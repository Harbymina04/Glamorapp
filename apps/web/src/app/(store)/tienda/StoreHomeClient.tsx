'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, X, Heart, Clock, Store as StoreIcon, Search, MapPin, Loader2 } from 'lucide-react';
import { ProductCard } from '@/components/store/ProductCard';
import { NailDesignCard } from '@/components/store/NailDesignCard';
import { formatCOP, categoryColors, storeApi } from '@/lib/store-utils';
import { useStoreCart, getStorefrontDiscount } from '@/stores/store-cart';
import { useAuthStore } from '@/stores/auth-store';
import { getToken } from '@/lib/auth';
import { StoreChatbot } from '@/components/store/StoreChatbot';

const CATEGORIES = ['Todos', 'Uñas', 'Cabello', 'Maquillaje', 'Piel', 'Spa'];

const CAT_MATCH: Record<string, string[]> = {
  'Uñas':       ['uña', 'nail', 'esmalt', 'acrílico', 'gel'],
  'Cabello':    ['cabello', 'hair', 'cabel', 'shampoo', 'acondicionador', 'tinte'],
  'Maquillaje': ['maquillaje', 'makeup', 'labial', 'base', 'sombra', 'rubor'],
  'Piel':       ['piel', 'skin', 'crema', 'sérum', 'facial', 'hidratante'],
  'Spa':        ['spa', 'masaje', 'relaj', 'aromaterapia'],
};

function NailDesignModal({ design, onClose }: { design: any; onClose: () => void }) {
  const { toggleFavorite, isFavorite } = useStoreCart();
  const fav = isFavorite(design.id);
  const GRADIENTS = [
    'from-rose-300 via-pink-400 to-fuchsia-500',
    'from-violet-400 via-purple-400 to-pink-400',
    'from-fuchsia-400 via-pink-400 to-rose-400',
    'from-indigo-300 via-violet-400 to-purple-500',
  ];
  const grad = GRADIENTS[design.name?.charCodeAt(0) % GRADIENTS.length];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-lg">
        <div className={`relative h-72 bg-gradient-to-b ${grad}`}>
          {design.imageUrl && <img src={design.imageUrl} alt={design.name} className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition">
            <X className="w-5 h-5" />
          </button>
          <button onClick={() => toggleFavorite(design.id)} className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition">
            <Heart className={`w-4 h-4 ${fav ? 'fill-[#EF2D8F] text-[#EF2D8F]' : 'text-white'}`} />
          </button>
          <div className="absolute bottom-4 left-4">
            <h2 className="text-2xl font-black text-white">{design.name}</h2>
            {design.technique && (
              <span className="mt-1 inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full">{design.technique}</span>
            )}
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            {design.suggestedPrice ? (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Precio desde</p>
                <p className="text-2xl font-black text-gray-900">{formatCOP(Number(design.suggestedPrice))}</p>
              </div>
            ) : <div />}
            {design.estimatedDurationMinutes && (
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Duración aprox.</p>
                <p className="text-lg font-bold text-gray-700 flex items-center gap-1"><Clock className="w-4 h-4" /> {design.estimatedDurationMinutes} min</p>
              </div>
            )}
          </div>
          <a href={design.salonSlug ? `/tienda/${design.salonSlug}?tab=servicios` : '#salones'} onClick={onClose}
            className="block w-full py-3 bg-[#EF2D8F] text-white rounded-xl font-bold text-center hover:bg-[#d4267e] transition">
            {design.salonName ? `Agendar en ${design.salonName} →` : 'Agendar una cita →'}
          </a>
        </div>
      </div>
    </div>
  );
}

interface Props {
  shops: any[];
  products: any[];
  bannerUrl?: string | null;
  designs: any[];
}

const SHOPS_PAGE_SIZE = 6;

