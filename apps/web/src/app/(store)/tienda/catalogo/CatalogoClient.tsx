'use client';

import { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import { Search, SlidersHorizontal, X, Heart, AlertCircle, Loader2, MapPin } from 'lucide-react';
import { ProductCard } from '@/components/store/ProductCard';
import { storeApi, formatCOP } from '@/lib/store-utils';
import { useStoreCart, getStorefrontDiscount } from '@/stores/store-cart';
import { getSavedLocation, requestLocation, type ClientLocation } from '@/lib/geo';

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

function CatalogoContent({ initialProducts = [] }: { initialProducts?: any[] }) {
  const { isFavorite } = useStoreCart();

  // Productos precargados en el servidor (SSR) → el HTML inicial los contiene
  // y los crawlers ven el catálogo sin ejecutar JS.
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [storefrontDiscounts, setStorefrontDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(initialProducts.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('Todos');

  // Los query params (?q=, ?cat=) se leen en el cliente tras montar:
  // useSearchParams() forzaría el fallback de Suspense en el HTML estático
  // y los crawlers verían el skeleton en vez de los productos.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get('q');
    const cat = sp.get('cat');
    if (q) { setSearch(q); setDebouncedSearch(q); }
    if (cat && CAT_FROM_ID[cat]) setCategory(CAT_FROM_ID[cat]);
  }, []);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [sort, setSort] = useState('default');
  const [filterOpen, setFilterOpen] = useState(false);

  // ── Filtro "Cerca de mí" ──────────────────────────────────────
  const [nearMe, setNearMe] = useState(false);
  const [radiusKm, setRadiusKm] = useState(25);
  const [coords, setCoords] = useState<ClientLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const geoMounted = useRef(false);

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
    // Con "Cerca de mí" activo, el servidor filtra por radio y anexa distanceKm
    const geoParams = nearMe && coords
      ? `&lat=${coords.lat}&lng=${coords.lng}&maxKm=${radiusKm}`
      : '';
    storeApi.get(`/storefront/public/products?limit=${PAGE_SIZE}&offset=${offset}${geoParams}`)
      .then(res => {
        const items = Array.isArray(res) ? res : [];
        setProducts(prev => reset ? items : [...prev, ...items]);
        setHasMore(items.length === PAGE_SIZE);
        setPage(reset ? 0 : currentPage);
      })
      .catch(() => { if (reset) setError(true); })
      .finally(() => setter(false));
  };

  const toggleNearMe = async () => {
    setLocError('');
    if (nearMe) { setNearMe(false); return; }
    const saved = getSavedLocation();
    if (saved) { setCoords(saved); setNearMe(true); return; }
    setLocating(true);
    try {
      const loc = await requestLocation();
      setCoords(loc);
      setNearMe(true);
    } catch {
      setLocError('No pudimos obtener tu ubicación. Revisa el permiso del navegador.');
    } finally {
      setLocating(false);
    }
  };

  // Refetch al activar/desactivar el filtro o cambiar el radio
  useEffect(() => {
    if (!geoMounted.current) { geoMounted.current = true; return; }
    fetchProducts(true);
  }, [nearMe, coords, radiusKm]);

  useEffect(() => {
    // Con productos del servidor no refetcheamos la primera página
    if (initialProducts.length > 0) {
      setHasMore(initialProducts.length >= PAGE_SIZE);
      return;
    }
    fetchProducts(true);
    // Load discounts after products arrive — re-fetch when products list changes
  }, []);

  // Load storefront discounts once products are available
  useEffect(() => {
    if (!products.length) return;
    const tenantIds = Array.from(new Set(products.map((p: any) => p.tenantId).filter(Boolean))) as string[];
    Promise.all(
      tenantIds.map(tid =>
        storeApi.get(`/storefront/public/discounts?tenantId=${tid}`).catch(() => []),
      ),
    ).then(results => setStorefrontDiscounts((results as any[][]).flat()));
  }, [products.length]);

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
    else if (nearMe) {
      // Con "Cerca de mí" y orden por relevancia, los más cercanos primero
      result.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }
    return result;
  }, [products, debouncedSearch, category, minPrice, maxPrice, onlyFavs, sort, isFavorite, nearMe]);

  const activeFilters: { label: string; clear: () => void }[] = [];
  if (category !== 'Todos') activeFilters.push({ label: category, clear: () => setCategory('Todos') });
  if (minPrice) activeFilters.push({ label: `Desde ${formatCOP(Number(minPrice))}`, clear: () => setMinPrice('') });
  if (maxPrice) activeFilters.push({ label: `Hasta ${formatCOP(Number(maxPrice))}`, clear: () => setMaxPrice('') });
  if (onlyFavs) activeFilters.push({ label: 'Solo favoritos', clear: () => setOnlyFavs(false) });
  if (nearMe) activeFilters.push({ label: `Cerca de mí (≤${radiusKm} km)`, clear: () => setNearMe(false) });

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
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar en el catálogo..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
        </div>
        <button onClick={toggleNearMe} disabled={locating}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition whitespace-nowrap ${
            nearMe ? 'bg-[#EF2D8F] text-white border-transparent' : 'border-gray-200 text-gray-700 hover:border-[#EF2D8F] hover:text-[#EF2D8F]'
          } disabled:opacity-60`}>
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          Cerca de mí
        </button>
        {nearMe && (
          <select value={radiusKm} onChange={e => setRadiusKm(Number(e.target.value))}
            className="hidden sm:block px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30">
            {[5, 10, 25, 50].map(km => <option key={km} value={km}>≤ {km} km</option>)}
          </select>
        )}
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="hidden sm:block px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30">
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={() => setFilterOpen(true)}
          className="md:hidden flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
          <SlidersHorizontal className="w-4 h-4" /> Filtros
          {activeFilters.length > 0 && <span className="w-5 h-5 rounded-full bg-[#EF2D8F] text-white text-xs flex items-center justify-center">{activeFilters.length}</span>}
        </button>
        <span className="hidden sm:block text-sm text-gray-500 whitespace-nowrap">{filtered.length} productos</span>
      </div>
      <span className="sm:hidden block text-xs text-gray-400 mb-3">{filtered.length} productos</span>
      {locError && <p className="text-xs text-amber-600 mb-3">{locError}</p>}

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {activeFilters.map(f => (
            <span key={f.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-[#EF2D8F] text-sm rounded-full border border-pink-200">
              {f.label}<button onClick={f.clear}><X className="w-3.5 h-3.5" /></button>
            </span>
          ))}
        </div>
      )}

      {/* Mobile category chips */}
      <div className="md:hidden flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition ${
              category === cat ? 'bg-[#EF2D8F] text-white border-transparent' : 'border-gray-200 text-gray-600'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Mobile filter drawer */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFilterOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-900">Filtros</h3>
              <button onClick={() => setFilterOpen(false)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Ordenar por</p>
              <div className="space-y-1">
                {SORT_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => setSort(o.value)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition ${sort === o.value ? 'bg-pink-50 text-[#EF2D8F] font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Rango de precio</p>
              <div className="flex gap-3">
                <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Mínimo"
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
                <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Máximo"
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
              </div>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl border border-gray-200">
              <input type="checkbox" checked={onlyFavs} onChange={e => setOnlyFavs(e.target.checked)} className="rounded border-gray-300 text-[#EF2D8F]" />
              <Heart className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">Solo favoritos</span>
            </label>
            <div className="space-y-2">
              <button onClick={toggleNearMe} disabled={locating}
                className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition ${
                  nearMe ? 'bg-[#EF2D8F] text-white border-transparent' : 'border-gray-200 text-gray-700'
                } disabled:opacity-60`}>
                {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                Cerca de mí
              </button>
              {nearMe && (
                <select value={radiusKm} onChange={e => setRadiusKm(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none">
                  {[5, 10, 25, 50].map(km => <option key={km} value={km}>Hasta {km} km</option>)}
                </select>
              )}
            </div>
            <button onClick={() => setFilterOpen(false)}
              className="w-full py-3 bg-[#EF2D8F] text-white rounded-xl font-bold hover:bg-[#d4267e] transition">
              Ver {filtered.length} productos
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        <aside className="hidden md:block w-64 flex-shrink-0 space-y-6">
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

        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {filtered.map(p => {
                  const basePrice = Number(p.salePrice || 0);
                  const disc = getStorefrontDiscount(
                    { id: p.id, categoryId: p.categoryId, tenantId: p.tenantId },
                    storefrontDiscounts,
                  );
                  const effectivePrice = disc
                    ? Math.round(basePrice * (1 - Number(disc.discountPercent) / 100))
                    : basePrice;
                  return (
                    <ProductCard key={p.id} id={p.id} name={p.name}
                      price={effectivePrice}
                      oldPrice={disc ? basePrice : undefined}
                      imageUrl={p.images?.[0]?.url}
                      category={p.category?.name}
                      categoryId={p.categoryId}
                      distanceKm={p.distanceKm}
                      isFeatured={p.isFeatured}
                      tenantId={p.tenantId} />
                  );
                })}
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

export function CatalogoClient({ initialProducts = [] }: { initialProducts?: any[] }) {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    }>
      <CatalogoContent initialProducts={initialProducts} />
    </Suspense>
  );
}
