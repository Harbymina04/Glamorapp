'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Loader2, Search, Receipt, DollarSign, TrendingUp, AlertCircle,
  RefreshCw, Plus, X, CheckCircle2, FileText, BarChart3, Clock,
  Bell, Play,
} from 'lucide-react';

interface Payment {
  id: string;
  tenantId: string;
  tenant: { id: string; name: string; slug: string };
  planId: string;
  plan: { id: string; name: string; slug: string };
  wompiReference: string | null;
  amount: string;
  currency: string;
  billingCycle: string;
  periodStart: string;
  periodEnd: string;
  paymentMethod: string;
  status: string;
  notes: string | null;
  invoiceRequested: boolean;
  invoiceStatus: string;
  invoiceEmail: string | null;
  invoiceNumber: string | null;
  invoiceIssuedAt: string | null;
  createdAt: string;
}

interface BillingStats {
  totalCollected: number;
  mrr: number;
  arr: number;
  totalPayments: number;
  pendingInvoices: number;
}

interface ExpiringSub {
  id: string;
  tenantId: string;
  billingCycle: string;
  currentPeriodEnd: string;
  tenant: { id: string; name: string; slug: string };
  plan: { id: string; name: string; monthlyPrice: number; yearlyPrice: number };
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  monthlyPrice: number;
  yearlyPrice: number;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

const statusColors: Record<string, string> = {
  approved: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  declined: 'bg-red-100 text-red-700',
  manual: 'bg-blue-100 text-blue-700',
};

const statusLabels: Record<string, string> = {
  approved: 'Aprobado',
  pending: 'Pendiente',
  declined: 'Rechazado',
  manual: 'Manual',
};

const invoiceStatusColors: Record<string, string> = {
  none: 'bg-gray-100 text-gray-500',
  issued: 'bg-green-100 text-green-700',
};

const invoiceStatusLabels: Record<string, string> = {
  none: 'Sin factura',
  issued: 'Emitida',
};

const billingLabels: Record<string, string> = {
  monthly: 'Mensual',
  yearly: 'Anual',
};

const paymentMethodLabels: Record<string, string> = {
  pse: 'PSE',
  transfer: 'Transferencia',
  cash: 'Efectivo',
  card: 'Tarjeta',
};

type Tab = 'payments' | 'expiring' | 'stats';

export default function AdminBillingPage() {
  const { token } = useAuthStore();
  const [tab, setTab] = useState<Tab>('payments');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [expiringSubs, setExpiringSubs] = useState<ExpiringSub[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [runningCheck, setRunningCheck] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cycleFilter, setCycleFilter] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Manual payment modal
  const [manualModal, setManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    tenantId: '', planId: '', billingCycle: 'monthly', amount: '',
    paymentMethod: 'transfer', notes: '', periodStart: '', periodEnd: '',
  });
  const [saving, setSaving] = useState(false);

