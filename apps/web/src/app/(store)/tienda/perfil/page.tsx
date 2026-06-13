'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Package, Calendar, ShoppingBag, User, Loader2, CheckCircle2,
  Clock, Truck, XCircle, MapPin, ChevronRight, LogOut,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { getToken, setUser } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';
import { useStoreCart } from '@/stores/store-cart';
import { formatCOP } from '@/lib/store-utils';

type Tab = 'pedidos' | 'citas' | 'carrito' | 'info';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'pedidos', label: 'Mis pedidos', icon: <Package className="w-4 h-4" /> },
  { key: 'citas',   label: 'Mis citas',   icon: <Calendar className="w-4 h-4" /> },
  { key: 'carrito', label: 'Mi carrito',  icon: <ShoppingBag className="w-4 h-4" /> },
  { key: 'info',    label: 'Mi información', icon: <User className="w-4 h-4" /> },
];

// ── Estado de pedido → etiqueta, color, ícono ──────────────────────
const ORDER_STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pendiente',  color: 'bg-amber-50 text-amber-700 border-amber-200',  icon: <Clock className="w-3.5 h-3.5" /> },
  confirmed: { label: 'Confirmado', color: 'bg-blue-50 text-blue-700 border-blue-200',     icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  preparing: { label: 'Preparando', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: <Package className="w-3.5 h-3.5" /> },
  ready:     { label: 'Listo',      color: 'bg-purple-50 text-purple-700 border-purple-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  delivered: { label: 'Entregado',  color: 'bg-green-50 text-green-700 border-green-200',   icon: <Truck className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Cancelado',  color: 'bg-red-50 text-red-600 border-red-200',         icon: <XCircle className="w-3.5 h-3.5" /> },
};

