'use client';

import { PlanGate } from '@/hooks/use-plan-gate';

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
  Filter, Scissors, BarChart3, ArrowUpRight, ArrowDownRight, Receipt,
} from 'lucide-react';
import Link from 'next/link';

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
function ReportsPage() {
  const { token } = useAuthStore();
  const [tab, setTab] = useState<Tab>('overview');

  // Data
  const [overview, setOverview]         = useState<any>(null);
  const [salesData, setSalesData]       = useState<any>(null);   // { data, summary, total, totalPages }
  const [appointments, setAppointments] = useState<any>(null);   // { data, stats, total }
  const [topSelling, setTopSelling]     = useState<any[]>([]);
  const [inventory, setInventory]       = useState<any[]>([]);
  const [expensesData, setExpensesData] = useState<any>(null);   // { data, summary }

  // Loading states
  const [loadingOverview, setLoadingOverview]   = useState(true);
  const [loadingSales, setLoadingSales]         = useState(false);
  const [loadingAppts, setLoadingAppts]         = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingExpenses, setLoadingExpenses]   = useState(false);
  const [fetchError, setFetchError]             = useState('');

  // Pagination (sales)
  const [salesPage, setSalesPage] = useState(1);

  // Filters — use LOCAL date (not UTC) so timezones don't shift the visible day
  const localDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return localDate(d);
  });
  const [dateTo, setDateTo] = useState(() => localDate(new Date()));

  // ── Fetch overview (always) ──────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    try { setOverview(await api.get('/reports/overview', { token: token! })); }
    catch { /* silent */ }
    finally { setLoadingOverview(false); }
  }, [token]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  // ── Fetch tab data on demand ─────────────────────────────────
  const fetchSales = useCallback(async (page = 1) => {
    setLoadingSales(true); setFetchError('');
    try {
      const [s, ts] = await Promise.all([
        api.get(`/reports/sales?dateFrom=${dateFrom}&dateTo=${dateTo}&page=${page}&limit=50`, { token: token! }),
        api.get(`/reports/top-selling?dateFrom=${dateFrom}&dateTo=${dateTo}`, { token: token! }),
      ]);
      setSalesData(s);
      setTopSelling(Array.isArray(ts) ? ts : []);
      setSalesPage(page);
    } catch (e: any) { setFetchError(e.message || 'Error al cargar ventas'); }
    finally { setLoadingSales(false); }
  }, [token, dateFrom, dateTo]);

  const fetchAppointments = useCallback(async () => {
    setLoadingAppts(true);
    try { setAppointments(await api.get(`/reports/appointments?dateFrom=${dateFrom}&dateTo=${dateTo}`, { token: token! })); }
    catch { /* silent */ }
    finally { setLoadingAppts(false); }
  }, [token, dateFrom, dateTo]);

  const fetchInventory = useCallback(async () => {
    setLoadingInventory(true);
    try { setInventory(await api.get('/reports/inventory', { token: token! })); }
    catch { /* silent */ }
    finally { setLoadingInventory(false); }
  }, [token]);

  const fetchExpenses = useCallback(async () => {
    setLoadingExpenses(true);
    try { setExpensesData(await api.get(`/reports/expenses?dateFrom=${dateFrom}&dateTo=${dateTo}`, { token: token! })); }
    catch { /* silent */ }
    finally { setLoadingExpenses(false); }
  }, [token, dateFrom, dateTo]);

  useEffect(() => {
    if (tab === 'sales')        fetchSales(1);
    if (tab === 'appointments') fetchAppointments();
    if (tab === 'inventory')    fetchInventory();
    if (tab === 'expenses')     fetchExpenses();
  }, [tab]); // eslint-disable-line

  // Re-fetch when dates change
  useEffect(() => {
    if (tab === 'sales')        fetchSales(1);
    if (tab === 'appointments') fetchAppointments();
    if (tab === 'expenses')     fetchExpenses();
  }, [dateFrom, dateTo]); // eslint-disable-line

  // ── Derived data ─────────────────────────────────────────────
  const sales             = salesData?.data ?? [];
  const salesSummary      = salesData?.summary;
  const expenses          = expensesData?.data ?? [];
  const expensesSummary   = expensesData?.summary;
  const apptList          = appointments?.data ?? [];
  const apptStats         = appointments?.stats ?? [];

  const salesByDay        = groupSalesByDay(sales);
  const expenseByCategory = groupExpensesByCategory(expenses);
  const apptByStatus      = groupAppointmentsByStatus(apptList);
  const lowStockItems     = inventory.filter(p => Number(p.currentStock) <= Number(p.minStock || 0));

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

      {/* Acceso rápido al reporte IVA */}
      <div className="mb-4">
        <Link href="/dashboard/reports/iva" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-100 transition">
          <Receipt className="w-4 h-4" /> Reporte IVA (DIAN)
        </Link>
      </div>

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

          {fetchError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{fetchError}</div>
          )}
          {loadingSales ? <LoadingSkeleton rows={4} cols={2} /> : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Ventas completadas</p>
                  <p className="text-2xl font-bold text-foreground">{salesSummary?.totalSales ?? sales.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Subtotal (sin IVA)</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(Number(salesSummary?.subtotal || 0) - Number(salesSummary?.totalIva || 0))}</p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">IVA recaudado</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(salesSummary?.totalIva || 0)}</p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total con IVA</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(salesSummary?.totalRevenue || 0)}</p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Ticket promedio</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(salesSummary?.avgTicket || 0)}</p>
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

              {/* Top selling products */}
              {topSelling.length > 0 && (
                <div className="bg-white rounded-xl border border-border-primary p-5">
                  <h3 className="font-semibold text-foreground mb-4">Productos más vendidos</h3>
                  <div className="space-y-2">
                    {topSelling.map((p: any, i: number) => (
                      <div key={p.productId} className="flex items-center gap-3">
                        <span className="w-5 text-xs text-muted-foreground text-right">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                            <div className="flex items-center gap-3 ml-2 shrink-0">
                              <span className="text-xs text-muted-foreground">{p.qtySold} uds.</span>
                              <span className="text-xs font-semibold text-green-600">{formatCurrency(p.revenue)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
                            <div
                              className="h-full rounded-full bg-glamor-primary"
                              style={{ width: `${Math.min(100, (p.qtySold / (topSelling[0]?.qtySold || 1)) * 100)}%` }}
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
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">N° Venta</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Cliente</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Subtotal</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">IVA</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((s: any) => (
                          <tr key={s.id} className="border-b border-border-primary/40 last:border-0 hover:bg-surface-hover/40">
                            <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{formatDate(s.createdAt)}</td>
                            <td className="py-2 px-3 text-xs text-muted-foreground">{s.saleNumber}</td>
                            <td className="py-2 px-3">
                              {s.customer ? `${s.customer.firstName} ${s.customer.lastName}` : 'Cliente ocasional'}
                            </td>
                            <td className="py-2 px-3 text-right text-muted-foreground">{formatCurrency(Number(s.subtotal || 0) - Number(s.taxAmount || 0))}</td>
                            <td className="py-2 px-3 text-right text-blue-600 text-xs">{formatCurrency(s.taxAmount || 0)}</td>
                            <td className="py-2 px-3 text-right font-semibold text-green-600">{formatCurrency(s.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* Pagination */}
                    {salesData?.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-3 px-1">
                        <p className="text-xs text-muted-foreground">
                          Página {salesPage} de {salesData.totalPages} · {salesData.total} ventas en total
                        </p>
                        <div className="flex gap-2">
                          <button
                            disabled={salesPage <= 1}
                            onClick={() => fetchSales(salesPage - 1)}
                            className="h-7 px-3 rounded-lg border border-border-primary text-xs hover:bg-surface-hover disabled:opacity-40"
                          >
                            Anterior
                          </button>
                          <button
                            disabled={salesPage >= salesData.totalPages}
                            onClick={() => fetchSales(salesPage + 1)}
                            className="h-7 px-3 rounded-lg border border-border-primary text-xs hover:bg-surface-hover disabled:opacity-40"
                          >
                            Siguiente
                          </button>
                        </div>
                      </div>
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
          {/* Date filter */}
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

          {loadingAppts ? <LoadingSkeleton rows={4} cols={2} /> : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total citas</p>
                  <p className="text-2xl font-bold text-foreground">{appointments?.total ?? apptList.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Confirmadas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {apptList.filter((a: any) => a.status === 'confirmed').length}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {apptList.filter((a: any) => a.status === 'pending').length}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Canceladas</p>
                  <p className="text-2xl font-bold text-red-500">
                    {apptList.filter((a: any) => a.status === 'cancelled').length}
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

                {/* Appointments list */}
                <div className="bg-white rounded-xl border border-border-primary p-5">
                  <h3 className="font-semibold text-foreground mb-4">Citas del período</h3>
                  {apptList.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sin citas en el período</p>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {apptList.slice(0, 20).map((a: any) => (
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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total productos</p>
                  <p className="text-2xl font-bold text-foreground">{inventory.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Stock crítico / sin stock</p>
                  <p className="text-2xl font-bold text-red-500">{lowStockItems.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Valor del inventario (costo)</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(inventory.reduce((s, p) => s + Number(p.costPrice || 0) * Number(p.currentStock || 0), 0))}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Valor a precio de venta</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(inventory.reduce((s, p) => s + Number(p.salePrice || 0) * Number(p.currentStock || 0), 0))}
                  </p>
                </div>
              </div>

              {/* Bar chart — solo productos bajo stock mínimo */}
              {lowStockItems.length > 0 ? (
                <div className="bg-white rounded-xl border border-border-primary p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Productos bajo stock mínimo ({lowStockItems.length})
                    </h3>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(180, lowStockItems.length * 36)}>
                    <BarChart data={lowStockItems} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const item = lowStockItems.find((p: any) => p.name === label);
                          return (
                            <div className="bg-white border border-border-primary rounded-lg shadow-lg p-3 text-xs">
                              <p className="font-semibold text-foreground mb-1">{label}</p>
                              <p className="text-red-500">Stock actual: <strong>{payload[0]?.value}</strong></p>
                              <p className="text-muted-foreground">Stock mínimo: <strong>{item?.minStock ?? 0}</strong></p>
                              <p className="text-muted-foreground">SKU: {item?.sku ?? '—'}</p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="currentStock" name="Stock actual" radius={[0, 4, 4, 0]}>
                        {lowStockItems.map((p: any, i: number) => (
                          <Cell
                            key={i}
                            fill={Number(p.currentStock) <= 0 ? '#ef4444' : '#f97316'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Sin stock (0 uds.)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-500 inline-block" /> Bajo mínimo</span>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-border-primary p-8 text-center">
                  <Package className="w-10 h-10 text-green-500 mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-medium text-green-700">Inventario saludable</p>
                  <p className="text-xs text-muted-foreground mt-1">Todos los productos están sobre su stock mínimo</p>
                </div>
              )}

              {/* Tabla detalle productos bajo mínimo */}
              {lowStockItems.length > 0 && (
                <div className="bg-white rounded-xl border border-border-primary shadow-card overflow-hidden">
                  <div className="px-5 py-3 border-b border-border-primary">
                    <h3 className="font-semibold text-foreground text-sm">Detalle de alertas</h3>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border-primary bg-surface-primary/50">
                        <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Producto</th>
                        <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Stock actual</th>
                        <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Stock mínimo</th>
                        <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Déficit</th>
                        <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Precio venta</th>
                        <th className="text-center px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {lowStockItems.map((p: any) => {
                        const deficit = (p.minStock || 0) - Number(p.currentStock);
                        const isOut = Number(p.currentStock) <= 0;
                        return (
                          <tr key={p.id} className="hover:bg-surface-hover/50 transition">
                            <td className="px-5 py-3">
                              <p className="text-sm font-medium text-foreground">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.sku ?? '—'} · IVA {p.isIvaExcluded ? 'excluido' : `${p.ivaRate}%`}</p>
                            </td>
                            <td className={`px-5 py-3 text-right text-sm font-bold ${isOut ? 'text-red-500' : 'text-orange-500'}`}>
                              {p.currentStock}
                            </td>
                            <td className="px-5 py-3 text-right text-sm text-muted-foreground">{p.minStock || 0}</td>
                            <td className="px-5 py-3 text-right text-sm font-semibold text-red-500">
                              -{Math.max(0, deficit)}
                            </td>
                            <td className="px-5 py-3 text-right text-sm text-foreground">{formatCurrency(p.salePrice)}</td>
                            <td className="px-5 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                isOut ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {isOut ? 'Sin stock' : 'Bajo mínimo'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Expenses ──────────────────────────────────────── */}
      {tab === 'expenses' && (
        <div className="space-y-6">
          {/* Date filter */}
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

          {loadingExpenses ? <LoadingSkeleton rows={4} cols={2} /> : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total gastos del período</p>
                  <p className="text-2xl font-bold text-red-500">{formatCurrency(expensesSummary?.total || 0)}</p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Número de gastos</p>
                  <p className="text-2xl font-bold text-foreground">{expensesSummary?.count ?? expenses.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-border-primary p-4">
                  <p className="text-xs text-muted-foreground mb-1">Gasto promedio</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(expensesSummary?.count > 0 ? Number(expensesSummary.total) / expensesSummary.count : 0)}
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

export default function ReportsPageWithGate() {
  return <PlanGate feature="reports"><ReportsPage /></PlanGate>;
}
