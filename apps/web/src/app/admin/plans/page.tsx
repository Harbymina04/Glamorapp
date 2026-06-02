'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  Plus, Save, Loader2, X, Pencil, Trash2, CheckCircle2, AlertCircle,
  Crown, Users, Building2, Sparkles, Zap, HardDrive,
} from 'lucide-react';

interface PlanFeatures {
  modules: Record<string, boolean>;
  limits: { maxBranches: number; maxUsers: number; aiTokensMonthly: number; storageGB: number };
}

interface Plan {
  id: string; name: string; slug: string; description?: string;
  monthlyPrice: number; yearlyPrice: number;
  maxUsers: number; maxBranches: number;
  features?: PlanFeatures; isActive: boolean; isPopular: boolean; sortOrder: number;
}

const MODULE_KEYS = [
  { key: 'pos', label: 'POS (Ventas)' },
  { key: 'inventory', label: 'Inventario' },
  { key: 'catalog', label: 'Catálogo' },
  { key: 'appointments', label: 'Citas' },
  { key: 'customers', label: 'Clientes' },
  { key: 'suppliers', label: 'Proveedores' },
  { key: 'purchases', label: 'Compras' },
  { key: 'expenses', label: 'Gastos' },
  { key: 'reports', label: 'Reportes' },
  { key: 'users', label: 'Usuarios' },
  { key: 'ai_agents', label: 'Agentes IA' },
  { key: 'accounting', label: 'Contabilidad' },
  { key: 'api', label: 'API' },
  { key: 'whiteLabel', label: 'White Label' },
];

function defaultFeatures(): PlanFeatures {
  return {
    modules: Object.fromEntries(MODULE_KEYS.map(m => [m.key, false])),
    limits: { maxBranches: 1, maxUsers: 2, aiTokensMonthly: 5000, storageGB: 1 },
  };
}

const emptyPlan = {
  name: '', slug: '', description: '',
  monthlyPrice: 0, yearlyPrice: 0,
  maxUsers: 2, maxBranches: 1,
  features: defaultFeatures(), isActive: true, isPopular: false, sortOrder: 0,
};

