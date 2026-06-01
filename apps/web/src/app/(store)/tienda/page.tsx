'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, X, Heart, MapPin, Clock, Store as StoreIcon } from 'lucide-react';
import { ProductCard } from '@/components/store/ProductCard';
import { ShopCard } from '@/components/store/ShopCard';
import { NailDesignCard } from '@/components/store/NailDesignCard';
import { storeApi, formatCOP, categoryColors } from '@/lib/store-utils';
import { useStoreCart } from '@/stores/store-cart';

const CATEGORIES = ['Todos', 'Uñas', 'Cabello', 'Maquillaje', 'Piel', 'Spa'];

// Category name mapping (Spanish display → filter match)
const CAT_MATCH: Record<string, string[]> = {
  'Uñas':      ['uña', 'nail', 'esmalt', 'acrílico', 'gel'],
  'Cabello':   ['cabello', 'hair', 'cabel', 'shampoo', 'acondicionador', 'tinte', 'coloración'],
  'Maquillaje':['maquillaje', 'makeup', 'labial', 'base', 'sombra', 'rubor'],
  'Piel':      ['piel', 'skin', 'crema', 'sérum', 'facial', 'hidratante'],
  'Spa':       ['spa', 'masaje', 'relaj', 'aromaterapia'],
};

// ─── Nail Design Detail Modal ─────────────────────────────────────

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
        {/* Image */}
        <div className={`relative h-72 bg-gradient-to-b ${grad}`}>
          {design.imageUrl && (
            <img src={design.imageUrl} alt={design.name} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={() => toggleFavorite(design.id)}
            className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition"
          >
            <Heart className={`w-4 h-4 ${fav ? 'fill-[#EF2D8F] text-[#EF2D8F]' : 'text-white'}`} />
          </button>
          <div className="absolute bottom-4 left-4">
            <h2 className="text-2xl font-black text-white">{design.name}</h2>
            {design.technique && (
              <span className="mt-1 inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full">
                {design.technique}
              </span>
            )}
          </div>
        </div>

        {/* Info */}
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
                <p className="text-lg font-bold text-gray-700 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {design.estimatedDurationMinutes} min
                </p>
              </div>
            )}
          </div>

          {design.colors?.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Colores</p>
              <div className="flex gap-2 flex-wrap">
                {design.colors.map((c: string) => (
                  <div key={c} className="w-7 h-7 rounded-full border-2 border-white shadow" style={{ backgroundColor: c }} title={c} />
                ))}
              </div>
            </div>
          )}

          <Link
            href="/tienda/catalogo"
            className="block w-full py-3 bg-[#EF2D8F] text-white rounded-xl font-bold text-center hover:bg-[#d4267e] transition"
          >
            Ver más diseños →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Service Card with booking modal ─────────────────────────────

