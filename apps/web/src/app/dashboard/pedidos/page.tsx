'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ShoppingBag, Loader2, CheckCircle2, Clock, AlertCircle,
  ChevronDown, ChevronUp, Package, Phone, Mail, MessageSquare,
  RefreshCw, XCircle, Truck, ShoppingCart,
} from 'lucide-react';

// ─── Types & helpers ─────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
  pending:    { label: 'Pendiente',      color: 'bg-amber-100 text-amber-700 border-amber-200',   next: 'confirmed',   nextLabel: 'Confirmar' },
  confirmed:  { label: 'Confirmado',     color: 'bg-blue-100 text-blue-700 border-blue-200',      next: 'preparing',   nextLabel: 'Iniciar preparación' },
  preparing:  { label: 'En preparación', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', next: 'ready',       nextLabel: 'Listo para entregar' },
  ready:      { label: 'Listo',          color: 'bg-green-100 text-green-700 border-green-200',   next: 'delivered',   nextLabel: 'Marcar entregado' },
  delivered:  { label: 'Entregado',      color: 'bg-gray-100 text-gray-600 border-gray-200',      },
  cancelled:  { label: 'Cancelado',      color: 'bg-red-100 text-red-600 border-red-200',         },
};

const PAYMENT_LABELS: Record<string, string> = {
  store: 'Pago en tienda', card: 'Tarjeta', pse: 'PSE', nequi: 'Nequi',
};

const TABS = [
  { key: 'all',       label: 'Todos' },
  { key: 'pending',   label: 'Pendientes' },
  { key: 'confirmed', label: 'Confirmados' },
  { key: 'preparing', label: 'En preparación' },
  { key: 'ready',     label: 'Listos' },
  { key: 'delivered', label: 'Historial' },
];

// ─── Order row ────────────────────────────────────────────────────

