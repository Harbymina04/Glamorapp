'use client';

import { useState } from 'react';
import { Clock, Star, Store, Calendar, X, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { formatCOP, categoryColors } from '@/lib/store-utils';
import { useAuthStore } from '@/stores/auth-store';
import { getToken } from '@/lib/auth';

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
  storeId?: string;
  tenantId?: string;
}

function calcEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + durationMinutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function ServiceCard({
  id, name, category, price, durationMinutes, rating = 0,
  reviewCount = 0, shopsCount = 1, allowsBooking = false,
  storeId, tenantId,
}: ServiceCardProps) {
  const catKey = (category || 'default').toLowerCase();
  const colors = categoryColors[catKey] || categoryColors.default;

  const [showModal, setShowModal] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookError, setBookError] = useState('');

  const { user, isAuthenticated } = useAuthStore();
  const isCustomer = isAuthenticated && user?.role === 'customer';

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  const handleBook = async () => {
    if (!date || !time) { setBookError('Selecciona fecha y hora'); return; }
    setBookError('');
    setBooking(true);
    try {
      const token = getToken();
      const endTime = calcEndTime(time, durationMinutes || 60);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/appointments/public/book`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          // price lo calcula el servidor desde el servicio (no se envía)
          body: JSON.stringify({ storeId, serviceId: id, date, startTime: time, endTime, notes: notes || undefined }),
        }
      );
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || 'Error al agendar'); }
      setBooked(true);
    } catch (e: any) {
      setBookError(e.message || 'Error al agendar la cita');
    } finally {
      setBooking(false);
    }
  };

  const handleClose = () => {
    setShowModal(false); setBooked(false); setBookError('');
    setDate(''); setTime(''); setNotes('');
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
        <div className="w-20 h-20 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
          <Calendar className="w-8 h-8" style={{ color: colors.color }} />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          {category && (
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: colors.bg, color: colors.color }}>
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
            {durationMinutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {durationMinutes} min</span>}
            <span className="font-semibold text-gray-900">Desde {formatCOP(price)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Store className="w-3 h-3" /> {shopsCount} salón{shopsCount !== 1 ? 'es' : ''}
            </span>
            {allowsBooking && storeId && (
              <button onClick={() => setShowModal(true)}
                className="px-3 py-1 bg-[#EF2D8F] text-white rounded-lg text-xs font-medium hover:bg-[#d4267e] transition">
                Agendar →
              </button>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>

            {booked ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">¡Cita agendada!</h3>
                <p className="text-sm text-gray-500 mb-1">{name}</p>
                <p className="text-sm font-semibold text-gray-700">{formatDate(date)} a las {time}</p>
                <button onClick={handleClose} className="mt-5 w-full py-2.5 bg-[#EF2D8F] text-white rounded-xl text-sm font-bold hover:bg-[#d4267e] transition">Cerrar</button>
              </div>
            ) : isCustomer ? (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Agendar cita</h3>
                <p className="text-[#EF2D8F] font-semibold mb-4">{name}</p>
                <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1.5 text-sm">
                  {durationMinutes && <div className="flex justify-between"><span className="text-gray-500">Duración</span><span className="font-medium">{durationMinutes} min</span></div>}
                  <div className="flex justify-between"><span className="text-gray-500">Precio</span><span className="font-bold">{formatCOP(price)}</span></div>
                </div>
                {bookError && <p className="mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">{bookError}</p>}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                    <input type="date" value={date} min={minDateStr} onChange={e => setDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hora</label>
                    <input type="time" value={time} onChange={e => setTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Notas <span className="text-gray-400">(opcional)</span></label>
                    <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="Ej: color preferido, alergias..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F]" />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={handleClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">Cancelar</button>
                  <button onClick={handleBook} disabled={booking}
                    className="flex-1 py-2.5 bg-[#EF2D8F] text-white rounded-xl text-sm font-bold hover:bg-[#d4267e] transition disabled:opacity-60">
                    {booking ? 'Agendando...' : 'Confirmar'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Agendar cita</h3>
                <p className="text-[#EF2D8F] font-semibold mb-4">{name}</p>
                <div className="bg-gray-50 rounded-xl p-3 mb-5 text-sm space-y-1.5">
                  {durationMinutes && <div className="flex justify-between"><span className="text-gray-500">Duración</span><span className="font-medium">{durationMinutes} min</span></div>}
                  <div className="flex justify-between"><span className="text-gray-500">Desde</span><span className="font-bold">{formatCOP(price)}</span></div>
                </div>
                <p className="text-sm text-gray-500 mb-4 text-center">Para agendar necesitas ingresar a tu cuenta</p>
                <div className="flex gap-3">
                  <button onClick={handleClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">Cancelar</button>
                  <Link href={`/tienda/auth/login${tenantId ? `?tenantId=${tenantId}` : ''}`}
                    className="flex-1 py-2.5 bg-[#EF2D8F] text-white rounded-xl text-sm font-bold text-center hover:bg-[#d4267e] transition">
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
