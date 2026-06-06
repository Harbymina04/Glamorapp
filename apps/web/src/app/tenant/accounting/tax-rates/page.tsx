'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { Plus, Trash2, Loader2, Check, Pencil, X } from 'lucide-react';

const TAX_TYPES = [
  { value: 'iva', label: 'IVA' },
  { value: 'ica', label: 'ICA' },
  { value: 'retefuente', label: 'ReteFuente' },
  { value: 'reteiva', label: 'ReteIVA' },
  { value: 'reteica', label: 'ReteICA' },
];

const APPLIES_TO = [
  { value: 'all', label: 'Todos' },
  { value: 'products', label: 'Productos' },
  { value: 'services', label: 'Servicios' },
];

const emptyForm = { name: '', taxType: 'iva', rate: '', isDefault: false, appliesTo: 'all' };

export default function TaxRatesPage() {
  const { token } = useAuthStore();
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await api.get('/accounting/tax-rates', { token: token! });
      setRates(data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (token) load(); }, [token]);

  const handleSubmit = async () => {
    if (!form.name || !form.rate) return setError('Nombre y tasa son requeridos');
    const rate = parseFloat(form.rate);
    if (isNaN(rate) || rate < 0 || rate > 100) return setError('La tasa debe ser entre 0 y 100');

    setSaving(true); setError('');
    try {
      const payload = { name: form.name, taxType: form.taxType, rate, isDefault: form.isDefault, appliesTo: form.appliesTo };
      if (editId) {
        await api.put(`/accounting/tax-rates/${editId}`, payload, { token: token! });
      } else {
        await api.post('/accounting/tax-rates', payload, { token: token! });
      }
      setShowForm(false); setForm(emptyForm); setEditId(null);
      await load();
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleEdit = (r: any) => {
    setForm({ name: r.name, taxType: r.taxType, rate: String(r.rate), isDefault: r.isDefault, appliesTo: r.appliesTo });
    setEditId(r.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desactivar esta tarifa?')) return;
    try {
      await api.del(`/accounting/tax-rates/${id}`, { token: token! });
      await load();
    } catch (e: any) { alert(e.message || 'Error'); }
  };

  const inputClass = 'w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tarifas de impuestos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configura las tarifas de IVA y retenciones aplicadas en ventas y compras. La tarifa marcada como <strong>predeterminada</strong> se aplica automáticamente en el POS.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
            className="flex items-center gap-2 h-9 px-4 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition"
          >
            <Plus className="w-4 h-4" /> Nueva tarifa
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border-primary p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">{editId ? 'Editar tarifa' : 'Nueva tarifa'}</h2>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="p-1 rounded hover:bg-surface-hover">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nombre *</label>
              <input className={inputClass} placeholder="ej. IVA 19%" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Tasa (%) *</label>
              <input type="number" min="0" max="100" step="0.01" className={inputClass} placeholder="19" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Tipo</label>
              <select className={inputClass} value={form.taxType} onChange={e => setForm(f => ({ ...f, taxType: e.target.value }))}>
                {TAX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Aplica a</label>
              <select className={inputClass} value={form.appliesTo} onChange={e => setForm(f => ({ ...f, appliesTo: e.target.value }))}>
                {APPLIES_TO.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
              className="w-4 h-4 rounded border-border-primary accent-glamor-primary" />
            <span className="text-sm text-foreground">Predeterminada para el POS (IVA de ventas)</span>
          </label>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="h-9 px-4 rounded-lg border border-border-primary text-sm text-muted-foreground hover:bg-surface-hover transition">
              Cancelar
            </button>
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
      ) : rates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-border-primary">
          <p className="text-muted-foreground text-sm">No hay tarifas configuradas.</p>
          <p className="text-muted-foreground text-xs mt-1">Crea una tarifa de IVA para que el POS la aplique automáticamente.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border-primary overflow-hidden shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary bg-surface-primary/50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Nombre</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase w-20">Tasa</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Aplica a</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase w-28">Predeterminada</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rates.map((r: any) => (
                <tr key={r.id} className="hover:bg-surface-hover/30 transition">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{r.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {TAX_TYPES.find(t => t.value === r.taxType)?.label ?? r.taxType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">{Number(r.rate)}%</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{r.appliesTo}</td>
                  <td className="px-4 py-3 text-center">
                    {r.isDefault ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> Sí
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => handleEdit(r)} className="p-1.5 rounded hover:bg-surface-hover text-muted-foreground hover:text-foreground transition">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
