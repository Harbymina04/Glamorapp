'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api, API_BASE_URL } from '@/lib/api-client';
import { formatCurrency, cn } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { ImageUploader, ProductImage } from '@/components/shared/image-uploader';
import { ArrowLeft, Save, Loader2, Trash2, Package, Truck, Clock, Star, TrendingUp, Sparkles } from 'lucide-react';

const API_BASE = API_BASE_URL;

type Tab = 'info' | 'proveedores' | 'movimientos';

const MOVE_TYPE_LABELS: Record<string, string> = {
  entry: 'Entrada',
  exit: 'Salida',
  adjustment: 'Ajuste',
  transfer: 'Transferencia',
};

const MOVE_TYPE_COLORS: Record<string, string> = {
  entry: 'text-green-600',
  exit: 'text-red-600',
  adjustment: 'text-orange-600',
  transfer: 'text-blue-600',
};

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuthStore();
  const productId = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>('info');

  // Info tab state
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [productName, setProductName] = useState('');
  const [form, setForm] = useState({
    name: '', sku: '', description: '', categoryId: '', brandId: '',
    salePrice: '', costPrice: '', currentStock: '0', minStock: '5', unitOfMeasure: 'unit',
  });

  // Proveedores tab state
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // Movimientos tab state
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api.get(`/products/${productId}`, { token }),
      api.get('/products/categories/list', { token }),
      api.get('/products/brands/list', { token }),
    ]).then(([product, cats, brands]) => {
      const p = product;
      setProductName(p.name);
      setForm({
        name: p.name || '', sku: p.sku || '', description: p.description || '',
        categoryId: p.categoryId || '', brandId: p.brandId || '',
        salePrice: String(p.salePrice || ''), costPrice: String(p.costPrice || ''),
        currentStock: String(p.currentStock ?? '0'), minStock: String(p.minStock ?? '5'),
        unitOfMeasure: p.unitOfMeasure || 'unit',
      });
      setImages(p.images || []);
      setCategories(Array.isArray(cats) ? cats : cats?.data || []);
      setBrands(Array.isArray(brands) ? brands : brands?.data || []);
    }).catch(() => setError('Producto no encontrado'))
      .finally(() => setLoading(false));
  }, [token, productId]);

  // Resolve master_ prefixed IDs before saving
  const resolveMasterId = async (id: string, type: 'categories' | 'brands'): Promise<string> => {
    if (!id.startsWith('master_')) return id;
    const masterId = id.replace('master_', '');
    const result = await api.post(`/products/${type}/from-master`, { masterId }, { token: token! });
    return result.id;
  };

  // Load suppliers when tab activated
  useEffect(() => {
    if (activeTab !== 'proveedores' || !token) return;
    setLoadingSuppliers(true);
    api.get(`/products/${productId}/suppliers`, { token })
      .then(res => setSuppliers(Array.isArray(res) ? res : res.data || []))
      .catch(() => {})
      .finally(() => setLoadingSuppliers(false));
  }, [activeTab, token, productId]);

  // Load movements when tab activated
  useEffect(() => {
    if (activeTab !== 'movimientos' || !token) return;
    setLoadingMovements(true);
    api.get(`/products/${productId}/movements?limit=50`, { token })
      .then(res => setMovements(res.data || []))
      .catch(() => {})
      .finally(() => setLoadingMovements(false));
  }, [activeTab, token, productId]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const generateDesc = async () => {
    if (!form.name?.trim()) return;
    setGeneratingDesc(true);
    try {
      const res = await api.post('/products/ai/describe', {
        name: form.name,
        category: categories.find((c: any) => c.id === form.categoryId)?.name,
        brand: brands.find((b: any) => b.id === form.brandId)?.name,
      }, { token });
      if (res.description) setForm(prev => ({ ...prev, description: res.description }));
    } catch {}
    finally { setGeneratingDesc(false); }
  };

  const handleUploadImages = async (files: File[]): Promise<ProductImage[]> => {
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));
    const res = await fetch(`${API_BASE}/api/v1/products/${productId}/images`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
    });
    if (!res.ok) throw new Error('Error al subir imágenes');
    const data = await res.json();
    return data.images;
  };

  const handleRemoveImage = async (imageId: string) => {
    await fetch(`${API_BASE}/api/v1/products/${productId}/images/${imageId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setError('El nombre es obligatorio');
    setSaving(true); setError('');
    try {
      const categoryId = form.categoryId ? await resolveMasterId(form.categoryId, 'categories') : undefined;
      const brandId = form.brandId ? await resolveMasterId(form.brandId, 'brands') : undefined;
      await api.put(`/products/${productId}`, {
        name: form.name.trim(), sku: form.sku.trim() || undefined,
        description: form.description.trim() || undefined,
        categoryId, brandId,
        salePrice: parseFloat(form.salePrice) || 0,
        costPrice: parseFloat(form.costPrice) || undefined,
        minStock: parseInt(form.minStock) || 5, unitOfMeasure: form.unitOfMeasure || 'unit',
      }, { token: token! });
      setProductName(form.name.trim());
      setError('');
    } catch (e: any) {
      setError(e.message || 'Error al actualizar');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este producto? Se marcará como inactivo.')) return;
    setDeleting(true);
    try { await api.del(`/products/${productId}`, { token: token! }); router.push('/dashboard/inventory/products'); }
    catch (e: any) { setError(e.message || 'Error al eliminar'); setDeleting(false); }
  };

  const tabClass = (tab: Tab) => cn(
    'px-4 py-2.5 text-sm font-medium border-b-2 transition',
    activeTab === tab
      ? 'border-glamor-primary text-glamor-primary'
      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border-primary',
  );

  const inputClass = 'w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition';
  const labelClass = 'block text-sm font-medium text-foreground mb-1.5';

  if (loading) {
    return (
      <div className="max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-surface-hover rounded" />
          <div className="h-96 bg-white rounded-xl border border-border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-surface-hover">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{productName}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Stock: {form.currentStock} · SKU: {form.sku || '—'}</p>
          </div>
        </div>
        <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 h-9 px-4 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition disabled:opacity-50">
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Eliminar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-primary mb-6">
        <button onClick={() => setActiveTab('info')} className={tabClass('info')}>
          <span className="flex items-center gap-1.5"><Package className="w-4 h-4" /> Info General</span>
        </button>
        <button onClick={() => setActiveTab('proveedores')} className={tabClass('proveedores')}>
          <span className="flex items-center gap-1.5"><Truck className="w-4 h-4" /> Proveedores</span>
        </button>
        <button onClick={() => setActiveTab('movimientos')} className={tabClass('movimientos')}>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Movimientos</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* === INFO GENERAL TAB === */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-xl border border-border-primary p-6 shadow-card space-y-5">
          <ImageUploader
            images={images} onUpload={handleUploadImages} onRemove={handleRemoveImage}
            onImagesChange={setImages} disabled={saving}
          />

          <div>
            <label className={labelClass}>Nombre *</label>
            <input className={inputClass} value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="Ej: Esmalte semipermanente" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>SKU</label><input className={inputClass} value={form.sku} onChange={e => handleChange('sku', e.target.value)} placeholder="SKU-001" /></div>
            <div>
              <label className={labelClass}>Unidad de medida</label>
              <select className={inputClass} value={form.unitOfMeasure} onChange={e => handleChange('unitOfMeasure', e.target.value)}>
                <option value="unit">Unidad</option><option value="ml">Mililitro (ml)</option>
                <option value="g">Gramo (g)</option><option value="kit">Kit</option><option value="pair">Par</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelClass}>Descripción</label>
              <button
                type="button"
                onClick={generateDesc}
                disabled={!form.name?.trim() || generatingDesc}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition disabled:opacity-40"
              >
                {generatingDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {generatingDesc ? 'Generando...' : 'Generar con IA'}
              </button>
            </div>
            <textarea className={`${inputClass} h-20 py-2 resize-none`} value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Descripción opcional..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Categoría</label>
              <select className={inputClass} value={form.categoryId} onChange={e => handleChange('categoryId', e.target.value)}>
                <option value="">Sin categoría</option>
                {categories.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Marca</label>
              <select className={inputClass} value={form.brandId} onChange={e => handleChange('brandId', e.target.value)}>
                <option value="">Sin marca</option>
                {brands.map((b: any) => (<option key={b.id} value={b.id}>{b.name}</option>))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div><label className={labelClass}>Precio venta *</label><input type="number" step="0.01" min="0" className={inputClass} value={form.salePrice} onChange={e => handleChange('salePrice', e.target.value)} placeholder="0.00" /></div>
            <div><label className={labelClass}>Precio costo</label><input type="number" step="0.01" min="0" className={inputClass} value={form.costPrice} onChange={e => handleChange('costPrice', e.target.value)} placeholder="0.00" /></div>
            <div><label className={labelClass}>Stock actual</label><input type="number" min="0" className={inputClass} value={form.currentStock} onChange={e => handleChange('currentStock', e.target.value)} disabled /></div>
          </div>

          <div><label className={labelClass}>Stock mínimo (alerta)</label><input type="number" min="0" className={`${inputClass} w-40`} value={form.minStock} onChange={e => handleChange('minStock', e.target.value)} placeholder="5" /></div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => router.back()} className="h-10 px-4 rounded-lg border border-border-primary text-sm font-medium text-muted-foreground hover:bg-surface-hover transition">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 h-10 px-6 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}

      {/* === PROVEEDORES TAB === */}
      {activeTab === 'proveedores' && (
        <div className="bg-white rounded-xl border border-border-primary shadow-card">
          <div className="px-4 py-3 border-b border-border-primary">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground text-sm">Proveedores de este producto</h2>
              <button
                onClick={() => router.push(`/dashboard/suppliers/compare?product=${productId}`)}
                className="text-xs text-glamor-primary hover:underline flex items-center gap-1"
              >
                <TrendingUp className="w-3 h-3" /> Comparar precios
              </button>
            </div>
          </div>
          {loadingSuppliers ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Cargando...</div>
          ) : suppliers.length === 0 ? (
            <div className="p-8 text-center">
              <Truck className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
              <p className="text-sm text-muted-foreground">Sin proveedores asociados</p>
              <button
                onClick={() => router.push('/dashboard/suppliers')}
                className="mt-2 text-xs text-glamor-primary hover:underline"
              >
                Ir a proveedores para asociar productos
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary bg-surface-primary/50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Proveedor</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">SKU prov.</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Precio compra</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Margen</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Preferido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {suppliers.map((s: any) => (
                  <tr
                    key={s.supplierProductId}
                    className="hover:bg-surface-hover/50 transition cursor-pointer"
                    onClick={() => router.push(`/dashboard/suppliers/${s.supplierId}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{s.supplierName}</p>
                      <p className="text-xs text-muted-foreground">{s.supplierNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.supplierSku || '—'}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                      {s.supplierPrice ? formatCurrency(s.supplierPrice) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.margin !== null ? (
                        <span className={cn('text-sm font-medium', Number(s.margin) >= 30 ? 'text-green-600' : Number(s.margin) >= 10 ? 'text-orange-600' : 'text-red-600')}>
                          {s.margin}%
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.isPreferred ? <Star className="w-4 h-4 text-yellow-500 inline" /> : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* === MOVIMIENTOS TAB === */}
      {activeTab === 'movimientos' && (
        <div className="bg-white rounded-xl border border-border-primary shadow-card">
          <div className="px-4 py-3 border-b border-border-primary">
            <h2 className="font-semibold text-foreground text-sm">Historial de movimientos</h2>
          </div>
          {loadingMovements ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Cargando...</div>
          ) : movements.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
              <p className="text-sm text-muted-foreground">Sin movimientos registrados</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary bg-surface-primary/50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Fecha</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Cantidad</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Stock</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Referencia</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movements.map((m: any) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleDateString('es-MX')}
                      <br />
                      <span className="text-xs">{new Date(m.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn('text-sm font-medium', MOVE_TYPE_COLORS[m.movementType] || 'text-foreground')}>
                        {MOVE_TYPE_LABELS[m.movementType] || m.movementType}
                      </span>
                    </td>
                    <td className={cn('px-4 py-2.5 text-right text-sm font-semibold', m.quantity > 0 ? 'text-green-600' : 'text-red-600')}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </td>
                    <td className="px-4 py-2.5 text-center text-sm text-muted-foreground">
                      <span className="text-xs text-muted-foreground">{m.previousStock}</span>
                      <span className="mx-1">→</span>
                      <span className="font-medium text-foreground">{m.newStock}</span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">
                      {m.referenceType && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-primary text-xs">
                          {m.referenceType}
                          {m.referenceId ? ` #${m.referenceId.slice(-6)}` : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground max-w-[200px] truncate">{m.notes || '—'}</td>
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
