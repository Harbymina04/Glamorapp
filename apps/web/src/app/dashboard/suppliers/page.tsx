'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Plus, Search, Pencil, Trash2, Loader2, Save, X, BarChart3 } from 'lucide-react';

const inputClass = 'w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition';
const labelClass = 'block text-sm font-medium text-foreground mb-1.5';

export default function SuppliersPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: '', contactName: '', contactTitle: '', email: '',
    phone: '', website: '', taxId: '', address: '', category: '',
    paymentTerms: '', creditLimit: '0', notes: '',
  });
  const [error, setError] = useState('');

  const fetchSuppliers = useCallback(async () => {
    const currentToken = useAuthStore.getState().token;
    if (!currentToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search.trim()) params.set('search', search.trim());
      const res = await api.get(`/suppliers?${params}`, { token: currentToken });
      setSuppliers(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ businessName: '', contactName: '', contactTitle: '', email: '', phone: '', website: '', taxId: '', address: '', category: '', paymentTerms: '', creditLimit: '0', notes: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setForm({
      businessName: s.businessName || '',
      contactName: s.contactName || '',
      contactTitle: s.contactTitle || '',
      email: s.email || '',
      phone: s.phone || '',
      website: s.website || '',
      taxId: s.taxId || '',
      address: s.address || '',
      category: s.category || '',
      paymentTerms: s.paymentTerms || '',
      creditLimit: String(s.creditLimit || 0),
      notes: s.notes || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    const currentToken = useAuthStore.getState().token;
    if (!currentToken) { setError('No hay sesión activa'); return; }
    if (!form.businessName.trim()) { setError('El nombre es obligatorio'); return; }
    setSaving(true); setError('');
    try {
      const body: any = {
        businessName: form.businessName.trim(),
        contactName: form.contactName.trim() || null,
        contactTitle: form.contactTitle.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        taxId: form.taxId.trim() || null,
        address: form.address.trim() || null,
        category: form.category.trim() || null,
        paymentTerms: form.paymentTerms.trim() || null,
        creditLimit: parseFloat(form.creditLimit) || 0,
        notes: form.notes.trim() || null,
      };
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, body, { token: currentToken });
      } else {
        await api.post('/suppliers', body, { token: currentToken });
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (e: any) { setError(e.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"? Se marcará como inactivo.`)) return;
    const currentToken = useAuthStore.getState().token;
    if (!currentToken) return;
    setDeletingId(id);
    try {
      await api.del(`/suppliers/${id}`, { token: currentToken });
      setSuppliers(prev => prev.filter(i => i.id !== id));
    } catch { alert('No se pudo eliminar el proveedor. Intenta de nuevo.'); }
    finally { setDeletingId(null); }
  };

  const filtered = search.trim()
    ? suppliers.filter((s: any) =>
        s.businessName?.toLowerCase().includes(search.toLowerCase()) ||
        s.supplierNumber?.toLowerCase().includes(search.toLowerCase()) ||
        s.contactName?.toLowerCase().includes(search.toLowerCase()))
    : suppliers;

  const columns = [
    { key: 'businessName', header: 'Proveedor', render: (s: any) => (
      <div>
        <p className="font-medium text-foreground text-sm">{s.businessName}</p>
        <p className="text-xs text-muted-foreground">{s.supplierNumber}</p>
      </div>
    )},
    { key: 'contactName', header: 'Contacto' },
    { key: 'phone', header: 'Teléfono' },
    { key: 'currentBalance', header: 'Saldo pendiente', render: (s: any) => formatCurrency(s.currentBalance) },
    { key: 'totalPurchases', header: 'Total compras', render: (s: any) => formatCurrency(s.totalPurchases) },
    { key: 'status', header: 'Estado', render: (s: any) => (
      <StatusBadge status={s.status} labels={{ active: 'Activo', inactive: 'Inactivo' }}
        colors={{ active: 'bg-green-50 text-green-700 border-green-200', inactive: 'bg-gray-50 text-gray-600 border-gray-200' }} />
    )},
    { key: 'actions', header: '', render: (s: any) => (
      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
        <button onClick={() => openEdit(s)}
          className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-glamor-primary transition" title="Editar">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={() => handleDelete(s.id, s.businessName)}
          disabled={deletingId === s.id}
          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition disabled:opacity-50" title="Eliminar">
          {deletingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
    )},
  ];

  if (loading) return <LoadingSkeleton rows={5} cols={4} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proveedores</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona tus proveedores y compras</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 h-10 px-4 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition">
          <Plus className="w-4 h-4" /> Nuevo proveedor
        </button>
        <button onClick={() => router.push('/dashboard/suppliers/compare')}
          className="flex items-center gap-2 h-10 px-4 border border-border-primary text-foreground rounded-lg text-sm font-medium hover:bg-surface-hover transition">
          <BarChart3 className="w-4 h-4" /> Comparar
        </button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input placeholder="Buscar proveedores..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20" />
      </div>

      <DataTable columns={columns} data={filtered} onRowClick={(s: any) => router.push(`/dashboard/suppliers/${s.id}`)} />

      {/* ── Modal Create/Edit ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-foreground">
                {editingId ? 'Editar proveedor' : 'Nuevo proveedor'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-surface-hover">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
              )}
              <div>
                <label className={labelClass}>Nombre del negocio *</label>
                <input className={inputClass} value={form.businessName}
                  onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                  placeholder="Ej: Distribuidora de Productos de Belleza SA" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Contacto</label>
                  <input className={inputClass} value={form.contactName}
                    onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                    placeholder="Nombre del contacto" />
                </div>
                <div>
                  <label className={labelClass}>Cargo</label>
                  <input className={inputClass} value={form.contactTitle}
                    onChange={e => setForm(f => ({ ...f, contactTitle: e.target.value }))}
                    placeholder="Ej: Gerente de ventas" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Email</label>
                  <input className={inputClass} type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input className={inputClass} value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Sitio web</label>
                  <input className={inputClass} value={form.website}
                    onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>RFC / Tax ID</label>
                  <input className={inputClass} value={form.taxId}
                    onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Categoría</label>
                  <input className={inputClass} value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="Ej: Productos de belleza" />
                </div>
                <div>
                  <label className={labelClass}>Condiciones de pago</label>
                  <input className={inputClass} value={form.paymentTerms}
                    onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))}
                    placeholder="Ej: Net 30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Límite de crédito</label>
                  <input className={inputClass} type="number" min="0" step="0.01" value={form.creditLimit}
                    onChange={e => setForm(f => ({ ...f, creditLimit: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Dirección</label>
                  <input className={inputClass} value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Notas</label>
                <textarea className={inputClass + ' h-20 resize-none py-2'} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Notas internas..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-surface-primary/30">
              <button onClick={() => setShowModal(false)}
                className="h-10 px-4 rounded-lg border border-border-primary text-sm font-medium text-muted-foreground hover:bg-surface-hover transition">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 h-10 px-6 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear proveedor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
