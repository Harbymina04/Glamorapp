'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Clock, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { storeApi } from '@/lib/store-utils';

type TxStatus = 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'PENDING' | null;

function PaymentResultContent() {
  const params = useSearchParams();
  const transactionId = params.get('id');
  const [status, setStatus] = useState<TxStatus>(null);
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  const checkStatus = async () => {
    if (!transactionId) { setLoading(false); return; }
    try {
      const tx = await storeApi.get(`/payments/status/${transactionId}`);
      setStatus(tx.status);
      setReference(tx.reference ?? '');
      // If still pending, keep polling (max 3 times, every 4s)
      return tx.status;
    } catch {
      setStatus('ERROR');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let tries = 0;
    const poll = async () => {
      const s = await checkStatus();
      if (s === 'PENDING' && tries < 3) {
        tries++;
        setPolling(true);
        setTimeout(poll, 4000);
      } else {
        setPolling(false);
      }
    };
    poll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#EF2D8F]" />
        <p className="text-gray-500">Verificando pago con tu banco...</p>
      </div>
    );
  }

  if (!transactionId) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Enlace inválido</h1>
        <p className="text-gray-500 mb-6">No se encontró información de la transacción.</p>
        <Link href="/tienda" className="px-6 py-2.5 bg-[#EF2D8F] text-white rounded-full font-semibold hover:bg-[#d4267e] transition">
          Ir a la tienda
        </Link>
      </div>
    );
  }

  // ── APPROVED ──
  if (status === 'APPROVED') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">¡Pago exitoso!</h1>
        <p className="text-gray-500 mb-4">Tu pago PSE fue aprobado. Tu pedido ha sido confirmado.</p>
        {reference && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-400 mb-1">Número de orden</p>
            <p className="text-xl font-mono font-bold text-[#EF2D8F]">{reference}</p>
          </div>
        )}
        <p className="text-sm text-gray-400 mb-8">El salón preparará tu pedido y te contactará pronto.</p>
        <Link href="/tienda" className="inline-flex items-center gap-2 px-8 py-3 bg-[#EF2D8F] text-white rounded-full font-bold hover:bg-[#d4267e] transition">
          <ArrowLeft className="w-4 h-4" /> Volver a la tienda
        </Link>
      </div>
    );
  }

  // ── PENDING ──
  if (status === 'PENDING') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-12 h-12 text-amber-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Pago en proceso</h1>
        <p className="text-gray-500 mb-4">Tu banco está procesando el pago. Puede tomar unos minutos.</p>
        {reference && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-400 mb-1">Número de orden</p>
            <p className="text-xl font-mono font-bold text-[#EF2D8F]">{reference}</p>
          </div>
        )}
        <p className="text-sm text-gray-400 mb-6">
          {polling ? 'Actualizando estado automáticamente...' : 'Si completaste el pago en tu banco, espera unos minutos y revisa tu correo.'}
        </p>
        <button
          onClick={() => { setLoading(true); checkStatus(); }}
          className="flex items-center gap-2 mx-auto px-6 py-2.5 border-2 border-[#EF2D8F] text-[#EF2D8F] rounded-full font-semibold hover:bg-pink-50 transition"
        >
          <RefreshCw className="w-4 h-4" /> Verificar estado
        </button>
      </div>
    );
  }

  // ── DECLINED / VOIDED / ERROR ──
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
        <XCircle className="w-12 h-12 text-red-500" />
      </div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Pago no completado</h1>
      <p className="text-gray-500 mb-4">
        {status === 'DECLINED'
          ? 'Tu banco rechazó la transacción. Intenta con otro método de pago.'
          : status === 'VOIDED'
          ? 'La transacción fue anulada.'
          : 'Ocurrió un error procesando tu pago.'}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
        <Link href="/tienda" className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition">
          Ir a la tienda
        </Link>
        <Link href="/tienda/checkout" className="px-6 py-2.5 bg-[#EF2D8F] text-white rounded-full font-semibold hover:bg-[#d4267e] transition">
          Intentar de nuevo
        </Link>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#EF2D8F]" />
      </div>
    }>
      <PaymentResultContent />
    </Suspense>
  );
}
