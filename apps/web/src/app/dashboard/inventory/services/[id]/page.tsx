'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { ArrowLeft, Save, Loader2, Trash2, Scissors } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuthStore();
  const serviceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch(`${API}/master-data/categories?type=service&lang=es`)
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    durationMinutes: '60',
    color: '#EF2D8F',
  });

  useEffect(() => {
    if (!token) return;
    api.get(`/services/${serviceId}`, { token })
      .then((s) => {
        setForm({
          name: s.name || '',
          category: s.category || '',
          description: s.description || '',
          price: String(s.price || ''),
          durationMinutes: String(s.durationMinutes ?? '60'),
          color: s.color || '#EF2D8F',
        });
      })
      .catch(() => setError('Servicio no encontrado'))
      .finally(() => setLoading(false));
  }, [token, serviceId]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setError('El nombre es obligatorio');
    if (!form.price || parseFloat(form.price) <= 0) return setError('El precio debe ser mayor a 0');
    setSaving(true);
    setError('');
    try {
      await api.put(`/services/${serviceId}`, {
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        description: form.description.trim() || undefined,
        price: parseFloat(form.price),
        durationMinutes: parseInt(form.durationMinutes) || 60,
        color: form.color,
      }, { token: token! });
      router.push('/dashboard/inventory/services');
    } catch (e: any) {
      setError(e.message || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este servicio? Se marcará como inactivo.')) return;
    setDeleting(true);
    try {
      await api.del(`/services/${serviceId}`, { token: token! });
      router.push('/dashboard/inventory/services');
    } catch (e: any) {
      setError(e.message || 'Error al eliminar');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-surface-hover rounded" />
          <div className="h-64 bg-white rounded-xl border border-border-primary" />
        </div>
      </div>
    );
  }

  const inputClass = 'w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition';
  const labelClass = 'block text-sm font-medium text-foreground mb-1.5';

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-surface-hover">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Editar servicio</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{form.name || 'Servicio'}</p>
          </div>
        </div>
        <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 h-9 px-4 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition disabled:opacity-50">
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Eliminar
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-border-primary p-6 shadow-card space-y-5">
        {/* Preview */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-primary/50 border border-border-primary">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: form.color }}>
            <Scissors className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">{form.name || 'Nombre del servicio'}</p>
            <p className="text-xs text-muted-foreground">
              {form.category || 'Sin categoría'} · {form.durationMinutes} min · ${parseFloat(form.price || '0').toFixed(2)}
            </p>
          </div>
        </div>

        <div>
          <label className={labelClass}>Nombre *</label>
          <input className={inputClass} value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="Ej: Manicure premium" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Categoría</label>
            <select className={inputClass} value={form.category} onChange={e => handleChange('category', e.target.value)}>
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Duración (minutos)</label>
            <input type="number" min="5" step="5" className={inputClass} value={form.durationMinutes} onChange={e => handleChange('durationMinutes', e.target.value)} placeholder="60" />
          </div>
        </div>

        <div>
          <label className={labelClass}>Descripción</label>
          <textarea className={`${inputClass} h-20 py-2 resize-none`} value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Describe el servicio (opcional)..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Precio *</label>
            <input type="number" step="0.01" min="0" className={inputClass} value={form.price} onChange={e => handleChange('price', e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className={labelClass}>Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.color} onChange={e => handleChange('color', e.target.value)} className="w-10 h-10 rounded-lg border border-border-primary cursor-pointer p-0.5" />
              <input className={inputClass} value={form.color} onChange={e => handleChange('color', e.target.value)} placeholder="#EF2D8F" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => router.back()} className="h-10 px-4 rounded-lg border border-border-primary text-sm font-medium text-muted-foreground hover:bg-surface-hover transition">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 h-10 px-6 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
