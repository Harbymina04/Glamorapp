'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import {
  Store, Globe, Package, Scissors, MapPin, ShoppingCart,
  Eye, EyeOff, Copy, Check, Save, Loader2, AlertCircle,
  Plus, X, ChevronRight, Instagram, Facebook, ExternalLink,
  ToggleLeft, ToggleRight, Search, Filter,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────
type Tab = 'perfil' | 'productos' | 'servicios' | 'sucursales' | 'comercio';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'perfil', label: 'Perfil', icon: <Store className="w-4 h-4" /> },
  { id: 'productos', label: 'Productos', icon: <Package className="w-4 h-4" /> },
  { id: 'servicios', label: 'Servicios', icon: <Scissors className="w-4 h-4" /> },
  { id: 'sucursales', label: 'Sucursales', icon: <MapPin className="w-4 h-4" /> },
  { id: 'comercio', label: 'Comercio', icon: <ShoppingCart className="w-4 h-4" /> },
];

const BUSINESS_TYPES = [
  { value: 'nail_salon', label: 'Salón de Uñas' },
  { value: 'hair_salon', label: 'Salón de Cabello' },
  { value: 'spa', label: 'Spa' },
  { value: 'makeup', label: 'Maquillaje' },
  { value: 'beauty_center', label: 'Centro de Belleza' },
  { value: 'barber', label: 'Barbería' },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-[#EF2D8F]' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ─── Tab: Perfil ─────────────────────────────────────────────────────
function PerfilTab({ storefront, onSave }: { storefront: any; onSave: (data: any) => Promise<void> }) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    if (storefront) {
      setForm({
        displayName: storefront.displayName || '',
        slug: storefront.slug || '',
        tagline: storefront.tagline || '',
        description: storefront.description || '',
        businessType: storefront.businessType || '',
        tags: Array.isArray(storefront.tags) ? storefront.tags : [],
        whatsapp: storefront.whatsapp || '',
        instagram: storefront.instagram || '',
        facebook: storefront.facebook || '',
        tiktok: storefront.tiktok || '',
        website: storefront.website || '',
        publicEmail: storefront.publicEmail || '',
        publicPhone: storefront.publicPhone || '',
        logoUrl: storefront.logoUrl || '',
        bannerUrl: storefront.bannerUrl || '',
      });
    }
  }, [storefront]);

  const uploadImage = async (file: File, field: 'logoUrl' | 'bannerUrl') => {
    const setUploading = field === 'logoUrl' ? setUploadingLogo : setUploadingBanner;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = useAuthStore.getState().token;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/upload/image`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData }
      );
      if (!res.ok) throw new Error('Error al subir imagen');
      const data = await res.json();
      set(field, data.url);
    } catch (e: any) {
      alert(e.message || 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`tienda.glamorapp.com/${form.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  };

  const removeTag = (t: string) => set('tags', form.tags.filter((x: string) => x !== t));

  return (
    <div className="space-y-6">
      {/* URL card */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">URL de tu vitrina</p>
          <p className="font-mono text-sm font-semibold text-gray-800">
            tienda.glamorapp.com/<span className="text-[#EF2D8F]">{form.slug || '…'}</span>
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 transition"
        >
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>

      {/* Images */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
        <h3 className="font-semibold text-gray-900">Imágenes</h3>

        {/* Banner */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-2">Banner de portada</label>
          <div
            className="relative w-full h-36 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-[#EF2D8F] transition group"
            style={form.bannerUrl ? { backgroundImage: `url(${form.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', borderStyle: 'solid' } : {}}
            onClick={() => document.getElementById('banner-upload')?.click()}
          >
            {!form.bannerUrl && (
              <div className="text-center text-gray-400 group-hover:text-[#EF2D8F] transition">
                <div className="text-2xl mb-1">🖼️</div>
                <p className="text-xs font-medium">Subir banner</p>
                <p className="text-xs">JPG, PNG, WEBP · máx. 10MB</p>
              </div>
            )}
            {form.bannerUrl && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <p className="text-white text-xs font-semibold">Cambiar banner</p>
              </div>
            )}
            {uploadingBanner && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-[#EF2D8F] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <input id="banner-upload" type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'bannerUrl')} />
          {form.bannerUrl && (
            <button onClick={() => set('bannerUrl', '')} className="mt-1 text-xs text-red-500 hover:underline">
              Quitar banner
            </button>
          )}
        </div>

        {/* Logo */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-2">Logo del salón</label>
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-[#EF2D8F] transition overflow-hidden flex-shrink-0 group relative"
              onClick={() => document.getElementById('logo-upload')?.click()}
            >
              {form.logoUrl ? (
                <>
                  <img src={form.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <p className="text-white text-xs font-bold">Cambiar</p>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-400 group-hover:text-[#EF2D8F] transition">
                  <div className="text-xl">🏷️</div>
                  <p className="text-xs">Logo</p>
                </div>
              )}
              {uploadingLogo && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-[#EF2D8F] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p>Recomendado: <strong>200×200 px</strong></p>
              <p>Formatos: JPG, PNG, WEBP</p>
              <p>Máx. 10 MB</p>
              {form.logoUrl && (
                <button onClick={() => set('logoUrl', '')} className="text-red-500 hover:underline">
                  Quitar logo
                </button>
              )}
            </div>
          </div>
          <input id="logo-upload" type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'logoUrl')} />
        </div>
      </div>

      {/* Basic info */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Información básica</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Nombre del salón</label>
            <input
              value={form.displayName || ''}
              onChange={e => set('displayName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
              placeholder="Mi Salón de Belleza"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Slug (URL)</label>
            <input
              value={form.slug || ''}
              onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
              placeholder="mi-salon"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Eslogan</label>
          <input
            value={form.tagline || ''}
            onChange={e => set('tagline', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
            placeholder="Tu belleza, nuestra pasión"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Descripción</label>
          <textarea
            value={form.description || ''}
            onChange={e => set('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 resize-none"
            placeholder="Describe tu salón..."
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Tipo de negocio</label>
          <select
            value={form.businessType || ''}
            onChange={e => set('businessType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
          >
            <option value="">Seleccionar...</option>
            {BUSINESS_TYPES.map(bt => (
              <option key={bt.value} value={bt.value}>{bt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-2">Etiquetas</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(form.tags || []).map((t: string) => (
              <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FFF1F8] text-[#EF2D8F] rounded-full text-xs font-medium">
                {t}
                <button onClick={() => removeTag(t)} className="hover:text-red-600"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
              placeholder="Nueva etiqueta..."
            />
            <button onClick={addTag} className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Contacto público</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Email público</label>
            <input value={form.publicEmail || ''} onChange={e => set('publicEmail', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" placeholder="info@salon.com" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Teléfono público</label>
            <input value={form.publicPhone || ''} onChange={e => set('publicPhone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" placeholder="+57 300 000 0000" />
          </div>
        </div>
      </div>

      {/* Social */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Redes sociales</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'whatsapp', label: 'WhatsApp', placeholder: '+57 300 000 0000' },
            { key: 'instagram', label: 'Instagram', placeholder: '@mi_salon' },
            { key: 'facebook', label: 'Facebook', placeholder: 'facebook.com/mi-salon' },
            { key: 'tiktok', label: 'TikTok', placeholder: '@mi_salon' },
            { key: 'website', label: 'Sitio web', placeholder: 'https://mi-salon.com' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
              <input value={(form as any)[key] || ''} onChange={e => set(key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
                placeholder={placeholder} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#EF2D8F] text-white rounded-lg font-medium text-sm hover:bg-[#d4267e] transition disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar cambios
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Productos ──────────────────────────────────────────────────
function ProductosTab() {
  const { token } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (visibility !== 'all') q.set('visibility', visibility === 'visible' ? 'visible' : 'hidden');
      const res = await api.get(`/storefront/products?${q}`, { token: token! });
      setProducts(res.data || []);
    } catch { } finally { setLoading(false); }
  }, [token, search, visibility]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id: string, current: boolean) => {
    try {
      await api.put(`/storefront/products/${id}/visibility`, { isStoreVisible: !current }, { token: token! });
      setProducts(ps => ps.map(p => p.id === id ? { ...p, isStoreVisible: !current } : p));
    } catch { }
  };

  const bulkAction = async (visible: boolean) => {
    if (!selected.size) return;
    try {
      await api.put('/storefront/products/bulk-visibility', { productIds: Array.from(selected), isStoreVisible: visible }, { token: token! });
      setProducts(ps => ps.map(p => selected.has(p.id) ? { ...p, isStoreVisible: visible } : p));
      setSelected(new Set());
    } catch { }
  };

  const toggleSelect = (id: string) => {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const allSelected = products.length > 0 && products.every(p => selected.has(p.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(products.map(p => p.id)));
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <p className="text-sm text-blue-700">Los precios y stock se toman automáticamente del módulo de Inventario.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
            placeholder="Buscar productos..." />
        </div>
        <select value={visibility} onChange={e => setVisibility(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30">
          <option value="all">Todos</option>
          <option value="visible">Visibles</option>
          <option value="hidden">Ocultos</option>
        </select>
        {selected.size > 0 && (
          <div className="flex gap-2">
            <button onClick={() => bulkAction(true)}
              className="px-3 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition">
              Publicar ({selected.size})
            </button>
            <button onClick={() => bulkAction(false)}
              className="px-3 py-2 text-sm bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition">
              Ocultar ({selected.size})
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-3 w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll}
                  className="rounded border-gray-300" />
              </th>
              <th className="p-3 text-left text-xs font-semibold text-gray-600">Producto</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-600">Categoría</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-600">Precio</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-600">Stock</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-600">En Tienda</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400 text-sm">Cargando...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400 text-sm">No hay productos</td></tr>
            ) : products.map(p => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="p-3">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)}
                    className="rounded border-gray-300" />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt="" className="w-10 h-10 object-cover rounded-lg" />
                      ) : (
                        <Package className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900 line-clamp-1">{p.name}</span>
                  </div>
                </td>
                <td className="p-3 text-sm text-gray-600">{p.category?.name || '—'}</td>
                <td className="p-3 text-sm font-semibold text-gray-900">
                  ${Number(p.salePrice).toLocaleString('es-CO')}
                </td>
                <td className="p-3">
                  <span className={`text-sm font-medium ${p.currentStock === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {p.currentStock === 0 ? '⚠️ 0' : p.currentStock}
                  </span>
                </td>
                <td className="p-3">
                  <Toggle checked={p.isStoreVisible} onChange={() => toggle(p.id, p.isStoreVisible)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Servicios ──────────────────────────────────────────────────
function ServiciosTab() {
  const { token } = useAuthStore();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/storefront/services', { token: token! })
      .then(res => setServices(Array.isArray(res) ? res : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const updateService = async (id: string, data: any) => {
    try {
      await api.put(`/storefront/services/${id}/visibility`, data, { token: token! });
      setServices(ss => ss.map(s => s.id === id ? { ...s, ...data } : s));
    } catch { }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-3 text-left text-xs font-semibold text-gray-600">Servicio</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-600">Precio</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-600">Duración</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-600">Visible</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-600">Booking Online</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400 text-sm">Cargando...</td></tr>
            ) : services.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400 text-sm">No hay servicios</td></tr>
            ) : services.map(s => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    {s.category && <p className="text-xs text-gray-400">{s.category}</p>}
                  </div>
                </td>
                <td className="p-3 text-sm font-semibold text-gray-900">
                  ${Number(s.price).toLocaleString('es-CO')}
                </td>
                <td className="p-3 text-sm text-gray-600">{s.durationMinutes} min</td>
                <td className="p-3">
                  <Toggle checked={s.isStoreVisible}
                    onChange={v => updateService(s.id, { isStoreVisible: v, allowsOnlineBooking: s.allowsOnlineBooking })} />
                </td>
                <td className="p-3">
                  <Toggle checked={s.allowsOnlineBooking}
                    onChange={v => updateService(s.id, { isStoreVisible: s.isStoreVisible, allowsOnlineBooking: v })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 text-center">
        Activa &quot;Booking Online&quot; para que los clientes puedan agendar citas directamente desde tu vitrina.
      </p>
    </div>
  );
}

// ─── Tab: Sucursales ─────────────────────────────────────────────────
function SucursalesTab() {
  const { token } = useAuthStore();
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.get('/storefront/locations', { token: token! })
      .then(res => {
        const locs = Array.isArray(res) ? res : [];
        setLocations(locs);
        const f: Record<string, any> = {};
        locs.forEach((l: any) => {
          f[l.id] = {
            isStoreVisible: l.isStoreVisible || false,
            acceptsPickup: l.acceptsPickup !== false,
            acceptsOnlineAppointments: l.acceptsOnlineAppointments !== false,
            latitude: l.latitude || '',
            longitude: l.longitude || '',
            neighborhood: l.neighborhood || '',
          };
        });
        setForms(f);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const setField = (id: string, k: string, v: any) =>
    setForms(f => ({ ...f, [id]: { ...f[id], [k]: v } }));

  const save = async (id: string) => {
    setSaving(s => ({ ...s, [id]: true }));
    try {
      await api.put(`/storefront/locations/${id}`, forms[id], { token: token! });
    } catch { } finally { setSaving(s => ({ ...s, [id]: false })); }
  };

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Cargando...</div>;

  return (
    <div className="space-y-4">
      {locations.map(loc => (
        <div key={loc.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{loc.name}</h3>
              <p className="text-xs text-gray-500">{loc.address}{loc.city ? `, ${loc.city}` : ''}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'isStoreVisible', label: 'Visible en tienda' },
              { key: 'acceptsPickup', label: 'Acepta retiro en tienda' },
              { key: 'acceptsOnlineAppointments', label: 'Citas online' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">{label}</span>
                <Toggle checked={forms[loc.id]?.[key] ?? false}
                  onChange={v => setField(loc.id, key, v)} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Barrio / Sector</label>
              <input value={forms[loc.id]?.neighborhood || ''} onChange={e => setField(loc.id, 'neighborhood', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
                placeholder="Chapinero" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Latitud</label>
              <input type="number" step="0.0000001" value={forms[loc.id]?.latitude || ''} onChange={e => setField(loc.id, 'latitude', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
                placeholder="4.7110" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Longitud</label>
              <input type="number" step="0.0000001" value={forms[loc.id]?.longitude || ''} onChange={e => setField(loc.id, 'longitude', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
                placeholder="-74.0721" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => save(loc.id)} disabled={saving[loc.id]}
              className="flex items-center gap-2 px-4 py-2 bg-[#EF2D8F] text-white rounded-lg text-sm font-medium hover:bg-[#d4267e] transition disabled:opacity-60">
              {saving[loc.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </button>
          </div>
        </div>
      ))}
      {locations.length === 0 && (
        <div className="p-10 text-center text-gray-400">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay sucursales activas</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Comercio ────────────────────────────────────────────────────
function ComercioTab({ storefront, onSave }: { storefront: any; onSave: (data: any) => Promise<void> }) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (storefront) {
      setForm({
        acceptsOrders: storefront.acceptsOrders ?? true,
        minOrderAmount: storefront.minOrderAmount ?? 0,
        acceptsDelivery: storefront.acceptsDelivery ?? false,
        deliveryFee: storefront.deliveryFee ?? 0,
        deliveryRadiusKm: storefront.deliveryRadiusKm ?? 10,
        freeDeliveryThreshold: storefront.freeDeliveryThreshold ?? 0,
        acceptsAppointments: storefront.acceptsAppointments ?? true,
        advancePaymentPercent: storefront.advancePaymentPercent ?? 0,
      });
    }
  }, [storefront]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {/* Pedidos */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" /> Pedidos
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Acepta pedidos online</p>
            <p className="text-xs text-gray-500">Los clientes pueden hacer pedidos desde tu vitrina</p>
          </div>
          <Toggle checked={form.acceptsOrders ?? true} onChange={v => set('acceptsOrders', v)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Pedido mínimo (COP)</label>
          <input type="number" value={form.minOrderAmount || 0} onChange={e => set('minOrderAmount', Number(e.target.value))}
            className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
        </div>
      </div>

      {/* Envío */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Domicilio / Envío</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Acepta domicilios</p>
          </div>
          <Toggle checked={form.acceptsDelivery ?? false} onChange={v => set('acceptsDelivery', v)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Tarifa de domicilio (COP)</label>
            <input type="number" value={form.deliveryFee || 0} onChange={e => set('deliveryFee', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Radio de entrega (km)</label>
            <input type="number" value={form.deliveryRadiusKm || 10} onChange={e => set('deliveryRadiusKm', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Envío gratis a partir de (COP)</label>
          <input type="number" value={form.freeDeliveryThreshold || 0} onChange={e => set('freeDeliveryThreshold', Number(e.target.value))}
            className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
          <p className="text-xs text-gray-500 mt-1">Si el pedido alcanza este monto, el domicilio sale gratis. Deja 0 para no aplicar.</p>
        </div>
      </div>

      {/* Citas */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Citas y Reservas</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Acepta citas online</p>
          </div>
          <Toggle checked={form.acceptsAppointments ?? true} onChange={v => set('acceptsAppointments', v)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Anticipo requerido (%)</label>
          <input type="number" min={0} max={100} value={form.advancePaymentPercent || 0} onChange={e => set('advancePaymentPercent', Number(e.target.value))}
            className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#EF2D8F] text-white rounded-lg font-medium text-sm hover:bg-[#d4267e] transition disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar configuración
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function StorefrontPage() {
  const { token } = useAuthStore();
  const [storefront, setStorefront] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('perfil');
  const [toggling, setToggling] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sf, st] = await Promise.all([
        api.get('/storefront', { token: token! }),
        api.get('/storefront/stats', { token: token! }),
      ]);
      setStorefront(sf);
      setStats(st);
    } catch { } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleToggleActive = async () => {
    setToggling(true);
    try {
      const endpoint = storefront?.isActive ? '/storefront/deactivate' : '/storefront/activate';
      const res = await api.post(endpoint, {}, { token: token! });
      setStorefront(res);
    } catch { } finally { setToggling(false); }
  };

  const handleSave = async (data: any) => {
    const res = await api.put('/storefront', data, { token: token! });
    setStorefront(res);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#EF2D8F]" />
      </div>
    );
  }

  const isActive = storefront?.isActive;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-[#EF2D8F]" /> Mi Vitrina Digital
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Administra tu tienda online y presencia digital</p>
        </div>
        {saveSuccess && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <Check className="w-4 h-4" /> Guardado
          </span>
        )}
      </div>

      {/* Status banner */}
      <div className={`rounded-xl border p-4 flex items-center justify-between ${
        isActive ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-amber-400'}`} />
          <div>
            <p className={`font-semibold text-sm ${isActive ? 'text-green-800' : 'text-amber-800'}`}>
              {isActive ? 'Vitrina activa' : 'Vitrina inactiva'}
            </p>
            <p className={`text-xs ${isActive ? 'text-green-600' : 'text-amber-600'}`}>
              {isActive ? 'Tu tienda es visible para los clientes.' : 'Activa tu vitrina para que los clientes puedan encontrarte.'}
            </p>
          </div>
        </div>
        <button onClick={handleToggleActive} disabled={toggling}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60 ${
            isActive
              ? 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-50'
              : 'bg-[#EF2D8F] text-white hover:bg-[#d4267e]'
          }`}>
          {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isActive ? 'Desactivar vitrina' : 'Activar vitrina'}
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Productos visibles', value: stats.visibleProducts },
            { label: 'Servicios visibles', value: stats.visibleServices },
            { label: 'Pedidos hoy', value: stats.ordersToday },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-[#EF2D8F] text-[#EF2D8F]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <div className="p-5">
          {activeTab === 'perfil' && <PerfilTab storefront={storefront} onSave={handleSave} />}
          {activeTab === 'productos' && <ProductosTab />}
          {activeTab === 'servicios' && <ServiciosTab />}
          {activeTab === 'sucursales' && <SucursalesTab />}
          {activeTab === 'comercio' && <ComercioTab storefront={storefront} onSave={handleSave} />}
        </div>
      </div>
    </div>
  );
}
