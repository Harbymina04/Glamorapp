'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import {
  Loader2, CreditCard, Building2, Users, Zap, HardDrive,
  CheckCircle2, ArrowUpRight, AlertTriangle,
} from 'lucide-react';

interface BillingData {
  planName: string;
  planSlug: string;
  status: string;
  billingCycle?: string;
  monthlyPrice?: number;
  trialEndsAt?: string | null;
  trialDaysLeft?: number | null;
  currentPeriodEnd?: string | null;
  maxBranches?: number;
  maxUsers?: number;
  features?: Record<string, any>;
}

interface UsageData {
  currentBranches: number;
  currentUsers: number;
  tokensUsedThisMonth: number;
}

function UsageBar({ label, used, max, icon }: { label: string; used: number; max: number; icon: React.ReactNode }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-glamor-primary';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <span className={`font-semibold ${pct >= 90 ? 'text-red-600' : 'text-foreground'}`}>
          {used.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {pct >= 90 && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Estás al {pct}% del límite
        </p>
      )}
    </div>
  );
}

export default function TenantBillingPage() {
  const { token, plan } = useAuthStore();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    if (!token) return;
    try {
      const [storesRes, usersRes, aiRes] = await Promise.all([
        api.get('/tenant/stores', { token }),
        api.get('/tenant/users', { token }),
        api.get('/tenant/ai-usage', { token }),
      ]);
      setUsage({
        currentBranches: Array.isArray(storesRes) ? storesRes.length : (storesRes.data?.length ?? 0),
        currentUsers: Array.isArray(usersRes) ? usersRes.length : (usersRes.data?.length ?? 0),
        tokensUsedThisMonth: (aiRes.tokensInThisMonth ?? 0) + (aiRes.tokensOutThisMonth ?? 0),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-glamor-primary" /></div>;
  }

  const billing = plan as BillingData | null;
  const features = (billing?.features as any)?.modules ?? billing?.features ?? {};
  const limits = (billing?.features as any)?.limits ?? {};
  const maxBranches: number = limits.maxBranches ?? billing?.maxBranches ?? 1;
  const maxUsers: number = limits.maxUsers ?? billing?.maxUsers ?? 2;
  const maxTokens: number = limits.aiTokensMonthly ?? 0;

  const isTrialing = billing?.status === 'trial';
  const statusColor = isTrialing ? 'bg-amber-100 text-amber-700' : billing?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600';
  const statusLabel = isTrialing ? 'Período de prueba' : billing?.status === 'active' ? 'Activo' : billing?.status ?? 'Sin plan';

  const enabledModules = Object.entries(features).filter(([, v]) => v === true).map(([k]) => k);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Plan y Facturación</h1>
        <p className="text-sm text-muted-foreground mt-1">Uso actual y detalles de tu suscripción</p>
      </div>

      {/* Plan card */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-glamor-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-glamor-primary" />
            </div>
            <div>
              <p className="font-bold text-lg capitalize">{billing?.planName ?? 'Free'}</p>
              {billing?.monthlyPrice !== undefined && (
                <p className="text-sm text-muted-foreground">
                  ${billing.monthlyPrice.toLocaleString()} / mes
                </p>
              )}
            </div>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
        </div>

        {isTrialing && billing?.trialDaysLeft !== null && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Tu período de prueba vence en <strong>{billing.trialDaysLeft} día(s)</strong>. Activa tu plan para continuar.</span>
          </div>
        )}

        {billing?.currentPeriodEnd && !isTrialing && (
          <p className="text-xs text-muted-foreground">
            Próxima renovación: {new Date(billing.currentPeriodEnd).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Usage limits */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
        <h2 className="font-semibold">Uso actual</h2>

        <UsageBar
          label="Sucursales"
          used={usage?.currentBranches ?? 0}
          max={maxBranches}
          icon={<Building2 className="w-4 h-4" />}
        />
        <UsageBar
          label="Usuarios"
          used={usage?.currentUsers ?? 0}
          max={maxUsers}
          icon={<Users className="w-4 h-4" />}
        />
        {maxTokens > 0 && (
          <UsageBar
            label="Tokens IA este mes"
            used={usage?.tokensUsedThisMonth ?? 0}
            max={maxTokens}
            icon={<Zap className="w-4 h-4" />}
          />
        )}
      </div>

      {/* Enabled modules */}
      {enabledModules.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="font-semibold mb-4">Módulos incluidos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {enabledModules.map(m => (
              <div key={m} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <span className="capitalize">{m.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upgrade CTA */}
      <div className="bg-gradient-to-r from-glamor-primary to-pink-500 rounded-xl p-6 text-white">
        <h3 className="font-bold text-lg mb-1">¿Necesitas más?</h3>
        <p className="text-sm text-white/80 mb-4">Actualiza tu plan para más sucursales, usuarios y tokens de IA.</p>
        <button className="flex items-center gap-2 bg-white text-glamor-primary font-semibold text-sm px-4 py-2 rounded-lg hover:bg-white/90 transition">
          Ver planes <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
