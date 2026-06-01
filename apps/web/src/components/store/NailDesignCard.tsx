'use client';

import { Heart, MapPin } from 'lucide-react';
import { useStoreCart } from '@/stores/store-cart';
import { formatCOP } from '@/lib/store-utils';

interface NailDesignCardProps {
  id: string;
  name: string;
  technique?: string;
  price?: number;
  shopName?: string;
  likes?: number;
  gradient?: string;
  imageUrl?: string;
}

const GRADIENTS = [
  'from-rose-300 via-pink-400 to-fuchsia-500',
  'from-violet-400 via-purple-400 to-pink-400',
  'from-fuchsia-400 via-pink-400 to-rose-400',
  'from-indigo-300 via-violet-400 to-purple-500',
];

export function NailDesignCard({ id, name, technique, price, shopName, likes = 0, gradient, imageUrl }: NailDesignCardProps) {
  const { toggleFavorite, isFavorite } = useStoreCart();
  const fav = isFavorite(id);
  const grad = gradient || GRADIENTS[name.charCodeAt(0) % GRADIENTS.length];

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-200" style={{ aspectRatio: '3/4' }}>
      {/* Image / gradient bg */}
      <div className={`absolute inset-0 bg-gradient-to-b ${grad}`}>
        {imageUrl && (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        )}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      {/* Heart */}
      <button
        onClick={() => toggleFavorite(id)}
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition"
      >
        <Heart className={`w-4 h-4 ${fav ? 'fill-[#EF2D8F] text-[#EF2D8F]' : 'text-white'}`} />
      </button>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1">
        <p className="text-white text-sm font-bold leading-tight line-clamp-1">{name}</p>
        {technique && (
          <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full">{technique}</span>
        )}
        <div className="flex items-center justify-between">
          {price && <span className="text-white font-semibold text-sm">{formatCOP(price)}</span>}
          {shopName && (
            <span className="flex items-center gap-1 text-white/70 text-xs">
              <MapPin className="w-3 h-3" />{shopName}
            </span>
          )}
        </div>
        {likes > 0 && (
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3 fill-pink-400 text-pink-400" />
            <span className="text-white/70 text-xs">{likes}</span>
          </div>
        )}
      </div>
    </div>
  );
}
