'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import {
  Loader2, Store, Users, ShoppingCart, Calendar, DollarSign,
  Contact, Crown, Clock, CheckCircle2, AlertTriangle,
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
