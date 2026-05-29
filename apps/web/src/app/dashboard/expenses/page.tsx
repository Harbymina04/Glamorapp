'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatCard } from '@/components/shared/stat-card';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import {
  Wallet, TrendingUp, TrendingDown, Plus, Search,
  X, Save, Loader2, AlertCircle, Pencil, Trash2,
  Calendar, FileText, DollarSign, CreditCard, Tag, StickyNote,
  Receipt, Ban,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
] as const;

const EXPENSE_STATUSES = [
  { value: 'paid', label: 'Pagado' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'cancelled', label: 'Cancelado' },
] as const;

const RECURRENCE_LABELS: Record<string, string> = {
  none: 'Sin recurrencia',
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
};

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-orange-50 text-orange-700 border-orange-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

interface ExpenseForm {
  concept: string;
  amount: string;
  categoryId: string;
  paymentMethod: string;
  status: string;
  expenseDate: string;
  dueDate: string;
  notes: string;
}

const emptyForm: ExpenseForm = {
  concept: '',
  amount: '',
  categoryId: '',
  paymentMethod: 'cash',
  status: 'paid',
  expenseDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  notes: '',
};

// ─── Page ───────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const { token } = useAuthStore();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Void confirm
  const [showVoid, setShowVoid] = useState(false);
  const [voidId, setVoidId] = useState<string | null>(null);
  const [voidConcept, setVoidConcept] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  // ─── Fetch ─────────────────────────────────────────────────────
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filterCategory) params.set('categoryId', filterCategory);

      const [expRes, sumRes, catRes] = await Promise.all([
        api.get(`/expenses?${params}`, { token: token! }),
        api.get('/expenses/summary', { token: token! }),
        api.get('/expenses/categories', { token: token! }),
      ]);
      setExpenses(expRes.data || []);
      setSummary(sumRes);
      setCategories(catRes || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, filterCategory]);

  useEffect(() => {
    if (!token) return;
    fetchExpenses();
  }, [token]); // eslint-disable-line

  // Re-fetch when filter changes
  useEffect(() => {
    if (!token) return;
    fetchExpenses();
  }, [filterCategory]); // eslint-disable-line

  // ─── Search (client-side) ──────────────────────────────────────
  const filteredExpenses = search
    ? expenses.filter((e: any) =>
        `${e.concept} ${e.category?.name || ''} ${e.notes || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : expenses;

  // ─── Form handlers ─────────────────────────────────────────────
  const openNewModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm, expenseDate: new Date().toISOString().split('T')[0] });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (e: any) => {
    setEditingId(e.id);
    setForm({
      concept: e.concept || '',
      amount: e.amount ? String(e.amount) : '',
      categoryId: e.categoryId || '',
      paymentMethod: e.paymentMethod || 'cash',
      status: e.status || 'paid',
      expenseDate: e.expenseDate?.split('T')[0] || '',
      dueDate: e.dueDate?.split('T')[0] || '',
      notes: e.notes || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.concept.trim()) return setFormError('El concepto es requerido');
    if (!form.amount || parseFloat(form.amount) <= 0) return setFormError('El monto debe ser mayor a 0');
    if (!form.expenseDate) return setFormError('La fecha es requerida');

    setSaving(true);
    setFormError('');
    try {
      const body: any = {
        concept: form.concept.trim(),
        amount: parseFloat(form.amount),
        categoryId: form.categoryId || null,
        paymentMethod: form.paymentMethod,
        status: form.status,
        expenseDate: new Date(form.expenseDate).toISOString(),
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        notes: form.notes.trim() || null,
      };

      if (editingId) {
        await api.put(`/expenses/${editingId}`, body, { token: token! });
      } else {
        await api.post('/expenses', body, { token: token! });
      }
      setShowModal(false);
      fetchExpenses();
    } catch (e: any) {
      setFormError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // ─── Void ──────────────────────────────────────────────────────
  const openVoidConfirm = (e: any) => {
    setVoidId(e.id);
    setVoidConcept(e.concept);
    setVoidReason('');
    setShowVoid(true);
  };

  const handleVoid = async () => {
    if (!voidId) return;
    if (!voidReason.trim()) return alert('Debes indicar un motivo de anulación');
    setVoiding(true);
    try {
      await api.del(`/expenses/${voidId}?reason=${encodeURIComponent(voidReason.trim())}`, { token: token! });
      setShowVoid(false);
      setVoidId(null);
      fetchExpenses();
    } catch (e: any) {
      alert(e.message || 'Error al anular');
    } finally {
      setVoiding(false);
    }
  };

  // ─── Stats ─────────────────────────────────────────────────────
  const monthTotal = summary?.monthTotal || 0;
  const count = summary?.count || 0;
  const avgExpense = count > 0 ? monthTotal / count : 0;

  // ─── Shared classes ────────────────────────────────────────────
  const inputClass = 'w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition';
  const labelClass = 'block text-sm font-medium text-foreground mb-1.5';

  if (loading) return <LoadingSkeleton rows={8} cols={5} />;

  const columns = [
    {
      key: 'concept', header: 'Concepto', render: (e: any) => (
        <div>
          <p className="font-medium text-foreground text-sm">{e.concept}</p>
          {e.category && (
            <p className="text-xs text-muted-foreground">{e.category.name}</p>
          )}
        </div>
      ),
    },
    {
      key: 'amount', header: 'Monto', render: (e: any) => (
        <span className="font-semibold text-red-600">{formatCurrency(e.amount)}</span>
      ),
    },
    {
      key: 'paymentMethod', header: 'Método', render: (e: any) => (
        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <CreditCard className="w-3.5 h-3.5" />
          {PAYMENT_METHODS.find(m => m.value === e.paymentMethod)?.label || e.paymentMethod}
        </span>
      ),
    },
    {
      key: 'expenseDate', header: 'Fecha', render: (e: any) => formatDate(e.expenseDate),
    },
    {
      key: 'status', header: 'Estado', render: (e: any) => (
        <StatusBadge status={e.status} colors={STATUS_COLORS}
          labels={{ paid: 'Pagado', pending: 'Pendiente', cancelled: 'Cancelado' }} />
      ),
    },
    {
      key: 'actions', header: '', render: (e: any) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={(ev) => { ev.stopPropagation(); openEditModal(e); }}
            title="Editar"
            className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-glamor-primary transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={(ev) => { ev.stopPropagation(); openVoidConfirm(e); }}
            title="Anular"
            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition">
            <Ban className="w-4 h-4" />
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
          <h1 className="text-2xl font-bold text-foreground">Gastos</h1>
          <p className="text-muted-foreground text-sm mt-1">Control de egresos del negocio</p>
        </div>
        <button onClick={openNewModal}
          className="flex items-center gap-2 h-10 px-4 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition">
          <Plus className="w-4 h-4" /> Nuevo gasto
        </button>
      </div>

      {/* ─── KPI Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total del mes" value={formatCurrency(monthTotal)} icon={<Wallet className="w-5 h-5 text-red-500" />} />
        <StatCard title="Cantidad" value={String(count)} icon={<Receipt className="w-5 h-5 text-orange-500" />} />
        <StatCard title="Promedio" value={formatCurrency(avgExpense)} icon={<TrendingUp className="w-5 h-5 text-blue-500" />} />
        <StatCard title="Pendientes" value={String(expenses.filter((e: any) => e.status === 'pending').length)} icon={<TrendingDown className="w-5 h-5 text-yellow-500" />} />
      </div>

      {/* ─── Filters ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Buscar gastos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* ─── Table ──────────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={filteredExpenses}
        onRowClick={(e: any) => openEditModal(e)}
        emptyMessage="No se encontraron gastos"
      />

      {/* ═══════════════════════════════════════════════════════════
         CREATE / EDIT MODAL
         ═══════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
              <h3 className="text-lg font-bold text-foreground">
                {editingId ? 'Editar gasto' : 'Nuevo gasto'}
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

              {/* Concepto */}
              <div>
                <label className={labelClass}>
                  <FileText className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
                  Concepto *
                </label>
                <input className={inputClass} value={form.concept}
                  onChange={e => setForm(prev => ({ ...prev, concept: e.target.value }))}
                  placeholder="Ej: Pago de renta, Servicios, Insumos..." />
              </div>

              {/* Monto + Método de pago */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    <DollarSign className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
                    Monto *
                  </label>
                  <input type="number" step="0.01" min="0" className={inputClass} value={form.amount}
                    onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00" />
                </div>
                <div>
                  <label className={labelClass}>
                    <CreditCard className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
                    Método de pago
                  </label>
                  <select className={inputClass} value={form.paymentMethod}
                    onChange={e => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}>
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Categoría + Estado */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    <Tag className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
                    Categoría
                  </label>
                  <select className={inputClass} value={form.categoryId}
                    onChange={e => setForm(prev => ({ ...prev, categoryId: e.target.value }))}>
                    <option value="">Sin categoría</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Estado</label>
                  <select className={inputClass} value={form.status}
                    onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}>
                    {EXPENSE_STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fecha gasto + Fecha vencimiento */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    <Calendar className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
                    Fecha del gasto *
                  </label>
                  <input type="date" className={inputClass} value={form.expenseDate}
                    onChange={e => setForm(prev => ({ ...prev, expenseDate: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>
                    <Calendar className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
                    Vencimiento
                  </label>
                  <input type="date" className={inputClass} value={form.dueDate}
                    onChange={e => setForm(prev => ({ ...prev, dueDate: e.target.value }))} />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className={labelClass}>
                  <StickyNote className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
                  Notas
                </label>
                <textarea className={`${inputClass} h-20 py-2 resize-none`} value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Detalles adicionales..." />
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
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear gasto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         VOID CONFIRMATION MODAL
         ═══════════════════════════════════════════════════════════ */}
      {showVoid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowVoid(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-foreground mb-2">Anular gasto</h3>
            <p className="text-sm text-muted-foreground mb-3">
              ¿Anular el gasto <strong>{voidConcept}</strong>?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1.5">Motivo de anulación *</label>
              <input className={inputClass} value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                placeholder="Ej: Error en el registro, duplicado..." />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowVoid(false)}
                className="h-10 px-4 rounded-lg border border-border-primary text-sm font-medium text-muted-foreground hover:bg-surface-hover">
                Cancelar
              </button>
              <button onClick={handleVoid} disabled={voiding}
                className="flex items-center gap-2 h-10 px-4 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50">
                {voiding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                {voiding ? 'Anulando...' : 'Anular gasto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
