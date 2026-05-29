'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  Palette, Heart, Eye, Search, Plus, Pencil, Trash2, X, Upload,
  Sparkles, Clock, DollarSign, ImageIcon, Check, AlertCircle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────── */

const CATEGORIES = [
  { value: 'classic', label: 'Clásico' },
  { value: 'decorated', label: 'Decorado' },
  { value: 'artistic', label: 'Artístico' },
  { value: 'modern', label: 'Moderno' },
  { value: 'trending', label: 'Tendencia' },
  { value: 'minimalist', label: 'Minimalista' },
  { value: 'seasonal', label: 'Temporada' },
];

const PRESET_COLORS = [
  '#FF2D8E', '#EF2D8F', '#DC143C', '#FF6B6B', '#FF8C69',
  '#FFD700', '#FFA500', '#FF6347', '#FF69B4', '#C71585',
  '#8B008B', '#4B0082', '#6A0DAD', '#9400D3', '#BA55D3',
  '#000080', '#0000CD', '#4169E1', '#1E90FF', '#00BFFF',
  '#008080', '#00CED1', '#20B2AA', '#2E8B57', '#228B22',
  '#808000', '#B8860B', '#8B4513', '#A0522D', '#696969',
  '#000000', '#FFFFFF', '#F5F5DC', '#FFF8DC', '#FAEBD7',
];

