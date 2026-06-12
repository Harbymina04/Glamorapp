'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag, MapPin } from 'lucide-react';
import { useStoreCart } from '@/stores/store-cart';
import { formatCOP } from '@/lib/store-utils';
import { productPath } from '@/lib/product-url';
import { StarRating } from './StarRating';

interface ProductCardProps {
  id: string;
  name: string;
  brand?: string;
  price: number;
  oldPrice?: number;
  rating?: number;
  reviewCount?: number;
  shopName?: string;
  imageUrl?: string;
  category?: string;
  categoryId?: string;
  tenantId?: string;
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  nails: 'from-rose-300 to-pink-400',
  hair: 'from-violet-300 to-purple-400',
  makeup: 'from-pink-300 to-fuchsia-400',
  skin: 'from-orange-200 to-amber-300',
  spa: 'from-teal-300 to-cyan-400',
  default: 'from-pink-200 to-purple-300',
};

export function ProductCard({
  id, name, brand, price, oldPrice, rating = 0, reviewCount = 0,
  shopName, imageUrl, category, categoryId, tenantId = '',
}: ProductCardProps) {
  const { addItem, toggleFavorite, isFavorite } = useStoreCart();
  const [toastMsg, setToastMsg] = useState('');

  const fav = isFavorite(id);
  const gradKey = (category || 'default').toLowerCase();
  const grad = CATEGORY_GRADIENTS[gradKey] || CATEGORY_GRADIENTS.default;
  const discount = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;

  const handleAdd = () => {
    addItem({
      productId: id, name, price,
      originalPrice: oldPrice ?? undefined,
      discountPercent: discount > 0 ? discount : undefined,
      shopName: shopName || '', tenantId, imageUrl, categoryId,
    });
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wasFav = isFavorite(id);
    toggleFavorite(id);
    setToastMsg(wasFav ? 'Eliminado de favoritos' : 'Agregado a favoritos');
    setTimeout(() => setToastMsg(''), 2000);
  };

  return (
    <div className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
      {/* Image */}
      <Link href={productPath({ id, name })} className="block relative aspect-square overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center`}>
            <ShoppingBag className="w-12 h-12 text-white/70" />
          </div>
        )}
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            -{discount}%
          </span>
        )}
        <div className="absolute top-2 right-2">
          <button
            onClick={handleFavorite}
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow hover:bg-white transition z-10"
          >
            <Heart className={`w-4 h-4 ${fav ? 'fill-[#EF2D8F] text-[#EF2D8F]' : 'text-gray-400'}`} />
          </button>
          {toastMsg && (
            <div className="absolute right-0 top-9 z-20 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap shadow-lg">
              {toastMsg}
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-3 space-y-2">
        {rating > 0 && <StarRating rating={rating} count={reviewCount} size="sm" />}
        <Link href={productPath({ id, name })} className="block">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight hover:text-[#EF2D8F] transition-colors">{name}</h3>
        </Link>
        {shopName && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400 truncate">{shopName}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-base font-bold text-gray-900">{formatCOP(price)}</span>
            {oldPrice && (
              <span className="ml-1.5 text-xs text-gray-400 line-through">{formatCOP(oldPrice)}</span>
            )}
          </div>
        </div>
        <button
          onClick={handleAdd}
          className="w-full py-2 bg-[#EF2D8F] text-white rounded-lg text-xs font-semibold hover:bg-[#d4267e] transition"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
