'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { Plus, Loader2, Pencil, ToggleLeft, ToggleRight, X, Check, Percent, Tag, Calendar } from 'lucide-react';

type DiscountStatus = 'active' | 'scheduled' | 'expired' | 'inactive';

const SCOPE_LABELS: Record<string, string> = {
  all: 'Todo el catálogo',
  products: 'Productos específicos',
  services: 'Servicios',
  category: 'Por categoría',
};

const STATUS_STYLES: Record<DiscountStatus, string> = {
  active:    'bg-green-100 text-green-700 border-green-200',
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  expired:   'bg-gray-100 text-gray-500 border-gray-200',
  inactive:  'bg-orange-100 text-orange-700 border-orange-200',
};

const STATUS_LABELS: Record<DiscountStatus, string> = {
  active: 'Activa', scheduled: 'Programada', expired: 'Vencida', inactive: 'Inactiva',
};

function getStatus(d: any): DiscountStatus {
  const now = new Date();
  if (!d.isActive) return 'inactive';
  if (d.endDate && new Date(d.endDate) < now) return 'expired';
  if (d.startDate && new Date(d.startDate) > now) return 'scheduled';
  return 'active';
}

const emptyForm = {
  name: '', description: '', discountPercent: '', scope: 'all',
  targetIds: [] as string[], startDate: '', endDate: '', isActive: true,
  applyToStorefront: false,
};

const inputCls = 'w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition';
const labelCls = 'block text-sm font-medium text-foreground mb-1.5';

