'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import Link from 'next/link';
import {
  Loader2, Search, Crown, CreditCard, Clock, AlertCircle,
  Building2, ArrowUpDown, RefreshCw, CheckCircle2, X, Ban,
  ChevronDown, Store, Receipt,
} from 'lucide-react';

interface SubscriptionData {
  id: string; tenantId: string; tenantName: string; tenantSlug: string;
  planId: string; planName: string; planSlug: string;
  monthlyPrice: number; yearlyPrice: number;
  status: string; billingCycle: string;
  trialEndsAt: string | null; trialDaysLeft: number | null;
  currentPeriodStart: string | null; currentPeriodEnd: string | null;
  cancelledAt: string | null; createdAt: string;
}

interface Plan {
  id: string; name: string; slug: string; monthlyPrice: number; yearlyPrice: number;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
  expired: 'bg-amber-100 text-amber-700',
};

const statusLabels: Record<string, string> = {
  active: 'Activo', trial: 'Prueba', cancelled: 'Cancelado', expired: 'Expirado',
};

const billingLabels: Record<string, string> = {
  monthly: 'Mensual', yearly: 'Anual',
};

export default function AdminSubscriptionsPage() {
  const { token } = useAuthStore();
  const [subs, setSubs] = useState<SubscriptionData[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [changeModal, setChangeModal] = useState<SubscriptionData | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedBilling, setSelectedBilling] = useState('monthly');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/admin/plans/subscriptions/list?${params}&limit=100`, { token: token! });
      let data = res || [];
      if (search) {
        const s = search.toLowerCase();
        data = data.filter((sub: SubscriptionData) =>
          sub.tenantName.toLowerCase().includes(s) ||
          sub.tenantSlug.toLowerCase().includes(s) ||
          sub.planName.toLowerCase().includes(s)
        );
      }
      setSubs(data);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Error al cargar');
    } finally { setLoading(false); }
  }, [token, search, statusFilter]);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await api.get('/admin/plans', { token: token! });
      setPlans(res || []);
    } catch (e) { /* ignore */ }
  }, [token]);

  useEffect(() => { if (token) { fetchSubs(); fetchPlans(); } }, [fetchSubs, fetchPlans, token]);

  const openChange = (sub: SubscriptionData) => {
    setChangeModal(sub);
    setSelectedPlanId(sub.planId);
    setSelectedBilling(sub.billingCycle);
  };

  const handleChangePlan = async () => {
    if (!changeModal) return;
    setSaving(true);
    try {
      await api.post(`/admin/plans/tenants/${changeModal.tenantId}/change-plan`, {
        planId: selectedPlanId,
        billingCycle: selectedBilling,
      }, { token: token! });
      setChangeModal(null);
      fetchSubs();
      setToast({ msg: 'Plan cambiado exitosamente', type: 'success' });
    } catch (e: any) {
      setToast({ msg: e.message || 'Error al cambiar plan', type: 'error' });
    }
    setSaving(false);
  };

  const handleCancel = async (sub: SubscriptionData) => {
    if (!confirm(`¿Cancelar suscripción de ${sub.tenantName}?`)) return;
    try {
      await api.put(`/admin/plans/subscriptions/${sub.id}`, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      }, { token: token! });
      fetchSubs();
      setToast({ msg: 'Suscripción cancelada', type: 'success' });
    } catch (e: any) {
      setToast({ msg: e.message || 'Error', type: 'error' });
    }
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const estimatedPrice = selectedBilling === 'yearly'
    ? (selectedPlan?.yearlyPrice || 0)
    : (selectedPlan?.monthlyPrice || 0);

  if (loading && subs.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-glamor-primary" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suscripciones</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona las suscripciones de todos los clientes</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-border-primary p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><CreditCard className="w-4 h-4" /> Total</div>
          <p className="text-2xl font-bold text-foreground">{subs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 bg-green-50/30 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> Activas</div>
          <p className="text-2xl font-bold text-green-600">{subs.filter(s => s.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 bg-blue-50/30 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Clock className="w-4 h-4 text-blue-500" /> En prueba</div>
          <p className="text-2xl font-bold text-blue-600">{subs.filter(s => s.status === 'trial').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-border-primary p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Ban className="w-4 h-4" /> Canceladas</div>
          <p className="text-2xl font-bold text-red-500">{subs.filter(s => s.status === 'cancelled').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente o plan..." className="w-full h-10 pl-10 pr-4 rounded-lg border text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg border text-sm bg-white">
          <option value="">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="trial">En prueba</option>
          <option value="cancelled">Canceladas</option>
        </select>
        <button onClick={fetchSubs} className="h-10 px-3 rounded-lg border text-sm flex items-center gap-1.5 hover:bg-surface-hover">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

      {/* Table */}
      <div className="bg-white rounded-xl border border-border-primary overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-hover border-b border-border-primary">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Cliente</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Plan</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Ciclo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Precio</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Trial</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Próx. cobro</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Pagos</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {subs.map(s => (
              <tr key={s.id} className="border-b border-border-light hover:bg-surface-hover/50 transition">
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.tenantName}</p>
                    <p className="text-xs text-muted-foreground">{s.tenantSlug}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-sm font-medium">{s.planName}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={s.status} colors={statusColors} labels={statusLabels} />
                </td>
                <td className="px-4 py-3 text-sm">{billingLabels[s.billingCycle] || s.billingCycle}</td>
                <td className="px-4 py-3 text-sm font-medium">{formatCurrency(s.monthlyPrice)}</td>
                <td className="px-4 py-3">
                  {s.trialDaysLeft != null ? (
                    <span className={`text-sm font-medium ${s.trialDaysLeft <= 3 ? 'text-red-600' : s.trialDaysLeft <= 7 ? 'text-amber-600' : 'text-blue-600'}`}>
                      {s.trialDaysLeft} días
                    </span>
                  ) : <span className="text-sm text-muted-foreground">-</span>}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {s.currentPeriodEnd ? formatDate(s.currentPeriodEnd) : '-'}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/billing?tenantId=${s.tenantId}`}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-surface-hover text-muted-foreground font-medium hover:bg-surface-primary transition flex items-center gap-1 w-fit"
                  >
                    <Receipt className="w-3 h-3" /> Ver pagos
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openChange(s)} className="px-2.5 py-1.5 text-xs rounded-lg bg-glamor-primary/10 text-glamor-primary font-medium hover:bg-glamor-primary/20 transition flex items-center gap-1">
                      <ArrowUpDown className="w-3 h-3" /> Cambiar plan
                    </button>
                    {s.status !== 'cancelled' && (
                      <button onClick={() => handleCancel(s)} className="px-2.5 py-1.5 text-xs rounded-lg bg-red-50 text-red-600 font-medium hover:bg-red-100 transition flex items-center gap-1">
                        <Ban className="w-3 h-3" /> Cancelar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {subs.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">No hay suscripciones.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Change Plan Modal */}
      {changeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setChangeModal(null)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
              <h3 className="text-lg font-bold">Cambiar plan</h3>
              <button onClick={() => setChangeModal(null)} className="p-1.5 rounded-lg hover:bg-surface-hover"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-surface-primary rounded-lg">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">{changeModal.tenantName}</p>
                  <p className="text-xs text-muted-foreground">Plan actual: {changeModal.planName} ({billingLabels[changeModal.billingCycle]})</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Nuevo plan</label>
                <div className="space-y-2">
                  {plans.map(p => (
                    <label key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      selectedPlanId === p.id ? 'border-glamor-primary bg-glamor-primary/5' : 'border-border-primary hover:border-glamor-primary/30'
                    }`}>
                      <input type="radio" name="plan" checked={selectedPlanId === p.id} onChange={() => setSelectedPlanId(p.id)} className="text-glamor-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold flex items-center gap-1.5">
                          {p.name}
                          {p.slug === 'professional' && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Popular</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(p.monthlyPrice)}/mes · {formatCurrency(p.yearlyPrice)}/año
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Ciclo de facturación</label>
                <select value={selectedBilling} onChange={e => setSelectedBilling(e.target.value)} className="w-full h-10 px-3 rounded-lg border text-sm bg-white">
                  <option value="monthly">Mensual ({formatCurrency(selectedPlan?.monthlyPrice || 0)}/mes)</option>
                  <option value="yearly">Anual ({formatCurrency(selectedPlan?.yearlyPrice || 0)}/año)</option>
                </select>
              </div>

              <div className="p-4 rounded-lg bg-glamor-primary/5 border border-glamor-primary/20">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Total estimado:</span> {formatCurrency(estimatedPrice)}/{selectedBilling === 'yearly' ? 'año' : 'mes'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">La suscripción actual será cancelada y se creará una nueva.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-primary bg-surface-primary/30">
              <button onClick={() => setChangeModal(null)} className="h-10 px-4 rounded-lg border text-sm">Cancelar</button>
              <button onClick={handleChangePlan} disabled={saving || !selectedPlanId} className="flex items-center gap-2 h-10 px-6 bg-glamor-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Cambiar plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border ${
          toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 p-0.5 rounded hover:bg-black/5"><X className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}
