'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowLeftRight, Package, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  currentStock: number;
  unitOfMeasure: string;
}

interface Store {
  id: string;
  name: string;
  city: string | null;
}

export default function NewTransferPage() {
  const router = useRouter();
  const { token } = useAuthStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productId, setProductId] = useState('');
  const [targetStoreId, setTargetStoreId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const selectedProduct = products.find(p => p.id === productId);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [productsRes, storesRes] = await Promise.all([
        api.get('/products?limit=500&status=active', { token }),
        api.get('/inventory/transfers/stores', { token }),
      ]);
      // Only show products with stock available
      const withStock = (productsRes.data ?? []).filter((p: Product) => p.currentStock > 0);
      setProducts(withStock);
      setStores(storesRes ?? []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qty = parseInt(quantity, 10);
    if (!productId || !targetStoreId || !qty || qty <= 0) {
      setError('Completa todos los campos requeridos');
      return;
    }
    if (selectedProduct && qty > selectedProduct.currentStock) {
      setError(`Stock insuficiente. Disponible: ${selectedProduct.currentStock}`);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/inventory/transfers', { productId, targetStoreId, quantity: qty, notes: notes || undefined }, { token });
      router.push('/dashboard/inventory/transfers');
    } catch (err: any) {
      setError(err.message ?? 'Error al crear la transferencia');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground text-sm">Cargando...</div>
    );
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/inventory/transfers" className="text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nueva transferencia</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Mueve stock a otra sucursal del negocio</p>
        </div>
      </div>

      {stores.length === 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm mb-6">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>No hay otras sucursales disponibles. Las transferencias requieren al menos dos sucursales activas.</span>
        </div>
      )}

      {products.length === 0 && stores.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm mb-6">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>No hay productos con stock disponible para transferir.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border-primary p-6 space-y-5">

        {/* Product */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Producto <span className="text-red-500">*</span>
          </label>
          <select
            value={productId}
            onChange={e => { setProductId(e.target.value); setQuantity(''); }}
            className="w-full rounded-lg border border-border-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-glamor-primary/30 focus:border-glamor-primary"
            required
          >
            <option value="">Selecciona un producto</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} {p.sku ? `(${p.sku})` : ''} — Stock: {p.currentStock}
              </option>
            ))}
          </select>
          {selectedProduct && (
            <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
              <Package className="w-3 h-3" />
              Stock disponible: <span className="font-semibold text-foreground ml-0.5">{selectedProduct.currentStock} {selectedProduct.unitOfMeasure}</span>
            </p>
          )}
        </div>

        {/* Target store */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Sucursal destino <span className="text-red-500">*</span>
          </label>
          <select
            value={targetStoreId}
            onChange={e => setTargetStoreId(e.target.value)}
            className="w-full rounded-lg border border-border-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-glamor-primary/30 focus:border-glamor-primary"
            required
          >
            <option value="">Selecciona una sucursal</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}{s.city ? ` — ${s.city}` : ''}
              </option>
            ))}
          </select>
          {stores.length === 0 && (
            <p className="mt-1.5 text-xs text-muted-foreground">No hay otras sucursales disponibles</p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Cantidad <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={selectedProduct?.currentStock ?? undefined}
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-border-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-glamor-primary/30 focus:border-glamor-primary"
            required
          />
          {selectedProduct && quantity && parseInt(quantity) > selectedProduct.currentStock && (
            <p className="mt-1 text-xs text-red-500">Excede el stock disponible ({selectedProduct.currentStock})</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Notas</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Motivo de la transferencia, referencia, etc."
            className="w-full rounded-lg border border-border-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-glamor-primary/30 focus:border-glamor-primary resize-none"
          />
        </div>

        {/* Preview */}
        {selectedProduct && targetStoreId && quantity && parseInt(quantity) > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-glamor-primary/5 border border-glamor-primary/20 text-sm">
            <CheckCircle2 className="w-4 h-4 text-glamor-primary shrink-0" />
            <span className="text-foreground">
              Transferir <span className="font-semibold">{quantity} {selectedProduct.unitOfMeasure}</span> de{' '}
              <span className="font-semibold">{selectedProduct.name}</span>
              {' '}<ArrowRight className="w-3 h-3 inline text-muted-foreground" />{' '}
              <span className="font-semibold">{stores.find(s => s.id === targetStoreId)?.name}</span>
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Link
            href="/dashboard/inventory/transfers"
            className="flex-1 text-center px-4 py-2 rounded-lg border border-border-primary text-sm text-muted-foreground hover:bg-muted/50 transition"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting || stores.length === 0 || products.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? 'Transfiriendo...' : (
              <>
                <ArrowLeftRight className="w-4 h-4" />
                Confirmar transferencia
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
