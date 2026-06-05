'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import {
  Loader2, CreditCard, Building2, Users, Zap,
  CheckCircle2, ArrowUpRight, AlertTriangle, Star, X,
  ChevronDown,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxUsers: number;
  maxBranches: number;
  isPopular: boolean;
  features: {
    limits?: { maxUsers: number; maxBranches: number; aiTokensMonthly: number; storageGB: number };
    modules?: Record<string, boolean>;
  };
}

interface BillingData {
  planName: string; planSlug: string; status: string;
  billingCycle?: string; monthlyPrice?: number;
  trialEndsAt?: string | null; trialDaysLeft?: number | null;
  currentPeriodEnd?: string | null;
  maxBranches?: number; maxUsers?: number;
  features?: Record<string, any>;
}

interface UsageData { currentBranches: number; currentUsers: number; tokensUsedThisMonth: number }

interface PseForm {
  buyerName: string; buyerEmail: string; buyerPhone: string;
  bankCode: string; docType: string; docNumber: string; userType: 0 | 1;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  pos: 'Punto de venta', inventory: 'Inventario', appointments: 'Citas',
  customers: 'Clientes', reports: 'Reportes', expenses: 'Gastos',
  suppliers: 'Proveedores', purchases: 'Compras', catalog: 'Catálogo',
  ai_agents: 'Agentes IA', accounting: 'Contabilidad', api: 'API access',
  whiteLabel: 'White label', users: 'Gestión usuarios', settings: 'Configuración',
};

const DOC_TYPES = ['CC', 'CE', 'NIT', 'TI', 'PP'];
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function UsageBar({ label, used, max, icon }: { label: string; used: number; max: number; icon: React.ReactNode }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-glamor-primary';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">{icon}<span>{label}</span></div>
        <span className={`font-semibold ${pct >= 90 ? 'text-red-600' : 'text-foreground'}`}>{used} / {max}</span>
      </div>
      <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {pct >= 90 && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Estás al {pct}% del límite</p>}
    </div>
  );
}

// ─── PSE Payment Modal ────────────────────────────────────────────────────────