export default function NailDesignsPage() {
  const { token } = useAuthStore();
  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal states
  const [selectedDesign, setSelectedDesign] = useState<any | null>(null); // detail modal
  const [editingDesign, setEditingDesign] = useState<any | null>(null);   // create/edit modal
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  // Form state
  const [form, setForm] = useState({
    name: '',
    category: 'classic',
    technique: '',
    suggestedPrice: '',
    estimatedDurationMinutes: '',
    colors: [] as string[],
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customColor, setCustomColor] = useState('#FF2D8E');

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ─── Data fetching ───────────────────────────────────── */

  const fetchDesigns = () => {
    api.get('/nail-designs?limit=50', { token: token! })
      .then(res => setDesigns(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (token) fetchDesigns(); }, [token]);

  /* ─── Helpers ─────────────────────────────────────────── */

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const openCreate = () => {
    setForm({ name: '', category: 'classic', technique: '', suggestedPrice: '', estimatedDurationMinutes: '', colors: [] });
    setImageFile(null);
    setImagePreview(null);
    setEditingDesign({});
  };

  const openEdit = (d: any) => {
    setForm({
      name: d.name || '',
      category: d.category || 'classic',
      technique: d.technique || '',
      suggestedPrice: d.suggestedPrice ? String(d.suggestedPrice) : '',
      estimatedDurationMinutes: d.estimatedDurationMinutes ? String(d.estimatedDurationMinutes) : '',
      colors: Array.isArray(d.colors) ? d.colors : [],
    });
    setImageFile(null);
    setImagePreview(d.imageUrl || null);
    setEditingDesign(d);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const addColor = (color: string) => {
    setForm(prev => {
      if (prev.colors.includes(color)) return prev;
      return { ...prev, colors: [...prev.colors, color] };
    });
  };

  const removeColor = (color: string) => {
    setForm(prev => ({ ...prev, colors: prev.colors.filter(c => c !== color) }));
  };

  /* ─── CRUD actions ────────────────────────────────────── */

  const handleSave = async () => {
    if (!form.name.trim()) return showFeedback('error', 'El nombre es obligatorio');
    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        category: form.category,
        technique: form.technique || undefined,
        suggestedPrice: form.suggestedPrice ? parseFloat(form.suggestedPrice) : undefined,
        estimatedDurationMinutes: form.estimatedDurationMinutes ? parseInt(form.estimatedDurationMinutes) : undefined,
        colors: form.colors,
      };

      let design: any;
      if (editingDesign?.id) {
        design = await api.put(`/nail-designs/${editingDesign.id}`, payload, { token: token! });
      } else {
        design = await api.post('/nail-designs', payload, { token: token! });
      }

      // Upload image if selected
      if (imageFile && design?.id) {
        setUploading(true);
        const formData = new FormData();
        formData.append('image', imageFile);
        await fetch(`http://localhost:3001/api/v1/nail-designs/${design.id}/upload-image`, {
          method: 'POST',
          body: formData,
          headers: { Authorization: `Bearer ${token}` },
        });
        setUploading(false);
      }

      showFeedback('success', editingDesign ? 'Diseño actualizado' : 'Diseño creado');
      setEditingDesign(null);
      fetchDesigns();
    } catch (e) {
      showFeedback('error', 'Error al guardar');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/nail-designs/${deleteTarget.id}`, { token: token! });
      showFeedback('success', 'Diseño eliminado');
      setDeleteTarget(null);
      fetchDesigns();
    } catch (e) {
      showFeedback('error', 'Error al eliminar');
    }
  };

  const toggleFavorite = async (id: string) => {
    try {
      const res = await api.post(`/nail-designs/${id}/favorite`, {}, { token: token! });
      setDesigns(prev => prev.map(d => d.id === id ? { ...d, isFavorite: res.isFavorite } : d));
    } catch (e) {
      showFeedback('error', 'Error');
    }
  };

  /* ─── Filter ──────────────────────────────────────────── */

  const filtered = designs.filter((d: any) =>
    !filter || d.name.toLowerCase().includes(filter.toLowerCase())
  );

  /* ─── Render ──────────────────────────────────────────── */

  if (loading) return <LoadingSkeleton rows={3} cols={3} />;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catálogo de Uñas</h1>
          <p className="text-muted-foreground text-sm mt-1">{designs.length} diseños en catálogo</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 h-10 px-4 rounded-lg bg-glamor-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Nuevo diseño
        </button>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
          feedback.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {feedback.message}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Buscar diseños..."
          className="w-full h-9 pl-9 pr-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Palette className="w-8 h-8 text-muted-foreground" />}
          title="Sin diseños"
          description={filter ? 'No se encontraron diseños con ese nombre' : 'Crea tu primer diseño de uñas'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((d: any) => (
            <div
              key={d.id}
              onClick={() => { setSelectedDesign(d); setModalImageIndex(0); }}
              className="bg-white rounded-xl border border-border-primary overflow-hidden hover:shadow-card-hover transition group cursor-pointer"
            >
              {/* Image */}
              <div className="h-44 bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center relative overflow-hidden">
                {d.imageUrl ? (
                  <img
                    src={d.imageUrl}
                    alt={d.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Palette className="w-12 h-12 text-glamor-primary/30" />
                )}

                {/* Favorite */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(d.id); }}
                  className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                    d.isFavorite
                      ? 'bg-red-100 text-red-500'
                      : 'bg-white/80 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-400'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${d.isFavorite ? 'fill-current' : ''}`} />
                </button>

                {/* Color dots */}
                {d.colors && d.colors.length > 0 && (
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    {d.colors.slice(0, 6).map((color: string, i: number) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    {d.colors.length > 6 && (
                      <span className="text-[10px] text-white bg-black/40 rounded-full px-1.5 leading-4">
                        +{d.colors.length - 6}
                      </span>
                    )}
                  </div>
                )}

                {/* Edit/delete overlay */}
                <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(d); }}
                    className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-muted-foreground hover:bg-blue-100 hover:text-blue-600"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(d); }}
                    className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-muted-foreground hover:bg-red-100 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground text-sm truncate flex-1">{d.name}</h3>
                  {d.isFavorite && <Heart className="w-4 h-4 text-red-500 fill-red-500 shrink-0 mt-0.5" />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-hover text-muted-foreground">
                    {CATEGORIES.find(c => c.value === d.category)?.label || d.category}
                  </span>
                  {d.technique && (
                    <span className="text-xs text-muted-foreground">{d.technique}</span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="font-bold text-glamor-primary">
                    {d.suggestedPrice ? formatCurrency(d.suggestedPrice) : '—'}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="w-3.5 h-3.5" />{d.popularityScore ?? 0}
                  </div>
                </div>
                {d.estimatedDurationMinutes && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" /> ~{d.estimatedDurationMinutes} min
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          DETAIL MODAL
          ═══════════════════════════════════════════════════════════ */}
      {selectedDesign && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedDesign(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-between px-6 py-4 border-b border-border-primary rounded-t-2xl">
              <h2 className="text-lg font-bold text-foreground truncate pr-4">{selectedDesign.name}</h2>
              <button
                onClick={() => setSelectedDesign(null)}
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-surface-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Image */}
              {selectedDesign.imageUrl ? (
                <div className="relative bg-surface-hover rounded-xl overflow-hidden aspect-square max-h-80 mx-auto mb-6">
                  <img
                    src={selectedDesign.imageUrl}
                    alt={selectedDesign.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="mb-6 bg-surface-hover rounded-xl flex items-center justify-center aspect-video max-h-60">
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <span className="text-sm">Sin imagen</span>
                  </div>
                </div>
              )}

              {/* Detail cards */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-surface-hover rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">Precio sugerido</p>
                  <p className="text-xl font-bold text-glamor-primary">
                    {selectedDesign.suggestedPrice ? formatCurrency(selectedDesign.suggestedPrice) : '—'}
                  </p>
                </div>
                <div className="bg-surface-hover rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">Duración estimada</p>
                  <p className="text-xl font-bold text-foreground">
                    {selectedDesign.estimatedDurationMinutes ? `${selectedDesign.estimatedDurationMinutes} min` : '—'}
                  </p>
                </div>
              </div>

              {/* Colors */}
              {selectedDesign.colors && selectedDesign.colors.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Colores</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedDesign.colors.map((color: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-hover">
                        <div className="w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: color }} />
                        <span className="text-xs font-mono text-muted-foreground">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-border-primary">
                <span className="text-xs px-3 py-1 rounded-full bg-surface-hover text-muted-foreground">
                  {CATEGORIES.find(c => c.value === selectedDesign.category)?.label || selectedDesign.category}
                </span>
                {selectedDesign.technique && (
                  <span className="text-xs px-3 py-1 rounded-full bg-surface-hover text-muted-foreground">
                    {selectedDesign.technique}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-surface-hover text-muted-foreground">
                  <Eye className="w-3 h-3" /> {selectedDesign.popularityScore ?? 0} vistas
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-border-primary">
                <button
                  onClick={() => { setSelectedDesign(null); openEdit(selectedDesign); }}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-surface-hover text-sm text-foreground hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <Pencil className="w-4 h-4" /> Editar
                </button>
                <button
                  onClick={() => toggleFavorite(selectedDesign.id)}
                  className={`flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm transition-colors ${
                    selectedDesign.isFavorite
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-surface-hover text-muted-foreground hover:bg-red-50 hover:text-red-500'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${selectedDesign.isFavorite ? 'fill-current' : ''}`} />
                  {selectedDesign.isFavorite ? 'Favorito' : 'Marcar favorito'}
                </button>
                <button
                  onClick={() => { setSelectedDesign(null); setDeleteTarget(selectedDesign); }}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-surface-hover text-sm text-red-500 hover:bg-red-50 transition-colors ml-auto"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          CREATE / EDIT MODAL
          ═══════════════════════════════════════════════════════════ */}
      {editingDesign !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setEditingDesign(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-between px-6 py-4 border-b border-border-primary rounded-t-2xl">
              <h2 className="text-lg font-bold text-foreground">
                {editingDesign?.id ? 'Editar diseño' : 'Nuevo diseño'}
              </h2>
              <button
                onClick={() => setEditingDesign(null)}
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-surface-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Imagen</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative border-2 border-dashed border-border-primary rounded-xl p-6 text-center cursor-pointer hover:border-glamor-primary/50 hover:bg-pink-50/30 transition-colors"
                >
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain" />
                      <button
                        onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageFile(null); }}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      <Upload className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <span className="text-sm">Click para subir imagen</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nombre</label>
                <input
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Uñas francesas con glitter"
                  className="w-full h-9 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Categoría</label>
                <select
                  value={form.category}
                  onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Technique */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Técnica</label>
                <input
                  value={form.technique}
                  onChange={e => setForm(prev => ({ ...prev, technique: e.target.value }))}
                  placeholder="Ej: Gel, Acrílico, Polvo de inmersión..."
                  className="w-full h-9 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
                />
              </div>

              {/* Price & Duration row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Precio sugerido ($)</label>
                  <input
                    type="number"
                    value={form.suggestedPrice}
                    onChange={e => setForm(prev => ({ ...prev, suggestedPrice: e.target.value }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full h-9 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Duración (min)</label>
                  <input
                    type="number"
                    value={form.estimatedDurationMinutes}
                    onChange={e => setForm(prev => ({ ...prev, estimatedDurationMinutes: e.target.value }))}
                    placeholder="60"
                    min="0"
                    className="w-full h-9 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
                  />
                </div>
              </div>

              {/* Colors */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Colores ({form.colors.length} seleccionados)
                </label>

                {/* Custom color input */}
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="color"
                    value={customColor}
                    onChange={e => setCustomColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={customColor}
                    onChange={e => setCustomColor(e.target.value)}
                    placeholder="#FF2D8E"
                    className="flex-1 h-8 px-2 rounded border border-border-primary text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
                  />
                  <button
                    onClick={() => addColor(customColor)}
                    className="h-8 px-3 rounded-lg bg-glamor-primary text-white text-xs font-medium hover:opacity-90"
                  >
                    Agregar
                  </button>
                </div>

                {/* Presets */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => addColor(color)}
                      className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                        form.colors.includes(color)
                          ? 'border-gray-800 scale-110 ring-2 ring-glamor-primary/30'
                          : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>

                {/* Selected colors */}
                {form.colors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.colors.map((color, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-hover text-xs">
                        <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: color }} />
                        <span className="font-mono text-muted-foreground">{color}</span>
                        <button onClick={() => removeColor(color)} className="text-muted-foreground hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-border-primary px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setEditingDesign(null)}
                className="h-9 px-4 rounded-lg text-sm text-muted-foreground hover:bg-surface-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="flex items-center gap-1.5 h-9 px-5 rounded-lg bg-glamor-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {saving || uploading ? (
                  <><Sparkles className="w-4 h-4 animate-spin" /> Guardando...</>
                ) : (
                  <><Check className="w-4 h-4" /> {editingDesign?.id ? 'Actualizar' : 'Crear diseño'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          DELETE CONFIRMATION
          ═══════════════════════════════════════════════════════════ */}
      {deleteTarget && (
        <ConfirmDialog
          open={true}
          title="Eliminar diseño"
          message={`¿Eliminar "${deleteTarget.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          variant="danger"
        />
      )}
    </div>
  );
}
