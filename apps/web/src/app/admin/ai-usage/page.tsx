'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { Loader2, Brain, TrendingUp, Zap, Building2 } from 'lucide-react';

interface Totals {
  tokensIn: number; tokensOut: number; totalCalls: number; costEstimated: number;
}

interface TenantUsage {
  tenantId: string; tenantName: string; tenantSlug: string;
  tokensIn: number; tokensOut: number; totalCalls: number; costEstimated: number;
}

interface DailyPoint {
  date: string; tokensIn: number; tokensOut: number;
}

interface GlobalUsage {
  month: string;
  totals: Totals;
  byTenant: TenantUsage[];
  daily: DailyPoint[];
}

export default function AdminAiUsagePage() {
  const { token } = useAuthStore();
  const [data, setData] = useState<GlobalUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get('/admin/ai-usage', { token: token! });
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-glamor-primary" /></div>;
  }

  const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}K` : String(n);
  const fmtCost = (n: number) => `$${n.toFixed(4)}`;

  // Max daily value for chart bars
  const maxDaily = Math.max(1, ...(data?.daily.map(d => d.tokensIn + d.tokensOut) || [1]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Consumo de IA</h1>
        <p className="text-sm text-muted-foreground mt-1">Métricas globales — {data?.month}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><Zap className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-2xl font-bold">{fmt(data?.totals.tokensIn || 0)}</p><p className="text-xs text-muted-foreground">Tokens In</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Zap className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-2xl font-bold">{fmt(data?.totals.tokensOut || 0)}</p><p className="text-xs text-muted-foreground">Tokens Out</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-2xl font-bold">{data?.totals.totalCalls || 0}</p><p className="text-xs text-muted-foreground">Llamadas</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center"><Brain className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-2xl font-bold">{fmtCost(data?.totals.costEstimated || 0)}</p><p className="text-xs text-muted-foreground">Costo Est.</p></div>
          </div>
        </div>
      </div>

      {/* Daily Chart */}
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <h3 className="font-semibold mb-4">Consumo Diario</h3>
        <div className="flex items-end gap-1 h-32">
          {(data?.daily || []).slice(-30).map(d => {
            const h = maxDaily > 0 ? ((d.tokensIn + d.tokensOut) / maxDaily) * 100 : 0;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${fmt(d.tokensIn + d.tokensOut)} tokens`}>
                <span className="text-[10px] text-muted-foreground">{fmt(d.tokensIn + d.tokensOut)}</span>
                <div className="w-full bg-glamor-primary/20 rounded-t" style={{ height: `${Math.max(h, 2)}%` }}>
                  <div className="w-full bg-glamor-primary rounded-t" style={{ height: '100%' }} />
                </div>
                <span className="text-[9px] text-muted-foreground">{d.date.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* By Tenant */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b"><h3 className="font-semibold">Por Tenant</h3></div>
        <table className="w-full">
          <thead>
            <tr className="border-b bg-surface-secondary">
              <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Tenant</th>
              <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Tokens In</th>
              <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Tokens Out</th>
              <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Calls</th>
              <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Costo</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(data?.byTenant || []).map(t => (
              <tr key={t.tenantId} className="hover:bg-surface-hover/50">
                <td className="px-4 py-3"><p className="font-medium text-sm">{t.tenantName}</p><p className="text-xs text-muted-foreground">{t.tenantSlug}</p></td>
                <td className="px-4 py-3 text-sm text-right">{fmt(t.tokensIn)}</td>
                <td className="px-4 py-3 text-sm text-right">{fmt(t.tokensOut)}</td>
                <td className="px-4 py-3 text-sm text-right">{t.totalCalls}</td>
                <td className="px-4 py-3 text-sm text-right font-mono">{fmtCost(t.costEstimated)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