  // Invoice modal
  const [invoiceModal, setInvoiceModal] = useState<Payment | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({
    businessName: '', nit: '', email: '', address: '', city: '',
  });
  const [issuingInvoice, setIssuingInvoice] = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (cycleFilter) params.set('billingCycle', cycleFilter);
      const res = await api.get(`/admin/plans/billing/payments?${params}&limit=200`, { token: token! });
      let data: Payment[] = res || [];
      if (search) {
        const s = search.toLowerCase();
        data = data.filter(p =>
          p.tenant.name.toLowerCase().includes(s) ||
          p.tenant.slug.toLowerCase().includes(s) ||
          (p.wompiReference || '').toLowerCase().includes(s)
        );
      }
      setPayments(data);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Error al cargar pagos');
    } finally { setLoading(false); }
  }, [token, statusFilter, cycleFilter, search]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.get('/admin/plans/billing/stats', { token: token! });
      setStats(res);
    } catch { /* ignore */ }
    setStatsLoading(false);
  }, [token]);

  const fetchMeta = useCallback(async () => {
    try {
      const [plansRes, tenantsRes] = await Promise.all([
        api.get('/admin/plans', { token: token! }),
        api.get('/admin/plans/tenants?limit=500', { token: token! }),
      ]);
      setPlans(plansRes || []);
      setTenants(tenantsRes || []);
    } catch { /* ignore */ }
  }, [token]);

  const fetchExpiring = useCallback(async () => {
    try {
      const res = await api.get('/admin/plans/billing/expiring-soon?days=30', { token: token! });
      setExpiringSubs(res || []);
    } catch { /* ignore */ }
  }, [token]);

  const handleRunCheck = async () => {
    setRunningCheck(true);
    try {
      const res = await api.post('/admin/plans/billing/run-renewal-check', {}, { token: token! });
      setToast({ msg: `✅ Check ejecutado — recordatorios: ${res.reminders}, expirados: ${res.expired}`, type: 'success' });
      fetchExpiring(); fetchStats();
    } catch (e: any) {
      setToast({ msg: e.message || 'Error al ejecutar el check', type: 'error' });
    }
    setRunningCheck(false);
  };

  useEffect(() => {
    if (token) { fetchPayments(); fetchStats(); fetchMeta(); fetchExpiring(); }
  }, [fetchPayments, fetchStats, fetchMeta, fetchExpiring, token]);

  // Auto-fill amount when plan+cycle changes in manual modal
  useEffect(() => {
    if (manualForm.planId && manualForm.billingCycle) {
      const plan = plans.find(p => p.id === manualForm.planId);
      if (plan) {
        const price = manualForm.billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
        setManualForm(f => ({ ...f, amount: String(price) }));
      }
    }
  }, [manualForm.planId, manualForm.billingCycle, plans]);

  const handleManualSubmit = async () => {
    if (!manualForm.tenantId || !manualForm.planId || !manualForm.amount || !manualForm.periodStart || !manualForm.periodEnd) {
      setToast({ msg: 'Completa todos los campos requeridos', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/plans/billing/payments/manual', {
        ...manualForm,
        amount: Number(manualForm.amount),
      }, { token: token! });
      setManualModal(false);
      setManualForm({ tenantId: '', planId: '', billingCycle: 'monthly', amount: '', paymentMethod: 'transfer', notes: '', periodStart: '', periodEnd: '' });
      fetchPayments(); fetchStats();
      setToast({ msg: 'Pago registrado exitosamente', type: 'success' });
    } catch (e: any) {
      setToast({ msg: e.message || 'Error al registrar pago', type: 'error' });
    }
    setSaving(false);
  };

  const openInvoiceModal = (payment: Payment) => {
    setInvoiceModal(payment);
    const existing = payment.invoiceData as any;
    setInvoiceForm({
      businessName: existing?.businessName || '',
      nit: existing?.nit || '',
      email: existing?.email || payment.invoiceEmail || '',
      address: existing?.address || '',
      city: existing?.city || '',
    });
  };

  const handleIssueInvoice = async () => {
    if (!invoiceModal) return;
    if (!invoiceForm.businessName || !invoiceForm.nit || !invoiceForm.email) {
      setToast({ msg: 'Razón social, NIT y email son requeridos', type: 'error' });
      return;
    }
    setIssuingInvoice(true);
    try {
      await api.put(`/admin/plans/billing/payments/${invoiceModal.id}/invoice`, {
        ...invoiceForm,
        invoiceNumber: `SUB-${Date.now()}`,
      }, { token: token! });
      setInvoiceModal(null);
      fetchPayments();
      setToast({ msg: 'Factura emitida correctamente', type: 'success' });
    } catch (e: any) {
      setToast({ msg: e.message || 'Error al emitir factura', type: 'error' });
    }
    setIssuingInvoice(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Facturación</h1>
          <p className="text-muted-foreground text-sm mt-1">Historial de pagos de suscripciones y facturación electrónica</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunCheck}
            disabled={runningCheck}
            title="Ejecuta el cron de vencimientos ahora (sin esperar las 9am)"
            className="flex items-center gap-2 h-10 px-3 rounded-lg border border-border-primary text-sm font-medium text-muted-foreground hover:bg-surface-hover transition disabled:opacity-50"
          >
            {runningCheck ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Ejecutar check ahora
          </button>
          <button
            onClick={() => setManualModal(true)}
            className="flex items-center gap-2 h-10 px-4 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary/90 transition"
          >
            <Plus className="w-4 h-4" /> Registrar pago manual
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border-primary">
        {([
          { key: 'payments', label: 'Pagos' },
          { key: 'expiring', label: `Próximos a vencer${expiringSubs.length > 0 ? ` (${expiringSubs.length})` : ''}` },
          { key: 'stats',    label: 'Estadísticas' },
        ] as { key: Tab; label: string }[]).map(({ key: t, label }) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              tab === t
                ? 'border-glamor-primary text-glamor-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Expiring Soon Tab ── */}
      {tab === 'expiring' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Suscripciones activas que vencen en los próximos <strong>30 días</strong>. El cron corre diariamente a las 9am y envía recordatorios automáticos a 7, 3 y 1 día antes.
            </p>
            <button onClick={fetchExpiring} className="h-9 px-3 rounded-lg border text-sm flex items-center gap-1.5 hover:bg-surface-hover text-muted-foreground">
              <RefreshCw className="w-3.5 h-3.5" /> Actualizar
            </button>
          </div>

          {expiringSubs.length === 0 ? (
            <div className="bg-white rounded-xl border border-border-primary p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3 opacity-60" />
              <p className="text-foreground font-medium">Todo en orden</p>
              <p className="text-sm text-muted-foreground mt-1">No hay suscripciones por vencer en los próximos 30 días.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-border-primary overflow-hidden">
              <table className="w-full">
                <thead className="bg-surface-hover border-b border-border-primary">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Plan</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Ciclo</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Vence el</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Días restantes</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {expiringSubs.map(sub => {
                    const daysLeft = Math.ceil((new Date(sub.currentPeriodEnd).getTime() - Date.now()) / 86400000);
                    const urgency = daysLeft <= 1 ? 'text-red-600 font-bold' : daysLeft <= 3 ? 'text-orange-600 font-semibold' : daysLeft <= 7 ? 'text-amber-600' : 'text-foreground';
                    const amount = sub.billingCycle === 'yearly' ? sub.plan.yearlyPrice : sub.plan.monthlyPrice;
                    return (
                      <tr key={sub.id} className="border-b border-border-light hover:bg-surface-hover/50 transition">
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-foreground">{sub.tenant.name}</p>
                          <p className="text-xs text-muted-foreground">{sub.tenant.slug}</p>
                        </td>
                        <td className="px-4 py-3 text-sm">{sub.plan.name}</td>
                        <td className="px-4 py-3 text-sm">{sub.billingCycle === 'yearly' ? 'Anual' : 'Mensual'}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(sub.currentPeriodEnd)}</td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 text-sm ${urgency}`}>
                            <Clock className="w-3.5 h-3.5" />
                            {daysLeft <= 0 ? 'Hoy' : `${daysLeft} día${daysLeft !== 1 ? 's' : ''}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{formatCurrency(amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Info box about the cron */}
          <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
            <Bell className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Recordatorios automáticos activos</p>
              <p className="text-sm text-blue-700 mt-0.5">
                El sistema envía emails y notificaciones in-app automáticamente a los <strong>7 días</strong>, <strong>3 días</strong> y <strong>1 día</strong> antes del vencimiento.
                Al vencer, la suscripción pasa a estado <strong>Expirado</strong> y el acceso queda suspendido.
              </p>
              <p className="text-sm text-blue-600 mt-1">
                Usa el botón <strong>"Ejecutar check ahora"</strong> en el encabezado para disparar el proceso manualmente sin esperar las 9am.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats Tab ── */}
      {tab === 'stats' && (
        <div>
          {statsLoading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="w-8 h-8 animate-spin text-glamor-primary" /></div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-border-primary p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><TrendingUp className="w-4 h-4 text-glamor-primary" /> MRR</div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.mrr)}</p>
                <p className="text-xs text-muted-foreground mt-1">Ingresos mensuales recurrentes</p>
              </div>
              <div className="bg-white rounded-xl border border-border-primary p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><TrendingUp className="w-4 h-4 text-green-500" /> ARR</div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.arr)}</p>
                <p className="text-xs text-muted-foreground mt-1">Ingresos anuales recurrentes</p>
              </div>
              <div className="bg-white rounded-xl border border-border-primary p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><DollarSign className="w-4 h-4 text-amber-500" /> Total cobrado</div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalCollected)}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.totalPayments} pagos aprobados</p>
              </div>
              <div className="bg-white rounded-xl border border-border-primary p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><FileText className="w-4 h-4 text-red-500" /> Facturas pendientes</div>
                <p className="text-2xl font-bold text-red-500">{stats.pendingInvoices}</p>
                <p className="text-xs text-muted-foreground mt-1">Solicitadas sin emitir</p>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">No hay estadísticas disponibles.</div>
          )}
        </div>
      )}

      {/* ── Payments Tab ── */}
      {tab === 'payments' && (
        <div>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar tenant o referencia..."
                className="w-full h-10 pl-10 pr-4 rounded-lg border text-sm"
              />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg border text-sm bg-white">
              <option value="">Todos los estados</option>
              <option value="approved">Aprobados</option>
              <option value="pending">Pendientes</option>
              <option value="declined">Rechazados</option>
            </select>
            <select value={cycleFilter} onChange={e => setCycleFilter(e.target.value)} className="h-10 px-3 rounded-lg border text-sm bg-white">
              <option value="">Todos los ciclos</option>
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
            </select>
            <button onClick={fetchPayments} className="h-10 px-3 rounded-lg border text-sm flex items-center gap-1.5 hover:bg-surface-hover">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

          {loading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-glamor-primary" /></div>
          ) : (
            <div className="bg-white rounded-xl border border-border-primary overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-hover border-b border-border-primary">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Tenant</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Plan</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Monto</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Ciclo</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Método</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Estado</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Wompi Ref</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Período</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Factura</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Fecha</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} className="border-b border-border-light hover:bg-surface-hover/40 transition">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">{p.tenant.name}</p>
                          <p className="text-xs text-muted-foreground">{p.tenant.slug}</p>
                        </td>
                        <td className="px-4 py-3">{p.plan.name}</td>
                        <td className="px-4 py-3 font-medium">{formatCurrency(Number(p.amount))}</td>
                        <td className="px-4 py-3">{billingLabels[p.billingCycle] || p.billingCycle}</td>
                        <td className="px-4 py-3">{paymentMethodLabels[p.paymentMethod] || p.paymentMethod}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[p.status] || 'bg-gray-100 text-gray-600'}`}>
                            {statusLabels[p.status] || p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                          {p.wompiReference ? p.wompiReference.slice(0, 20) + '…' : '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(p.periodStart)} — {formatDate(p.periodEnd)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${invoiceStatusColors[p.invoiceStatus] || 'bg-gray-100 text-gray-500'}`}>
                            {invoiceStatusLabels[p.invoiceStatus] || p.invoiceStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(p.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          {p.status === 'approved' && (
                            <button
                              onClick={() => openInvoiceModal(p)}
                              className="px-2.5 py-1.5 text-xs rounded-lg bg-glamor-primary/10 text-glamor-primary font-medium hover:bg-glamor-primary/20 transition flex items-center gap-1 ml-auto"
                            >
                              <FileText className="w-3 h-3" />
                              {p.invoiceStatus === 'issued' ? 'Ver factura' : 'Emitir factura'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr><td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">No hay pagos registrados.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Manual Payment Modal ── */}
      {manualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setManualModal(false)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary sticky top-0 bg-white">
              <h3 className="text-lg font-bold">Registrar pago manual</h3>
              <button onClick={() => setManualModal(false)} className="p-1.5 rounded-lg hover:bg-surface-hover"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Tenant *</label>
                <select value={manualForm.tenantId} onChange={e => setManualForm(f => ({ ...f, tenantId: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm bg-white">
                  <option value="">Seleccionar tenant...</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Plan *</label>
                <select value={manualForm.planId} onChange={e => setManualForm(f => ({ ...f, planId: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm bg-white">
                  <option value="">Seleccionar plan...</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Ciclo *</label>
                  <select value={manualForm.billingCycle} onChange={e => setManualForm(f => ({ ...f, billingCycle: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm bg-white">
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Monto (COP) *</label>
                  <input type="number" value={manualForm.amount} onChange={e => setManualForm(f => ({ ...f, amount: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Método de pago *</label>
                <select value={manualForm.paymentMethod} onChange={e => setManualForm(f => ({ ...f, paymentMethod: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm bg-white">
                  <option value="transfer">Transferencia</option>
                  <option value="cash">Efectivo</option>
                  <option value="pse">PSE</option>
                  <option value="card">Tarjeta</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Inicio período *</label>
                  <input type="date" value={manualForm.periodStart} onChange={e => setManualForm(f => ({ ...f, periodStart: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Fin período *</label>
                  <input type="date" value={manualForm.periodEnd} onChange={e => setManualForm(f => ({ ...f, periodEnd: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notas</label>
                <textarea value={manualForm.notes} onChange={e => setManualForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-lg border text-sm resize-none" placeholder="Observaciones opcionales..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-primary bg-surface-primary/30 sticky bottom-0">
              <button onClick={() => setManualModal(false)} className="h-10 px-4 rounded-lg border text-sm">Cancelar</button>
              <button onClick={handleManualSubmit} disabled={saving} className="flex items-center gap-2 h-10 px-6 bg-glamor-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Registrar pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice Modal ── */}
      {invoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setInvoiceModal(null)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
              <h3 className="text-lg font-bold">{invoiceModal.invoiceStatus === 'issued' ? 'Ver factura' : 'Emitir factura'}</h3>
              <button onClick={() => setInvoiceModal(null)} className="p-1.5 rounded-lg hover:bg-surface-hover"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Payment summary */}
              <div className="p-3 bg-surface-primary rounded-lg text-sm">
                <p className="font-semibold text-foreground">{invoiceModal.tenant.name}</p>
                <p className="text-muted-foreground">{invoiceModal.plan.name} · {billingLabels[invoiceModal.billingCycle]} · {formatCurrency(Number(invoiceModal.amount))}</p>
                <p className="text-muted-foreground text-xs">{formatDate(invoiceModal.periodStart)} — {formatDate(invoiceModal.periodEnd)}</p>
                {invoiceModal.invoiceNumber && (
                  <p className="text-xs text-green-700 mt-1 font-medium">N° {invoiceModal.invoiceNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Razón social *</label>
                <input value={invoiceForm.businessName} onChange={e => setInvoiceForm(f => ({ ...f, businessName: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm" placeholder="Empresa S.A.S" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">NIT *</label>
                <input value={invoiceForm.nit} onChange={e => setInvoiceForm(f => ({ ...f, nit: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm" placeholder="900123456-7" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email factura *</label>
                <input type="email" value={invoiceForm.email} onChange={e => setInvoiceForm(f => ({ ...f, email: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm" placeholder="contabilidad@empresa.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Dirección</label>
                <input value={invoiceForm.address} onChange={e => setInvoiceForm(f => ({ ...f, address: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm" placeholder="Calle 123 # 45-67" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Ciudad</label>
                <input value={invoiceForm.city} onChange={e => setInvoiceForm(f => ({ ...f, city: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm" placeholder="Bogotá" />
              </div>

              {invoiceModal.invoiceStatus === 'issued' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Factura emitida el {formatDate(invoiceModal.invoiceIssuedAt!)}
                </div>
              )}

              <p className="text-xs text-muted-foreground">La integración automática con proveedor de facturación electrónica estará disponible próximamente. Por ahora se registra manualmente.</p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-primary bg-surface-primary/30">
              <button onClick={() => setInvoiceModal(null)} className="h-10 px-4 rounded-lg border text-sm">Cancelar</button>
              <button onClick={handleIssueInvoice} disabled={issuingInvoice} className="flex items-center gap-2 h-10 px-6 bg-glamor-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {issuingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {invoiceModal.invoiceStatus === 'issued' ? 'Actualizar' : 'Emitir factura'}
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