function OrderRow({
  order, onStatusChange, loading,
}: { order: any; onStatusChange: (id: string, status: string) => void; loading: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

  // "Cobrar en POS" — store-payment orders without a linked sale
  const isStorePayment = order.paymentMethod === 'store' || !order.paymentMethod;
  const isOpenStatus   = ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status);
  // For delivered orders: only show button if delivered very recently (within 2h) — avoids showing on old test orders
  const isRecentlyDelivered = order.status === 'delivered'
    && (Date.now() - new Date(order.updatedAt || order.createdAt).getTime()) < 2 * 60 * 60 * 1000;
  const canChargeInPos = isStorePayment && (isOpenStatus || isRecentlyDelivered) && !order.saleId;
  // On 'ready' with store payment, hide the "Marcar entregado" button — cashier must charge via POS first
  const hideProgressBtn = order.status === 'ready' && isStorePayment && !order.saleId;
  const items: any[] = Array.isArray(order.items) ? order.items : (typeof order.items === 'string' ? JSON.parse(order.items) : []);

  return (
    <div className={`border rounded-xl overflow-hidden bg-white transition-shadow ${expanded ? 'shadow-md' : 'shadow-sm hover:shadow-md'}`}>
      {/* Header row */}
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Order number + status */}
        <div className="min-w-[90px]">
          <p className="font-bold text-sm text-foreground">{order.orderNumber}</p>
          <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
        </div>

        {/* Customer */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{order.buyerName}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {order.buyerPhone && (
              <a href={`tel:${order.buyerPhone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                <Phone className="w-3 h-3" />{order.buyerPhone}
              </a>
            )}
            {order.buyerEmail && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="w-3 h-3" />{order.buyerEmail}
              </span>
            )}
          </div>
        </div>

        {/* Items summary */}
        <div className="hidden sm:block text-right min-w-[80px]">
          <p className="text-sm font-medium">{items.length} ítem{items.length !== 1 ? 's' : ''}</p>
          <p className="text-xs text-muted-foreground">{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</p>
        </div>

        {/* Total */}
        <div className="text-right min-w-[90px]">
          <p className="font-bold text-sm">{formatCurrency(Number(order.total))}</p>
          {Number(order.deliveryFee) > 0 && (
            <p className="text-xs text-muted-foreground">+{formatCurrency(Number(order.deliveryFee))} envío</p>
          )}
        </div>

        {/* Status badge */}
        <span className={`hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
          {cfg.label}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Progress button — hidden on 'ready' when cashier must charge via POS first */}
          {cfg.next && order.status !== 'delivered' && order.status !== 'cancelled' && !hideProgressBtn && (
            <button
              onClick={() => onStatusChange(order.id, cfg.next!)}
              disabled={loading}
              className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-60 flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              {cfg.nextLabel}
            </button>
          )}
          {/* Cobrar en POS — pago en tienda, mostrar siempre que no haya venta vinculada */}
          {canChargeInPos && (
            <button
              onClick={() => router.push(`/dashboard/pos?orderId=${order.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <ShoppingCart className="w-3 h-3" />
              {order.status === 'ready' ? 'Cobrar y entregar' : 'Cobrar en POS'}
            </button>
          )}
          {order.status === 'pending' && (
            <button
              onClick={() => onStatusChange(order.id, 'cancelled')}
              disabled={loading}
              title="Cancelar pedido"
              className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t bg-gray-50 px-4 py-4 space-y-4">
          {/* Items */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Productos</p>
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin detalle de ítems</p>
              ) : items.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.name || item.productName || `Producto ${i + 1}`}</p>
                      {item.qty && <p className="text-xs text-muted-foreground">Cantidad: {item.qty}</p>}
                    </div>
                  </div>
                  <p className="text-sm font-semibold">
                    {item.price ? formatCurrency(Number(item.price) * (item.qty || 1)) : '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Notes + Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {order.buyerNotes && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Nota del cliente
                </p>
                <p className="text-sm text-amber-800">{order.buyerNotes}</p>
              </div>
            )}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(Number(order.subtotal))}</span>
              </div>
              {Number(order.deliveryFee) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envío</span>
                  <span>{formatCurrency(Number(order.deliveryFee))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t pt-1">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(Number(order.total))}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pt-1">
                <span>Método de pago</span>
                <span>{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Status timeline */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Estado actual</p>
            <div className="flex items-center gap-2 flex-wrap">
              {['pending', 'confirmed', 'preparing', 'ready', 'delivered'].map((s, i) => {
                const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];
                const currentIdx = statuses.indexOf(order.status === 'cancelled' ? 'pending' : order.status);
                const stepIdx = statuses.indexOf(s);
                const isDone = order.status !== 'cancelled' && stepIdx <= currentIdx;
                const isCurrent = s === order.status;
                return (
                  <div key={s} className="flex items-center gap-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      order.status === 'cancelled' ? 'bg-gray-100 text-gray-400'
                      : isCurrent ? 'bg-primary text-white'
                      : isDone ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isDone && !isCurrent ? '✓' : i + 1}
                    </div>
                    <span className={`text-xs ${isCurrent ? 'font-semibold text-primary' : isDone ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {STATUS_CONFIG[s].label}
                    </span>
                    {i < 4 && <span className="text-gray-300 mx-1">→</span>}
                  </div>
                );
              })}
              {order.status === 'cancelled' && (
                <span className="ml-2 text-xs text-red-500 font-semibold">● Cancelado</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────

export default function PedidosPage() {
  const { token, user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [error, setError] = useState('');

  // KPIs
  const [kpis, setKpis] = useState({
    pending: 0, confirmed: 0, preparing: 0, ready: 0, todayTotal: 0,
  });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (activeTab !== 'all' && activeTab !== 'delivered') params.set('status', activeTab);
      if (activeTab === 'delivered') params.set('status', 'delivered');
      // Always filter by the current store
      if (user?.storeId) params.set('storeId', user.storeId);

      const [ordersRes] = await Promise.all([
        api.get(`/storefront/orders?${params}`, { token: token! }),
      ]);
      setOrders(ordersRes.data || []);
      setTotal(ordersRes.total || 0);

      // Load KPI counts (all statuses)
      const allRes = await api.get(`/storefront/orders?limit=1${user?.storeId ? `&storeId=${user.storeId}` : ''}`, { token: token! });
      // Build kpis from counts — fetch individually for accuracy
      const [p, c, pr, r] = await Promise.all([
        api.get(`/storefront/orders?status=pending&limit=1${user?.storeId ? `&storeId=${user.storeId}` : ''}`, { token: token! }),
        api.get(`/storefront/orders?status=confirmed&limit=1${user?.storeId ? `&storeId=${user.storeId}` : ''}`, { token: token! }),
        api.get(`/storefront/orders?status=preparing&limit=1${user?.storeId ? `&storeId=${user.storeId}` : ''}`, { token: token! }),
        api.get(`/storefront/orders?status=ready&limit=1${user?.storeId ? `&storeId=${user.storeId}` : ''}`, { token: token! }),
      ]);
      setKpis({
        pending:   p.total  || 0,
        confirmed: c.total  || 0,
        preparing: pr.total || 0,
        ready:     r.total  || 0,
        todayTotal: 0,
      });
    } catch (e: any) {
      setError(e?.message || 'Error al cargar pedidos');
    } finally { setLoading(false); }
  }, [token, user?.storeId, activeTab]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setActionLoading(orderId);
    try {
      await api.patch(`/storefront/orders/${orderId}/status`, { status: newStatus }, { token: token! });
      load();
    } catch (e: any) {
      setError(e?.message || 'Error al actualizar el pedido');
    } finally { setActionLoading(null); }
  };

  const urgentCount = kpis.pending + kpis.confirmed;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Pedidos Online
            {urgentCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                {urgentCount} nuevos
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pedidos de la tienda digital para esta sucursal
          </p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-muted transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pendientes', value: kpis.pending,   color: 'border-amber-400 bg-amber-50', text: 'text-amber-700', icon: <Clock className="w-4 h-4" /> },
          { label: 'Confirmados', value: kpis.confirmed, color: 'border-blue-400 bg-blue-50',   text: 'text-blue-700',  icon: <CheckCircle2 className="w-4 h-4" /> },
          { label: 'Preparando',  value: kpis.preparing, color: 'border-indigo-400 bg-indigo-50', text: 'text-indigo-700', icon: <Package className="w-4 h-4" /> },
          { label: 'Listos',      value: kpis.ready,     color: 'border-green-400 bg-green-50',  text: 'text-green-700', icon: <Truck className="w-4 h-4" /> },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border-2 p-4 ${k.color}`}>
            <div className={`flex items-center gap-2 ${k.text} mb-1`}>
              {k.icon}
              <span className="text-xs font-semibold uppercase tracking-wide">{k.label}</span>
            </div>
            <p className={`text-3xl font-bold ${k.text}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Tab filter */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-white border-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
            {tab.key === 'pending'   && kpis.pending   > 0 && <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5">{kpis.pending}</span>}
            {tab.key === 'preparing' && kpis.preparing > 0 && <span className="ml-1.5 bg-indigo-500 text-white text-xs rounded-full px-1.5">{kpis.preparing}</span>}
            {tab.key === 'ready'     && kpis.ready     > 0 && <span className="ml-1.5 bg-green-500 text-white text-xs rounded-full px-1.5">{kpis.ready}</span>}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="font-medium text-muted-foreground">
            {activeTab === 'all' ? 'No hay pedidos para esta sucursal' : `No hay pedidos ${STATUS_CONFIG[activeTab]?.label?.toLowerCase() || ''}`}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Los pedidos de la tienda digital aparecerán aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <OrderRow
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
              loading={actionLoading === order.id}
            />
          ))}
          {total > 50 && (
            <p className="text-center text-sm text-muted-foreground pt-2">
              Mostrando 50 de {total} pedidos
            </p>
          )}
        </div>
      )}
    </div>
  );
}
