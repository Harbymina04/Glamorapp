'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import {
  Users, DollarSign, Loader2, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, Calendar, X, Scissors,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid:    'bg-green-100 text-green-700',
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid:    'Pagada',
};

// ─── Collaborator card ────────────────────────────────────────────────────────

function CollaboratorCard({
  item, onPay, paying,
}: { item: any; onPay: (userId: string) => void; paying: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { token } = useAuthStore();
  const [detail, setDetail]   = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!expanded || detail.length > 0) return;
    setLoading(true);
    try {
      const res = await api.get(
        `/commissions/user/${item.user.id}?status=pending&limit=50`, { token: token! }
      );
      setDetail(res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [expanded, item.user.id, token, detail.length]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const initials = `${item.user.firstName?.[0] || ''}${item.user.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 p-4">
        <div className="w-10 h-10 rounded-full bg-glamor-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">
            {item.user.firstName} {item.user.lastName}
          </p>
          <p className="text-xs text-muted-foreground capitalize">{item.user.role}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Servicios</p>
            <p className="font-semibold">{item.totalServices}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Base</p>
            <p className="font-semibold">{formatCurrency(item.totalBase)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Pendiente</p>
            <p className="font-bold text-amber-600">{formatCurrency(item.totalPending)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Pagado</p>
            <p className="font-semibold text-green-600">{formatCurrency(item.totalPaid)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {item.totalPending > 0 && (
            <button
              onClick={() => onPay(item.user.id)}
              disabled={paying}
              className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-60 flex items-center gap-1.5 transition"
            >
              {paying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
              Liquidar {formatCurrency(item.totalPending)}
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-muted-foreground transition"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Detail */}
      {expanded && (
        <div className="border-t">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : detail.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground">Sin comisiones pendientes</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Servicio</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Venta</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Base</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">%</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Comisión</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {detail.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium">{c.serviceName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{c.sale?.saleNumber || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(c.baseAmount)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{Number(c.commissionRate).toFixed(1)}%</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-amber-700">{formatCurrency(c.amount)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Pay Modal ────────────────────────────────────────────────────────────────

function PayModal({
  userId, userName, amount, onConfirm, onClose, loading,
}: { userId: string; userName: string; amount: number; onConfirm: (notes: string) => void; onClose: () => void; loading: boolean }) {
  const [notes, setNotes] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold">Liquidar comisiones</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-center">
          <p className="text-sm text-green-700 mb-1">Total a pagar a <strong>{userName}</strong></p>
          <p className="text-3xl font-bold text-green-700">{formatCurrency(amount)}</p>
        </div>
        <div className="mb-4">
          <label className="text-xs text-muted-foreground mb-1 block">Notas del pago (opcional)</label>
          <input
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Ej: Transferencia Nequi, efectivo, etc."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
          <button
            onClick={() => onConfirm(notes)}
            disabled={loading}
            className="flex-1 h-10 bg-green-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirmar pago
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CommissionsPage() {
  const { token } = useAuthStore();
  const now = new Date();
  const [from, setFrom] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  );
  const [to, setTo] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  );
  const [summary, setSummary]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [payTarget, setPayTarget] = useState<{ userId: string; userName: string; amount: number } | null>(null);
  const [paying, setPaying]     = useState(false);
  const [success, setSuccess]   = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const data = await api.get(`/commissions/summary?from=${from}&to=${to}`, { token: token! });
      setSummary(data || []);
    } catch (e: any) { setError(e?.message || 'Error al cargar'); }
    finally { setLoading(false); }
  }, [token, from, to]);

  useEffect(() => { load(); }, [load]);

  const handlePay = (userId: string) => {
    const col = summary.find(s => s.user.id === userId);
    if (!col) return;
    setPayTarget({ userId, userName: `${col.user.firstName} ${col.user.lastName}`, amount: col.totalPending });
  };

  const confirmPay = async (notes: string) => {
    if (!payTarget) return;
    setPaying(true);
    try {
      const result = await api.post('/commissions/pay', {
        userIds:     [payTarget.userId],
        periodStart: from, periodEnd: to,
        notes:       notes || undefined,
      }, { token: token! });
      setSuccess(`✓ Se liquidaron ${result.paid} comisiones por ${formatCurrency(result.total)} a ${payTarget.userName}`);
      setPayTarget(null);
      load();
    } catch (e: any) { setError(e?.message || 'Error al procesar el pago'); }
    finally { setPaying(false); }
  };

  const totalPending = summary.reduce((s, c) => s + c.totalPending, 0);
  const totalPaid    = summary.reduce((s, c) => s + c.totalPaid, 0);
  const totalSvcs    = summary.reduce((s, c) => s + c.totalServices, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comisiones</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comisiones por servicios realizados · liquidación por colaborador
          </p>
        </div>
      </div>

      {/* Period filter */}
      <div className="bg-white rounded-xl border shadow-sm p-4 flex gap-4 flex-wrap items-end">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <button onClick={load} disabled={loading}
          className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
          Consultar
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* KPI cards */}
      {summary.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Scissors className="w-3.5 h-3.5" /> Servicios realizados</p>
            <p className="text-2xl font-bold">{totalSvcs}</p>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-amber-500" /> Total pendiente</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPending)}</p>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Total pagado</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
          </div>
        </div>
      )}

      {/* Collaborator cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : summary.length === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center text-muted-foreground">
          <Scissors className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin comisiones en el período</p>
          <p className="text-sm mt-1">Asigna un colaborador a cada servicio en el POS para generar comisiones automáticamente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {summary.map(item => (
            <CollaboratorCard
              key={item.user.id}
              item={item}
              onPay={handlePay}
              paying={paying && payTarget?.userId === item.user.id}
            />
          ))}
        </div>
      )}

      {/* Pay modal */}
      {payTarget && (
        <PayModal
          userId={payTarget.userId}
          userName={payTarget.userName}
          amount={payTarget.amount}
          onConfirm={confirmPay}
          onClose={() => setPayTarget(null)}
          loading={paying}
        />
      )}
    </div>
  );
}
