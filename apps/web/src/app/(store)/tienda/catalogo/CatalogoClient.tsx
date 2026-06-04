'use client';

import { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X, Heart, AlertCircle, Loader2 } from 'lucide-react';
import { ProductCard } from '@/components/store/ProductCard';
import { storeApi, formatCOP } from '@/lib/store-utils';
import { useStoreCart } from '@/stores/store-cart';

const SORT_OPTIONS = [
  { value: 'default', label: 'Relevancia' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'name_asc', label: 'Nombre A-Z' },
];

const CATEGORIES = ['Todos', 'Uñas', 'Cabello', 'Maquillaje', 'Piel', 'Spa'];

const CAT_FROM_ID: Record<string, string> = {
  nails: 'Uñas', hair: 'Cabello', makeup: 'Maquillaje', skin: 'Piel', spa: 'Spa', all: 'Todos',
};

const PAGE_SIZE = 20;

function CatalogoContent() {
  const searchParams = useSearchParams();
  const { isFavorite } = useStoreCart();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState(CAT_FROM_ID[searchParams.get('cat') ?? ''] ?? 'Todos');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [sort, setSort] = useState('default');

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  const fetchProducts = (reset = false) => {
    const currentPage = reset ? 0 : page + 1;
    const offset = currentPage * PAGE_SIZE;
    const setter = reset ? setLoading : setLoadingMore;
    setter(true);
    if (reset) setError(false);
    storeApi.get(`/storefront/public/products?limit=${PAGE_SIZE}&offset=${offset}`)
      .then(res => {
        const items = Array.isArray(res) ? res : [];
        setProducts(prev => reset ? items : [...prev, ...items]);
        setHasMore(items.length === PAGE_SIZE);
        if (!reset) setPage(currentPage);
      })
      .catch(() => { if (reset) setError(true); })
      .finally(() => setter(false));
  };

  useEffect(() => { fetchProducts(true); }, []);

  const filtered = useMemo(() => {
    let result = [...products];
    if (debouncedSearch) result = result.filter(p => p.name.toLowerCase().includes(debouncedSearch.toLowerCase()));
    if (category !== 'Todos') result = result.filter(p => (p.category?.name || '').toLowerCase().includes(category.toLowerCase()));
    if (minPrice) result = result.filter(p => Number(p.salePrice) >= Number(minPrice));
    if (maxPrice) result = result.filter(p => Number(p.salePrice) <= Number(maxPrice));
    if (onlyFavs) result = result.filter(p => isFavorite(p.id));
    if (sort === 'price_asc') result.sort((a, b) => Number(a.salePrice) - Number(b.salePrice));
    else if (sort === 'price_desc') result.sort((a, b) => Number(b.salePrice) - Number(a.salePrice));
    else if (sort === 'name_asc') result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [products, debouncedSearch, category, minPrice, maxPrice, onlyFavs, sort, isFavorite]);

  const activeFilters: { label: string; clear: () => void }[] = [];
  if (category !== 'Todos') activeFilters.push({ label: category, clear: () => setCategory('Todos') });
  if (minPrice) activeFilters.push({ label: `Desde ${formatCOP(Number(minPrice))}`, clear: () => setMinPrice('') });
  if (maxPrice) activeFilters.push({ label: `Hasta ${formatCOP(Number(maxPrice))}`, clear: () => setMaxPrice('') });
  if (onlyFavs) activeFilters.push({ label: 'Solo favoritos', clear: () => setOnlyFavs(false) });

  if (error) return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-4">
      <AlertCircle className="w-12 h-12 mb-4 text-gray-300" />
      <p className="text-gray-500 mb-5">No se pudo cargar el catálogo. Intenta de nuevo.</p>
      <button onClick={() => fetchProducts(true)} className="px-5 py-2.5 bg-[#EF2D8F] text-white rounded-full text-sm font-semibold hover:bg-[#d4267e] transition">
        Reintentar
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar en el catálogo..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30">
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="text-sm text-gray-500 whitespace-nowrap">{filtered.length} productos</span>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {activeFilters.map(f => (
            <span key={f.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-[#EF2D8F] text-sm rounded-full border border-pink-200">
              {f.label}<button onClick={f.clear}><X className="w-3.5 h-3.5" /></button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-6">
        <aside className="w-64 flex-shrink-0 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Categorías</h3>
            <ul className="space-y-1">
              {CATEGORIES.map(cat => (
                <li key={cat}>
                  <button onClick={() => setCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${category === cat ? 'bg-pink-50 text-[#EF2D8F] font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Rango de precio</h3>
            <div className="space-y-2">
              <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Mínimo"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Máximo"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Filtros especiales</h3>
            <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
              <input type="checkbox" checked={onlyFavs} onChange={e => setOnlyFavs(e.target.checked)} className="rounded border-gray-300 text-[#EF2D8F]" />
              <Heart className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">Solo favoritos</span>
            </label>
          </div>
        </aside>

        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-4 gap-4">
              {[...Array(12)].map((_, i) => <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Search className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">No se encontraron productos</p>
              <p className="text-xs mt-1">Intenta con otros filtros</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map(p => (
                  <ProductCard key={p.id} id={p.id} name={p.name}
                    price={Number(p.salePrice)} imageUrl={p.images?.[0]?.url}
                    category={p.category?.name} tenantId={p.tenantId} />
                ))}
              </div>
              {hasMore && !debouncedSearch && category === 'Todos' && !minPrice && !maxPrice && !onlyFavs && (
                <div className="flex justify-center mt-8">
                  <button onClick={() => fetchProducts(false)} disabled={loadingMore}
                    className="flex items-center gap-2 px-6 py-3 border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-60">
                    {loadingMore ? <><Loader2 className="w-4 h-4 animate-spin" /> Cargando...</> : 'Cargar más productos'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function CatalogoClient() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    }>
      <CatalogoContent />
    </Suspense>
  );
}
