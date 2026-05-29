'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Package, Eye, Star, Search, Filter, ChevronLeft, ChevronRight,
  EyeOff, Sparkles, RefreshCw, Tag, Box, AlertCircle, CheckCircle2, X, ImageIcon,
} from 'lucide-react';

export default function CatalogProductsPage() {
  const { token } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  const limit = 12;

  const fetchProducts = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (categoryId) params.set('categoryId', categoryId);
      if (featuredOnly) params.set('isFeatured', 'true');

      const res = await api.get(`/catalog/products?${params.toString()}`, { token: token! });
      setProducts(res.data || []);
      const t = res.meta?.total ?? res.total ?? (res.data || []).length;
      setTotal(t);
      setTotalPages(res.meta?.totalPages ?? Math.ceil(t / limit));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, search, categoryId, featuredOnly]);

  useEffect(() => {
    if (!token) return;
    api.get('/products/categories/list', { token })
      .then(res => setCategories(Array.isArray(res) ? res : (res.data || [])))
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchProducts(1);
  }, [fetchProducts]);

  // Re-fetch when page changes (but not on initial mount since fetchProducts handles it)
  const prevPageRef = useRef(page);
  useEffect(() => {
    if (prevPageRef.current !== page) {
      fetchProducts(page);
    }
    prevPageRef.current = page;
  }, [page]);

  const goToPage = (p: number) => {
    setPage(p);
    fetchProducts(p);
  };

  const toggleFeatured = async (id: string) => {
    try {
      const res = await api.put(`/catalog/products/${id}/toggle-featured`, {}, { token: token! });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, isFeatured: res.isFeatured } : p));
      showFeedback('success', res.isFeatured ? 'Producto destacado' : 'Destacado removido');
    } catch (e) {
      showFeedback('error', 'Error al cambiar destacado');
    }
  };

  const toggleVisibility = async (id: string) => {
    try {
      const res = await api.put(`/catalog/products/${id}/toggle-visibility`, {}, { token: token! });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, isCatalogVisible: res.isCatalogVisible } : p));
      showFeedback('success', res.isCatalogVisible ? 'Visible en catálogo' : 'Oculto del catálogo');
    } catch (e) {
      showFeedback('error', 'Error al cambiar visibilidad');
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(1);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Catálogo de Productos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {total} producto{total !== 1 ? 's' : ''} visible{total !== 1 ? 's' : ''} para clientes
        </p>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
          feedback.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {feedback.message}
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en catálogo..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
          />
        </form>

        {/* Category filter */}
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <select
            value={categoryId}
            onChange={e => { setCategoryId(e.target.value); setPage(1); }}
            className="h-9 pl-9 pr-8 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 appearance-none cursor-pointer"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>

        {/* Featured toggle */}
        <button
          onClick={() => { setFeaturedOnly(!featuredOnly); setPage(1); }}
          className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-colors ${
            featuredOnly
              ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
              : 'border-border-primary text-muted-foreground hover:bg-surface-hover'
          }`}
        >
          <Star className={`w-4 h-4 ${featuredOnly ? 'fill-yellow-500 text-yellow-500' : ''}`} />
          Destacados
        </button>

        {/* Refresh */}
        <button
          onClick={() => fetchProducts(page)}
          disabled={loading}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border-primary text-sm text-muted-foreground hover:bg-surface-hover transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Products grid */}
      {loading ? (
        <LoadingSkeleton rows={3} cols={4} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8 text-muted-foreground" />}
          title="Sin productos en el catálogo"
          description={search || categoryId || featuredOnly
            ? 'No se encontraron productos con los filtros actuales. Intenta ajustar la búsqueda.'
            : 'Agrega productos desde Inventario y actívalos para que aparezcan aquí.'}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p: any) => (
              <div
                key={p.id}
                onClick={() => { setSelectedProduct(p); setModalImageIndex(0); }}
                className={`bg-white rounded-xl border overflow-hidden hover:shadow-card-hover transition group cursor-pointer ${
                  !p.isCatalogVisible ? 'border-dashed border-muted-foreground/30 opacity-70' : 'border-border-primary'
                }`}
              >
                {/* Image */}
                <div className="h-40 bg-surface-hover flex items-center justify-center relative overflow-hidden">
                  {p.images?.[0]?.url ? (
                    <img
                      src={p.images[0].url}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Package className="w-12 h-12 text-muted-foreground/40" />
                  )}

                  {/* Quick actions overlay */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.preventDefault(); toggleFeatured(p.id); }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                        p.isFeatured
                          ? 'bg-yellow-400 text-white'
                          : 'bg-white/90 text-muted-foreground hover:bg-yellow-100 hover:text-yellow-600'
                      }`}
                      title={p.isFeatured ? 'Quitar destacado' : 'Destacar producto'}
                    >
                      <Star className={`w-3.5 h-3.5 ${p.isFeatured ? 'fill-white' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); toggleVisibility(p.id); }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                        p.isCatalogVisible
                          ? 'bg-white/90 text-muted-foreground hover:bg-red-100 hover:text-red-600'
                          : 'bg-red-100 text-red-500 hover:bg-red-200'
                      }`}
                      title={p.isCatalogVisible ? 'Ocultar del catálogo' : 'Mostrar en catálogo'}
                    >
                      {p.isCatalogVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Visibility badge */}
                  {!p.isCatalogVisible && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-600">
                      Oculto
                    </div>
                  )}

                  {/* Stock badge */}
                  {p.currentStock != null && p.currentStock <= 5 && p.currentStock > 0 && (
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                      ¡Quedan {p.currentStock}!
                    </div>
                  )}
                  {p.currentStock === 0 && (
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-600">
                      Agotado
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground text-sm truncate flex-1">{p.name}</h3>
                    {p.isFeatured && (
                      <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0 mt-0.5" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    {p.category?.name && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-surface-hover text-muted-foreground">
                        {p.category.name}
                      </span>
                    )}
                    {p.brand?.name && (
                      <span className="text-xs text-muted-foreground">{p.brand.name}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="font-bold text-glamor-primary">{formatCurrency(p.salePrice)}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="w-3.5 h-3.5" />{p.catalogViews ?? 0}
                    </span>
                  </div>

                  {/* Stock bar */}
                  {p.currentStock != null && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Stock</span>
                        <span className="font-medium text-foreground">{p.currentStock} uds.</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-hover overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            p.currentStock > 10 ? 'bg-green-500' : p.currentStock > 5 ? 'bg-amber-400' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, ((p.currentStock || 0) / 50) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-primary">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages} — {total} producto{total !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="h-8 w-8 rounded-lg border border-border-primary flex items-center justify-center text-muted-foreground hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`h-8 min-w-[2rem] px-1 rounded-lg text-sm font-medium transition-colors ${
                        pageNum === page
                          ? 'bg-glamor-primary text-white'
                          : 'text-muted-foreground hover:bg-surface-hover'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="h-8 w-8 rounded-lg border border-border-primary flex items-center justify-center text-muted-foreground hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-between px-6 py-4 border-b border-border-primary rounded-t-2xl">
              <h2 className="text-lg font-bold text-foreground truncate pr-4">{selectedProduct.name}</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-surface-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Images gallery */}
              {selectedProduct.images && selectedProduct.images.length > 0 ? (
                <div className="mb-6">
                  <div className="relative bg-surface-hover rounded-xl overflow-hidden aspect-square max-h-80 mx-auto">
                    <img
                      src={selectedProduct.images[modalImageIndex].url}
                      alt={`${selectedProduct.name} - imagen ${modalImageIndex + 1}`}
                      className="w-full h-full object-contain"
                    />
                    {selectedProduct.images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalImageIndex(prev => prev === 0 ? selectedProduct.images.length - 1 : prev - 1);
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center text-foreground hover:bg-white transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalImageIndex(prev => prev === selectedProduct.images.length - 1 ? 0 : prev + 1);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center text-foreground hover:bg-white transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        {/* Dot indicators */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {selectedProduct.images.map((_: any, i: number) => (
                            <button
                              key={i}
                              onClick={(e) => { e.stopPropagation(); setModalImageIndex(i); }}
                              className={`w-2 h-2 rounded-full transition-all ${
                                i === modalImageIndex
                                  ? 'bg-glamor-primary w-4'
                                  : 'bg-white/70 hover:bg-white'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Thumbnails row */}
                  {selectedProduct.images.length > 1 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                      {selectedProduct.images.map((img: any, i: number) => (
                        <button
                          key={i}
                          onClick={() => setModalImageIndex(i)}
                          className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                            i === modalImageIndex
                              ? 'border-glamor-primary shadow-md'
                              : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={img.url} alt={`${selectedProduct.name} ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-6 bg-surface-hover rounded-xl flex items-center justify-center aspect-video max-h-60">
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <span className="text-sm">Sin imágenes disponibles</span>
                  </div>
                </div>
              )}

              {/* Product details */}
              <div className="space-y-4">
                {/* Price & Stock */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-hover rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Precio</p>
                    <p className="text-2xl font-bold text-glamor-primary">{formatCurrency(selectedProduct.salePrice)}</p>
                  </div>
                  <div className="bg-surface-hover rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Stock disponible</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-foreground">{selectedProduct.currentStock ?? 0}</p>
                      <span className="text-sm text-muted-foreground">uds.</span>
                    </div>
                    {selectedProduct.currentStock != null && (
                      <div className="w-full h-1.5 rounded-full bg-gray-200 mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            selectedProduct.currentStock > 10 ? 'bg-green-500' : selectedProduct.currentStock > 5 ? 'bg-amber-400' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, ((selectedProduct.currentStock || 0) / 50) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Descripción</h3>
                  {selectedProduct.description ? (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedProduct.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Sin descripción</p>
                  )}
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border-primary">
                  {selectedProduct.category?.name && (
                    <span className="text-xs px-3 py-1 rounded-full bg-surface-hover text-muted-foreground">
                      <Tag className="w-3 h-3 inline mr-1" />{selectedProduct.category.name}
                    </span>
                  )}
                  {selectedProduct.brand?.name && (
                    <span className="text-xs px-3 py-1 rounded-full bg-surface-hover text-muted-foreground">
                      <Box className="w-3 h-3 inline mr-1" />{selectedProduct.brand.name}
                    </span>
                  )}
                  {selectedProduct.sku && (
                    <span className="text-xs px-3 py-1 rounded-full bg-surface-hover text-muted-foreground">
                      SKU: {selectedProduct.sku}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
