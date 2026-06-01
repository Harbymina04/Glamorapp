'use client';

import { Clock, Star, Store, Calendar } from 'lucide-react';
import { formatCOP, categoryColors } from '@/lib/store-utils';

interface ServiceCardProps {
  id: string;
  name: string;
  category?: string;
  price: number;
  durationMinutes?: number;
  rating?: number;
  reviewCount?: number;
  shopsCount?: number;
  allowsBooking?: boolean;
}

export function ServiceCard({
  id, name, category, price, durationMinutes, rating = 0,
  reviewCount = 0, shopsCount = 1, allowsBooking = false,
}: ServiceCardProps) {
  const catKey = (category || 'default').toLowerCase();
  const colors = categoryColors[catKey] || categoryColors.default;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
      {/* Icon area */}
      <div
        className="w-20 h-20 rounded-xl flex-shrink-0 flex items-center justify-center"
        style={{ backgroundColor: colors.bg }}
      >
        <Calendar className="w-8 h-8" style={{ color: colors.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {category && (
          <span
            className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: colors.bg, color: colors.color }}
          >
            {category}
          </span>
        )}
        <h3 className="text-sm font-semibold text-gray-900 truncate">{name}</h3>
        {rating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-gray-500">{rating.toFixed(1)} ({reviewCount})</span>
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {durationMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {durationMinutes} min
            </span>
          )}
          <span className="font-semibold text-gray-900">Desde {formatCOP(price)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Store className="w-3 h-3" /> {shopsCount} salón{shopsCount !== 1 ? 'es' : ''}
          </span>
          {allowsBooking && (
            <button className="px-3 py-1 bg-[#EF2D8F] text-white rounded-lg text-xs font-medium hover:bg-[#d4267e] transition">
              Agendar →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
