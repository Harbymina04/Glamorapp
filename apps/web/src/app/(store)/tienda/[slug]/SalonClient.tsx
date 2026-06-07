'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MapPin, Star, Phone, Instagram, Facebook,
  Globe, CheckCircle2, Package, Scissors, Palette,
  MessageCircle, X, Heart, Clock,
} from 'lucide-react';
import { ProductCard } from '@/components/store/ProductCard';
import { ServiceCard } from '@/components/store/ServiceCard';
import { NailDesignCard } from '@/components/store/NailDesignCard';
import { StarRating } from '@/components/store/StarRating';
import { ReviewCard } from '@/components/store/ReviewCard';
import { formatCOP } from '@/lib/store-utils';
import { useStoreCart } from '@/stores/store-cart';
import { StoreChatbot } from '@/components/store/StoreChatbot';

type Tab = 'productos' | 'servicios' | 'diseños' | 'reseñas' | 'ubicaciones';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'productos',   label: 'Productos',   icon: <Package className="w-4 h-4" /> },
  { key: 'servicios',   label: 'Servicios',   icon: <Scissors className="w-4 h-4" /> },
  { key: 'diseños',     label: 'Diseños',     icon: <Palette className="w-4 h-4" /> },
  { key: 'reseñas',     label: 'Reseñas',     icon: <Star className="w-4 h-4" /> },
  { key: 'ubicaciones', label: 'Ubicaciones', icon: <MapPin className="w-4 h-4" /> },
];

