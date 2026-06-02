'use client';

import Link from 'next/link';
import { Star, CheckCircle } from 'lucide-react';

interface ShopCardProps {
  id: string;
  name: string;
  slug?: string;
  type?: string;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  gradient?: string;
}

const GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-violet-500 to-purple-500',
  'from-fuchsia-500 to-pink-500',
  'from-indigo-500 to-violet-500',
  'from-rose-400 to-fuchsia-500',
];

export function ShopCard({ id, name, slug, type, rating = 0, reviewCount = 0, tags = [], gradient }: ShopCardProps) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const grad = gradient || GRADIENTS[name.charCodeAt(0) % GRADIENTS.length];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 min-w-[260px]">
      {/* Banner */}
      <div className={`h-32 bg-gradient-to-br ${grad} relative flex items-end p-4`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center">
            <span className="text-white text-xl font-bold">{initials}</span>
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">{name}</p>
            <span className="inline-flex items-center gap-1 text-white/80 text-xs">
              <CheckCircle className="w-3 h-3" /> Verificado
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {rating > 0 && (
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-semibold text-gray-900">{rating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({reviewCount} reseñas)</span>
          </div>
        )}
        {type && <p className="text-xs text-gray-500">{type}</p>}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((t) => (
              <span key={t} className="px-2 py-0.5 bg-pink-50 text-[#EF2D8F] text-xs rounded-full border border-pink-200">
                {t}
              </span>
            ))}
          </div>
        )}
        <Link
          href={slug ? `/tienda/${slug}` : `/tienda/salon/${id}`}
          className="block w-full text-center py-2 border border-[#EF2D8F] text-[#EF2D8F] rounded-lg text-sm font-semibold hover:bg-[#EF2D8F] hover:text-white transition"
        >
          Ver salón →
        </Link>
      </div>
    </div>
  );
}