export function StoreHomeClient({ shops, products, designs, bannerUrl }: Props) {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [selectedDesign, setSelectedDesign] = useState<any>(null);
  const [storefrontDiscounts, setStorefrontDiscounts] = useState<any[]>([]);
  const [shopSearch, setShopSearch] = useState('');
  const [shopsExpanded, setShopsExpanded] = useState(false);

  // ── Filtro por ubicación ─────────────────────────────────────
  const [shopsList, setShopsList] = useState<any[]>(shops);
  const [locMode, setLocMode] = useState<'none' | 'geo' | 'city'>('none');
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState('');

  // Ciudades disponibles para el fallback manual
  useEffect(() => {
    storeApi.get('/storefront/public/cities')
      .then((c: string[]) => setCities(Array.isArray(c) ? c : []))
      .catch(() => {});
  }, []);

  const applyGeo = useCallback((lat: number, lng: number) =>
    storeApi.get(`/storefront/public?lat=${lat}&lng=${lng}`)
      .then((data: any[]) => {
        setShopsList(Array.isArray(data) ? data : []);
        setLocMode('geo');
        setSelectedCity('');
      }), []);

  // Reusar la ubicación de una visita anterior (la coordenada solo viaja en la
  // consulta, nunca se almacena en el servidor)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('glamor-loc');
      if (saved) {
        const { lat, lng } = JSON.parse(saved);
        if (Number.isFinite(lat) && Number.isFinite(lng)) applyGeo(lat, lng).catch(() => {});
      }
    } catch { /* ignore */ }
  }, [applyGeo]);

  const handleNearMe = () => {
    setLocError('');
    if (!('geolocation' in navigator)) {
      setLocError('Tu navegador no soporta geolocalización. Elige tu ciudad:');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try { localStorage.setItem('glamor-loc', JSON.stringify({ lat, lng })); } catch { /* ignore */ }
        applyGeo(lat, lng)
          .catch(() => setLocError('No pudimos cargar las tiendas cercanas. Intenta de nuevo.'))
          .finally(() => setLocating(false));
      },
      () => {
        setLocating(false);
        setLocError('No pudimos obtener tu ubicación. Elige tu ciudad:');
      },
      { timeout: 8000, maximumAge: 300000 },
    );
  };

  const handleCity = (c: string) => {
    setSelectedCity(c);
    setLocError('');
    if (!c) { clearLocation(); return; }
    storeApi.get(`/storefront/public?city=${encodeURIComponent(c)}`)
      .then((data: any[]) => {
        setShopsList(Array.isArray(data) ? data : []);
        setLocMode('city');
      })
      .catch(() => {});
  };

  const clearLocation = () => {
    setShopsList(shops);
    setLocMode('none');
    setSelectedCity('');
    setLocError('');
    try { localStorage.removeItem('glamor-loc'); } catch { /* ignore */ }
  };

  // Load storefront discounts per unique tenant in product list
  useEffect(() => {
    const tenantIds = Array.from(new Set(products.map((p: any) => p.tenantId).filter(Boolean))) as string[];
    if (!tenantIds.length) return;
    Promise.all(
      tenantIds.map(tid =>
        storeApi.get(`/storefront/public/discounts?tenantId=${tid}`).catch(() => []),
      ),
    ).then(results => {
      setStorefrontDiscounts((results as any[][]).flat());
    });
  }, [products]);

  const filteredProducts = activeCategory === 'Todos'
    ? products
    : products.filter(p => {
        const catName = (p.category?.name || p.categoryName || '').toLowerCase();
        const keywords = CAT_MATCH[activeCategory] || [activeCategory.toLowerCase()];
        return keywords.some(kw => catName.includes(kw));
      });

  return (
    <div>
      {/* Hero */}
      <section
        className="relative overflow-hidden py-16 md:py-24 px-4 text-white"
        style={bannerUrl
          ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: 'linear-gradient(135deg, #EF2D8F 0%, #8B5CF6 100%)' }
        }
      >
        {bannerUrl && (
          <div className="absolute inset-0 bg-gradient-to-r from-[#EF2D8F]/70 to-[#8B5CF6]/70" />
        )}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs md:text-sm font-medium mb-4 md:mb-6">
            <Sparkles className="w-4 h-4" /> Más de 500 salones de belleza
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4 md:mb-6">
            Tu belleza, a un click<br />de distancia.
          </h1>
          <p className="text-base md:text-xl text-white/80 mb-6 md:mb-10 max-w-2xl mx-auto">
            Encuentra los mejores productos, servicios y diseños de uñas de los salones de tu ciudad.
          </p>
          <Link href="/tienda/catalogo"
            className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-3.5 bg-white text-[#EF2D8F] rounded-full font-bold hover:bg-gray-50 transition text-sm md:text-base">
            Ver catálogo <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 space-y-16 py-12">
        {/* Popular Products */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">🔥 Productos populares</h2>
            <Link href="/tienda/catalogo" className="text-sm text-[#EF2D8F] font-semibold hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                  activeCategory === cat
                    ? 'bg-[#EF2D8F] text-white border-transparent'
                    : 'border-gray-200 text-gray-600 hover:border-[#EF2D8F] hover:text-[#EF2D8F]'
                }`}>
                {cat}
              </button>
            ))}
          </div>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><p>No hay productos en esta categoría</p></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredProducts.slice(0, 10).map(p => {
                const basePrice = Number(p.salePrice || p.price || 0);
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
                    imageUrl={p.images?.[0]?.url || p.imageUrl}
                    category={p.category?.name}
                    categoryId={p.categoryId}
                    shopName={p.brand?.name || ''}
                    isFeatured={p.isFeatured}
                    tenantId={p.tenantId} />
                );
              })}
            </div>
          )}
        </section>

        {/* Salones */}
        {shops.length > 0 && (
          <section id="salones" className="scroll-mt-24 bg-gradient-to-br from-pink-50 to-fuchsia-50 rounded-3xl p-5 md:p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">💅 Agenda tu cita</h2>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                Elige un salón y explora sus servicios, precios y disponibilidad.
              </p>
            </div>

            {/* Filtro por ubicación */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              <button onClick={handleNearMe} disabled={locating}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border-2 transition ${
                  locMode === 'geo'
                    ? 'bg-[#EF2D8F] text-white border-transparent'
                    : 'border-[#EF2D8F] text-[#EF2D8F] hover:bg-pink-50'
                } disabled:opacity-60`}>
                {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                Cerca de mí
              </button>
              {cities.length > 0 && (
                <select value={selectedCity} onChange={e => handleCity(e.target.value)}
                  className="px-3 py-2 rounded-full border-2 border-pink-200 bg-white text-sm text-gray-700 focus:outline-none focus:border-[#EF2D8F]">
                  <option value="">Todas las ciudades</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              {locMode !== 'none' && (
                <button onClick={clearLocation}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-white transition">
                  <X className="w-3.5 h-3.5" /> Quitar filtro
                </button>
              )}
            </div>
            {locError && (
              <p className="text-center text-xs text-amber-600 mb-4">{locError}</p>
            )}

            {/* Search — only show when many shops */}
            {shopsList.length > SHOPS_PAGE_SIZE && (
              <div className="relative max-w-sm mx-auto mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar salón..."
                  value={shopSearch}
                  onChange={e => setShopSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-pink-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/20"
                />
              </div>
            )}

            {(() => {
              const filtered = shopSearch.trim()
                ? shopsList.filter(s => s.displayName?.toLowerCase().includes(shopSearch.toLowerCase()))
                : shopsList;
              const visible = shopsExpanded || shopSearch.trim() ? filtered : filtered.slice(0, SHOPS_PAGE_SIZE);

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-10 text-gray-400 text-sm">
                    <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No encontramos salones {locMode === 'city' && selectedCity ? `en ${selectedCity}` : 'con ese criterio'}.
                    <button onClick={clearLocation} className="block mx-auto mt-2 text-[#EF2D8F] font-semibold hover:underline">
                      Ver todos los salones
                    </button>
                  </div>
                );
              }

              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visible.map(shop => (
                      <Link key={shop.id} href={`/tienda/${shop.slug}`}
                        className="bg-white rounded-2xl p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all border border-gray-100 group">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#EF2D8F] to-purple-500 flex items-center justify-center text-white text-2xl font-black flex-shrink-0 group-hover:scale-105 transition-transform">
                          {shop.displayName?.[0] || '✦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 truncate">{shop.displayName}</p>
                          {shop.tagline && <p className="text-xs text-gray-400 truncate mt-0.5">{shop.tagline}</p>}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {shop.distanceKm != null && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-xs rounded-full font-semibold">
                                <MapPin className="w-3 h-3" /> a {shop.distanceKm} km
                              </span>
                            )}
                            {shop.distanceKm == null && shop.nearestCity && locMode !== 'none' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-50 text-gray-500 text-xs rounded-full font-medium">
                                <MapPin className="w-3 h-3" /> {shop.nearestCity}
                              </span>
                            )}
                            {(Array.isArray(shop.tags) ? shop.tags : []).slice(0, 2).map((tag: string) => (
                              <span key={tag} className="px-1.5 py-0.5 bg-pink-50 text-[#EF2D8F] text-xs rounded-full font-medium">{tag}</span>
                            ))}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#EF2D8F] transition-colors flex-shrink-0" />
                      </Link>
                    ))}
                  </div>

                  {/* Show more / less */}
                  {!shopSearch.trim() && filtered.length > SHOPS_PAGE_SIZE && (
                    <div className="text-center mt-6">
                      <button
                        onClick={() => setShopsExpanded(v => !v)}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border-2 border-[#EF2D8F] text-[#EF2D8F] text-sm font-semibold hover:bg-[#EF2D8F] hover:text-white transition-all"
                      >
                        {shopsExpanded
                          ? <><X className="w-4 h-4" /> Mostrar menos</>
                          : <><ArrowRight className="w-4 h-4" /> Ver los {filtered.length - SHOPS_PAGE_SIZE} salones restantes</>
                        }
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </section>
        )}

        {/* Nail Designs */}
        {designs.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">💫 Diseños tendencia</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {designs.map(d => (
                <div key={d.id} onClick={() => setSelectedDesign(d)} className="cursor-pointer">
                  <NailDesignCard id={d.id} name={d.name} technique={d.technique}
                    price={d.suggestedPrice ? Number(d.suggestedPrice) : undefined}
                    imageUrl={d.imageUrl} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {selectedDesign && <NailDesignModal design={selectedDesign} onClose={() => setSelectedDesign(null)} />}

      <StoreChatbot
        tenantId={products[0]?.tenantId}
        storeName="Glamorapp"
      />
    </div>
  );
}
