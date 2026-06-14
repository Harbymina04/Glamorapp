'use client';

import { useAuthStore } from '@/stores/auth-store';
import { Clock, AlertTriangle, X, Crown } from 'lucide-react';
import { useState } from 'react';

export function TrialBanner() {
  const { plan, user } = useAuthStore();
  const [dismissed, setDismissed] = useState(false);

  if (!plan || dismissed) return null;

  // Solo el dueño (tenant_admin) puede gestionar el plan; a los demás se les
  // indica que contacten al administrador (no se les manda a una ruta vedada).
  const canUpgrade = user?.role === 'tenant_admin';

  // No existe plan gratuito: solo prueba y, al vencer, se cobra. Por eso el
  // aviso SOLO se muestra durante la prueba (el vencimiento lo maneja
  // TrialExpiredGate / facturación). Un plan activo no muestra banner.
  if (plan.status !== 'trial') return null;

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
        {canUpgrade ? (
          <a href="/tenant/billing" className={`underline font-semibold ml-2 ${isUrgent ? 'text-red-900' : 'text-blue-900'}`}>
            <Crown className="w-3.5 h-3.5 inline mr-1" />
            Activar mi plan
          </a>
        ) : (
          <span className={`ml-2 ${isUrgent ? 'text-red-900/80' : 'text-blue-900/80'}`}>Pídele al administrador que active el plan.</span>
        )}
      </div>
      <button onClick={() => setDismissed(true)} className="p-0.5 rounded hover:bg-black/10">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
