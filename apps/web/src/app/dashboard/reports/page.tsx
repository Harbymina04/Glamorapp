'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from '@/components/shared/stat-card';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { DollarSign, ShoppingBag, CalendarCheck, TrendingUp, Package, Users, Wallet, Download } from 'lucide-react';

export default function ReportsPage() {
  const { token } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/overview', { token: token! })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingSkeleton rows={3} cols={3} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
          <p className="text-muted-foreground text-sm mt-1">Análisis y métricas de tu negocio</p>
        </div>
        <button className="flex items-center gap-2 h-10 px-4 border border-border-primary rounded-lg text-sm font-medium hover:bg-surface-hover transition">
          <Download className="w-4 h-4" /> Exportar reporte
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Ingresos del mes" value={formatCurrency(data?.monthRevenue || 0)} icon={<DollarSign className="w-5 h-5 text-green-500" />} />
        <StatCard title="Ventas del mes" value={String(data?.monthSalesCount || 0)} icon={<ShoppingBag className="w-5 h-5 text-glamor-primary" />} />
        <StatCard title="Citas hoy" value={String(data?.todayAppointments || 0)} icon={<CalendarCheck className="w-5 h-5 text-blue-500" />} />
        <StatCard title="Clientes" value={String(data?.totalCustomers || 0)} icon={<Users className="w-5 h-5 text-purple-500" />} />
      </div>

      {/* Report sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-border-primary p-5">
          <h3 className="font-semibold text-foreground mb-4">Resumen de Ventas</h3>
          <div className="space-y-3">
            {[
              { label: 'Ventas completadas', value: String(data?.monthSalesCount || 0), icon: <ShoppingBag className="w-4 h-4 text-green-500" /> },
              { label: 'Ticket promedio', value: formatCurrency(data?.monthSalesCount > 0 ? data.monthRevenue / data.monthSalesCount : 0), icon: <TrendingUp className="w-4 h-4 text-blue-500" /> },
              { label: 'Ingresos hoy', value: formatCurrency(data?.todayRevenue || 0), icon: <DollarSign className="w-4 h-4 text-glamor-primary" /> },
              { label: 'Citas hoy', value: String(data?.todayAppointments || 0), icon: <CalendarCheck className="w-4 h-4 text-orange-500" /> },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border-primary/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-hover flex items-center justify-center">{item.icon}</div>
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
                <span className="font-semibold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border-primary p-5">
          <h3 className="font-semibold text-foreground mb-4">Indicadores de Inventario</h3>
          <div className="space-y-3">
            {[
              { label: 'Total productos', value: String(data?.totalProducts || 0), icon: <Package className="w-4 h-4 text-purple-500" /> },
              { label: 'Productos sin stock', value: String(data?.lowStockProducts || 0), icon: <Package className="w-4 h-4 text-red-500" /> },
              { label: 'Clientes totales', value: String(data?.totalCustomers || 0), icon: <Users className="w-4 h-4 text-blue-500" /> },
              { label: 'Ventas hoy', value: String(data?.todaySalesCount || 0), icon: <ShoppingBag className="w-4 h-4 text-glamor-primary" /> },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border-primary/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-hover flex items-center justify-center">{item.icon}</div>
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
                <span className="font-semibold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
