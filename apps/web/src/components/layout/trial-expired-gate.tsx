'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Lock, CreditCard } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

const ALLOWED_PATHS = ['/tenant/billing', '/auth/login', '/auth/logout'];

export function TrialExpiredGate({ children }: { children: React.ReactNode }) {
  const { plan, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const isExpired =
    isAuthenticated &&
    plan?.status === 'trial' &&
    plan?.trialDaysLeft !== null &&
    plan?.trialDaysLeft !== undefined &&
    plan.trialDaysLeft <= 0;

  const isAllowedPath = ALLOWED_PATHS.some(p => pathname.startsWith(p));

  useEffect(() => {
    if (isExpired && !isAllowedPath) {
      router.replace('/tenant/billing');
    }
  }, [isExpired, isAllowedPath, router]);

  // Block with overlay while redirect happens (or if somehow on a non-allowed path)
  if (isExpired && !isAllowedPath) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full mx-4 bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Período de prueba expirado</h2>
          <p className="text-gray-500 text-sm mb-6">
            Tu prueba gratuita ha finalizado. Activa tu plan para seguir gestionando tu salón.
          </p>
          <button
            onClick={() => router.push('/tenant/billing')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-glamor-primary text-white rounded-xl font-semibold hover:bg-glamor-primary-hover transition"
          >
            <CreditCard className="w-4 h-4" />
            Activar mi plan
          </button>
          <p className="text-xs text-gray-400 mt-4">Tus datos están seguros y disponibles cuando actives tu plan.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
