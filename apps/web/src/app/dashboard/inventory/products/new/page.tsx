'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api, API_BASE_URL } from '@/lib/api-client';
import { ArrowLeft, Save, Loader2, Sparkles } from 'lucide-react';
import { ImageUploader, ProductImage } from '@/components/shared/image-uploader';

const API_BASE = API_BASE_URL;

export default function NewProductPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [error, setError] = useState('');
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<ProductImage[]>([]);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    description: '',
    categoryId: '',
    brandId: '',
    salePrice: '',
    costPrice: '',
    currentStock: '0',
    minStock: '5',
    maxStock: '0',
    unitOfMeasure: 'unit',
    ivaRate: '19',
    isIvaExcluded: 'false',
  });

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.get('/products/categories/list', { token }),
      api.get('/products/brands/list', { token }),
    ]).then(([cats, brnds]) => {
      setCategories(Array.isArray(cats) ? cats : cats?.data || []);
      setBrands(Array.isArray(brnds) ? brnds : brnds?.data || []);
    }).catch(console.error);
  }, [token]);

  // Resolve master_ prefixed IDs before saving: auto-create tenant category/brand
  const resolveMasterId = async (
    id: string,
    type: 'categories' | 'brands',
  ): Promise<string> => {
    if (!id.startsWith('master_')) return id;
    const masterId = id.replace('master_', '');
    const result = await api.post(`/products/${type}/from-master`, { masterId }, { token: token! });
    return result.id;
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const generateDesc = async () => {
    if (!form.name.trim()) return;
    setGeneratingDesc(true);
    try {
      const res = await api.post('/products/ai/describe', {
        name: form.name,
        category: categories.find((c: any) => c.id === form.categoryId)?.name,
        brand: brands.find((b: any) => b.id === form.brandId)?.name,
      }, { token });
      if (res.description) handleChange('description', res.description);
    } catch {}
    finally { setGeneratingDesc(false); }
  };

  // Upload images using the /upload/images endpoint (saves to disk, returns URLs)
  const handleUploadImages = async (files: File[]): Promise<ProductImage[]> => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    const res = await fetch(`${API_BASE}/api/v1/upload/images`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(err.message || 'Error al subir imágenes');
    }

    const data = await res.json();
    // Return temporary image objects (id will be assigned when linking to product)
    return data.files.map((f: any, i: number) => ({
      id: `temp-${Date.now()}-${i}`,
      url: f.url,
      filename: f.filename,
      sortOrder: uploadedImages.length + i,
    }));
  };

  const handleImagesChange = (newImages: ProductImage[]) => {
    setUploadedImages(newImages);
  };

  const handleRemoveImage = async (imageId: string) => {
    // For temp images (not yet linked to a product), just remove from state
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError('El nombre es obligatorio');
    setSaving(true);
    setError('');
    try {
      // Resolve master_ IDs to real tenant IDs (creates them if needed)
      const categoryId = form.categoryId
        ? await resolveMasterId(form.categoryId, 'categories')
        : undefined;
      const brandId = form.brandId
        ? await resolveMasterId(form.brandId, 'brands')
        : undefined;

      // 1. Create the product
      const product = await api.post('/products', {
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        description: form.description.trim() || undefined,
        categoryId,
        brandId,
        salePrice: parseFloat(form.salePrice) || 0,
        costPrice: parseFloat(form.costPrice) || undefined,
        currentStock: parseInt(form.currentStock) || 0,
        minStock: parseInt(form.minStock) || 5,
        maxStock: parseInt(form.maxStock) || 0,
        unitOfMeasure: form.unitOfMeasure || 'unit',
        ivaRate: form.isIvaExcluded === 'true' ? 0 : parseFloat(form.ivaRate) || 19,
        isIvaExcluded: form.isIvaExcluded === 'true',
      }, { token: token! });

      const productId = product.id;

      // 2. Link uploaded images to the product
      if (uploadedImages.length > 0) {
        const imageFormData = new FormData();
        // Re-upload images directly to product endpoint
        // We need the actual File objects for this
        // Since we stored URLs, we'll use a different approach:
        // Call the backend to link the existing uploaded files
        for (const img of uploadedImages) {
          await fetch(`${API_BASE}/api/v1/products/${productId}/link-image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ url: img.url, filename: img.filename }),
          });
        }
      }

      router.push('/dashboard/inventory/products');
    } catch (e: any) {
      setError(e.message || 'Error al crear producto');
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
          <h1 className="text-2xl font-bold text-foreground">Nuevo producto</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Agrega un producto al inventario</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-border-primary p-6 shadow-card space-y-5">
        {/* Imágenes */}
        <ImageUploader
          images={uploadedImages}
          onUpload={handleUploadImages}
          onRemove={handleRemoveImage}
          onImagesChange={handleImagesChange}
          disabled={saving}
        />

        {/* Nombre */}
        <div>
          <label className={labelClass}>Nombre *</label>
          <input className={inputClass} value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="Ej: Esmalte semipermanente" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>SKU</label>
            <input className={inputClass} value={form.sku} onChange={e => handleChange('sku', e.target.value)} placeholder="SKU-001" />
          </div>
          <div>
            <label className={labelClass}>Unidad de medida</label>
            <select className={inputClass} value={form.unitOfMeasure} onChange={e => handleChange('unitOfMeasure', e.target.value)}>
              <option value="unit">Unidad</option>
              <option value="ml">Mililitro (ml)</option>
              <option value="g">Gramo (g)</option>
              <option value="kit">Kit</option>
              <option value="pair">Par</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>Descripción</label>
            <button
              type="button"
              onClick={generateDesc}
              disabled={!form.name.trim() || generatingDesc}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition disabled:opacity-40"
            >
              {generatingDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {generatingDesc ? 'Generando...' : 'Generar con IA'}
            </button>
          </div>
          <textarea className={`${inputClass} h-20 py-2 resize-none`} value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Descripción opcional del producto..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Categoría</label>
            <select className={inputClass} value={form.categoryId} onChange={e => handleChange('categoryId', e.target.value)}>
              <option value="">Sin categoría</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Marca</label>
            <select className={inputClass} value={form.brandId} onChange={e => handleChange('brandId', e.target.value)}>
              <option value="">Sin marca</option>
              {brands.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Precio venta *</label>
            <input type="number" step="0.01" min="0" className={inputClass} value={form.salePrice} onChange={e => handleChange('salePrice', e.target.value)} placeholder="0.00" />
            <p className="text-xs text-muted-foreground mt-1">Precio incluye IVA (se muestra al cliente)</p>
          </div>
          <div>
            <label className={labelClass}>Precio costo</label>
            <input type="number" step="0.01" min="0" className={inputClass} value={form.costPrice} onChange={e => handleChange('costPrice', e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className={labelClass}>Stock inicial</label>
            <input type="number" min="0" className={inputClass} value={form.currentStock} onChange={e => handleChange('currentStock', e.target.value)} placeholder="0" />
          </div>
        </div>

        {/* IVA Colombia */}
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-blue-800">Configuración IVA (Colombia)</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tarifa IVA</label>
              <select
                className={inputClass}
                value={form.isIvaExcluded === 'true' ? 'excluded' : form.ivaRate}
                onChange={e => {
                  if (e.target.value === 'excluded') {
                    handleChange('isIvaExcluded', 'true');
                    handleChange('ivaRate', '0');
                  } else {
                    handleChange('isIvaExcluded', 'false');
                    handleChange('ivaRate', e.target.value);
                  }
                }}
              >
                <option value="19">19% — Tarifa general (servicios, cosméticos)</option>
                <option value="5">5% — Tarifa diferencial</option>
                <option value="0">0% — Exento</option>
                <option value="excluded">Excluido de IVA</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <div className="text-xs text-blue-700 space-y-1">
                <p><strong>Gravado 19%:</strong> Servicios de belleza, cosméticos</p>
                <p><strong>Exento 0%:</strong> Puede recuperar IVA de compras</p>
                <p><strong>Excluido:</strong> No aplica IVA, no recupera</p>
              </div>
            </div>
          </div>
          {form.isIvaExcluded !== 'true' && form.ivaRate && Number(form.salePrice) > 0 && (
            <div className="text-xs text-blue-600 bg-white/60 rounded px-3 py-2">
              Precio sin IVA: <strong>${(Number(form.salePrice) / (1 + Number(form.ivaRate) / 100)).toLocaleString('es-CO', { minimumFractionDigits: 0 })}</strong>
              {' · '}IVA incluido: <strong>${(Number(form.salePrice) - Number(form.salePrice) / (1 + Number(form.ivaRate) / 100)).toLocaleString('es-CO', { minimumFractionDigits: 0 })}</strong>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <div>
            <label className={labelClass}>Stock mínimo (alerta)</label>
            <input type="number" min="0" className={`${inputClass} w-40`} value={form.minStock} onChange={e => handleChange('minStock', e.target.value)} placeholder="5" />
          </div>
          <div>
            <label className={labelClass}>Stock máximo (0 = sin límite)</label>
            <input type="number" min="0" className={`${inputClass} w-40`} value={form.maxStock} onChange={e => handleChange('maxStock', e.target.value)} placeholder="0" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => router.back()} className="h-10 px-4 rounded-lg border border-border-primary text-sm font-medium text-muted-foreground hover:bg-surface-hover transition">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 h-10 px-6 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Guardar producto'}
          </button>
        </div>
      </div>
    </div>
  );
}
