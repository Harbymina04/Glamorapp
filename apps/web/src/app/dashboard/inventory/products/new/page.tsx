'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api, API_BASE_URL } from '@/lib/api-client';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { ImageUploader, ProductImage } from '@/components/shared/image-uploader';

const API_BASE = API_BASE_URL;

export default function NewProductPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
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
    unitOfMeasure: 'unit',
  });

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.get('/products/categories/list', { token }),
      api.get('/products/brands/list', { token }),
    ]).then(([cats, brands]) => {
      setCategories(Array.isArray(cats) ? cats : cats.data || []);
      setBrands(Array.isArray(brands) ? brands : brands.data || []);
    }).catch(console.error);
  }, [token]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
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
      // 1. Create the product
      const product = await api.post('/products', {
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        description: form.description.trim() || undefined,
        categoryId: form.categoryId || undefined,
        brandId: form.brandId || undefined,
        salePrice: parseFloat(form.salePrice) || 0,
        costPrice: parseFloat(form.costPrice) || undefined,
        currentStock: parseInt(form.currentStock) || 0,
        minStock: parseInt(form.minStock) || 5,
        unitOfMeasure: form.unitOfMeasure || 'unit',
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
          <label className={labelClass}>Descripción</label>
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

        <div>
          <label className={labelClass}>Stock mínimo (alerta)</label>
          <input type="number" min="0" className={`${inputClass} w-40`} value={form.minStock} onChange={e => handleChange('minStock', e.target.value)} placeholder="5" />
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
