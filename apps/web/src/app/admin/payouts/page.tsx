'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign, TrendingUp, Clock, CheckCircle2,
  Loader2, Settings, ChevronDown, ChevronRight,
  Building2, AlertCircle,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────

interface Overview {
  allTime: { grossAmount: number; platformFee: number; netPaidOut: number };
  thisMonth: { grossAmount: number; platformFee: number; payoutCount: number };
  pendingPayouts: { orderCount: number; grossAmount: number; platformFee: number; netAmount: number };
}

interface TenantSummary {
  tenantId: string; tenantName: string; tenantSlug: string;
  orderCount: number; grossAmount: number; platformFee: number; netAmount: number;
}

interface Summary { items: TenantSummary[]; totalPlatformFee: number; totalPending: number }

interface Config { commissionRate: number; minPayoutAmount: number }

// ─── Stat card ───────────────────────────────────────────────────

function StatCard({ title, value, sub, icon, accent = false }: {
  title: string; value: string; sub?: string; icon: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? 'bg-glamor-primary text-white border-glamor-primary' : 'bg-white'}`}>
      <div className="flex items-start justify-between mb-3">
        <p className={`text-xs font-semibold uppercase tracking-wide ${accent ? 'text-white/70' : 'text-muted-foreground'}`}>{title}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? 'bg-white/20' : 'bg-glamor-primary/10'}`}>
          <span className={accent ? 'text-white' : 'text-glamor-primary'}>{icon}</span>
        </div>
      </div>
      <p className={`text-2xl font-bold ${accent ? 'text-white' : 'text-foreground'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-white/70' : 'text-muted-foreground'}`}>{sub}</p>}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────