function LocationCard({ store }: { store: any }) {
  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-[#111827]">{store.name}</p>
          {store.address && <p className="text-sm text-[#6B7280] mt-0.5">{store.address}</p>}
          {store.neighborhood && <p className="text-xs text-[#9CA3AF]">{store.neighborhood}</p>}
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${store.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {store.isActive ? 'Abierta' : 'Cerrada'}
        </span>
      </div>
      <div className="flex gap-3 flex-wrap text-xs text-[#6B7280]">
        {store.acceptsPickup && (
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Recogida en tienda</span>
        )}
        {store.acceptsOnlineAppointments && (
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Citas online</span>
        )}
      </div>
      {store.phone && (
        <a href={`tel:${store.phone}`} className="flex items-center gap-2 text-sm text-[#EF2D8F] hover:underline">
          <Phone className="w-3.5 h-3.5" /> {store.phone}
        </a>
      )}
      {store.latitude && store.longitude && (
        <a href={`https://maps.google.com/?q=${store.latitude},${store.longitude}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-[#EF2D8F] hover:underline">
          <MapPin className="w-3.5 h-3.5" /> Ver en Google Maps
        </a>
      )}
    </div>
  );
}

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
  const images: string[] = design.images?.length
    ? design.images.map((img: any) => img.url || img)
    : design.imageUrl ? [design.imageUrl] : [];
  const [activeImg, setActiveImg] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className={`relative bg-gradient-to-b ${grad} flex-shrink-0`} style={{ height: '320px' }}>
          {images.length > 0
            ? <img src={images[activeImg]} alt={design.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full" />
          }
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
        {images.length > 1 && (
          <div className="flex gap-2 px-4 py-3 bg-gray-50 border-b overflow-x-auto scrollbar-hide flex-shrink-0">
            {images.map((url, i) => (
              <button key={i} onClick={() => setActiveImg(i)}
                className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition ${i === activeImg ? 'border-[#EF2D8F]' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                <img src={url} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
        <div className="p-5 space-y-4 overflow-y-auto">
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
                <p className="text-lg font-bold text-gray-700 flex items-center gap-1 justify-end">
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
                  <div key={c} className="w-7 h-7 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-200" style={{ backgroundColor: c }} title={c} />
                ))}
              </div>
            </div>
          )}
          <button onClick={onClose} className="block w-full py-3 bg-[#EF2D8F] text-white rounded-xl font-bold text-center hover:bg-[#d4267e] transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyTab({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-center py-16 text-[#9CA3AF]">
      <div className="w-14 h-14 rounded-full bg-[#F3F4F6] flex items-center justify-center mx-auto mb-3">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

interface Props {
  storefront: any;
  products: any[];
  services: any[];
  designs: any[];
  reviews: any[];
  locations: any[];
}

export function SalonClient({ storefront, products, services, designs, reviews, locations }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('productos');
  const [selectedDesign, setSelectedDesign] = useState<any>(null);

  const tags: string[] = Array.isArray(storefront.tags) ? storefront.tags : [];
  const gradient = 'linear-gradient(135deg, #EF2D8F 0%, #8B5CF6 100%)';

  return (
    <div className="bg-white min-h-screen">
      {/* Banner */}
      <div className="relative h-52 md:h-80 overflow-hidden" style={{ background: gradient }}>
        {storefront.bannerUrl && (
          <img src={storefront.bannerUrl} alt={storefront.displayName} className="w-full h-full object-cover absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 h-full flex items-end pb-5 px-4 md:px-8 max-w-5xl mx-auto">
          <div className="flex items-end gap-3 md:gap-4">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-2xl border-2 border-white/50 shadow-lg shrink-0 overflow-hidden">
              {storefront.logoUrl
                ? <img src={storefront.logoUrl} alt={storefront.displayName} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-2xl md:text-3xl font-black">{storefront.displayName?.[0] || '✦'}</div>
              }
            </div>
            <div className="pb-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-3xl font-black text-white leading-tight">{storefront.displayName}</h1>
                <span className="flex items-center gap-1 bg-white/20 backdrop-blur px-2 py-0.5 rounded-full text-xs text-white font-medium whitespace-nowrap">
                  <CheckCircle2 className="w-3 h-3" /> Verificado
                </span>
              </div>
              {storefront.tagline && <p className="text-white/80 text-xs md:text-sm mt-1 line-clamp-1">{storefront.tagline}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-2 md:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4 flex-wrap min-w-0">
            {storefront.averageRating > 0 && (
              <StarRating rating={Number(storefront.averageRating)} count={storefront.totalReviews} size="sm" />
            )}
            {storefront.businessType && <span className="hidden sm:block text-sm text-[#6B7280]">{storefront.businessType}</span>}
            {tags.length > 0 && (
              <div className="hidden sm:flex gap-1 flex-wrap">
                {tags.slice(0, 3).map((tag: string) => (
                  <span key={tag} className="px-2 py-0.5 bg-[#FFF1F8] text-[#EF2D8F] text-xs rounded-full font-medium">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {storefront.whatsapp && (
              <a href={`https://wa.me/${storefront.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-full hover:bg-[#FFF1F8] text-[#9CA3AF] hover:text-[#EF2D8F] transition-colors">
                <MessageCircle className="w-4 h-4" />
              </a>
            )}
            {storefront.instagram && (
              <a href={`https://instagram.com/${storefront.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-full hover:bg-[#FFF1F8] text-[#9CA3AF] hover:text-[#EF2D8F] transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {storefront.website && (
              <a href={storefront.website} target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-full hover:bg-[#FFF1F8] text-[#9CA3AF] hover:text-[#EF2D8F] transition-colors">
                <Globe className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="flex gap-0 overflow-x-auto scrollbar-none">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#EF2D8F] text-[#EF2D8F]'
                    : 'border-transparent text-[#6B7280] hover:text-[#111827]'
                }`}>
                {tab.icon}
                <span className="ml-1">{tab.label}</span>
                {tab.key === 'productos'   && products.length > 0  && <span className="hidden sm:inline text-xs text-[#9CA3AF] ml-0.5">({products.length})</span>}
                {tab.key === 'servicios'   && services.length > 0  && <span className="hidden sm:inline text-xs text-[#9CA3AF] ml-0.5">({services.length})</span>}
                {tab.key === 'diseños'     && designs.length  > 0  && <span className="hidden sm:inline text-xs text-[#9CA3AF] ml-0.5">({designs.length})</span>}
                {tab.key === 'reseñas'     && reviews.length  > 0  && <span className="hidden sm:inline text-xs text-[#9CA3AF] ml-0.5">({reviews.length})</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-5xl mx-auto px-3 md:px-8 py-5 md:py-8">
        {activeTab === 'productos' && (
          products.length === 0
            ? <EmptyTab icon={<Package className="w-8 h-8" />} text="Este salón aún no tiene productos publicados" />
            : <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {products.map(p => (
                  <ProductCard key={p.id} id={p.id} name={p.name}
                    price={Number(p.salePrice || p.price || 0)}
                    imageUrl={p.images?.[0]?.url || p.imageUrl}
                    category={p.category?.name} shopName={p.brand?.name || ''}
                    tenantId={p.tenantId} />
                ))}
              </div>
        )}
        {activeTab === 'servicios' && (
          services.length === 0
            ? <EmptyTab icon={<Scissors className="w-8 h-8" />} text="Este salón aún no tiene servicios publicados" />
            : <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {services.map(s => (
                  <ServiceCard key={s.id} id={s.id} name={s.name}
                    category={s.category} price={Number(s.price || 0)}
                    durationMinutes={s.durationMinutes}
                    allowsBooking={s.allowsOnlineBooking}
                    storeId={s.storeId} tenantId={s.tenantId} />
                ))}
              </div>
        )}
        {activeTab === 'diseños' && (
          designs.length === 0
            ? <EmptyTab icon={<Palette className="w-8 h-8" />} text="Este salón aún no tiene diseños publicados" />
            : <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 md:gap-4 space-y-3 md:space-y-4">
                {designs.map(d => (
                  <div key={d.id} className="break-inside-avoid">
                    <NailDesignCard id={d.id} name={d.name} technique={d.technique}
                      price={d.suggestedPrice ? Number(d.suggestedPrice) : undefined}
                      imageUrl={d.imageUrl} onClick={() => setSelectedDesign(d)} />
                  </div>
                ))}
              </div>
        )}
        {activeTab === 'reseñas' && (
          reviews.length === 0
            ? <EmptyTab icon={<Star className="w-8 h-8" />} text="Aún no hay reseñas para este salón" />
            : <div className="space-y-4">
                {storefront.averageRating > 0 && (
                  <div className="bg-[#FFF1F8] rounded-2xl p-4 md:p-6 flex items-center gap-4 md:gap-6 mb-4">
                    <div className="text-center shrink-0">
                      <p className="text-4xl md:text-5xl font-black text-[#EF2D8F]">{Number(storefront.averageRating).toFixed(1)}</p>
                      <StarRating rating={Number(storefront.averageRating)} size="sm" />
                      <p className="text-xs text-[#6B7280] mt-1">{storefront.totalReviews} reseñas</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
                </div>
              </div>
        )}
        {activeTab === 'ubicaciones' && (
          locations.length === 0
            ? <EmptyTab icon={<MapPin className="w-8 h-8" />} text="No hay sucursales configuradas" />
            : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {locations.map(l => <LocationCard key={l.id} store={l} />)}
              </div>
        )}
      </div>

      {/* Description */}
      {storefront.description && (
        <div className="bg-[#FAFAFA] border-t mt-4">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
            <h2 className="text-lg font-bold text-[#111827] mb-3">Sobre {storefront.displayName}</h2>
            <p className="text-[#374151] leading-relaxed">{storefront.description}</p>
          </div>
        </div>
      )}

      {selectedDesign && (
        <NailDesignModal design={selectedDesign} onClose={() => setSelectedDesign(null)} />
      )}

      {/* Chatbot con contexto del salón */}
      <StoreChatbot
        tenantId={storefront.tenantId}
        storeName={storefront.displayName}
      />
    </div>
  );
}
