'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type TxStatus = 'APPROVED' | 'PENDING' | 'DECLINED' | 'ERROR' | 'loading';

function ResultContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { checkAuth } = useAuthStore();
  const [status, setStatus] = useState<TxStatus>('loading');
  const [attempts, setAttempts] = useState(0);

  const transactionId = params.get('id') ?? params.get('transaction_id');

  useEffect(() => {
    if (!transactionId) { setStatus('ERROR'); return; }

    const poll = async () => {
      try {
        const res = await fetch(`${API}/payments/status/${transactionId}`);
        const data = await res.json();
        const s: TxStatus = data.status ?? 'PENDING';
        setStatus(s);

        if (s === 'PENDING' && attempts < 8) {
          setAttempts(a => a + 1);
          setTimeout(poll, 3000);
        } else if (s === 'APPROVED') {
          // Refresh auth so plan updates in store
          await checkAuth();
        }
      } catch {
        setStatus('ERROR');
      }
    };

    poll();
  }, [transactionId]);

  const config = {
    APPROVED: {
      icon: <CheckCircle2 className="w-16 h-16 text-green-500" />,
      title: '¡Plan activado!',
      msg: 'Tu pago fue aprobado. Ahora tienes acceso completo a Glamorapp.',
      btnLabel: 'Ir al dashboard',
      btnFn: () => router.push('/dashboard'),
      color: 'text-green-700',
      bg: 'bg-green-50 border-green-200',
    },
    PENDING: {
      icon: <Clock className="w-16 h-16 text-amber-400" />,
      title: 'Pago en proceso',
      msg: 'Tu banco está procesando el pago. Te notificaremos cuando se confirme. Puede tomar unos minutos.',
      btnLabel: 'Volver a billing',
      btnFn: () => router.push('/tenant/billing'),
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
    },
    DECLINED: {
      icon: <XCircle className="w-16 h-16 text-red-500" />,
      title: 'Pago rechazado',
      msg: 'El banco rechazó la transacción. Verifica tu saldo y vuelve a intentarlo.',
      btnLabel: 'Intentar de nuevo',
      btnFn: () => router.push('/tenant/billing'),
      color: 'text-red-700',
      bg: 'bg-red-50 border-red-200',
    },
    ERROR: {
      icon: <XCircle className="w-16 h-16 text-red-500" />,
      title: 'Error en el pago',
      msg: 'Hubo un problema procesando tu pago. Si el dinero fue debitado, contacta a soporte.',
      btnLabel: 'Volver a billing',
      btnFn: () => router.push('/tenant/billing'),
      color: 'text-red-700',
      bg: 'bg-red-50 border-red-200',
    },
    loading: {
      icon: <Loader2 className="w-16 h-16 text-glamor-primary animate-spin" />,
      title: 'Verificando pago...',
      msg: 'Estamos confirmando tu transacción con el banco.',
      btnLabel: '',
      btnFn: () => {},
      color: 'text-gray-600',
      bg: 'bg-gray-50 border-gray-200',
    },
  };

  const c = config[status];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className={`max-w-md w-full bg-white rounded-2xl border-2 shadow-xl p-8 text-center space-y-5 ${c.bg}`}>
        <div className="flex justify-center">{c.icon}</div>
        <div>
          <h2 className={`text-2xl font-bold ${c.color}`}>{c.title}</h2>
          <p className="text-gray-500 text-sm mt-2">{c.msg}</p>
        </div>
        {transactionId && (
          <p className="text-xs text-gray-400 font-mono">Referencia: {transactionId}</p>
        )}
        {c.btnLabel && (
          <button
            onClick={c.btnFn}
            className="w-full py-3 bg-glamor-primary text-white font-semibold rounded-xl hover:bg-glamor-primary-hover transition"
          >
            {c.btnLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function BillingResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-glamor-primary" />
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}
