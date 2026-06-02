'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, X, Heart, MapPin, Clock, Store as StoreIcon, CheckCircle2 } from 'lucide-react';
import { ProductCard } from '@/components/store/ProductCard';
import { ShopCard } from '@/components/store/ShopCard';
import { NailDesignCard } from '@/components/store/NailDesignCard';
import { storeApi, formatCOP, categoryColors } from '@/lib/store-utils';
import { useStoreCart } from '@/stores/store-cart';
import { useAuthStore } from '@/stores/auth-store';
import { getToken } from '@/lib/auth';

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
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookError, setBookError] = useState('');

  const { user, isAuthenticated } = useAuthStore();
  const isCustomer = isAuthenticated && user?.role === 'customer';

  const catKey = (service.category || 'default').toLowerCase();
  const colors = categoryColors[catKey] || categoryColors.default;

  const handleBook = async () => {
    if (!date || !time) { setBookError('Selecciona fecha y hora'); return; }
    setBookError('');
    setBooking(true);
    try {
      const token = getToken();
      const endTime = calcEndTime(time, service.durationMinutes || 60);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/appointments/public/book`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            storeId: service.storeId,
            serviceId: service.id,
            date,
            startTime: time,
            endTime,
            price: Number(service.price),
            notes: notes || null,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al agendar');
      }
      setBooked(true);
    } catch (e: any) {
      setBookError(e.message || 'Error al agendar la cita');
    } finally {
      setBooking(false);
    }
  };

  const handleClose = () => {
    setShowBooking(false);
    setBooked(false);
    setBookError('');
    setDate('');
    setTime('');
    setNotes('');
  };

  // Minimum date = tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

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

      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>

            {/* ── Confirmación ── */}
            {booked ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">¡Cita agendada!</h3>
                <p className="text-sm text-gray-500 mb-1">{service.name}</p>
                <p className="text-sm font-semibold text-gray-700">{formatDate(date)} a las {time}</p>
                <button onClick={handleClose} className="mt-5 w-full py-2.5 bg-[#EF2D8F] text-white rounded-xl text-sm font-bold hover:bg-[#d4267e] transition">
                  Cerrar
                </button>
              </div>
            ) : isCustomer ? (
              /* ── Formulario de agendamiento ── */
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Agendar cita</h3>
                <p className="text-[#EF2D8F] font-semibold mb-4">{service.name}</p>

                <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1.5 text-sm">
                  {service.durationMinutes && (
                    <div className="flex justify-between"><span className="text-gray-500">Duración</span><span className="font-medium">{service.durationMinutes} min</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-gray-500">Precio</span><span className="font-bold">{formatCOP(Number(service.price))}</span></div>
                </div>

                {bookError && (
                  <p className="mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">{bookError}</p>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                    <input
                      type="date"
                      value={date}
                      min={minDateStr}
                      onChange={e => setDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hora</label>
                    <input
                      type="time"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Notas <span className="text-gray-400">(opcional)</span></label>
                    <input
                      type="text"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Ej: color preferido, alergia..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F]"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-5">
                  <button onClick={handleClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                    Cancelar
                  </button>
                  <button
                    onClick={handleBook}
                    disabled={booking}
                    className="flex-1 py-2.5 bg-[#EF2D8F] text-white rounded-xl text-sm font-bold hover:bg-[#d4267e] transition disabled:opacity-60"
                  >
                    {booking ? 'Agendando...' : 'Confirmar'}
                  </button>
                </div>
              </>
            ) : (
              /* ── Pedir login ── */
              <>
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
                  <button onClick={handleClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                    Cancelar
                  </button>
                  <Link
                    href={`/tienda/auth/login${service.tenantId ? `?tenantId=${service.tenantId}` : ''}`}
                    className="flex-1 py-2.5 bg-[#EF2D8F] text-white rounded-xl text-sm font-bold text-center hover:bg-[#d4267e] transition"
                  >
                    Ingresar
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function calcEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + durationMinutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── Main Page ────────────────────────────────────────────────────

export default function StorePage() {
  const [shops, setShops] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [selectedDesign, setSelectedDesign] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      storeApi.get('/storefront/public').catch(() => []),
      storeApi.get('/storefront/public/products?limit=20').catch(() => []),
      storeApi.get('/storefront/public/designs?limit=8').catch(() => []),
    ]).then(([sh, pr, ds]) => {
      setShops(Array.isArray(sh) ? sh : []);
      setProducts(Array.isArray(pr) ? pr : []);
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
          <div className="flex justify-center">
            <Link href="/tienda/catalogo"
              className="px-8 py-3.5 bg-white text-[#EF2D8F] rounded-full font-bold hover:bg-gray-50 transition flex items-center gap-2 justify-center">
              Ver catálogo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
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

        {/* Salones — CTA para explorar servicios por tienda */}
        {shops.length > 0 && (
          <section className="bg-gradient-to-br from-pink-50 to-fuchsia-50 rounded-3xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">💅 Agenda tu cita</h2>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                Elige un salón y explora sus servicios, precios y disponibilidad.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shops.map(shop => (
                <Link
                  key={shop.id}
                  href={`/tienda/${shop.slug}`}
                  className="bg-white rounded-2xl p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all border border-gray-100 group"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#EF2D8F] to-purple-500 flex items-center justify-center text-white text-2xl font-black flex-shrink-0 group-hover:scale-105 transition-transform">
                    {shop.displayName?.[0] || '✦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{shop.displayName}</p>
                    {shop.tagline && <p className="text-xs text-gray-400 truncate mt-0.5">{shop.tagline}</p>}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(Array.isArray(shop.tags) ? shop.tags : []).slice(0, 2).map((tag: string) => (
                        <span key={tag} className="px-1.5 py-0.5 bg-pink-50 text-[#EF2D8F] text-xs rounded-full font-medium">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#EF2D8F] transition-colors flex-shrink-0" />
                </Link>
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

      </div>

      {/* Nail Design Detail Modal */}
      {selectedDesign && (
        <NailDesignModal design={selectedDesign} onClose={() => setSelectedDesign(null)} />
      )}
    </div>
  );
}
