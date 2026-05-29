'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from '@/components/shared/stat-card';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { DollarSign, CalendarCheck, Package, UserCheck, TrendingUp, ShoppingBag, Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // tenant_admin → /tenant (only from root dashboard, not subpages)
  useEffect(() => {
    if (user?.role === 'tenant_admin') {
      router.replace('/tenant');
    }
  }, [user?.role, router]);

  useEffect(() => {
    api.get('/reports/overview', { token: token! })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingSkeleton rows={3} cols={4} />;

  const firstName = user?.firstName || 'Usuario';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          ¡Hola, {firstName}! <span className="text-2xl">👋</span>
        </h1>
        <p className="text-muted-foreground mt-1">Resumen de tu negocio</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Ventas del mes"
          value={formatCurrency(data?.monthRevenue || 0)}
          icon={<DollarSign className="w-5 h-5 text-glamor-primary" />}
          trend={{ value: 12, label: 'vs mes anterior', positive: true }}
        />
        <StatCard
          title="Citas hoy"
          value={String(data?.todayAppointments || 0)}
          icon={<CalendarCheck className="w-5 h-5 text-blue-500" />}
        />
        <StatCard
          title="Productos"
          value={String(data?.totalProducts || 0)}
          icon={<Package className="w-5 h-5 text-green-500" />}
        />
        <StatCard
          title="Clientes"
          value={String(data?.totalCustomers || 0)}
          icon={<UserCheck className="w-5 h-5 text-purple-500" />}
          trend={{ value: 5, label: 'nuevos', positive: true }}
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-border-primary p-5">
          <h3 className="font-semibold text-foreground mb-3">Acciones rápidas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Nueva venta', icon: ShoppingBag, href: '/dashboard/pos', color: 'bg-green-50 text-green-600' },
              { label: 'Agendar cita', icon: CalendarCheck, href: '/dashboard/appointments', color: 'bg-blue-50 text-blue-600' },
              { label: 'Ver inventario', icon: Package, href: '/dashboard/inventory', color: 'bg-orange-50 text-orange-600' },
              { label: 'Agentes IA', icon: Sparkles, href: '/dashboard/ai-agents', color: 'bg-purple-50 text-purple-600' },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border-primary hover:border-glamor-primary/30 hover:bg-glamor-50 transition text-center"
              >
                <div className={`w-10 h-10 rounded-full ${action.color} flex items-center justify-center`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-foreground">{action.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Store info card */}
        <div className="bg-white rounded-xl border border-border-primary p-5 gradient-card-accent">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center p-1.5">
              <img src="/logo.png" alt="Glamorapp" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Glamorapp</h3>
              <p className="text-xs text-muted-foreground">Plan Profesional</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Ventas hoy', value: formatCurrency(data?.todayRevenue || 0) },
              { label: 'Stock bajo', value: `${data?.lowStockProducts || 0} productos` },
              { label: 'Ticket promedio', value: formatCurrency(data?.monthSalesCount > 0 ? (data.monthRevenue / data.monthSalesCount) : 0) },
            ].map(item => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
