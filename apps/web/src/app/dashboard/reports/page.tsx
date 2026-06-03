'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatCard } from '@/components/shared/stat-card';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  DollarSign, ShoppingBag, CalendarCheck, Users, Package,
  TrendingUp, Wallet, AlertTriangle, Download, RefreshCw,
  Filter, Scissors, BarChart3, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

type Tab = 'overview' | 'sales' | 'appointments' | 'inventory' | 'expenses';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

const EXPENSE_CATEGORY_COLORS: Record<string, string> = {};

// ── Helpers ────────────────────────────────────────────────────────────────
function groupSalesByDay(sales: any[]): { date: string; total: number; count: number }[] {
  const map: Record<string, { total: number; count: number }> = {};
  for (const s of sales) {
    const day = s.createdAt?.split('T')[0] ?? '';
    if (!map[day]) map[day] = { total: 0, count: 0 };
    map[day].total += Number(s.total || 0);
    map[day].count += 1;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date: date.slice(5), ...v })); // "MM-DD"
}

function groupExpensesByCategory(expenses: any[]): { name: string; total: number }[] {
  const map: Record<string, number> = {};
  for (const e of expenses) {
    const cat = e.category?.name ?? 'Sin categoría';
    map[cat] = (map[cat] || 0) + Number(e.amount || 0);
  }
  return Object.entries(map).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
}

