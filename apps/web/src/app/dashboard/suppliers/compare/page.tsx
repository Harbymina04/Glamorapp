'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import {
  ArrowLeft, Search, TrendingDown, Star, DollarSign,
  Package, Clock, BarChart3,
} from 'lucide-react';

export default function CompareSuppliersPage() {
  const router = useRouter();

  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const getToken = () => useAuthStore.getState().token;

  const searchProducts = useCallback(async (q: string) => {
    if (q.length < 2) { setProductResults([]); return; }
    const token = getToken();
    if (!token) return;
    setSearching(true);
    try {
      const res = await api.get(`/products?search=${encodeURIComponent(q)}&limit=10`, { token });
      setProductResults(res.data || []);
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  }, []);

  const selectProduct = async (product: any) => {
    setSelectedProduct(product);
    setProductSearch(product.name);
    setProductResults([]);
    setComparison(null);

    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get(`/suppliers/compare/product/${product.id}`, { token });
      setComparison(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const bestPrice = comparison?.suppliers?.length > 0
    ? comparison.suppliers.reduce((best: any, s: any) =>
        (s.supplierPrice && (!best || Number(s.supplierPrice) < Number(best.supplierPrice))) ? s : best, null)
    : null;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-surface-hover">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comparar Proveedores</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Compara precios y condiciones entre proveedores para un mismo producto</p>
        </div>
      </div>

      {/* Product search */}
      <div className="bg-white rounded-xl border border-border-primary p-6 shadow-card mb-6">
        <label className="block text-sm font-medium text-foreground mb-2">Buscar producto</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Buscar por nombre o SKU..."
            value={productSearch}
            onChange={e => { setProductSearch(e.target.value); searchProducts(e.target.value); }}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
          />
          {productResults.length > 0 && (
            <div className="absolute z-20 top-full mt-1 w-full rounded-lg border border-border-primary bg-white shadow-lg max-h-60 overflow-y-auto">
              {productResults.map((p: any) => (
                <button key={p.id} onClick={() => selectProduct(p)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-hover border-b border-border-primary last:border-0 flex items-center justify-between">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{p.sku}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {searching && <p className="text-xs text-muted-foreground mt-2">Buscando...</p>}
      </div>

      {/* Results */}
      {loading && <LoadingSkeleton rows={4} cols={4} />}

      {comparison && !loading && (
        <div>
          {/* Product header */}
          <div className="bg-white rounded-xl border border-border-primary p-5 shadow-card mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-glamor-primary/10 text-glamor-primary">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{comparison.product.name}</h2>
                <p className="text-sm text-muted-foreground">
                  SKU: {comparison.product.sku}
                  {comparison.product.currentSalePrice && (
                    <> · Precio de venta: <span className="font-medium text-foreground">{formatCurrency(comparison.product.currentSalePrice)}</span></>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Comparison cards */}
          {comparison.suppliers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-border-primary">
              <Package className="w-12 h-12 text-muted-foreground opacity-30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Ningún proveedor suministra este producto</p>
              <p className="text-xs text-muted-foreground mt-1">Agrega el producto a un proveedor desde su ficha</p>
            </div>
          ) : (
            <>
              {/* Best price highlight */}
              {bestPrice && comparison.suppliers.length > 1 && (
                <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
                  <TrendingDown className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Mejor precio: {bestPrice.supplierName} — {formatCurrency(bestPrice.supplierPrice)}
                    </p>
                    {bestPrice.margin && <p className="text-xs text-green-600">Margen estimado: {bestPrice.margin}%</p>}
                  </div>
                </div>
              )}

              {/* Supplier cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {comparison.suppliers.map((s: any) => (
                  <div key={s.supplierProductId} className={`bg-white rounded-xl border shadow-card overflow-hidden transition ${
                    s.isPreferred ? 'border-amber-300 ring-1 ring-amber-200' : 'border-border-primary'
                  }`}>
                    {/* Preferred badge */}
                    {s.isPreferred && (
                      <div className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 border-b border-amber-200">
                        <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                        <span className="text-xs font-medium text-amber-700">Proveedor preferido</span>
                      </div>
                    )}

                    <div className="p-4 space-y-4">
                      {/* Supplier name */}
                      <div>
                        <p className="font-semibold text-foreground text-sm">{s.supplierName}</p>
                        <p className="text-xs text-muted-foreground">{s.supplierNumber}</p>
                      </div>

                      {/* Price */}
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Precio proveedor</p>
                          <p className="text-2xl font-bold text-foreground">
                            {s.supplierPrice ? formatCurrency(s.supplierPrice) : '—'}
                          </p>
                        </div>
                        {s.margin && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            Number(s.margin) > 30 ? 'bg-green-50 text-green-700' :
                            Number(s.margin) > 15 ? 'bg-blue-50 text-blue-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {s.margin}% margen
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="space-y-2 pt-2 border-t border-border-primary">
                        {s.supplierSku && (
                          <div className="flex items-center gap-2 text-xs">
                            <Package className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">SKU:</span>
                            <span className="font-mono text-foreground">{s.supplierSku}</span>
                          </div>
                        )}
                        {s.lastPriceChange && (
                          <div className="flex items-center gap-2 text-xs">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Último cambio:</span>
                            <span>{new Date(s.lastPriceChange).toLocaleDateString('es-MX')}</span>
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      <button
                        onClick={() => router.push(`/dashboard/suppliers/${s.supplierId}`)}
                        className="w-full h-9 rounded-lg border border-border-primary text-xs font-medium text-muted-foreground hover:bg-surface-hover hover:text-foreground transition">
                        Ver ficha del proveedor
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