function PseModal({
  plan, cycle, banks, banksLoading, onClose, onSuccess, token,
}: {
  plan: Plan; cycle: 'monthly' | 'yearly';
  banks: { financialInstitutionCode: string; financialInstitutionName: string }[];
  banksLoading?: boolean;
  onClose: () => void; onSuccess: (redirectUrl: string) => void; token: string;
}) {
  const price = Number(cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice);
  const [form, setForm] = useState<PseForm>({
    buyerName: '', buyerEmail: '', buyerPhone: '',
    bankCode: '', docType: 'CC', docNumber: '', userType: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof PseForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.buyerName || !form.buyerEmail || !form.buyerPhone || !form.bankCode || !form.docNumber) {
      setError('Completa todos los campos'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await api.post('/plans/subscribe', {
        planId: plan.id, billingCycle: cycle, ...form,
      }, { token });
      onSuccess(res.redirectUrl);
    } catch (e: any) {
      setError(e.message || 'Error al procesar el pago');
    } finally { setLoading(false); }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-glamor-primary/30';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-bold text-lg">Activar Plan {plan.name}</h3>
            <p className="text-sm text-gray-500">
              ${price.toLocaleString('es-CO')} COP / {cycle === 'yearly' ? 'año' : 'mes'} — PSE
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipo de persona</label>
              <select className={inputCls} value={form.userType} onChange={e => set('userType', Number(e.target.value) as 0 | 1)}>
                <option value={0}>Natural</option>
                <option value={1}>Jurídica</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Tipo de documento</label>
              <select className={inputCls} value={form.docType} onChange={e => set('docType', e.target.value)}>
                {DOC_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Número de documento</label>
            <input className={inputCls} value={form.docNumber} onChange={e => set('docNumber', e.target.value)} placeholder="1234567890" />
          </div>

          <div>
            <label className={labelCls}>Nombre completo</label>
            <input className={inputCls} value={form.buyerName} onChange={e => set('buyerName', e.target.value)} placeholder="Carlos Rodríguez" />
          </div>

          <div>
            <label className={labelCls}>Email</label>
            <input type="email" className={inputCls} value={form.buyerEmail} onChange={e => set('buyerEmail', e.target.value)} placeholder="carlos@miempresa.co" />
          </div>

          <div>
            <label className={labelCls}>Teléfono</label>
            <input className={inputCls} value={form.buyerPhone} onChange={e => set('buyerPhone', e.target.value)} placeholder="3001234567" />
          </div>

          <div>
            <label className={labelCls}>
              Banco PSE {banksLoading && <span className="text-gray-400">(cargando...)</span>}
            </label>
            <select className={inputCls} value={form.bankCode} onChange={e => set('bankCode', e.target.value)} disabled={banksLoading}>
              <option value="">{banksLoading ? 'Cargando bancos...' : 'Selecciona tu banco...'}</option>
              {banks.map(b => (
                <option key={b.financialInstitutionCode} value={b.financialInstitutionCode}>
                  {b.financialInstitutionName}
                </option>
              ))}
            </select>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Plan</span>
              <span className="font-medium">{plan.name} ({cycle === 'yearly' ? 'Anual' : 'Mensual'})</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
              <span>Total a pagar</span>
              <span className="text-glamor-primary">${price.toLocaleString('es-CO')} COP</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-glamor-primary text-white font-semibold rounded-xl hover:bg-glamor-primary-hover transition disabled:opacity-50"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Procesando...</> : <>Ir al banco a pagar <ArrowUpRight className="w-4 h-4" /></>}
          </button>
          <p className="text-center text-xs text-gray-400">Serás redirigido al portal PSE de tu banco. Pago 100% seguro vía Wompi.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TenantBillingPage() {
  const { token, plan: currentPlan, checkAuth } = useAuthStore();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPlans, setShowPlans] = useState(false);
  const [banks, setBanks] = useState<{ financialInstitutionCode: string; financialInstitutionName: string }[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);

  const billing = currentPlan as BillingData | null;
  const isTrialing = billing?.status === 'trial';
  const isExpired = isTrialing && (billing?.trialDaysLeft ?? 1) <= 0;

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [storesRes, usersRes, aiRes, plansRes] = await Promise.all([
        api.get('/tenant/stores', { token }),
        api.get('/tenant/users', { token }),
        api.get('/tenant/ai-usage', { token }),
        fetch(`${API}/plans/public`).then(r => r.json()),
      ]);
      setUsage({
        currentBranches: Array.isArray(storesRes) ? storesRes.length : (storesRes.data?.length ?? 0),
        currentUsers: Array.isArray(usersRes) ? usersRes.length : (usersRes.data?.length ?? 0),
        tokensUsedThisMonth: (aiRes.tokensInThisMonth ?? 0) + (aiRes.tokensOutThisMonth ?? 0),
      });
      setPlans((Array.isArray(plansRes) ? plansRes : []).filter((p: Plan) => p.slug !== 'free'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handlePaymentSuccess = (redirectUrl: string) => {
    if (redirectUrl) window.location.href = redirectUrl;
  };

  const handleSelectPlan = async (plan: Plan) => {
    setSelectedPlan(plan);
    if (banks.length === 0 && !banksLoading) {
      setBanksLoading(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${API}/payments/pse/banks`, { signal: controller.signal });
        clearTimeout(timeout);
        const data = await res.json();
        setBanks(Array.isArray(data) ? data : []);
      } catch {
        setBanks([]);
      } finally {
        setBanksLoading(false);
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-glamor-primary" /></div>;
  }

  const features = (billing?.features as any)?.modules ?? billing?.features ?? {};
  const limits = (billing?.features as any)?.limits ?? {};
  const maxBranches: number = limits.maxBranches ?? billing?.maxBranches ?? 1;
  const maxUsers: number = limits.maxUsers ?? billing?.maxUsers ?? 2;
  const maxTokens: number = limits.aiTokensMonthly ?? 0;
  const enabledModules = Object.entries(features).filter(([, v]) => v === true).map(([k]) => k);

  const statusColor = isExpired ? 'bg-red-100 text-red-700'
    : isTrialing ? 'bg-amber-100 text-amber-700'
    : billing?.status === 'active' ? 'bg-green-100 text-green-700'
    : 'bg-gray-100 text-gray-600';

  const statusLabel = isExpired ? 'Prueba expirada'
    : isTrialing ? 'Período de prueba'
    : billing?.status === 'active' ? 'Activo'
    : billing?.status ?? 'Sin plan';

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Plan y Facturación</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona tu suscripción y revisa tu uso actual</p>
        </div>
        <button
          onClick={() => setShowPlans(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-glamor-primary text-white text-sm font-semibold rounded-xl hover:bg-glamor-primary-hover transition"
        >
          {showPlans ? 'Ver mi plan' : 'Cambiar plan'} <ChevronDown className={`w-4 h-4 transition-transform ${showPlans ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* ── Current plan card ── */}
      {!showPlans && (
        <>
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-glamor-primary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-glamor-primary" />
                </div>
                <div>
                  <p className="font-bold text-lg capitalize">{billing?.planName ?? 'Free'}</p>
                  {billing?.monthlyPrice !== undefined && billing.monthlyPrice > 0 && (
                    <p className="text-sm text-muted-foreground">${billing.monthlyPrice.toLocaleString()} / mes</p>
                  )}
                </div>
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
            </div>

            {isExpired && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Tu período de prueba ha expirado. <button onClick={() => setShowPlans(true)} className="font-bold underline">Activa tu plan ahora</button> para seguir usando Glamorapp.</span>
              </div>
            )}

            {isTrialing && !isExpired && billing?.trialDaysLeft != null && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Tu prueba vence en <strong>{billing.trialDaysLeft} día(s)</strong>. <button onClick={() => setShowPlans(true)} className="font-bold underline">Ver planes</button></span>
              </div>
            )}

            {billing?.currentPeriodEnd && !isTrialing && (
              <p className="text-xs text-muted-foreground">
                Próxima renovación: {new Date(billing.currentPeriodEnd).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>

          {/* Usage */}
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
            <h2 className="font-semibold">Uso actual</h2>
            <UsageBar label="Sucursales" used={usage?.currentBranches ?? 0} max={maxBranches} icon={<Building2 className="w-4 h-4" />} />
            <UsageBar label="Usuarios" used={usage?.currentUsers ?? 0} max={maxUsers} icon={<Users className="w-4 h-4" />} />
            {maxTokens > 0 && (
              <UsageBar label="Tokens IA este mes" used={usage?.tokensUsedThisMonth ?? 0} max={maxTokens} icon={<Zap className="w-4 h-4" />} />
            )}
          </div>

          {/* Modules */}
          {enabledModules.length > 0 && (
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="font-semibold mb-4">Módulos incluidos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {enabledModules.map(m => (
                  <div key={m} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{MODULE_LABELS[m] ?? m.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Plan selector ── */}
      {showPlans && (
        <div className="space-y-4">
          {/* Billing cycle toggle */}
          <div className="flex justify-center">
            <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
              {(['monthly', 'yearly'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${cycle === c ? 'bg-white shadow text-glamor-primary' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {c === 'monthly' ? 'Mensual' : 'Anual'}
                  {c === 'yearly' && <span className="ml-1.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">−17%</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map(plan => {
              const price = Number(cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice);
              const modules = plan.features?.modules ?? {};
              const lim = plan.features?.limits ?? {};
              const isCurrent = billing?.planSlug === plan.slug && billing?.status === 'active';

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl border-2 shadow-sm p-6 flex flex-col gap-4 transition ${plan.isPopular ? 'border-glamor-primary' : 'border-gray-200'}`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="flex items-center gap-1 px-3 py-1 bg-glamor-primary text-white text-xs font-bold rounded-full">
                        <Star className="w-3 h-3" /> Más popular
                      </span>
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>
                  </div>

                  <div>
                    <span className="text-3xl font-extrabold">${price.toLocaleString('es-CO')}</span>
                    <span className="text-gray-400 text-sm ml-1">COP / {cycle === 'yearly' ? 'año' : 'mes'}</span>
                    {cycle === 'yearly' && (
                      <p className="text-xs text-green-600 mt-0.5">
                        Equivale a ${Math.round(price / 12).toLocaleString('es-CO')} COP/mes
                      </p>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{lim.maxBranches ?? plan.maxBranches} sucursales</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{lim.maxUsers ?? plan.maxUsers} usuarios</span>
                  </div>

                  {/* Modules */}
                  <ul className="space-y-1.5 flex-1">
                    {Object.entries(modules).filter(([, v]) => v).map(([k]) => (
                      <li key={k} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        {MODULE_LABELS[k] ?? k.replace(/_/g, ' ')}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isCurrent ? (
                    <div className="flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-700 text-sm font-semibold rounded-xl border border-green-200">
                      <CheckCircle2 className="w-4 h-4" /> Plan actual
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full py-2.5 text-sm font-semibold rounded-xl transition ${plan.isPopular ? 'bg-glamor-primary text-white hover:bg-glamor-primary-hover' : 'border-2 border-glamor-primary text-glamor-primary hover:bg-glamor-primary/5'}`}
                    >
                      Activar plan
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-center text-xs text-gray-400">Pagos 100% seguros vía Wompi PSE · Cancela cuando quieras</p>
        </div>
      )}

      {/* ── PSE Modal ── */}
      {selectedPlan && token && (
        <PseModal
          plan={selectedPlan}
          cycle={cycle}
          banks={banks}
          banksLoading={banksLoading}
          token={token}
          onClose={() => setSelectedPlan(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
