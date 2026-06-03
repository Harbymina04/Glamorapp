'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import {
  Loader2, Store, Users, ShoppingCart, Calendar, DollarSign,
  Contact, Crown, Clock, CheckCircle2, AlertTriangle, ArrowRight, Sparkles,
} from 'lucide-react';

interface DashboardData {
  totalStores: number;
  totalUsers: number;
  totalCustomers: number;
  totalSales: number;
  pendingAppointments: number;
  totalRevenue: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active:    { label: 'Activo',     color: 'text-green-700 bg-green-50 border-green-200',  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  trial:     { label: 'Prueba',     color: 'text-blue-700 bg-blue-50 border-blue-200',     icon: <Clock className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Cancelado',  color: 'text-red-700 bg-red-50 border-red-200',        icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  expired:   { label: 'Expirado',   color: 'text-amber-700 bg-amber-50 border-amber-200',  icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

export default function TenantDashboardPage() {
  const { token, plan, user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/tenant/dashboard', { token: token! });
      setData(res);
    } catch (e) {
      console.error('Dashboard error:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-glamor-primary" />
      </div>
    );
  }

  const kpis = [
    { label: 'Sucursales',        value: data?.totalStores || 0,     icon: Store,        color: 'bg-blue-100 text-blue-600' },
    { label: 'Usuarios',          value: data?.totalUsers || 0,      icon: Users,        color: 'bg-purple-100 text-purple-600' },
    { label: 'Clientes',          value: data?.totalCustomers || 0,  icon: Contact,      color: 'bg-green-100 text-green-600' },
    { label: 'Ventas Totales',    value: data?.totalSales || 0,      icon: ShoppingCart, color: 'bg-orange-100 text-orange-600' },
    { label: 'Citas Pendientes',  value: data?.pendingAppointments || 0, icon: Calendar, color: 'bg-amber-100 text-amber-600' },
    { label: 'Ingresos',          value: formatCurrency(data?.totalRevenue || 0), icon: DollarSign, color: 'bg-emerald-100 text-emerald-600', isCurrency: true },
  ];

  const planStatus = plan ? statusConfig[plan.status] ?? statusConfig.expired : null;
  const isNewAccount = plan?.status === 'trial' && (plan.trialDaysLeft ?? 0) >= 13;

  const onboardingSteps = [
    { label: 'Configura tu primera sucursal', href: '/tenant/stores', done: (data?.totalStores ?? 0) > 0 },
    { label: 'Agrega usuarios a tu equipo', href: '/tenant/users', done: (data?.totalUsers ?? 0) > 1 },
    { label: 'Crea tu catálogo de productos y servicios', href: '/dashboard/inventory/services/new', done: (data?.totalSales ?? 0) > 0 || (data?.totalCustomers ?? 0) > 0 },
    { label: 'Registra tu primer cliente', href: '/dashboard/customers', done: (data?.totalCustomers ?? 0) > 0 },
  ];
  const stepsCompleted = onboardingSteps.filter(s => s.done).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Hola, {user?.firstName || 'Administrador'} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Vista consolidada de todas tus sucursales</p>
        </div>

        {/* Plan badge */}
        {plan && (
          <div className="flex items-center gap-3 bg-white border border-border-primary rounded-xl px-4 py-3 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Crown className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground leading-none">{plan.planName}</p>
              <div className="flex items-center justify-end gap-1.5 mt-1">
                {planStatus && (
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${planStatus.color}`}>
                    {planStatus.icon}{planStatus.label}
                  </span>
                )}
                {plan.status === 'trial' && plan.trialDaysLeft != null && (
                  <span className="text-xs text-muted-foreground">
                    · {plan.trialDaysLeft}d restantes
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Onboarding banner — visible only on new/trial accounts with steps pending */}
      {isNewAccount && stepsCompleted < onboardingSteps.length && (
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-2xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
              <Sparkles className="w-5 h-5 text-glamor-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                ¡Bienvenido! Configura tu salón en minutos
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Completa estos pasos para sacar el máximo provecho de Glamorapp.{' '}
                <span className="font-medium text-glamor-primary">{stepsCompleted}/{onboardingSteps.length} completados</span>
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-white/60 rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-400 to-purple-500 rounded-full transition-all"
              style={{ width: `${(stepsCompleted / onboardingSteps.length) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {onboardingSteps.map((step) => (
              <Link
                key={step.href}
                href={step.done ? '#' : step.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                  step.done
                    ? 'bg-white/50 text-muted-foreground cursor-default'
                    : 'bg-white hover:bg-white/80 text-foreground shadow-sm'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  step.done ? 'bg-green-100' : 'bg-glamor-primary/10'
                }`}>
                  {step.done
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    : <ArrowRight className="w-3 h-3 text-glamor-primary" />
                  }
                </div>
                <span className={step.done ? 'line-through' : ''}>{step.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl p-5 border border-border-primary shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${kpi.color} flex items-center justify-center`}>
                <kpi.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
