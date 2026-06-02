'use client';

import { Star, MessageCircle } from 'lucide-react';

interface ReviewCardProps {
  review: {
    reviewerName?: string;
    createdAt?: string;
    rating?: number;
    comment?: string;
    reply?: string;
  };
}

export function ReviewCard({ review }: ReviewCardProps) {
  const initials = review.reviewerName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';
  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#EF2D8F]/10 flex items-center justify-center text-[#EF2D8F] font-bold text-sm shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-sm text-[#111827]">{review.reviewerName}</p>
            {review.createdAt && (
              <p className="text-xs text-[#9CA3AF]">
                {new Date(review.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`w-3.5 h-3.5 ${i < (review.rating ?? 0) ? 'fill-[#FBBF24] text-[#FBBF24]' : 'text-[#E5E7EB]'}`} />
          ))}
        </div>
      </div>
      {review.comment && <p className="text-sm text-[#374151] leading-relaxed">{review.comment}</p>}
      {review.reply && (
        <div className="bg-[#FFF1F8] border border-[#FCE7F3] rounded-lg p-3">
          <p className="text-xs font-semibold text-[#EF2D8F] mb-1 flex items-center gap-1">
            <MessageCircle className="w-3 h-3" /> Respuesta del salón
          </p>
          <p className="text-sm text-[#374151]">{review.reply}</p>
        </div>
      )}
    </div>
  );
}
