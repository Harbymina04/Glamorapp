'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import {
  ShoppingBag, Clock, CheckCircle, Package, Truck, XCircle,
  ChevronDown, ChevronRight, Loader2, RefreshCw,
} from 'lucide-react';

type OrderStatus = 'all' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pendiente',       color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  confirmed: { label: 'Confirmado',      color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  preparing: { label: 'En preparación',  color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  ready:     { label: 'Listo',           color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
  delivered: { label: 'Entregado',       color: 'text-gray-600',   bg: 'bg-gray-50 border-gray-200' },
  cancelled: { label: 'Cancelado',       color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
};

const STATUS_NEXT: Record<string, { label: string; next: string }[]> = {
  pending:   [{ label: 'Confirmar', next: 'confirmed' }, { label: 'Cancelar', next: 'cancelled' }],
  confirmed: [{ label: 'En preparación', next: 'preparing' }],
  preparing: [{ label: 'Listo para entregar', next: 'ready' }],
  ready:     [{ label: 'Entregado', next: 'delivered' }],
};

const FILTER_TABS: { id: OrderStatus; label: string }[] = [
  { id: 'all',       label: 'Todos' },
  { id: 'pending',   label: 'Pendientes' },
  { id: 'confirmed', label: 'Confirmados' },
  { id: 'preparing', label: 'Preparando' },
  { id: 'ready',     label: 'Listos' },
  { id: 'delivered', label: 'Entregados' },
  { id: 'cancelled', label: 'Cancelados' },
];

function KpiCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function OrderRow({ order, onStatusChange }: { order: any; onStatusChange: (id: string, status: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const actions = STATUS_NEXT[order.status] || [];
  const items: any[] = Array.isArray(order.items) ? order.items : [];

  const handleAction = async (next: string) => {
    setUpdating(true);
    try { await onStatusChange(order.id, next); } finally { setUpdating(false); }
  };

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50/50">
        <td className="p-3">
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </td>
        <td className="p-3">
          <span className="font-mono text-sm font-semibold text-gray-900">{order.orderNumber}</span>
        </td>
        <td className="p-3">
          <p className="text-sm font-medium text-gray-900">{order.buyerName}</p>
          {order.buyerPhone && <p className="text-xs text-gray-500">{order.buyerPhone}</p>}
        </td>
        <td className="p-3 text-sm text-gray-600">
          {items.length} ítem{items.length !== 1 ? 's' : ''}
        </td>
        <td className="p-3">
          <span className="text-sm font-semibold text-gray-900">
            ${Number(order.total).toLocaleString('es-CO')}
          </span>
        </td>
        <td className="p-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
          </span>
        </td>
        <td className="p-3">
          <div className="flex gap-1.5">
            {actions.map(a => (
              <button key={a.next} onClick={() => handleAction(a.next)} disabled={updating}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition disabled:opacity-60 ${
                  a.next === 'cancelled'
                    ? 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
                    : 'text-white bg-[#EF2D8F] border-transparent hover:bg-[#d4267e]'
                }`}>
                {updating ? '...' : a.label}
              </button>
            ))}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="bg-gray-50 px-6 py-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Detalle del pedido</p>
              {items.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{item.name || item.productName || 'Producto'}</span>
                  <span className="text-gray-500">x{item.qty || item.quantity || 1}</span>
                  <span className="font-medium text-gray-900">
                    ${Number(item.price || 0).toLocaleString('es-CO')}
                  </span>
                </div>
              ))}
              {order.buyerNotes && (
                <p className="text-xs text-gray-500 mt-2 italic">Notas: {order.buyerNotes}</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function OrdersPage() {
  const { token } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<OrderStatus>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = activeStatus !== 'all' ? `?status=${activeStatus}` : '';
      const [res, st] = await Promise.all([
        api.get(`/storefront/orders${q}`, { token: token! }),
        api.get('/storefront/stats', { token: token! }),
      ]);
      setOrders(res.data || []);
      setStats(st);
    } catch { } finally { setLoading(false); }
  }, [token, activeStatus]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: string, status: string) => {
    await api.patch(`/storefront/orders/${id}/status`, { status }, { token: token! });
    setOrders(os => os.map(o => o.id === id ? { ...o, status } : o));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#EF2D8F]" /> Pedidos Online
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona los pedidos recibidos desde tu vitrina digital</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* KPI Row */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Pedidos hoy" value={stats.ordersToday}
            icon={<ShoppingBag className="w-5 h-5 text-[#EF2D8F]" />} color="bg-pink-50" />
          <KpiCard label="Pendientes" value={stats.pendingOrders}
            icon={<Clock className="w-5 h-5 text-amber-600" />} color="bg-amber-50" />
          <KpiCard label="Pedidos mes" value={stats.monthOrders}
            icon={<Package className="w-5 h-5 text-blue-600" />} color="bg-blue-50" />
          <KpiCard label="Ingresos mes"
            value={`$${Math.round(stats.monthRevenue).toLocaleString('es-CO')}`}
            icon={<CheckCircle className="w-5 h-5 text-green-600" />} color="bg-green-50" />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {FILTER_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveStatus(tab.id)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition ${
              activeStatus === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-[#EF2D8F]" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-3 w-8" />
                <th className="p-3 text-left text-xs font-semibold text-gray-600">Orden</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-600">Cliente</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-600">Ítems</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-600">Total</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-600">Estado</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-400 text-sm">No hay pedidos en esta categoría</p>
                  </td>
                </tr>
              ) : (
                orders.map(o => (
                  <OrderRow key={o.id} order={o} onStatusChange={handleStatusChange} />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