export default function DiscountsPage() {
  const { token } = useAuthStore();
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/discounts?limit=50', { token });
      setDiscounts(res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Load products/categories when form opens and scope changes
  useEffect(() => {
    if (!showForm || !token) return;
    if (form.scope === 'products') {
      api.get('/products?limit=200', { token }).then(r => setProducts(r.data || [])).catch(() => {});
    }
    if (form.scope === 'category') {
      api.get('/products/categories', { token }).then(r => setCategories(r || [])).catch(() => {});
    }
  }, [showForm, form.scope, token]);

  const openCreate = () => { setForm(emptyForm); setEditId(null); setError(''); setShowForm(true); };
  const openEdit = (d: any) => {
    setForm({
      name: d.name, description: d.description || '', discountPercent: String(d.discountPercent),
      scope: d.scope, targetIds: Array.isArray(d.targetIds) ? d.targetIds : [],
      startDate: d.startDate ? d.startDate.slice(0, 10) : '',
      endDate:   d.endDate   ? d.endDate.slice(0, 10)   : '',
      isActive: d.isActive,
      applyToStorefront: d.applyToStorefront ?? false,
    });
    setEditId(d.id); setError(''); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError('El nombre es requerido');
    const pct = parseFloat(form.discountPercent);
    if (isNaN(pct) || pct <= 0 || pct > 100) return setError('El descuento debe ser entre 0.01% y 100%');
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name.trim(), description: form.description.trim() || undefined,
        discountPercent: pct, scope: form.scope, targetIds: form.targetIds,
        startDate: form.startDate || undefined, endDate: form.endDate || undefined,
        isActive: form.isActive,
        applyToStorefront: form.applyToStorefront,
      };
      if (editId) await api.put(`/discounts/${editId}`, payload, { token: token! });
      else await api.post('/discounts', payload, { token: token! });
      setShowForm(false); await load();
    } catch (e: any) { setError(e.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (id: string) => {
    try { await api.patch(`/discounts/${id}/toggle`, {}, { token: token! }); await load(); }
    catch (e: any) { alert(e.message || 'Error'); }
  };

  const toggleTarget = (id: string) => {
    setForm(f => ({
      ...f,
      targetIds: f.targetIds.includes(id)
        ? f.targetIds.filter(x => x !== id)
        : [...f.targetIds, id],
    }));
  };

  const activeCount = discounts.filter(d => getStatus(d) === 'active').length;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campañas de Descuento</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crea descuentos automáticos que se aplican en el POS al agregar productos o servicios.
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 h-9 px-4 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition">
          <Plus className="w-4 h-4" /> Nueva campaña
        </button>
      </div>

      {/* Active banner */}
      {activeCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          <Percent className="w-4 h-4 text-green-600" />
          <span><strong>{activeCount}</strong> campaña{activeCount > 1 ? 's' : ''} activa{activeCount > 1 ? 's' : ''} en este momento — los precios se aplican automáticamente en el POS.</span>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border-primary p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">{editId ? 'Editar campaña' : 'Nueva campaña'}</h2>
            <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-surface-hover"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Nombre de la campaña *</label>
              <input className={inputCls} placeholder="ej. Promo de verano 20%" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Descuento (%) *</label>
              <div className="relative">
                <input type="number" min="0.01" max="100" step="0.01" className={inputCls} placeholder="20" value={form.discountPercent} onChange={e => setForm(f => ({ ...f, discountPercent: e.target.value }))} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
            </div>
            <div>
              <label className={labelCls}>Alcance</label>
              <select className={inputCls} value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value, targetIds: [] }))}>
                <option value="all">Todo el catálogo</option>
                <option value="products">Productos específicos</option>
                <option value="services">Solo servicios</option>
                <option value="category">Por categoría</option>
              </select>
            </div>
          </div>

          {/* Target picker */}
          {form.scope === 'products' && (
            <div>
              <label className={labelCls}>Productos ({form.targetIds.length} seleccionados — si no seleccionas ninguno aplica a todos los productos)</label>
              <div className="border border-border-primary rounded-lg max-h-44 overflow-auto divide-y divide-border">
                {products.slice(0, 100).map(p => (
                  <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-surface-hover cursor-pointer">
                    <input type="checkbox" checked={form.targetIds.includes(p.id)} onChange={() => toggleTarget(p.id)} className="accent-glamor-primary" />
                    <span className="text-sm text-foreground flex-1">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{formatCurrency(p.salePrice)}</span>
                  </label>
                ))}
                {products.length === 0 && <p className="text-sm text-muted-foreground px-3 py-4 text-center">Cargando productos...</p>}
              </div>
            </div>
          )}

          {form.scope === 'category' && (
            <div>
              <label className={labelCls}>Categorías</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((c: any) => (
                  <button key={c.id} type="button" onClick={() => toggleTarget(c.id)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition ${form.targetIds.includes(c.id) ? 'bg-glamor-primary text-white border-glamor-primary' : 'bg-white text-foreground border-border-primary hover:bg-surface-hover'}`}>
                    {c.name}
                  </button>
                ))}
                {categories.length === 0 && <p className="text-sm text-muted-foreground">Cargando categorías...</p>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fecha inicio (opcional)</label>
              <input type="date" className={inputCls} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Fecha fin (opcional)</label>
              <input type="date" className={inputCls} value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Descripción (opcional)</label>
            <input className={inputCls} placeholder="Notas internas..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 rounded accent-glamor-primary" />
              <span className="text-sm text-foreground">Activa al guardar</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.applyToStorefront} onChange={e => setForm(f => ({ ...f, applyToStorefront: e.target.checked }))}
                className="w-4 h-4 rounded accent-glamor-primary" />
              <span className="text-sm text-foreground">
                Aplicar también en la <strong>Tienda Virtual</strong>
                <span className="ml-1 text-xs text-muted-foreground">(muestra precio tachado y badge en el catálogo online)</span>
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border-primary">
            <button onClick={() => setShowForm(false)} className="h-9 px-4 rounded-lg border border-border-primary text-sm text-muted-foreground hover:bg-surface-hover transition">Cancelar</button>
            <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 h-9 px-5 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40 bg-white rounded-xl border border-border-primary">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : discounts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-border-primary">
          <Percent className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground font-medium">No hay campañas creadas</p>
          <p className="text-muted-foreground text-sm mt-1">Crea una campaña para aplicar descuentos automáticos en el POS.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border-primary overflow-hidden shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary bg-surface-primary/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Campaña</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase w-24">Descuento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Alcance</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Vigencia</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase w-28">Estado</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {discounts.map(d => {
                const status = getStatus(d);
                const targets = Array.isArray(d.targetIds) ? d.targetIds : [];
                return (
                  <tr key={d.id} className="hover:bg-surface-hover/30 transition">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">{d.name}</p>
                      {d.description && <p className="text-xs text-muted-foreground truncate max-w-48">{d.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-lg font-bold text-glamor-primary">
                        {Number(d.discountPercent)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground">{SCOPE_LABELS[d.scope] ?? d.scope}</span>
                        {targets.length > 0 && <span className="text-xs text-muted-foreground">({targets.length})</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {d.startDate || d.endDate ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          {d.startDate ? new Date(d.startDate).toLocaleDateString('es-CO') : '—'}
                          {' → '}
                          {d.endDate ? new Date(d.endDate).toLocaleDateString('es-CO') : '∞'}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin límite</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLES[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(d)} className="p-1.5 rounded hover:bg-surface-hover text-muted-foreground hover:text-foreground transition" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleToggle(d.id)} className="p-1.5 rounded hover:bg-surface-hover transition" title={d.isActive ? 'Desactivar' : 'Activar'}>
                          {d.isActive
                            ? <ToggleRight className="w-5 h-5 text-green-500" />
                            : <ToggleLeft  className="w-5 h-5 text-muted-foreground" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
