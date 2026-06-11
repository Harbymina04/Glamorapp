'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { ArrowLeft, Save, Loader2, Scissors } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function NewServicePage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch(`${API}/master-data/categories?type=service&lang=es`)
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    durationMinutes: '60',
    color: '#EF2D8F',
    ivaRate: '19',
    isIvaExcluded: 'false',
  });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError('El nombre es obligatorio');
    if (!form.price || parseFloat(form.price) <= 0) return setError('El precio debe ser mayor a 0');
    setSaving(true);
    setError('');
    try {
      await api.post('/services', {
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        description: form.description.trim() || undefined,
        price: parseFloat(form.price),
        durationMinutes: parseInt(form.durationMinutes) || 60,
        color: form.color,
        ivaRate: form.isIvaExcluded === 'true' ? 0 : parseFloat(form.ivaRate) || 19,
        isIvaExcluded: form.isIvaExcluded === 'true',
      }, { token: token! });

      router.push('/dashboard/inventory/services');
    } catch (e: any) {
      setError(e.message || 'Error al crear servicio');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition';
  const labelClass = 'block text-sm font-medium text-foreground mb-1.5';

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-surface-hover">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nuevo servicio</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Agrega un servicio al catálogo</p>
        </div>
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

        {/* Name */}
        <div>
          <label className={labelClass}>Nombre *</label>
          <input className={inputClass} value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="Ej: Manicure premium" />
        </div>

        {/* Category + Duration */}
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

        {/* Description */}
        <div>
          <label className={labelClass}>Descripción</label>
          <textarea className={`${inputClass} h-20 py-2 resize-none`} value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Describe el servicio (opcional)..." />
        </div>

        {/* Price + Color */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Precio *</label>
            <input type="number" step="0.01" min="0" className={inputClass} value={form.price} onChange={e => handleChange('price', e.target.value)} placeholder="0.00" />
            <p className="text-xs text-muted-foreground mt-1">Precio incluye IVA</p>
          </div>
          <div>
            <label className={labelClass}>Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.color} onChange={e => handleChange('color', e.target.value)} className="w-10 h-10 rounded-lg border border-border-primary cursor-pointer p-0.5" />
              <input className={inputClass} value={form.color} onChange={e => handleChange('color', e.target.value)} placeholder="#EF2D8F" />
            </div>
          </div>
        </div>

        {/* IVA Colombia */}
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-3">
          <span className="text-sm font-semibold text-blue-800">Configuración IVA (Colombia)</span>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tarifa IVA</label>
              <select
                className={inputClass}
                value={form.isIvaExcluded === 'true' ? 'excluded' : form.ivaRate}
                onChange={e => {
                  if (e.target.value === 'excluded') {
                    handleChange('isIvaExcluded', 'true'); handleChange('ivaRate', '0');
                  } else {
                    handleChange('isIvaExcluded', 'false'); handleChange('ivaRate', e.target.value);
                  }
                }}
              >
                <option value="19">19% — Servicios de belleza (tarifa general)</option>
                <option value="5">5% — Tarifa diferencial</option>
                <option value="0">0% — Exento</option>
                <option value="excluded">Excluido de IVA</option>
              </select>
            </div>
            {form.isIvaExcluded !== 'true' && form.ivaRate && Number(form.price) > 0 && (
              <div className="flex items-end pb-1">
                <div className="text-xs text-blue-600 bg-white/60 rounded px-3 py-2 w-full">
                  Base gravable: <strong>${(Number(form.price) / (1 + Number(form.ivaRate) / 100)).toLocaleString('es-CO', { minimumFractionDigits: 0 })}</strong>
                  <br />IVA incluido: <strong>${(Number(form.price) - Number(form.price) / (1 + Number(form.ivaRate) / 100)).toLocaleString('es-CO', { minimumFractionDigits: 0 })}</strong>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => router.back()} className="h-10 px-4 rounded-lg border border-border-primary text-sm font-medium text-muted-foreground hover:bg-surface-hover transition">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 h-10 px-6 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Guardar servicio'}
          </button>
        </div>
      </div>
    </div>
  );
}
