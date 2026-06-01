'use client';

import { useEffect, useState, useMemo } from 'react';
import { Search, SlidersHorizontal, X, Heart } from 'lucide-react';
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
const RATINGS = [5, 4, 3, 2, 1];

export default function CatalogoPage() {
  const { isFavorite } = useStoreCart();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [onSale, setOnSale] = useState(false);
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [sort, setSort] = useState('default');

  useEffect(() => {
    storeApi.get('/storefront/public/products?limit=100')
      .then(res => setProducts(Array.isArray(res) ? res : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = [...products];

    if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (category !== 'Todos') {
      result = result.filter(p => (p.category?.name || '').toLowerCase().includes(category.toLowerCase()));
    }
    if (minPrice) result = result.filter(p => Number(p.salePrice) >= Number(minPrice));
    if (maxPrice) result = result.filter(p => Number(p.salePrice) <= Number(maxPrice));
    if (onlyFavs) result = result.filter(p => isFavorite(p.id));

    if (sort === 'price_asc') result.sort((a, b) => Number(a.salePrice) - Number(b.salePrice));
    else if (sort === 'price_desc') result.sort((a, b) => Number(b.salePrice) - Number(a.salePrice));
    else if (sort === 'name_asc') result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [products, search, category, minPrice, maxPrice, onlyFavs, sort, isFavorite]);

  const activeFilters: { label: string; clear: () => void }[] = [];
  if (category !== 'Todos') activeFilters.push({ label: category, clear: () => setCategory('Todos') });
  if (minPrice) activeFilters.push({ label: `Desde ${formatCOP(Number(minPrice))}`, clear: () => setMinPrice('') });
  if (maxPrice) activeFilters.push({ label: `Hasta ${formatCOP(Number(maxPrice))}`, clear: () => setMaxPrice('') });
  if (onSale) activeFilters.push({ label: 'En oferta', clear: () => setOnSale(false) });
  if (onlyFavs) activeFilters.push({ label: 'Solo favoritos', clear: () => setOnlyFavs(false) });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en el catálogo..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30">
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="text-sm text-gray-500 whitespace-nowrap">{filtered.length} productos</span>
      </div>

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {activeFilters.map(f => (
            <span key={f.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-[#EF2D8F] text-sm rounded-full border border-pink-200">
              {f.label}
              <button onClick={f.clear}><X className="w-3.5 h-3.5" /></button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 space-y-6">
          {/* Categories */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" /> Categorías
            </h3>
            <ul className="space-y-1">
              {CATEGORIES.map(cat => (
                <li key={cat}>
                  <button onClick={() => setCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      category === cat ? 'bg-pink-50 text-[#EF2D8F] font-semibold' : 'text-gray-600 hover:bg-gray-50'
                    }`}>
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Price range */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Rango de precio</h3>
            <div className="space-y-2">
              <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                placeholder="Mínimo" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                placeholder="Máximo" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
            </div>
          </div>

          {/* Special filters */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Filtros especiales</h3>
            <div className="space-y-2">
              {[
                { label: 'Solo favoritos', value: onlyFavs, set: setOnlyFavs, icon: <Heart className="w-4 h-4" /> },
              ].map(({ label, value, set, icon }) => (
                <label key={label} className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                  <input type="checkbox" checked={value} onChange={e => set(e.target.checked)}
                    className="rounded border-gray-300 text-[#EF2D8F]" />
                  {icon}
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-4 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Search className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">No se encontraron productos</p>
              <p className="text-xs mt-1">Intenta con otros filtros</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(p => (
                <ProductCard key={p.id} id={p.id} name={p.name}
                  price={Number(p.salePrice)} imageUrl={p.images?.[0]?.url}
                  category={p.category?.name} tenantId={p.tenantId} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