export default function AdminPlansPage() {
  const { token } = useAuthStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState(emptyPlan);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/plans', { token: token! });
      setPlans(res || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (token) fetchPlans(); }, [fetchPlans, token]);

  const openNew = () => { setEditing(null); setForm(emptyPlan); setError(''); setShowModal(true); };
  const openEdit = (p: Plan) => {
    // Ensure features has the new format
    const features = p.features || defaultFeatures();
    if (!features.modules) {
      // Convert old flat format
      const oldFeatures = p.features as any || {};
      features.modules = Object.fromEntries(MODULE_KEYS.map(m => [m.key, !!oldFeatures[m.key]]));
      features.limits = { maxBranches: p.maxBranches, maxUsers: p.maxUsers, aiTokensMonthly: 5000, storageGB: 1 };
    }
    setEditing(p);
    setForm({ ...p, description: p.description ?? '', features });
    setError('');
    setShowModal(true);
  };

  const toggleModule = (key: string) => {
    setForm(f => ({
      ...f,
      features: {
        ...f.features!,
        modules: { ...f.features!.modules, [key]: !f.features!.modules[key] },
      },
    }));
  };

  const updateLimit = (key: string, value: number) => {
    setForm(f => ({
      ...f,
      maxUsers: key === 'maxUsers' ? value : f.maxUsers,
      maxBranches: key === 'maxBranches' ? value : f.maxBranches,
      features: {
        ...f.features!,
        limits: { ...f.features!.limits, [key]: value },
      },
    }));
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) return setError('Nombre y slug son requeridos');
    setSaving(true);
    try {
      // Sync limits to top-level fields for backward compat
      const data = {
        ...form,
        maxUsers: form.features?.limits?.maxUsers ?? form.maxUsers,
        maxBranches: form.features?.limits?.maxBranches ?? form.maxBranches,
      };
      if (editing) {
        await api.put(`/admin/plans/${editing.id}`, data, { token: token! });
      } else {
        await api.post('/admin/plans', data, { token: token! });
      }
      setShowModal(false);
      fetchPlans();
      setToast({ msg: editing ? 'Plan actualizado' : 'Plan creado', type: 'success' });
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Inactivar este plan?')) return;
    try {
      await api.del(`/admin/plans/${id}`, { token: token! });
      fetchPlans();
      setToast({ msg: 'Plan inactivado', type: 'success' });
    } catch (e: any) {
      setToast({ msg: e.message || 'Error', type: 'error' });
    }
  };

  const activeModuleCount = (p: Plan) => {
    const modules = p.features?.modules || {};
    return Object.values(modules).filter(Boolean).length;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-glamor-primary" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planes y Suscripciones</h1>
          <p className="text-muted-foreground text-sm mt-1">Administra los planes de precios del sistema</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 h-10 px-4 bg-glamor-primary text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Nuevo plan
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border-primary overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-hover border-b border-border-primary">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Plan</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Precio M</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Precio A</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Usuarios</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Sucursales</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Módulos</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Tokens IA</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Estado</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(p => (
              <tr key={p.id} className="border-b border-border-light hover:bg-surface-hover/50 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {p.isPopular && <Crown className="w-4 h-4 text-amber-500" />}
                    <div>
                      <p className="text-sm font-semibold text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">/{p.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{formatCurrency(p.monthlyPrice)}</td>
                <td className="px-4 py-3 text-sm">{formatCurrency(p.yearlyPrice)}</td>
                <td className="px-4 py-3 text-sm flex items-center gap-1"><Users className="w-3.5 h-3.5 text-muted-foreground" /> {p.maxUsers}</td>
                <td className="px-4 py-3 text-sm flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-muted-foreground" /> {p.maxBranches}</td>
                <td className="px-4 py-3 text-sm">{activeModuleCount(p)} módulos</td>
                <td className="px-4 py-3 text-sm flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  {(p.features?.limits?.aiTokensMonthly || 0) >= 1000
                    ? `${((p.features?.limits?.aiTokensMonthly || 0) / 1000).toFixed(0)}K`
                    : (p.features?.limits?.aiTokensMonthly || 0)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.isActive ? 'active' : 'inactive'} colors={{ active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-500' }} labels={{ active: 'Activo', inactive: 'Inactivo' }} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-surface-hover"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">No hay planes creados. Crea el primero.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
              <h3 className="text-lg font-bold">{editing ? 'Editar plan' : 'Nuevo plan'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-hover"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-muted-foreground mb-1">Nombre</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full h-10 px-3 rounded-lg border text-sm" placeholder="Profesional" /></div>
                <div><label className="block text-xs font-medium text-muted-foreground mb-1">Slug</label><input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="w-full h-10 px-3 rounded-lg border text-sm" placeholder="profesional" disabled={!!editing} /></div>
              </div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Descripción</label><textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="w-full h-20 px-3 py-2 rounded-lg border text-sm resize-none" /></div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-muted-foreground mb-1">Precio mensual</label><input type="number" value={form.monthlyPrice} onChange={e => setForm({...form, monthlyPrice: Number(e.target.value)})} className="w-full h-10 px-3 rounded-lg border text-sm" /></div>
                <div><label className="block text-xs font-medium text-muted-foreground mb-1">Precio anual</label><input type="number" value={form.yearlyPrice} onChange={e => setForm({...form, yearlyPrice: Number(e.target.value)})} className="w-full h-10 px-3 rounded-lg border text-sm" /></div>
              </div>

              {/* Limits */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><HardDrive className="w-4 h-4" /> Límites</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div><label className="block text-xs text-muted-foreground mb-1">Max Usuarios</label><input type="number" value={form.features?.limits?.maxUsers ?? form.maxUsers} onChange={e => updateLimit('maxUsers', Number(e.target.value))} className="w-full h-10 px-3 rounded-lg border text-sm" /></div>
                  <div><label className="block text-xs text-muted-foreground mb-1">Max Sucursales</label><input type="number" value={form.features?.limits?.maxBranches ?? form.maxBranches} onChange={e => updateLimit('maxBranches', Number(e.target.value))} className="w-full h-10 px-3 rounded-lg border text-sm" /></div>
                  <div><label className="block text-xs text-muted-foreground mb-1">Tokens IA/mes</label><input type="number" value={form.features?.limits?.aiTokensMonthly || 0} onChange={e => updateLimit('aiTokensMonthly', Number(e.target.value))} className="w-full h-10 px-3 rounded-lg border text-sm" /></div>
                  <div><label className="block text-xs text-muted-foreground mb-1">Storage (GB)</label><input type="number" value={form.features?.limits?.storageGB || 0} onChange={e => updateLimit('storageGB', Number(e.target.value))} className="w-full h-10 px-3 rounded-lg border text-sm" /></div>
                </div>
              </div>

              {/* Modules */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Módulos</h4>
                <div className="grid grid-cols-3 gap-2">
                  {MODULE_KEYS.map(m => (
                    <label key={m.key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-surface-hover px-2 py-1.5 rounded">
                      <input type="checkbox" checked={form.features?.modules?.[m.key] || false} onChange={() => toggleModule(m.key)} className="rounded" />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isPopular} onChange={e => setForm({...form, isPopular: e.target.checked})} className="rounded" />
                  <Crown className="w-4 h-4 text-amber-500" /> Popular
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="rounded" />
                  Activo
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-primary bg-surface-primary/30">
              <button onClick={() => setShowModal(false)} className="h-10 px-4 rounded-lg border text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 h-10 px-6 bg-glamor-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border ${
          toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 p-0.5 rounded hover:bg-black/5"><X className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}