const ORDER_STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Pedidos ───────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.get('/storefront/public/my/orders', { token })
      .then((data: any[]) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-16 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  if (orders.length === 0) return (
    <div className="text-center py-16 text-gray-400">
      <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
      <p className="text-sm">Aún no tienes pedidos</p>
      <Link href="/tienda/catalogo" className="inline-block mt-4 px-5 py-2.5 bg-[#EF2D8F] text-white rounded-full text-sm font-semibold hover:bg-[#d4267e] transition">
        Explorar productos
      </Link>
    </div>
  );

  return (
    <div className="space-y-4">
      {orders.map(o => {
        const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.pending;
        const items = Array.isArray(o.items) ? o.items : [];
        const stepIdx = ORDER_STEPS.indexOf(o.status);
        const isCancelled = o.status === 'cancelled';
        return (
          <div key={o.id} className="bg-white border border-gray-200 rounded-xl p-4 md:p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-bold text-gray-900">{o.orderNumber}</p>
                <p className="text-xs text-gray-400">{formatDate(o.createdAt)}{o.store?.name ? ` · ${o.store.name}` : ''}</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${st.color}`}>
                {st.icon}{st.label}
              </span>
            </div>

            {/* Tracking timeline (oculto si cancelado) */}
            {!isCancelled && (
              <div className="flex items-center gap-1 mb-4">
                {ORDER_STEPS.map((step, i) => (
                  <div key={step} className="flex items-center flex-1 last:flex-none">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${i <= stepIdx ? 'bg-[#EF2D8F]' : 'bg-gray-200'}`} />
                    {i < ORDER_STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < stepIdx ? 'bg-[#EF2D8F]' : 'bg-gray-200'}`} />}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5 text-sm border-t border-gray-100 pt-3">
              {items.map((it: any, idx: number) => (
                <div key={idx} className="flex justify-between text-gray-600">
                  <span>{it.name} × {it.qty}</span>
                  <span>{formatCOP(Number(it.price) * Number(it.qty))}</span>
                </div>
              ))}
              {Number(o.deliveryFee) > 0 && (
                <div className="flex justify-between text-gray-500"><span>Envío</span><span>{formatCOP(Number(o.deliveryFee))}</span></div>
              )}
              <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-gray-100">
                <span>Total</span><span>{formatCOP(Number(o.total))}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Citas ─────────────────────────────────────────────────────────
function AppointmentsTab() {
  const [appts, setAppts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.get('/appointments/public/my', { token })
      .then((data: any[]) => setAppts(Array.isArray(data) ? data : []))
      .catch(() => setAppts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-16 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  if (appts.length === 0) return (
    <div className="text-center py-16 text-gray-400">
      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
      <p className="text-sm">No tienes citas agendadas</p>
    </div>
  );

  const statusLabel: Record<string, string> = {
    pending: 'Pendiente', confirmed: 'Confirmada', in_progress: 'En curso',
    completed: 'Completada', cancelled: 'Cancelada', no_show: 'No asistió',
  };

  return (
    <div className="space-y-3">
      {appts.map(a => (
        <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-6 h-6 text-[#EF2D8F]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{a.service?.name ?? 'Servicio'}</p>
            <p className="text-xs text-gray-500">
              {formatDate(a.date)} · {a.startTime}
              {a.professional ? ` · ${a.professional.firstName}` : ''}
              {a.store?.name ? ` · ${a.store.name}` : ''}
            </p>
          </div>
          <span className="text-xs font-medium text-gray-500 flex-shrink-0">{statusLabel[a.status] ?? a.status}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Carrito ───────────────────────────────────────────────────────
function CartTab() {
  const { items, total } = useStoreCart();

  if (items.length === 0) return (
    <div className="text-center py-16 text-gray-400">
      <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-40" />
      <p className="text-sm">Tu carrito está vacío</p>
      <Link href="/tienda/catalogo" className="inline-block mt-4 px-5 py-2.5 bg-[#EF2D8F] text-white rounded-full text-sm font-semibold hover:bg-[#d4267e] transition">
        Ver productos
      </Link>
    </div>
  );

  return (
    <div className="space-y-3">
      {items.map(i => (
        <div key={i.productId} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
            {i.imageUrl
              ? <img src={i.imageUrl} alt={i.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-gray-300" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{i.name}</p>
            <p className="text-xs text-gray-500">{i.shopName}</p>
            <p className="text-sm font-semibold text-gray-900">{formatCOP(i.price)} × {i.qty}</p>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <span className="font-bold text-gray-900">Total: {formatCOP(total())}</span>
        <Link href="/tienda/checkout" className="px-6 py-2.5 bg-[#EF2D8F] text-white rounded-full text-sm font-bold hover:bg-[#d4267e] transition flex items-center gap-1">
          Ir a pagar <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

// ─── Mi información ─────────────────────────────────────────────────
function InfoTab({ user, onUpdated }: { user: any; onUpdated: (u: any) => void }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (user) setForm({ firstName: user.firstName ?? '', lastName: user.lastName ?? '', phone: user.phone ?? '' });
  }, [user]);

  const save = async () => {
    setSaving(true); setMsg(''); setErr('');
    try {
      const token = getToken();
      const updated = await api.patch('/auth/me', form, { token: token! });
      onUpdated(updated);
      setMsg('Información actualizada');
      setTimeout(() => setMsg(''), 2500);
    } catch (e: any) {
      setErr(e?.message || 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Nombre</label>
          <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Apellido</label>
          <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Correo electrónico</label>
        <input value={user?.email ?? ''} disabled
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
        <p className="text-xs text-gray-400 mt-1">El correo no se puede cambiar.</p>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Teléfono</label>
        <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          placeholder="3001234567"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
      </div>

      {msg && <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      <button onClick={save} disabled={saving}
        className="px-6 py-2.5 bg-[#EF2D8F] text-white rounded-full text-sm font-bold hover:bg-[#d4267e] transition disabled:opacity-60 flex items-center gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Guardar cambios
      </button>
    </div>
  );
}

// ─── Página ────────────────────────────────────────────────────────
export default function PerfilPage() {
  const router = useRouter();
  const { user, isAuthenticated, checkAuth, logout } = useAuthStore();
  const [tab, setTab] = useState<Tab>('pedidos');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await checkAuth();
      setReady(true);
    })();
  }, [checkAuth]);

  // Guard: solo clientes autenticados
  useEffect(() => {
    if (ready && (!isAuthenticated || user?.role !== 'customer')) {
      router.replace('/tienda/auth/login?redirect=/tienda/perfil');
    }
  }, [ready, isAuthenticated, user, router]);

  const handleUpdated = useCallback((updated: any) => {
    // Refleja los cambios en el store/localStorage
    const merged = { ...user, ...updated };
    setUser(merged as any);
    useAuthStore.setState({ user: merged as any });
  }, [user]);

  if (!ready || !isAuthenticated || user?.role !== 'customer') {
    return <div className="py-32 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#EF2D8F] to-purple-500 flex items-center justify-center text-white text-lg font-black">
            {(user.firstName?.[0] ?? 'U').toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Hola, {user.firstName}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
        <button onClick={() => { logout(); router.push('/tienda'); }}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-gray-50 transition">
          <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Salir</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto scrollbar-hide">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition ${
              tab === t.key ? 'border-[#EF2D8F] text-[#EF2D8F]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'pedidos' && <OrdersTab />}
      {tab === 'citas'   && <AppointmentsTab />}
      {tab === 'carrito' && <CartTab />}
      {tab === 'info'    && <InfoTab user={user} onUpdated={handleUpdated} />}
    </div>
  );
}
