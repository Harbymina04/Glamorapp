'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { Star, MessageSquare, CheckCircle, Loader2, Send } from 'lucide-react';

type Filter = 'all' | 'pending' | 'responded';

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`${sz} ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
      ))}
    </div>
  );
}

function RatingBar({ rating, count, total }: { rating: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600 w-4 text-right">{rating}</span>
      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-6">{count}</span>
    </div>
  );
}

function ReviewCard({ review, onReply }: { review: any; onReply: (id: string, reply: string) => Promise<void> }) {
  const [replyMode, setReplyMode] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const initials = review.reviewerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleSend = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await onReply(review.id, replyText.trim());
      setReplyMode(false);
      setReplyText('');
    } finally { setSending(false); }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">{review.reviewerName}</p>
              {review.isVerified && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
                  <CheckCircle className="w-3 h-3" /> Compra verificada
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {new Date(review.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <StarDisplay rating={review.rating} size="sm" />
      </div>

      {review.comment && (
        <p className="text-sm text-gray-700">{review.comment}</p>
      )}

      {review.reply ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-600 mb-1">Glamour Studio respondió:</p>
          <p className="text-sm text-gray-700">{review.reply}</p>
        </div>
      ) : (
        <>
          {replyMode ? (
            <div className="space-y-2">
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                rows={3} placeholder="Escribe tu respuesta..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 resize-none" />
              <div className="flex gap-2">
                <button onClick={handleSend} disabled={sending || !replyText.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#EF2D8F] text-white rounded-lg text-sm font-medium hover:bg-[#d4267e] transition disabled:opacity-60">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Publicar respuesta
                </button>
                <button onClick={() => setReplyMode(false)}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setReplyMode(true)}
              className="flex items-center gap-1.5 text-sm text-[#EF2D8F] font-medium hover:text-[#d4267e] transition">
              <MessageSquare className="w-4 h-4" /> Responder
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  const { token } = useAuthStore();
  const [data, setData] = useState<any>({ data: [], total: 0, avgRating: 0, totalReviews: 0, byRating: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filter === 'pending') q.set('responded', 'false');
      if (filter === 'responded') q.set('responded', 'true');
      const res = await api.get(`/storefront/reviews?${q}`, { token: token! });
      setData(res);
    } catch { } finally { setLoading(false); }
  }, [token, filter]);

  useEffect(() => { load(); }, [load]);

  const handleReply = async (id: string, reply: string) => {
    await api.post(`/storefront/reviews/${id}/reply`, { reply }, { token: token! });
    setData((d: any) => ({
      ...d,
      data: d.data.map((r: any) => r.id === id ? { ...r, reply, repliedAt: new Date().toISOString() } : r),
    }));
  };

  const byRatingMap: Record<number, number> = {};
  (data.byRating || []).forEach((x: any) => { byRatingMap[x.rating] = x._count; });

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Star className="w-5 h-5 text-[#EF2D8F]" /> Reseñas
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestiona y responde las opiniones de tus clientes</p>
      </div>

      {/* Rating summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 flex gap-8 items-center">
        <div className="text-center">
          <p className="text-5xl font-bold text-gray-900">{data.avgRating.toFixed(1)}</p>
          <StarDisplay rating={Math.round(data.avgRating)} size="md" />
          <p className="text-xs text-gray-500 mt-1">{data.totalReviews} reseñas</p>
        </div>
        <div className="flex-1 space-y-2">
          {[5,4,3,2,1].map(r => (
            <RatingBar key={r} rating={r} count={byRatingMap[r] || 0} total={data.totalReviews} />
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { id: 'all', label: 'Todas' },
          { id: 'pending', label: 'Sin responder' },
          { id: 'responded', label: 'Respondidas' },
        ] as { id: Filter; label: string }[]).map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Reviews */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-[#EF2D8F]" />
        </div>
      ) : data.data.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Star className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm">No hay reseñas en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.data.map((r: any) => (
            <ReviewCard key={r.id} review={r} onReply={handleReply} />
          ))}
        </div>
      )}
    </div>
  );
}
