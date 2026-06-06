'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Save, Loader2, Plus, Trash2, Search, Package } from 'lucide-react';

interface CartItem {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  stock: number;
}

function NewPurchaseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuthStore();

  const prefilledProductId = searchParams.get('productId') || '';
  const prefilledSupplierId = searchParams.get('supplierId') || '';

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [supplierPrices, setSupplierPrices] = useState<Record<string, number>>({}); // productId → supplier price
  const [selectedSupplier, setSelectedSupplier] = useState(prefilledSupplierId);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState('');
  const [ivaPercent, setIvaPercent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductList, setShowProductList] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get('/suppliers?limit=100', { token }).then(res => {
      setSuppliers(res.data || []);
    });
    // Load supplier prices if supplier was prefilled via URL param
    if (prefilledSupplierId) handleSupplierChange(prefilledSupplierId);
    api.get('/products?limit=200', { token }).then(res => {
      const prods = res.data || [];
      setProducts(prods);

      // Pre-fill cart if productId was passed
      if (prefilledProductId) {
        const prod = prods.find((p: any) => p.id === prefilledProductId);
        if (prod) {
          setCart([{
            productId: prod.id,
            productName: prod.name,
            productSku: prod.sku || '',
            quantity: Math.max(1, (prod.minStock || 5) - (prod.currentStock || 0)),
            unitPrice: Number(prod.costPrice) || 0,
            stock: prod.currentStock,
          }]);
        }
      }
    });
  }, [token, prefilledProductId]);

  // Load supplier prices when supplier changes
  const handleSupplierChange = async (supplierId: string) => {
    setSelectedSupplier(supplierId);
    setSupplierPrices({});
    if (!supplierId || !token) return;
    try {
      const spList = await api.get(`/suppliers/${supplierId}/products`, { token });
      const map: Record<string, number> = {};
      for (const sp of spList || []) {
        if (sp.productId && sp.supplierPrice != null) {
          map[sp.productId] = Number(sp.supplierPrice);
        }
      }
      setSupplierPrices(map);
    } catch { /* ignore */ }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const addToCart = (product: any) => {
    if (cart.find(i => i.productId === product.id)) return;
    // Use supplier price if available, otherwise fall back to cost price
    const unitPrice = supplierPrices[product.id] ?? Number(product.costPrice) ?? 0;
    setCart(prev => [...prev, {
      productId: product.id,
      productName: product.name,
      productSku: product.sku || '',
      quantity: 1,
      unitPrice,
      stock: product.currentStock,
    }]);
    setProductSearch('');
    setShowProductList(false);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  };

  const updateCartItem = (productId: string, field: 'quantity' | 'unitPrice', value: number) => {
    setCart(prev => prev.map(i =>
      i.productId === productId ? { ...i, [field]: value } : i
    ));
  };

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const ivaAmount = subtotal * (ivaPercent / 100);
  const total = subtotal + ivaAmount;

  const handleSave = async () => {
    if (!selectedSupplier) return setError('Selecciona un proveedor');
    if (cart.length === 0) return setError('Agrega al menos un producto');

    setSaving(true);
    setError('');
    try {
      await api.post('/purchases', {
        supplierId: selectedSupplier,
        ivaPercent,
        notes: notes.trim() || undefined,
        items: cart.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      }, { token: token! });
      router.push('/dashboard/inventory/purchases');
    } catch (e: any) {
      setError(e.message || 'Error al crear la compra');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition';
  const labelClass = 'block text-sm font-medium text-foreground mb-1.5';

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-surface-hover">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nueva Orden de Compra</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Crea una orden de compra para un proveedor</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-border-primary p-6 shadow-card space-y-5">
        {/* Supplier Select */}
        <div>
          <label className={labelClass}>Proveedor *</label>
          <select
            className={inputClass}
            value={selectedSupplier}
            onChange={e => handleSupplierChange(e.target.value)}
          >
            <option value="">Seleccionar proveedor...</option>
            {suppliers.map((s: any) => (
              <option key={s.id} value={s.id}>{s.businessName} ({s.supplierNumber})</option>
            ))}
          </select>
        </div>

        {/* Product Search + Add */}
        <div>
          <label className={labelClass}>Agregar productos</label>
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  placeholder="Buscar producto..."
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setShowProductList(true); }}
                  onFocus={() => setShowProductList(true)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
                />
              </div>
            </div>
            {showProductList && productSearch && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-border-primary rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredProducts.slice(0, 20).map(p => {
                  const hasSupplierPrice = supplierPrices[p.id] != null;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      disabled={cart.some(i => i.productId === p.id)}
                      className="w-full text-left px-4 py-2.5 hover:bg-surface-hover text-sm flex items-center justify-between disabled:opacity-40"
                    >
                      <div>
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {p.sku || '—'} · Stock: {p.currentStock}</p>
                      </div>
                      <div className="text-right">
                        {hasSupplierPrice ? (
                          <>
                            <p className="text-xs font-semibold text-glamor-primary">{formatCurrency(supplierPrices[p.id])} <span className="text-[10px]">proveedor</span></p>
                            <p className="text-[10px] text-muted-foreground line-through">Costo: {formatCurrency(p.costPrice)}</p>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Costo: {formatCurrency(p.costPrice)}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <p className="px-4 py-3 text-sm text-muted-foreground text-center">No se encontraron productos</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div>
            <label className={labelClass}>Productos ({cart.length})</label>
            <div className="border border-border-primary rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-primary/50 border-b border-border-primary">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Producto</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground w-24">Cantidad</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground w-28">Precio unit.</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground w-28">Subtotal</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cart.map(item => (
                    <tr key={item.productId}>
                      <td className="px-3 py-2">
                        <p className="text-sm font-medium text-foreground">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.productSku}</p>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateCartItem(item.productId, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full h-8 text-center rounded border border-border-primary text-sm focus:outline-none focus:ring-1 focus:ring-glamor-primary/30"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={e => updateCartItem(item.productId, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full h-8 text-right rounded border border-border-primary text-sm focus:outline-none focus:ring-1 focus:ring-glamor-primary/30"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-medium text-foreground">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </td>
                      <td className="px-1 py-2">
                        <button onClick={() => removeFromCart(item.productId)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* IVA Selector */}
        <div>
          <label className={labelClass}>IVA de la compra</label>
          <div className="flex gap-2">
            {[0, 19].map(rate => (
              <button
                key={rate}
                type="button"
                onClick={() => setIvaPercent(rate)}
                className={`h-9 px-4 rounded-lg text-sm font-medium border transition ${
                  ivaPercent === rate
                    ? 'bg-glamor-primary text-white border-glamor-primary'
                    : 'bg-white text-foreground border-border-primary hover:bg-surface-hover'
                }`}
              >
                {rate === 0 ? 'Sin IVA' : `IVA ${rate}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Totals */}
        {cart.length > 0 && (
          <div className="flex justify-end">
            <div className="bg-surface-primary/30 rounded-lg px-4 py-3 min-w-[220px] space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium text-foreground">{formatCurrency(subtotal)}</span>
              </div>
              {ivaPercent > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA ({ivaPercent}%):</span>
                  <span className="font-medium text-blue-600">{formatCurrency(ivaAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-border-primary pt-2 mt-1">
                <span className="text-foreground">Total:</span>
                <span className="text-glamor-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className={labelClass}>Notas (opcional)</label>
          <textarea
            className={`${inputClass} h-20 py-2 resize-none`}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notas internas de la orden..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => router.back()} className="h-10 px-4 rounded-lg border border-border-primary text-sm font-medium text-muted-foreground hover:bg-surface-hover transition">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 h-10 px-6 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Creando...' : 'Crear orden'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewPurchasePage() {
  return (
    <Suspense fallback={<div className="max-w-3xl"><div className="animate-pulse h-96 bg-white rounded-xl border border-border-primary" /></div>}>
      <NewPurchaseForm />
    </Suspense>
  );
}
