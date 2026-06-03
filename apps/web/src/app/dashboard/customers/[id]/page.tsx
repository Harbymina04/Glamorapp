'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { LOYALTY_TIER_COLORS } from '@/lib/constants';
import {
  ArrowLeft, Phone, Mail, Cake, Star, DollarSign, ShoppingBag,
  CalendarCheck, TrendingUp, MessageSquare, Plus, Loader2,
  AlertCircle, Pencil, Save, X, Clock, CheckCircle2, XCircle,
  StickyNote, Receipt, Scissors,
} from 'lucide-react';

const inputClass = 'w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition';
const labelClass = 'block text-sm font-medium text-foreground mb-1.5';

type Tab = 'history' | 'notes';

const SEGMENTS: Record<string, { label: string; color: string }> = {
  new:      { label: 'Nuevo',     color: 'bg-blue-50 text-blue-700 border-blue-200' },
  frequent: { label: 'Frecuente', color: 'bg-green-50 text-green-700 border-green-200' },
  inactive: { label: 'Inactivo',  color: 'bg-gray-50 text-gray-600 border-gray-200' },
  vip:      { label: 'VIP',       color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
};

const SEGMENT_OPTIONS = [
  { value: 'new',      label: 'Nuevo' },
  { value: 'frequent', label: 'Frecuente' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'vip',      label: 'VIP' },
];

const LOYALTY_OPTIONS = [
  { value: 'bronze',   label: 'Bronce' },
  { value: 'silver',   label: 'Plata' },
  { value: 'gold',     label: 'Oro' },
  { value: 'platinum', label: 'Platino' },
];

const APPOINTMENT_STATUS_ICONS: Record<string, JSX.Element> = {
  completed:   <CheckCircle2 className="w-4 h-4 text-green-500" />,
  cancelled:   <XCircle className="w-4 h-4 text-red-400" />,
  no_show:     <XCircle className="w-4 h-4 text-orange-400" />,
  confirmed:   <Clock className="w-4 h-4 text-blue-500" />,
  pending:     <Clock className="w-4 h-4 text-gray-400" />,
  in_progress: <Clock className="w-4 h-4 text-purple-500" />,
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { token } = useAuthStore();

  const [customer, setCustomer] = useState<any>(null);
  const [history, setHistory]   = useState<{ sales: any[]; appointments: any[] }>({ sales: [], appointments: [] });
  const [notes, setNotes]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>('history');

  // Edit modal
  const [showEdit, setShowEdit]   = useState(false);
  const [editForm, setEditForm]   = useState<any>({});
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  // Notes
  const [newNote, setNewNote]     = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [cust, hist, nts] = await Promise.all([
        api.get(`/customers/${id}`, { token }),
        api.get(`/customers/${id}/history`, { token }),
        api.get(`/customers/${id}/notes`, { token }),
      ]);
      setCustomer(cust);
      setHistory(hist);
      setNotes(nts);
    } catch { router.push('/dashboard/customers'); }
    finally { setLoading(false); }
  }, [id, token]); // eslint-disable-line

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Edit handlers ──────────────────────────────────────────────
  const openEdit = () => {
    setEditForm({
      firstName:   customer.firstName  || '',
      lastName:    customer.lastName   || '',
      email:       customer.email      || '',
      phone:       customer.phone      || '',
      dateOfBirth: customer.dateOfBirth?.split('T')[0] || '',
      segment:     customer.segment    || 'new',
      loyaltyTier: customer.loyaltyTier || 'bronze',
      notes:       customer.notes      || '',
    });
    setFormError('');
    setShowEdit(true);
  };

  const handleSave = async () => {
    if (!editForm.firstName?.trim()) return setFormError('El nombre es requerido');
    if (!editForm.lastName?.trim())  return setFormError('El apellido es requerido');
    setSaving(true);
    setFormError('');
    try {
      const updated = await api.put(`/customers/${id}`, {
        ...editForm,
        dateOfBirth: editForm.dateOfBirth ? new Date(editForm.dateOfBirth).toISOString() : undefined,
      }, { token: token! });
      setCustomer(updated);
      setShowEdit(false);
    } catch (e: any) {
      setFormError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // ── Notes ──────────────────────────────────────────────────────
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await api.post(`/customers/${id}/notes`, { content: newNote.trim() }, { token: token! });
      setNewNote('');
      const nts = await api.get(`/customers/${id}/notes`, { token: token! });
      setNotes(nts);
    } catch { /* silent */ }
    finally { setAddingNote(false); }
  };

  // ── Render ─────────────────────────────────────────────────────
  if (loading) return <LoadingSkeleton rows={6} cols={4} />;
  if (!customer) return null;

  const seg = SEGMENTS[customer.segment] ?? SEGMENTS.new;
  const initials = `${customer.firstName?.[0] ?? ''}${customer.lastName?.[0] ?? ''}`.toUpperCase();

  const allActivity = [
    ...(history.sales || []).map((s: any) => ({ ...s, _type: 'sale' })),
    ...(history.appointments || []).map((a: any) => ({ ...a, _type: 'appointment' })),
  ].sort((a, b) => {
    const dateA = new Date(a._type === 'sale' ? a.createdAt : a.date).getTime();
    const dateB = new Date(b._type === 'sale' ? b.createdAt : b.date).getTime();
    return dateB - dateA;
  });

  return (
    <div>
      {/* ── Back ──────────────────────────────────────────────── */}
      <button
        onClick={() => router.push('/dashboard/customers')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a clientes
      </button>

      {/* ── Profile Header ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border-primary p-6 mb-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-glamor-primary to-purple-500 text-white flex items-center justify-center text-xl font-bold shrink-0">
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-foreground">
                {customer.firstName} {customer.lastName}
              </h1>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${seg.color}`}>
                {seg.label}
              </span>
              <StatusBadge status={customer.loyaltyTier} colors={LOYALTY_TIER_COLORS} />
            </div>
            <p className="text-sm text-muted-foreground mb-3">{customer.customerNumber}</p>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {customer.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> {customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {customer.email}
                </span>
              )}
              {customer.dateOfBirth && (
                <span className="flex items-center gap-1.5">
                  <Cake className="w-3.5 h-3.5" />
                  {new Date(customer.dateOfBirth).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}
                </span>
              )}
            </div>
          </div>

          {/* Edit button */}
          <button
            onClick={openEdit}
            className="flex items-center gap-2 h-9 px-4 border border-border-primary rounded-lg text-sm font-medium hover:bg-surface-hover transition shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-border-primary p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground font-medium">Total gastado</span>
          </div>
          <p className="text-xl font-bold text-foreground">{formatCurrency(customer.totalSpent || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border-primary p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-4 h-4 text-glamor-primary" />
            <span className="text-xs text-muted-foreground font-medium">Compras</span>
          </div>
          <p className="text-xl font-bold text-foreground">{customer.totalPurchases || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-border-primary p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground font-medium">Ticket promedio</span>
          </div>
          <p className="text-xl font-bold text-foreground">{formatCurrency(customer.averageTicket || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border-primary p-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarCheck className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-muted-foreground font-medium">Última compra</span>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {customer.lastPurchaseAt ? formatDate(customer.lastPurchaseAt) : '—'}
          </p>
        </div>
      </div>

      {/* ── Notes preview ─────────────────────────────────────── */}
      {customer.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
          <StickyNote className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{customer.notes}</p>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-4 border-b border-border-primary">
        {([
          { key: 'history', label: 'Historial', icon: <Clock className="w-4 h-4" /> },
          { key: 'notes',   label: 'Notas',     icon: <MessageSquare className="w-4 h-4" /> },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              tab === t.key
                ? 'border-glamor-primary text-glamor-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon} {t.label}
            {t.key === 'notes' && notes.length > 0 && (
              <span className="ml-1 text-xs bg-glamor-primary/10 text-glamor-primary rounded-full px-1.5 py-0.5">
                {notes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: History ──────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-3">
          {allActivity.length === 0 ? (
            <div className="bg-white rounded-xl border border-border-primary p-8 text-center text-muted-foreground text-sm">
              Sin actividad registrada
            </div>
          ) : (
            allActivity.map((item: any) => (
              item._type === 'sale' ? (
                <div key={item.id} className="bg-white rounded-xl border border-border-primary p-4 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                    <Receipt className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">
                        Venta #{item.saleNumber || item.id.slice(0, 8)}
                      </p>
                      <span className="text-sm font-bold text-green-600">{formatCurrency(item.total)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(item.createdAt)}</p>
                    {item.items && item.items.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.items.length} producto{item.items.length > 1 ? 's' : ''}
                        {item.items[0]?.productName ? `: ${item.items.map((i: any) => i.productName).join(', ')}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div key={item.id} className="bg-white rounded-xl border border-border-primary p-4 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                    <Scissors className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">
                        {item.service?.name || 'Cita'}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {APPOINTMENT_STATUS_ICONS[item.status]}
                        <span className="text-xs text-muted-foreground capitalize">{item.status?.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(item.date)}
                      {item.startTime && ` · ${item.startTime}`}
                    </p>
                    {item.price && (
                      <p className="text-xs font-medium text-purple-600 mt-0.5">{formatCurrency(item.price)}</p>
                    )}
                  </div>
                </div>
              )
            ))
          )}
        </div>
      )}

      {/* ── Tab: Notes ────────────────────────────────────────── */}
      {tab === 'notes' && (
        <div className="space-y-4">
          {/* Add note */}
          <div className="bg-white rounded-xl border border-border-primary p-4">
            <label className={labelClass}>Agregar nota interna</label>
            <div className="flex gap-2">
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Escribe una nota sobre este cliente..."
                className="flex-1 px-3 py-2 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary resize-none h-20 transition"
              />
              <button
                onClick={handleAddNote}
                disabled={addingNote || !newNote.trim()}
                className="flex items-center gap-1.5 h-9 px-3 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition disabled:opacity-50 self-end"
              >
                {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Agregar
              </button>
            </div>
          </div>

          {/* Notes list */}
          {notes.length === 0 ? (
            <div className="bg-white rounded-xl border border-border-primary p-8 text-center text-muted-foreground text-sm">
              Sin notas aún
            </div>
          ) : (
            notes.map((note: any) => (
              <div key={note.id} className="bg-white rounded-xl border border-border-primary p-4">
                <p className="text-sm text-foreground">{note.content}</p>
                <p className="text-xs text-muted-foreground mt-2">{formatDate(note.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         EDIT MODAL
         ═══════════════════════════════════════════════════════════ */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEdit(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
              <h3 className="text-lg font-bold text-foreground">Editar cliente</h3>
              <button onClick={() => setShowEdit(false)} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nombre *</label>
                  <input className={inputClass} value={editForm.firstName}
                    onChange={e => setEditForm((p: any) => ({ ...p, firstName: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Apellido *</label>
                  <input className={inputClass} value={editForm.lastName}
                    onChange={e => setEditForm((p: any) => ({ ...p, lastName: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" className={inputClass} value={editForm.email}
                    onChange={e => setEditForm((p: any) => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input className={inputClass} value={editForm.phone}
                    onChange={e => setEditForm((p: any) => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Fecha de nacimiento</label>
                  <input type="date" className={inputClass} value={editForm.dateOfBirth}
                    onChange={e => setEditForm((p: any) => ({ ...p, dateOfBirth: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Segmento</label>
                  <select className={inputClass} value={editForm.segment}
                    onChange={e => setEditForm((p: any) => ({ ...p, segment: e.target.value }))}>
                    {SEGMENT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Nivel de fidelidad</label>
                <select className={inputClass} value={editForm.loyaltyTier}
                  onChange={e => setEditForm((p: any) => ({ ...p, loyaltyTier: e.target.value }))}>
                  {LOYALTY_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Notas internas</label>
                <textarea className={`${inputClass} h-20 py-2 resize-none`} value={editForm.notes}
                  onChange={e => setEditForm((p: any) => ({ ...p, notes: e.target.value }))}
                  placeholder="Notas sobre el cliente..." />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-primary bg-surface-primary/30">
              <button onClick={() => setShowEdit(false)}
                className="h-10 px-4 rounded-lg border border-border-primary text-sm font-medium text-muted-foreground hover:bg-surface-hover transition">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 h-10 px-6 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