function ServiceCardInline({ service }: { service: any }) {
  const [showBooking, setShowBooking] = useState(false);
  const catKey = (service.category || 'default').toLowerCase();
  const colors = categoryColors[catKey] || categoryColors.default;

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
        <div className="w-20 h-20 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
          <Clock className="w-8 h-8" style={{ color: colors.color }} />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          {service.category && (
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: colors.bg, color: colors.color }}>
              {service.category}
            </span>
          )}
          <h3 className="text-sm font-semibold text-gray-900 truncate">{service.name}</h3>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {service.durationMinutes && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {service.durationMinutes} min</span>
            )}
            <span className="font-semibold text-gray-900">Desde {formatCOP(Number(service.price))}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <StoreIcon className="w-3 h-3" /> 1 salón
            </span>
            <button
              onClick={() => setShowBooking(true)}
              className="px-3 py-1 bg-[#EF2D8F] text-white rounded-lg text-xs font-medium hover:bg-[#d4267e] transition"
            >
              Agendar →
            </button>
          </div>
        </div>
      </div>

      {/* Simple booking modal */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowBooking(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <button onClick={() => setShowBooking(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Agendar cita</h3>
            <p className="text-[#EF2D8F] font-semibold mb-4">{service.name}</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
              {service.durationMinutes && (
                <div className="flex justify-between"><span className="text-gray-500">Duración</span><span className="font-medium">{service.durationMinutes} min</span></div>
              )}
              <div className="flex justify-between"><span className="text-gray-500">Desde</span><span className="font-bold text-gray-900">{formatCOP(Number(service.price))}</span></div>
            </div>
            <p className="text-sm text-gray-500 mb-4 text-center">Para agendar necesitas ingresar a tu cuenta</p>
            <div className="flex gap-3">
              <button onClick={() => setShowBooking(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Cancelar
              </button>
              <Link href="/auth/login" className="flex-1 py-2.5 bg-[#EF2D8F] text-white rounded-xl text-sm font-bold text-center hover:bg-[#d4267e] transition">
                Ingresar
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function StorePage() {
  const [shops, setShops] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [selectedDesign, setSelectedDesign] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      storeApi.get('/storefront/public').catch(() => []),
      storeApi.get('/storefront/public/products?limit=20').catch(() => []),
      storeApi.get('/storefront/public/services?limit=9').catch(() => []),
      storeApi.get('/storefront/public/designs?limit=8').catch(() => []),
    ]).then(([sh, pr, sv, ds]) => {
      setShops(Array.isArray(sh) ? sh : []);
      setProducts(Array.isArray(pr) ? pr : []);
      setServices(Array.isArray(sv) ? sv : []);
      setDesigns(Array.isArray(ds) ? ds : []);
    }).finally(() => setLoading(false));
  }, []);

  // Filter products by category — match against category name in Spanish
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
      <section className="relative overflow-hidden py-24 px-4 text-white"
        style={{ background: 'linear-gradient(135deg, #EF2D8F 0%, #8B5CF6 100%)' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" /> Más de 500 salones de belleza
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
            Tu belleza, a un click<br />de distancia.
          </h1>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Encuentra los mejores productos, servicios y diseños de uñas de los salones de tu ciudad.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/tienda/catalogo"
              className="px-8 py-3.5 bg-white text-[#EF2D8F] rounded-full font-bold hover:bg-gray-50 transition flex items-center gap-2 justify-center">
              Ver catálogo <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/register"
              className="px-8 py-3.5 bg-white/20 backdrop-blur-sm text-white rounded-full font-semibold hover:bg-white/30 transition">
              Registra tu salón
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 space-y-16 py-12">
        {/* Featured Shops */}
        {shops.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">⭐ Salones destacados</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {shops.map(shop => (
                <ShopCard key={shop.id} id={shop.id} name={shop.displayName}
                  slug={shop.slug} type={shop.businessType}
                  rating={Number(shop.averageRating)} reviewCount={shop.totalReviews}
                  tags={Array.isArray(shop.tags) ? shop.tags : []} />
              ))}
            </div>
          </section>
        )}

        {/* Popular Products */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">🔥 Productos populares</h2>
            <Link href="/tienda/catalogo" className="text-sm text-[#EF2D8F] font-semibold hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Category filter */}
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

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No hay productos en esta categoría</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredProducts.slice(0, 10).map(p => (
                <ProductCard key={p.id}
                  id={p.id}
                  name={p.name}
                  price={Number(p.salePrice || p.price || 0)}
                  imageUrl={p.images?.[0]?.url || p.imageUrl}
                  category={p.category?.name}
                  shopName={p.brand?.name || ''}
                  tenantId={p.tenantId}
                />
              ))}
            </div>
          )}
        </section>

        {/* Services */}
        {services.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">💅 Servicios más buscados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map(s => (
                <ServiceCardInline key={s.id} service={s} />
              ))}
            </div>
          </section>
        )}

        {/* Nail Designs */}
        {designs.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">💫 Diseños tendencia</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {designs.map(d => (
                <div key={d.id} onClick={() => setSelectedDesign(d)} className="cursor-pointer">
                  <NailDesignCard
                    id={d.id} name={d.name} technique={d.technique}
                    price={d.suggestedPrice ? Number(d.suggestedPrice) : undefined}
                    imageUrl={d.imageUrl}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA Banner */}
        <section className="rounded-2xl bg-[#1E1238] text-white p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">¿Tienes un salón?</h2>
          <p className="text-gray-300 text-lg mb-8">Registra tu negocio gratis y llega a miles de nuevos clientes.</p>
          <Link href="/auth/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#EF2D8F] text-white rounded-full font-bold hover:bg-[#d4267e] transition">
            Registra tu negocio gratis <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>

      {/* Nail Design Detail Modal */}
      {selectedDesign && (
        <NailDesignModal design={selectedDesign} onClose={() => setSelectedDesign(null)} />
      )}
    </div>
  );
}