function groupAppointmentsByStatus(appts: any[]): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  for (const a of appts) {
    const s = a.status ?? 'pending';
    map[s] = (map[s] || 0) + 1;
  }
  const labels: Record<string, string> = {
    completed: 'Completadas', cancelled: 'Canceladas', pending: 'Pendientes',
    confirmed: 'Confirmadas', no_show: 'No asistió', in_progress: 'En curso',
  };
  return Object.entries(map).map(([k, v]) => ({ name: labels[k] ?? k, value: v }));
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border-primary rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.name?.toLowerCase().includes('ingreso') || p.name?.toLowerCase().includes('total') || p.name?.toLowerCase().includes('gasto')
            ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { token } = useAuthStore();
  const [tab, setTab] = useState<Tab>('overview');

  // Data
  const [overview, setOverview]         = useState<any>(null);
  const [sales, setSales]               = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [topProducts, setTopProducts]   = useState<any[]>([]);
  const [inventory, setInventory]       = useState<any[]>([]);
  const [expenses, setExpenses]         = useState<any[]>([]);

  // Loading states
  const [loadingOverview, setLoadingOverview]         = useState(true);
  const [loadingSales, setLoadingSales]               = useState(false);
  const [loadingAppts, setLoadingAppts]               = useState(false);
  const [loadingInventory, setLoadingInventory]       = useState(false);
  const [loadingExpenses, setLoadingExpenses]         = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  // ── Fetch overview (always) ──────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    try { setOverview(await api.get('/reports/overview', { token: token! })); }
    catch { /* silent */ }
    finally { setLoadingOverview(false); }
  }, [token]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  // ── Fetch tab data on demand ─────────────────────────────────
  const fetchSales = useCallback(async () => {
    setLoadingSales(true);
    try {
      const [s, p] = await Promise.all([
        api.get(`/reports/sales?dateFrom=${dateFrom}&dateTo=${dateTo}`, { token: token! }),
        api.get('/reports/products?limit=8', { token: token! }),
      ]);
      setSales(Array.isArray(s) ? s : []);
      setTopProducts(Array.isArray(p) ? p : []);
    } catch { /* silent */ }
    finally { setLoadingSales(false); }
  }, [token, dateFrom, dateTo]);

  const fetchAppointments = useCallback(async () => {
    setLoadingAppts(true);
    try { setAppointments(await api.get('/reports/appointments', { token: token! })); }
    catch { /* silent */ }
    finally { setLoadingAppts(false); }
  }, [token]);

  const fetchInventory = useCallback(async () => {
    setLoadingInventory(true);
    try { setInventory(await api.get('/reports/inventory', { token: token! })); }
    catch { /* silent */ }
    finally { setLoadingInventory(false); }
  }, [token]);

  const fetchExpenses = useCallback(async () => {
    setLoadingExpenses(true);
    try { setExpenses(await api.get('/reports/expenses', { token: token! })); }
    catch { /* silent */ }
    finally { setLoadingExpenses(false); }
  }, [token]);

  useEffect(() => {
    if (tab === 'sales')        fetchSales();
    if (tab === 'appointments') fetchAppointments();
    if (tab === 'inventory')    fetchInventory();
    if (tab === 'expenses')     fetchExpenses();
  }, [tab]); // eslint-disable-line

  // Re-fetch sales when dates change
  useEffect(() => {
    if (tab === 'sales') fetchSales();
  }, [dateFrom, dateTo]); // eslint-disable-line

  // ── Derived data ─────────────────────────────────────────────
  const salesByDay       = groupSalesByDay(sales);
  const expenseByCategory = groupExpensesByCategory(expenses);
  const apptByStatus     = groupAppointmentsByStatus(appointments);
  const totalSalesAmount = sales.reduce((s, x) => s + Number(x.total || 0), 0);
  const avgTicket        = sales.length > 0 ? totalSalesAmount / sales.length : 0;
  const totalExpenses    = expenses.reduce((s, x) => s + Number(x.amount || 0), 0);
  const lowStockItems    = inventory.filter(p => Number(p.currentStock) <= Number(p.minStock || 0));

  // ── Render ───────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
          <p className="text-muted-foreground text-sm mt-1">Análisis y métricas de tu negocio</p>
        </div>
        <button
          onClick={fetchOverview}
          className="flex items-center gap-2 h-10 px-4 border border-border-primary rounded-lg text-sm font-medium hover:bg-surface-hover transition"
        >
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* KPI Cards (always visible) */}
      {loadingOverview ? (
        <LoadingSkeleton rows={1} cols={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Ingresos del mes"  value={formatCurrency(overview?.monthRevenue || 0)}    icon={<DollarSign className="w-5 h-5 text-green-500" />} />
          <StatCard title="Ventas del mes"    value={String(overview?.monthSalesCount || 0)}          icon={<ShoppingBag className="w-5 h-5 text-glamor-primary" />} />
          <StatCard title="Citas hoy"         value={String(overview?.todayAppointments || 0)}        icon={<CalendarCheck className="w-5 h-5 text-blue-500" />} />
          <StatCard title="Clientes totales"  value={String(overview?.totalCustomers || 0)}           icon={<Users className="w-5 h-5 text-purple-500" />} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border-primary overflow-x-auto">
        {([
          { key: 'overview',     label: 'Resumen',    icon: <BarChart3 className="w-4 h-4" /> },
          { key: 'sales',        label: 'Ventas',     icon: <DollarSign className="w-4 h-4" /> },
          { key: 'appointments', label: 'Citas',      icon: <CalendarCheck className="w-4 h-4" /> },
          { key: 'inventory',    label: 'Inventario', icon: <Package className="w-4 h-4" /> },
          { key: 'expenses',     label: 'Gastos',     icon: <Wallet className="w-4 h-4" /> },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap ${
              tab === t.key
                ? 'border-glamor-primary text-glamor-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ──────────────────────────────────────── */}
      {tab === 'overview' && !loadingOverview && overview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales summary */}
          <div className="bg-white rounded-xl border border-border-primary p-5">
            <h3 className="font-semibold text-foreground mb-4">Resumen del mes</h3>
            <div className="space-y-3">
              {[
                { label: 'Ingresos hoy',       value: formatCurrency(overview.todayRevenue || 0),    icon: <DollarSign className="w-4 h-4 text-green-500" />,        trend: null },
                { label: 'Ventas hoy',          value: String(overview.todaySalesCount || 0),          icon: <ShoppingBag className="w-4 h-4 text-glamor-primary" />,  trend: null },
                { label: 'Ticket promedio',     value: formatCurrency(overview.monthSalesCount > 0 ? overview.monthRevenue / overview.monthSalesCount : 0), icon: <TrendingUp className="w-4 h-4 text-blue-500" />, trend: null },
                { label: 'Citas programadas',   value: String(overview.todayAppointments || 0),        icon: <CalendarCheck className="w-4 h-4 text-orange-500" />,    trend: null },
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

          {/* Inventory summary */}
          <div className="bg-white rounded-xl border border-border-primary p-5">
            <h3 className="font-semibold text-foreground mb-4">Estado del inventario</h3>
            <div className="space-y-3">
              {[
                { label: 'Total productos',      value: String(overview.totalProducts || 0),      icon: <Package className="w-4 h-4 text-purple-500" /> },
                { label: 'Sin stock / bajo stock', value: String(overview.lowStockProducts || 0), icon: <AlertTriangle className="w-4 h-4 text-red-500" /> },
                { label: 'Total clientes',       value: String(overview.totalCustomers || 0),     icon: <Users className="w-4 h-4 text-blue-500" /> },
                { label: 'Ventas completadas',   value: String(overview.monthSalesCount || 0),    icon: <ShoppingBag className="w-4 h-4 text-glamor-primary" /> },
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
      )}

      {/* ── Tab: Sales ─────────────────────────────────────────── */}
      {tab === 'sales' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" /> Período:
            </div>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border-primary text-sm focus:outline-none focus:ring-2 focus:ring-glamor-primary/20" />
            <span className="text-muted-foreground text-sm">—</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border-primary text-sm focus:outline-none focus:ring-2 focus:ring-glamor-primary/20" />
          </div>

          {loadingSales ? <LoadingSkeleton rows={4} cols={2} /> : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total ingresos</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalSalesAmount)}</p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Número de ventas</p>
                  <p className="text-2xl font-bold text-foreground">{sales.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Ticket promedio</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(avgTicket)}</p>
                </div>
              </div>

              {/* Line chart — ingresos por día */}
              <div className="bg-white rounded-xl border border-border-primary p-5">
                <h3 className="font-semibold text-foreground mb-4">Ingresos por día</h3>
                {salesByDay.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sin datos en el período seleccionado</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={salesByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="total" name="Ingresos" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Bar chart — ventas por día */}
              <div className="bg-white rounded-xl border border-border-primary p-5">
                <h3 className="font-semibold text-foreground mb-4">Número de ventas por día</h3>
                {salesByDay.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={salesByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Ventas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Top products */}
              {topProducts.length > 0 && (
                <div className="bg-white rounded-xl border border-border-primary p-5">
                  <h3 className="font-semibold text-foreground mb-4">Productos más vistos en catálogo</h3>
                  <div className="space-y-2">
                    {topProducts.map((p: any, i: number) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className="w-5 text-xs text-muted-foreground text-right">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground ml-2 shrink-0">{p.catalogViews || 0} vistas</p>
                          </div>
                          <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
                            <div
                              className="h-full rounded-full bg-glamor-primary"
                              style={{ width: `${Math.min(100, ((p.catalogViews || 0) / (topProducts[0]?.catalogViews || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent sales table */}
              <div className="bg-white rounded-xl border border-border-primary p-5">
                <h3 className="font-semibold text-foreground mb-4">Ventas recientes</h3>
                {sales.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin ventas en el período</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border-primary">
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Fecha</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Cliente</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Productos</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.slice(0, 15).map((s: any) => (
                          <tr key={s.id} className="border-b border-border-primary/40 last:border-0 hover:bg-surface-hover/40">
                            <td className="py-2 px-3 text-muted-foreground">{formatDate(s.createdAt)}</td>
                            <td className="py-2 px-3">
                              {s.customer ? `${s.customer.firstName} ${s.customer.lastName}` : 'Cliente ocasional'}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">{s.items?.length || 0} ítem(s)</td>
                            <td className="py-2 px-3 text-right font-semibold text-green-600">{formatCurrency(s.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {sales.length > 15 && (
                      <p className="text-xs text-muted-foreground text-center pt-3">
                        Mostrando 15 de {sales.length} ventas
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Appointments ──────────────────────────────────── */}
      {tab === 'appointments' && (
        <div className="space-y-6">
          {loadingAppts ? <LoadingSkeleton rows={4} cols={2} /> : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Próximos 7 días</p>
                  <p className="text-2xl font-bold text-foreground">{appointments.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Confirmadas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {appointments.filter((a: any) => a.status === 'confirmed').length}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {appointments.filter((a: any) => a.status === 'pending').length}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Canceladas</p>
                  <p className="text-2xl font-bold text-red-500">
                    {appointments.filter((a: any) => a.status === 'cancelled').length}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie chart by status */}
                <div className="bg-white rounded-xl border border-border-primary p-5">
                  <h3 className="font-semibold text-foreground mb-4">Citas por estado</h3>
                  {apptByStatus.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sin citas próximas</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={apptByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                          {apptByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Upcoming list */}
                <div className="bg-white rounded-xl border border-border-primary p-5">
                  <h3 className="font-semibold text-foreground mb-4">Próximas citas</h3>
                  {appointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sin citas programadas</p>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {appointments.slice(0, 10).map((a: any) => (
                        <div key={a.id} className="flex items-center gap-3 py-2 border-b border-border-primary/40 last:border-0">
                          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                            <Scissors className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {a.customer ? `${a.customer.firstName} ${a.customer.lastName}` : 'Sin cliente'}
                            </p>
                            <p className="text-xs text-muted-foreground">{a.service?.name} · {formatDate(a.date)}</p>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            a.status === 'confirmed' ? 'bg-green-50 text-green-700' :
                            a.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                            'bg-yellow-50 text-yellow-700'
                          }`}>
                            {a.status === 'confirmed' ? 'Confirmada' : a.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Inventory ─────────────────────────────────────── */}
      {tab === 'inventory' && (
        <div className="space-y-6">
          {loadingInventory ? <LoadingSkeleton rows={4} cols={3} /> : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total productos</p>
                  <p className="text-2xl font-bold text-foreground">{inventory.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Stock crítico / sin stock</p>
                  <p className="text-2xl font-bold text-red-500">{lowStockItems.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Valor del inventario</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(inventory.reduce((s, p) => s + Number(p.costPrice || 0) * Number(p.currentStock || 0), 0))}
                  </p>
                </div>
              </div>

              {/* Bar chart — stock */}
              {inventory.length > 0 && (
                <div className="bg-white rounded-xl border border-border-primary p-5">
                  <h3 className="font-semibold text-foreground mb-4">Productos con menor stock</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={inventory.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="currentStock" name="Stock actual" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Low stock alert */}
              {lowStockItems.length > 0 && (
                <div className="bg-white rounded-xl border border-border-primary p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <h3 className="font-semibold text-foreground">Alertas de stock</h3>
                  </div>
                  <div className="space-y-2">
                    {lowStockItems.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-border-primary/40 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${Number(p.currentStock) <= 0 ? 'text-red-500' : 'text-orange-500'}`}>
                            {Number(p.currentStock) <= 0 ? 'Sin stock' : `${p.currentStock} uds.`}
                          </p>
                          <p className="text-xs text-muted-foreground">Mín: {p.minStock || 0}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Expenses ──────────────────────────────────────── */}
      {tab === 'expenses' && (
        <div className="space-y-6">
          {loadingExpenses ? <LoadingSkeleton rows={4} cols={2} /> : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total gastos del mes</p>
                  <p className="text-2xl font-bold text-red-500">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Número de gastos</p>
                  <p className="text-2xl font-bold text-foreground">{expenses.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Gasto promedio</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(expenses.length > 0 ? totalExpenses / expenses.length : 0)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie chart by category */}
                <div className="bg-white rounded-xl border border-border-primary p-5">
                  <h3 className="font-semibold text-foreground mb-4">Gastos por categoría</h3>
                  {expenseByCategory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sin gastos este mes</p>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={expenseByCategory} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={75}>
                            {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: any) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap gap-2 justify-center mt-2">
                        {expenseByCategory.map((c, i) => (
                          <span key={c.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Expenses list */}
                <div className="bg-white rounded-xl border border-border-primary p-5">
                  <h3 className="font-semibold text-foreground mb-4">Gastos recientes</h3>
                  {expenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sin gastos este mes</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {expenses.slice(0, 12).map((e: any) => (
                        <div key={e.id} className="flex items-center justify-between py-2 border-b border-border-primary/40 last:border-0">
                          <div>
                            <p className="text-sm font-medium text-foreground">{e.description || e.category?.name}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(e.expenseDate)} · {e.category?.name}</p>
                          </div>
                          <p className="text-sm font-bold text-red-500">{formatCurrency(e.amount)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