export default function PayoutsPage() {
  const { token } = useAuthStore();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [summary, setSummary]   = useState<Summary | null>(null);
  const [config, setConfig]     = useState<Config | null>(null);
  const [loading, setLoading]   = useState(true);
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const [tenantOrders, setTenantOrders] = useState<Record<string, any>>({});
  const [paying, setPaying] = useState<string | null>(null);
  const [payForm, setPayForm] = useState<Record<string, { reference: string; notes: string }>>({});
  const [showConfig, setShowConfig] = useState(false);
  const [configForm, setConfigForm] = useState({ commissionRate: '3', minPayout: '50000' });
  const [savingConfig, setSavingConfig] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [ov, sm, cfg] = await Promise.all([
        api.get('/admin/payouts/overview', { token }),
        api.get('/admin/payouts/summary', { token }),
        api.get('/admin/payouts/config', { token }),
      ]);
      setOverview(ov);
      setSummary(sm);
      setConfig(cfg);
      setConfigForm({
        commissionRate: String(parseFloat((cfg.commissionRate * 100).toFixed(2))),
        minPayout: String(cfg.minPayoutAmount),
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const loadTenantOrders = async (tenantId: string) => {
    if (tenantOrders[tenantId]) return;
    const res = await api.get(`/admin/payouts/tenant/${tenantId}`, { token: token! });
    setTenantOrders(prev => ({ ...prev, [tenantId]: res }));
  };

  const toggleTenant = async (tenantId: string) => {
    if (expandedTenant === tenantId) { setExpandedTenant(null); return; }
    setExpandedTenant(tenantId);
    await loadTenantOrders(tenantId);
  };

  const handlePayout = async (tenantId: string) => {
    setPaying(tenantId);
    try {
      const form = payForm[tenantId] || { reference: '', notes: '' };
      await api.post(`/admin/payouts/tenant/${tenantId}`, form, { token: token! });
      alert('✅ Liquidación registrada exitosamente');
      setExpandedTenant(null);
      setTenantOrders({});
      await load();
    } catch (e: any) {
      alert(`❌ ${e.message || 'Error al registrar liquidación'}`);
    } finally {
      setPaying(null);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await api.put('/admin/payouts/config', {
        commissionRate: parseFloat(configForm.commissionRate) / 100,
        minPayoutAmount: parseFloat(configForm.minPayout),
      }, { token: token! });
      await load();
      setShowConfig(false);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-glamor-primary" /></div>
  );

  const fmt = (n: number) => formatCurrency(n);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Liquidaciones</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comisión actual: <strong>{config ? (Number(config.commissionRate) * 100).toFixed(1) : '3'}%</strong> por transacción
          </p>
        </div>
        <button
          onClick={() => setShowConfig(v => !v)}
          className="flex items-center gap-2 px-4 py-2 border border-border-primary rounded-lg text-sm text-muted-foreground hover:bg-surface-hover transition"
        >
          <Settings className="w-4 h-4" /> Configurar comisión
        </button>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold">Configuración de comisión</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Tasa de comisión (%)</label>
              <input
                type="number" step="0.1" min="0" max="100"
                value={configForm.commissionRate}
                onChange={e => setConfigForm(f => ({ ...f, commissionRate: e.target.value }))}
                className="w-full px-3 py-2 border border-border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
              />
              <p className="text-xs text-muted-foreground mt-1">Ej: 3 = 3% de cada venta</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Monto mínimo de liquidación (COP)</label>
              <input
                type="number" step="1000" min="0"
                value={configForm.minPayout}
                onChange={e => setConfigForm(f => ({ ...f, minPayout: e.target.value }))}
                className="w-full px-3 py-2 border border-border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
              />
              <p className="text-xs text-muted-foreground mt-1">Ej: 50000 = mínimo $50.000 COP</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowConfig(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition">Cancelar</button>
            <button onClick={handleSaveConfig} disabled={savingConfig}
              className="flex items-center gap-2 px-4 py-2 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition disabled:opacity-50">
              {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* KPI Overview */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Comisión pendiente"
            value={fmt(overview.pendingPayouts.platformFee)}
            sub={`${overview.pendingPayouts.orderCount} órdenes`}
            icon={<Clock className="w-4 h-4" />}
            accent
          />
          <StatCard
            title="Por pagar a tenants"
            value={fmt(overview.pendingPayouts.netAmount)}
            sub="Pendiente de liquidar"
            icon={<DollarSign className="w-4 h-4" />}
          />
          <StatCard
            title="Comisión este mes"
            value={fmt(overview.thisMonth.platformFee)}
            sub={`de ${fmt(overview.thisMonth.grossAmount)} en ventas`}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <StatCard
            title="Comisión total histórica"
            value={fmt(overview.allTime.platformFee)}
            sub={`${fmt(overview.allTime.netPaidOut)} pagados a tenants`}
            icon={<CheckCircle2 className="w-4 h-4" />}
          />
        </div>
      )}

      {/* Pending payouts per tenant */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Pendiente por tenant</h2>
          {summary && summary.items.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full">
              {summary.items.length} tenant{summary.items.length !== 1 ? 's' : ''} con saldo
            </span>
          )}
        </div>

        {!summary || summary.items.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Todos los tenants están al día</p>
          </div>
        ) : (
          <div className="divide-y">
            {summary.items.map(t => (
              <div key={t.tenantId}>
                {/* Row */}
                <button
                  onClick={() => toggleTenant(t.tenantId)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-hover/50 transition text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-glamor-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-glamor-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{t.tenantName}</p>
                    <p className="text-xs text-muted-foreground">{t.orderCount} órdenes · {t.tenantSlug}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">{fmt(t.netAmount)}</p>
                    <p className="text-xs text-muted-foreground">comisión: {fmt(t.platformFee)}</p>
                  </div>
                  {expandedTenant === t.tenantId
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>

                {/* Expanded detail */}
                {expandedTenant === t.tenantId && (
                  <div className="px-5 pb-5 bg-surface-secondary/30 border-t">
                    {!tenantOrders[t.tenantId] ? (
                      <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-glamor-primary" /></div>
                    ) : (
                      <>
                        {/* Orders list */}
                        <div className="mt-4 rounded-lg border bg-white overflow-hidden mb-4">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-surface-secondary text-xs text-muted-foreground">
                                <th className="text-left px-4 py-2.5 font-medium">Orden</th>
                                <th className="text-left px-4 py-2.5 font-medium">Fecha</th>
                                <th className="text-left px-4 py-2.5 font-medium">Pago</th>
                                <th className="text-right px-4 py-2.5 font-medium">Total</th>
                                <th className="text-right px-4 py-2.5 font-medium">Comisión</th>
                                <th className="text-right px-4 py-2.5 font-medium">A pagar</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {(tenantOrders[t.tenantId]?.orders || []).map((o: any) => (
                                <tr key={o.id} className="hover:bg-surface-hover/30">
                                  <td className="px-4 py-2.5 font-mono text-xs font-bold text-glamor-primary">{o.orderNumber}</td>
                                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                                    {new Date(o.createdAt).toLocaleDateString('es-CO')}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                      o.paymentMethod === 'pse' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {o.paymentMethod === 'pse' ? 'PSE' : 'Tienda'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-semibold">{fmt(Number(o.total))}</td>
                                  <td className="px-4 py-2.5 text-right text-glamor-primary font-semibold">{fmt(Number(o.platformFee))}</td>
                                  <td className="px-4 py-2.5 text-right font-bold">{fmt(Number(o.tenantPayout))}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t bg-surface-secondary text-sm font-bold">
                                <td className="px-4 py-2.5 text-muted-foreground" colSpan={3}>
                                  Total ({tenantOrders[t.tenantId]?.orders?.length || 0} órdenes)
                                </td>
                                <td className="px-4 py-2.5 text-right">{fmt(tenantOrders[t.tenantId]?.grossAmount || 0)}</td>
                                <td className="px-4 py-2.5 text-right text-glamor-primary">{fmt(tenantOrders[t.tenantId]?.platformFee || 0)}</td>
                                <td className="px-4 py-2.5 text-right">{fmt(tenantOrders[t.tenantId]?.netAmount || 0)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {/* Payout form */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Referencia de transferencia</label>
                            <input
                              value={payForm[t.tenantId]?.reference || ''}
                              onChange={e => setPayForm(f => ({ ...f, [t.tenantId]: { ...f[t.tenantId], reference: e.target.value, notes: f[t.tenantId]?.notes || '' } }))}
                              placeholder="Ej: TRF-2026-0001"
                              className="w-full px-3 py-2 border border-border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Notas internas</label>
                            <input
                              value={payForm[t.tenantId]?.notes || ''}
                              onChange={e => setPayForm(f => ({ ...f, [t.tenantId]: { reference: f[t.tenantId]?.reference || '', notes: e.target.value } }))}
                              placeholder="Opcional..."
                              className="w-full px-3 py-2 border border-border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            Esta acción marca {tenantOrders[t.tenantId]?.orders?.length || 0} órdenes como liquidadas y no se puede deshacer.
                          </div>
                          <button
                            onClick={() => handlePayout(t.tenantId)}
                            disabled={paying === t.tenantId}
                            className="flex items-center gap-2 px-5 py-2.5 bg-glamor-primary text-white rounded-lg text-sm font-semibold hover:bg-glamor-primary-hover transition disabled:opacity-50 shrink-0 ml-4"
                          >
                            {paying === t.tenantId
                              ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                              : <><CheckCircle2 className="w-4 h-4" /> Marcar como pagado · {fmt(t.netAmount)}</>
                            }
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
