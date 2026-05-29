'use client';

import { useAuthStore } from '@/stores/auth-store';
import { Clock, AlertTriangle, X, Crown } from 'lucide-react';
import { useState } from 'react';

export function TrialBanner() {
  const { plan } = useAuthStore();
  const [dismissed, setDismissed] = useState(false);

  if (!plan || dismissed) return null;

  // Only show for trial plans
  if (plan.status !== 'trial') {
    // Show subtle plan indicator for active plans
    if (plan.status === 'active' && plan.planSlug === 'free') {
      return (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Plan <strong>Gratuito</strong> — funcionalidades limitadas.</span>
            <a href="/upgrade" className="underline font-medium ml-2">Actualizar plan →</a>
          </div>
        </div>
      );
    }
    return null;
  }

  const daysLeft = plan.trialDaysLeft ?? 0;
  const isUrgent = daysLeft <= 3;

  return (
    <div className={`${isUrgent ? 'bg-red-50 border-b border-red-200 text-red-800' : 'bg-blue-50 border-b border-blue-200 text-blue-800'} px-4 py-2.5 text-sm flex items-center justify-between`}>
      <div className="flex items-center gap-2">
        {isUrgent ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <Clock className="w-4 h-4" />
        )}
        {daysLeft > 0 ? (
          <span>
            Período de prueba · <strong>{daysLeft} {daysLeft === 1 ? 'día' : 'días'} restante{daysLeft === 1 ? '' : 's'}</strong> del plan <strong>{plan.planName}</strong>.
          </span>
        ) : (
          <span>Tu período de prueba <strong>ha expirado</strong>. Algunas funcionalidades están limitadas.</span>
        )}
        <a href="/upgrade" className={`underline font-semibold ml-2 ${isUrgent ? 'text-red-900' : 'text-blue-900'}`}>
          <Crown className="w-3.5 h-3.5 inline mr-1" />
          Actualizar a {plan.planSlug === 'free' ? 'Profesional' : 'un plan pago'}
        </a>
      </div>
      <button onClick={() => setDismissed(true)} className="p-0.5 rounded hover:bg-black/10">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
