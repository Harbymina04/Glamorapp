'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatCard } from '@/components/shared/stat-card';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { LOYALTY_TIER_COLORS } from '@/lib/constants';
import {
  Users, Star, UserPlus, TrendingUp, Plus, Search, Phone,
  X, Save, Loader2, AlertCircle, Pencil, Trash2, Mail, Cake,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────
const SEGMENTS = [
  { value: 'new', label: 'Nuevo' },
  { value: 'frequent', label: 'Frecuente' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'vip', label: 'VIP' },
] as const;

const LOYALTY_TIERS = [
  { value: 'bronze', label: 'Bronce' },
  { value: 'silver', label: 'Plata' },
  { value: 'gold', label: 'Oro' },
  { value: 'platinum', label: 'Platino' },
] as const;

interface CustomerForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  segment: string;
  loyaltyTier: string;
  notes: string;
}

const emptyForm: CustomerForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  segment: 'new',
  loyaltyTier: 'bronze',
  notes: '',
};

// ─── Page ───────────────────────────────────────────────────────────
export default function CustomersPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirm
  const [showDelete, setShowDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch customers ───────────────────────────────────────────
  const fetchCustomers = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (q) params.set('search', q);
      const res = await api.get(`/customers?${params}`, { token: token! });
      setCustomers(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchCustomers();
  }, [token]); // eslint-disable-line

  // ─── Search ────────────────────────────────────────────────────
  const handleSearch = (value: string) => {
    setSearch(value);
    fetchCustomers(value || undefined);
  };

  // ─── Form handlers ─────────────────────────────────────────────
  const openNewModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (c: any) => {
    setEditingId(c.id);
    setForm({
      firstName: c.firstName || '',
      lastName: c.lastName || '',
      email: c.email || '',
      phone: c.phone || '',
      dateOfBirth: c.dateOfBirth?.split('T')[0] || '',
      segment: c.segment || 'new',
      loyaltyTier: c.loyaltyTier || 'bronze',
      notes: c.notes || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.firstName.trim()) return setFormError('El nombre es requerido');
    if (!form.lastName.trim()) return setFormError('El apellido es requerido');
    setSaving(true);
    setFormError('');
    try {
      const body = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : undefined,
        segment: form.segment,
        loyaltyTier: form.loyaltyTier,
        notes: form.notes.trim() || undefined,
      };

      if (editingId) {
        await api.put(`/customers/${editingId}`, body, { token: token! });
      } else {
        await api.post('/customers', body, { token: token! });
      }
      setShowModal(false);
      fetchCustomers(search || undefined);
    } catch (e: any) {
      setFormError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ────────────────────────────────────────────────────
  const openDeleteConfirm = (c: any) => {
    setDeleteId(c.id);
    setDeleteName(`${c.firstName} ${c.lastName}`);
    setShowDelete(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.del(`/customers/${deleteId}`, { token: token! });
      setShowDelete(false);
      setDeleteId(null);
      fetchCustomers(search || undefined);
    } catch {
      alert('No se pudo eliminar el cliente. Intenta de nuevo.');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Stats ─────────────────────────────────────────────────────
  const vipCount = customers.filter((c: any) => c.loyaltyTier === 'gold' || c.loyaltyTier === 'platinum').length;
  const newCount = customers.filter((c: any) => c.segment === 'new').length;
  const avgTicket = customers.length > 0
    ? customers.reduce((s: number, c: any) => s + Number(c.averageTicket || 0), 0) / customers.length
    : 0;

  // ─── Shared classes ────────────────────────────────────────────
  const inputClass = 'w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition';
  const labelClass = 'block text-sm font-medium text-foreground mb-1.5';

  if (loading) return <LoadingSkeleton rows={8} cols={5} />;

  const columns = [
    {
      key: 'name', header: 'Cliente', render: (c: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-glamor-primary to-purple-500 text-white flex items-center justify-center text-xs font-bold">
            {c.firstName?.[0]}{c.lastName?.[0]}
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">{c.firstName} {c.lastName}</p>
            <p className="text-xs text-muted-foreground">{c.customerNumber}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone', header: 'Teléfono', render: (c: any) => (
        <div className="flex items-center gap-1 text-sm"><Phone className="w-3 h-3 text-muted-foreground" />{c.phone || '—'}</div>
      ),
    },
    {
      key: 'loyaltyTier', header: 'Fidelidad', render: (c: any) => (
        <StatusBadge status={c.loyaltyTier} colors={LOYALTY_TIER_COLORS} />
      ),
    },
    { key: 'totalSpent', header: 'Total gastado', render: (c: any) => formatCurrency(c.totalSpent) },
    { key: 'totalPurchases', header: 'Compras', render: (c: any) => c.totalPurchases },
    { key: 'lastPurchaseAt', header: 'Última compra', render: (c: any) => c.lastPurchaseAt ? formatDate(c.lastPurchaseAt) : '—' },
    {
      key: 'actions', header: '', render: (c: any) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={(e) => { e.stopPropagation(); openEditModal(c); }}
            title="Editar"
            className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-glamor-primary transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); openDeleteConfirm(c); }}
            title="Eliminar"
            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      className: 'w-20',
    },
  ];

  return (
    <div>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona tu cartera de clientes</p>
        </div>
        <button onClick={openNewModal}
          className="flex items-center gap-2 h-10 px-4 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition">
          <Plus className="w-4 h-4" /> Nuevo cliente
        </button>
      </div>

      {/* ─── KPI Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total clientes" value={String(customers.length)} icon={<Users className="w-5 h-5 text-glamor-primary" />} />
        <StatCard title="VIP" value={String(vipCount)} icon={<Star className="w-5 h-5 text-yellow-500" />} />
        <StatCard title="Nuevos" value={String(newCount)} icon={<UserPlus className="w-5 h-5 text-green-500" />} />
        <StatCard title="Ticket promedio" value={formatCurrency(avgTicket)} icon={<TrendingUp className="w-5 h-5 text-blue-500" />} />
      </div>

      {/* ─── Search ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Buscar clientes..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
          />
        </div>
      </div>

      {/* ─── Table ──────────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={customers}
        onRowClick={(c: any) => router.push(`/dashboard/customers/${c.id}`)}
      />

      {/* ═══════════════════════════════════════════════════════════
         CREATE / EDIT MODAL
         ═══════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
              <h3 className="text-lg font-bold text-foreground">
                {editingId ? 'Editar cliente' : 'Nuevo cliente'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}

              {/* First + Last name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nombre *</label>
                  <input className={inputClass} value={form.firstName}
                    onChange={e => setForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Nombre(s)" />
                </div>
                <div>
                  <label className={labelClass}>Apellido *</label>
                  <input className={inputClass} value={form.lastName}
                    onChange={e => setForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Apellido(s)" />
                </div>
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    <Mail className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
                    Email
                  </label>
                  <input type="email" className={inputClass} value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="cliente@email.com" />
                </div>
                <div>
                  <label className={labelClass}>
                    <Phone className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
                    Teléfono
                  </label>
                  <PhoneInput
                    value={form.phone}
                    onChange={v => setForm(prev => ({ ...prev, phone: v }))}
                    placeholder="3001234567"
                  />
                </div>
              </div>

              {/* DOB + Segment */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    <Cake className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
                    Fecha de nacimiento
                  </label>
                  <input type="date" className={inputClass} value={form.dateOfBirth}
                    onChange={e => setForm(prev => ({ ...prev, dateOfBirth: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Segmento</label>
                  <select className={inputClass} value={form.segment}
                    onChange={e => setForm(prev => ({ ...prev, segment: e.target.value }))}>
                    {SEGMENTS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Loyalty tier */}
              <div>
                <label className={labelClass}>Nivel de fidelidad</label>
                <select className={inputClass} value={form.loyaltyTier}
                  onChange={e => setForm(prev => ({ ...prev, loyaltyTier: e.target.value }))}>
                  {LOYALTY_TIERS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className={labelClass}>Notas</label>
                <textarea className={`${inputClass} h-20 py-2 resize-none`} value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas internas sobre el cliente..." />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-primary bg-surface-primary/30">
              <button onClick={() => setShowModal(false)}
                className="h-10 px-4 rounded-lg border border-border-primary text-sm font-medium text-muted-foreground hover:bg-surface-hover transition">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 h-10 px-6 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         DELETE CONFIRMATION MODAL
         ═══════════════════════════════════════════════════════════ */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDelete(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-foreground mb-2">Eliminar cliente</h3>
            <p className="text-sm text-muted-foreground mb-4">
              ¿Estás seguro de eliminar a <strong>{deleteName}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDelete(false)}
                className="h-10 px-4 rounded-lg border border-border-primary text-sm font-medium text-muted-foreground hover:bg-surface-hover">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-2 h-10 px-4 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
