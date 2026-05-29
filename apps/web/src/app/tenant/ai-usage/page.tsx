'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { Loader2, Zap, TrendingUp, Store, Clock } from 'lucide-react';

interface ByStore {
  storeId: string; storeName: string; tokensIn: number; tokensOut: number;
}

interface RecentAction {
  id: string; actionType: string; modelName: string;
  tokensIn: number; tokensOut: number;
  store?: { name: string };
  agent?: { name: string };
  createdAt: string;
}

interface TenantAiUsage {
  tokensInThisMonth: number;
  tokensOutThisMonth: number;
  byStore: ByStore[];
  recentActions: RecentAction[];
}

export default function TenantAiUsagePage() {
  const { token } = useAuthStore();
  const [data, setData] = useState<TenantAiUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get('/tenant/ai-usage', { token: token! });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Consumo de IA</h1>
        <p className="text-sm text-muted-foreground mt-1">Métricas de este mes</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><Zap className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-2xl font-bold">{fmt(data?.tokensInThisMonth || 0)}</p><p className="text-xs text-muted-foreground">Tokens In (este mes)</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-2xl font-bold">{fmt(data?.tokensOutThisMonth || 0)}</p><p className="text-xs text-muted-foreground">Tokens Out (este mes)</p></div>
          </div>
        </div>
      </div>

      {/* By Store */}
      {(data?.byStore || []).length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center gap-2">
            <Store className="w-4 h-4" />
            <h3 className="font-semibold">Por Sucursal</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b bg-surface-secondary">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Sucursal</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Tokens In</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Tokens Out</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.byStore.map(s => (
                <tr key={s.storeId} className="hover:bg-surface-hover/50">
                  <td className="px-4 py-3 text-sm font-medium">{s.storeName || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-right">{fmt(s.tokensIn)}</td>
                  <td className="px-4 py-3 text-sm text-right">{fmt(s.tokensOut)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Actions */}
      {(data?.recentActions || []).length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <h3 className="font-semibold">Acciones Recientes</h3>
          </div>
          <div className="divide-y max-h-96 overflow-auto">
            {data.recentActions.map(a => (
              <div key={a.id} className="px-4 py-3 flex items-center justify-between hover:bg-surface-hover/50">
                <div>
                  <p className="text-sm font-medium">{a.actionType}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.agent?.name || 'N/A'} · {a.store?.name || 'N/A'} · {a.modelName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">in:{a.tokensIn} out:{a.tokensOut}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
