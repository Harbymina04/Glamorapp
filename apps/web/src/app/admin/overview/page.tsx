'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  Building2, Users, TrendingUp, AlertTriangle, Crown,
  Clock, CheckCircle2, Brain, Zap, ArrowUpRight, RefreshCw, Loader2,
  CreditCard, Ban,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────

function StatCard({ title, value, sub, icon, color, onClick }: {
  title: string; value: string; sub?: string;
  icon: React.ReactNode; color: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-border-primary p-5 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-glamor-primary/30 transition-all' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {sub && <p className={`text-xs mt-1 ${color}`}>{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.replace('text-', 'bg-').replace('-600', '-100').replace('-500', '-100')}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function AdminOverviewPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [aiUsage, setAiUsage] = useState<any>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [tenantsRes, subsRes, aiRes] = await Promise.all([
        api.get('/admin/plans/tenants', { token }),
        api.get('/admin/plans/subscriptions/list?limit=200', { token }),
        api.get('/admin/ai-usage', { token }),
      ]);
      setTenants(tenantsRes || []);
      setSubs(subsRes || []);
      setAiUsage(aiRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // ─── Derived metrics ────────────────────────────────────────────

  const activeSubs   = subs.filter(s => s.status === 'active');
  const trialSubs    = subs.filter(s => s.status === 'trial');
  const cancelledSubs = subs.filter(s => s.status === 'cancelled');

  // MRR: active monthly + active annual/12
  const mrr = activeSubs.reduce((sum, s) => {
    const price = s.billingCycle === 'yearly'
      ? (s.yearlyPrice || s.monthlyPrice * 12) / 12
      : s.monthlyPrice;
    return sum + price;
  }, 0);

  // Expiring trial ≤ 7 days
  const expiringTrials = trialSubs
    .filter(s => s.trialDaysLeft != null && s.trialDaysLeft <= 7)
    .sort((a, b) => (a.trialDaysLeft ?? 99) - (b.trialDaysLeft ?? 99));

  // Recent tenants (last 5)
  const recentTenants = [...tenants]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const totalUsers = tenants.reduce((s, t) => s + (t.stats?.users ?? 0), 0);

  const fmt = (n: number) => n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-glamor-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 h-9 px-3 border border-border-primary rounded-lg text-sm hover:bg-surface-hover transition disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="MRR"
          value={formatCurrency(mrr)}
          sub={`${activeSubs.length} suscripciones activas`}
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          color="text-green-600"
          onClick={() => router.push('/admin/subscriptions')}
        />
        <StatCard
          title="Tenants"
          value={String(tenants.length)}
          sub={`${totalUsers} usuarios en total`}
          icon={<Building2 className="w-5 h-5 text-blue-600" />}
          color="text-blue-600"
          onClick={() => router.push('/admin/clients')}
        />
        <StatCard
          title="En prueba"
          value={String(trialSubs.length)}
          sub={expiringTrials.length > 0 ? `${expiringTrials.length} expiran en ≤7 días` : 'Sin vencimientos próximos'}
          icon={<Clock className="w-5 h-5 text-orange-500" />}
          color={expiringTrials.length > 0 ? 'text-orange-500' : 'text-muted-foreground'}
        />
        <StatCard
          title="Tokens IA este mes"
          value={fmt((aiUsage?.totals?.tokensIn ?? 0) + (aiUsage?.totals?.tokensOut ?? 0))}
          sub={`~$${(aiUsage?.totals?.costEstimated ?? 0).toFixed(3)} USD`}
          icon={<Brain className="w-5 h-5 text-purple-600" />}
          color="text-purple-600"
          onClick={() => router.push('/admin/ai-usage')}
        />
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Trials expirando pronto */}
        <div className="bg-white rounded-xl border border-border-primary overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Trials por vencer
            </h2>
            <button onClick={() => router.push('/admin/subscriptions')}
              className="text-xs text-glamor-primary hover:underline flex items-center gap-1">
              Ver todos <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {expiringTrials.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="text-sm">No hay trials próximos a vencer</p>
            </div>
          ) : (
            <div className="divide-y divide-border-light">
              {expiringTrials.map(s => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.tenantName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-500" />
                      {s.planName}
                    </p>
                  </div>
                  <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                    (s.trialDaysLeft ?? 99) <= 2
                      ? 'bg-red-50 text-red-700'
                      : (s.trialDaysLeft ?? 99) <= 5
                      ? 'bg-orange-50 text-orange-700'
                      : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    {s.trialDaysLeft === 0 ? 'Hoy' : `${s.trialDaysLeft}d`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nuevos clientes */}
        <div className="bg-white rounded-xl border border-border-primary overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Clientes recientes
            </h2>
            <button onClick={() => router.push('/admin/clients')}
              className="text-xs text-glamor-primary hover:underline flex items-center gap-1">
              Ver todos <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {recentTenants.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted-foreground text-sm">No hay clientes aún</div>
          ) : (
            <div className="divide-y divide-border-light">
              {recentTenants.map(t => {
                const sub = t.subscription;
                const statusColor: Record<string, string> = {
                  active: 'text-green-700 bg-green-50',
                  trial: 'text-blue-700 bg-blue-50',
                  cancelled: 'text-red-700 bg-red-50',
                  expired: 'text-amber-700 bg-amber-50',
                };
                return (
                  <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                        {' · '}
                        <span className="flex-inline items-center gap-1">
                          <Users className="inline w-3 h-3" /> {t.stats?.users ?? 0}
                        </span>
                      </p>
                    </div>
                    {sub ? (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[sub.status] || 'bg-gray-100 text-gray-600'}`}>
                        {sub.status === 'active' ? 'Activo' : sub.status === 'trial' ? 'Trial' : sub.status === 'cancelled' ? 'Cancelado' : 'Expirado'}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin plan</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Subscription breakdown ── */}
      <div className="bg-white rounded-xl border border-border-primary p-5">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          Estado de suscripciones
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Activas',    count: activeSubs.length,                       color: 'bg-green-500', icon: <CheckCircle2 className="w-4 h-4 text-green-600" /> },
            { label: 'En prueba',  count: trialSubs.length,                         color: 'bg-blue-500',  icon: <Clock className="w-4 h-4 text-blue-600" /> },
            { label: 'Canceladas', count: cancelledSubs.length,                     color: 'bg-red-400',   icon: <Ban className="w-4 h-4 text-red-500" /> },
            { label: 'Sin plan',   count: tenants.filter(t => !t.subscription).length, color: 'bg-gray-300',  icon: <Zap className="w-4 h-4 text-muted-foreground" /> },
          ].map(item => (
            <div key={item.label} className="text-center">
              <div className="flex items-center justify-center mb-2">{item.icon}</div>
              <p className="text-2xl font-bold text-foreground">{item.count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
              {/* Progress bar */}
              <div className="mt-2 h-1 bg-surface-primary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.color} transition-all`}
                  style={{ width: subs.length > 0 ? `${Math.round((item.count / Math.max(subs.length, tenants.length)) * 100)}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
