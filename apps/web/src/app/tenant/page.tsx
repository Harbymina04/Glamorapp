'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Store, Users, ShoppingCart, Calendar, DollarSign, TrendingUp } from 'lucide-react';

interface DashboardData {
  totalStores: number;
  totalUsers: number;
  totalCustomers: number;
  totalSales: number;
  pendingAppointments: number;
  totalRevenue: number;
}

export default function TenantDashboardPage() {
  const { token } = useAuthStore();
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
    { label: 'Sucursales', value: data?.totalStores || 0, icon: Store, color: 'bg-blue-100 text-blue-600' },
    { label: 'Usuarios', value: data?.totalUsers || 0, icon: Users, color: 'bg-purple-100 text-purple-600' },
    { label: 'Clientes', value: data?.totalCustomers || 0, icon: Users, color: 'bg-green-100 text-green-600' },
    { label: 'Ventas Totales', value: data?.totalSales || 0, icon: ShoppingCart, color: 'bg-orange-100 text-orange-600' },
    { label: 'Citas Pendientes', value: data?.pendingAppointments || 0, icon: Calendar, color: 'bg-amber-100 text-amber-600' },
    { label: 'Ingresos', value: formatCurrency(data?.totalRevenue || 0), icon: DollarSign, color: 'bg-emerald-100 text-emerald-600', isCurrency: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Vista consolidada de todas tus sucursales</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl p-5 border border-border-primary shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${kpi.color} flex items-center justify-center`}>
                <kpi.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {kpi.isCurrency ? kpi.value : kpi.value}
                </p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
