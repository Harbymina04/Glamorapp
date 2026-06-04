'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { ScopeGate } from '@/hooks/use-plan-gate';
import { Package, AlertTriangle, TrendingUp, DollarSign, Plus, Search, Pencil, Trash2, Loader2, ShoppingCart, Truck } from 'lucide-react';

export default function InventoryPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockSuppliers, setLowStockSuppliers] = useState<Record<string, any>>({});

  const fetchProducts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search.trim()) params.set('search', search.trim());
      if (categoryFilter) params.set('categoryId', categoryFilter);
      const res = await api.get(`/products?${params}`, { token });
      setProducts(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, search, categoryFilter]);

  useEffect(() => {
    if (!token) return;
    fetchProducts();
    api.get('/products/categories/list', { token })
      .then(res => setCategories(Array.isArray(res) ? res : res.data || []))
      .catch(() => {});
  }, [fetchProducts, token]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"? Se marcará como inactivo.`)) return;
    setDeletingId(id);
    try {
      await api.del(`/products/${id}`, { token: token! });
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (e: any) {
      alert('No se pudo eliminar el producto. Intenta de nuevo.');
    } finally {
      setDeletingId(null);
    }
  };

  const lowStock = products.filter((p: any) => p.currentStock <= p.minStock && p.currentStock > 0).length;
  const outOfStock = products.filter((p: any) => p.currentStock === 0).length;
  const totalValue = products.reduce((s: number, p: any) => s + Number(p.currentStock || 0) * Number(p.costPrice || 0), 0);

  const lowStockProducts = products.filter((p: any) => p.currentStock <= p.minStock);

  // Load preferred suppliers for low-stock products
  useEffect(() => {
    if (!token || lowStockProducts.length === 0) return;
    const loadSuppliers = async () => {
      const map: Record<string, any> = {};
      await Promise.all(lowStockProducts.map(async (p) => {
        try {
          const res = await api.get(`/products/${p.id}/suppliers`, { token });
          const list = Array.isArray(res) ? res : (res.data || []);
          const preferred = list.find((s: any) => s.isPreferred) || list[0];
          if (preferred) map[p.id] = preferred;
        } catch {}
      }));
      setLowStockSuppliers(map);
    };
    loadSuppliers();
  }, [token, products]);

  const handleReorder = (productId: string) => {
    const supplier = lowStockSuppliers[productId];
    const params = new URLSearchParams();
    params.set('productId', productId);
    if (supplier?.supplierId) params.set('supplierId', supplier.supplierId);
    router.push(`/dashboard/inventory/purchases/new?${params}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventario</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona tus productos y existencias</p>
        </div>
        <ScopeGate module="inventory" action="create">
          <button
            onClick={() => router.push('/dashboard/inventory/products/new')}
            className="flex items-center gap-2 h-10 px-4 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition"
          >
            <Plus className="w-4 h-4" /> Nuevo producto
          </button>
        </ScopeGate>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total productos" value={String(products.length)} icon={<Package className="w-5 h-5 text-glamor-primary" />} />
        <StatCard title="Stock bajo" value={String(lowStock)} icon={<AlertTriangle className="w-5 h-5 text-orange-500" />} />
        <StatCard title="Sin stock" value={String(outOfStock)} icon={<TrendingUp className="w-5 h-5 text-red-500" />} />
        <StatCard title="Valor inventario" value={formatCurrency(totalValue)} icon={<DollarSign className="w-5 h-5 text-green-500" />} />
      </div>

      {/* Low-stock Alerts */}
      {!loading && lowStockProducts.length > 0 && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-orange-800 text-sm">Productos con stock bajo ({lowStockProducts.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockProducts.map(p => {
              const supplier = lowStockSuppliers[p.id];
              return (
                <div key={p.id} className="flex items-center gap-2 bg-white rounded-lg border border-orange-200 px-3 py-2 text-sm">
                  <span className="font-medium text-foreground">{p.name}</span>
                  <span className={`font-bold ${p.currentStock === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                    {p.currentStock}
                  </span>
                  {supplier && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      {supplier.supplierName}
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReorder(p.id); }}
                    className="ml-1 flex items-center gap-1 px-2 py-1 bg-orange-600 text-white rounded text-xs font-medium hover:bg-orange-700 transition"
                  >
                    <ShoppingCart className="w-3 h-3" /> Crear OC
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Buscar productos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border-primary text-sm bg-white text-muted-foreground focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{products.length} resultados</span>
      </div>

      {loading ? (
        <LoadingSkeleton rows={8} cols={6} />
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-border-primary">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground text-sm">No se encontraron productos</p>
          <button onClick={() => router.push('/dashboard/inventory/products/new')} className="mt-3 text-sm text-glamor-primary font-medium hover:underline">
            Crear primer producto
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border-primary overflow-hidden shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary bg-surface-primary/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Producto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoría</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Precio venta</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p: any) => (
                <tr key={p.id} className="hover:bg-surface-hover/50 transition cursor-pointer" onClick={() => router.push(`/dashboard/inventory/products/${p.id}`)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}${p.images[0].url}`}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover border border-border-primary"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 rounded-lg bg-glamor-primary-light flex items-center justify-center ${p.images?.[0] ? 'hidden' : ''}`}>
                        <Package className="w-5 h-5 text-glamor-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.sku || 'Sin SKU'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.category?.name || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-semibold ${p.currentStock === 0 ? 'text-red-600' : p.currentStock <= p.minStock ? 'text-orange-600' : 'text-foreground'}`}>
                      {p.currentStock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-foreground">{formatCurrency(p.salePrice)}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={p.status} colors={{ active: 'bg-green-50 text-green-700 border-green-200', inactive: 'bg-gray-50 text-gray-600 border-gray-200' }} />
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <ScopeGate module="inventory" action="edit">
                        <button
                          onClick={() => router.push(`/dashboard/inventory/products/${p.id}`)}
                          className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-glamor-primary transition"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </ScopeGate>
                      <ScopeGate module="inventory" action="delete">
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          disabled={deletingId === p.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition disabled:opacity-50"
                          title="Eliminar"
                        >
                          {deletingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </ScopeGate>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
