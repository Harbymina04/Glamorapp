'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import {
  Megaphone, Plus, Bot, CheckCircle2, XCircle, Clock, Play, Pause,
  Loader2, X, Save, AlertCircle, Sparkles, ImageIcon, Upload,
  BarChart3, Ban, Search,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// ── Types ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Borrador',   color: 'bg-gray-100 text-gray-600' },
  scheduled: { label: 'Programada', color: 'bg-blue-50 text-blue-700' },
  active:    { label: 'Activa',     color: 'bg-green-50 text-green-700' },
  paused:    { label: 'Pausada',    color: 'bg-yellow-50 text-yellow-700' },
  completed: { label: 'Completada', color: 'bg-purple-50 text-purple-700' },
  cancelled: { label: 'Cancelada',  color: 'bg-red-50 text-red-600' },
  proposed:  { label: 'Propuesta IA', color: 'bg-violet-50 text-violet-700' },
};

const TYPE_LABELS: Record<string, string> = {
  promotional:  'Promocional',
  loyalty:      'Fidelización',
  reactivation: 'Reactivación',
  birthday:     'Cumpleaños',
  seasonal:     'Temporada',
  awareness:    'Branding',
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp:  'WhatsApp',
  email:     'Email',
  instagram: 'Instagram',
  facebook:  'Facebook',
  sms:       'SMS',
};

const inputClass = 'w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition';
const labelClass = 'block text-sm font-medium text-foreground mb-1.5';

const CAMPAIGN_TYPES = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));
const CHANNELS       = Object.entries(CHANNEL_LABELS).map(([value, label]) => ({ value, label }));
const SEGMENTS = [
  { value: 'all',      label: 'Todos los clientes' },
  { value: 'new',      label: 'Nuevos' },
  { value: 'frequent', label: 'Frecuentes' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'vip',      label: 'VIP' },
];
const TIERS = [
  { value: 'all',      label: 'Todos los niveles' },
  { value: 'bronze',   label: 'Bronce' },
  { value: 'silver',   label: 'Plata' },
  { value: 'gold',     label: 'Oro' },
  { value: 'platinum', label: 'Platino' },
];

type Tab = 'all' | 'proposals' | 'active';

const emptyForm = {
  name: '', description: '', type: 'promotional', channels: [] as string[],
  targetSegment: 'all', targetTier: 'all', subject: '', message: '',
  ctaText: '', ctaUrl: '', scheduledAt: '',
};

// ── Page ──────────────────────────────────────────────────────────
export default function MarketingPage() {
  const { token } = useAuthStore();
  const [tab, setTab]               = useState<Tab>('all');
  const [campaigns, setCampaigns]   = useState<any[]>([]);
  const [stats, setStats]           = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState({ ...emptyForm });
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');

  // Image upload
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useState<HTMLInputElement | null>(null);

  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/upload/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Error al subir imagen');
      const data = await res.json();
      const url = data.url || data.path || data.fileUrl;
      setForm(p => ({ ...p, imageUrl: url }));
      setImagePreview(url.startsWith('http') ? url : `${API_BASE.replace('/api/v1', '')}${url}`);
    } catch {
      setFormError('No se pudo subir la imagen. Intenta de nuevo.');
    } finally {
      setImageUploading(false);
    }
  };

  // Detail / review
  const [selected, setSelected]     = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing]   = useState(false);

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchData = useCallback(async (q?: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (q) params.set('search', q);
      if (tab === 'proposals') params.set('status', 'proposed');
      if (tab === 'active')    params.set('status', 'active');
      const [cList, cStats] = await Promise.all([
        api.get(`/marketing?${params}`, { token }),
        api.get('/marketing/stats', { token }),
      ]);
      setCampaigns(cList.data || []);
      setStats(cStats);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [token, tab]); // eslint-disable-line

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Create ─────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name.trim())          return setFormError('El nombre es requerido');
    if (!form.message.trim())       return setFormError('El mensaje es requerido');
    if (form.channels.length === 0) return setFormError('Selecciona al menos un canal');
    setSaving(true); setFormError('');
    try {
      await api.post('/marketing', {
        ...form,
        targetSegment: form.targetSegment === 'all' ? undefined : form.targetSegment,
        targetTier:    form.targetTier    === 'all' ? undefined : form.targetTier,
        scheduledAt:   form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
      }, { token: token! });
      setShowCreate(false);
      setForm({ ...emptyForm });
      fetchData();
    } catch (e: any) {
      setFormError(e.message || 'Error al crear la campaña');
    } finally { setSaving(false); }
  };

  const toggleChannel = (ch: string) => {
    setForm(p => ({
      ...p,
      channels: p.channels.includes(ch) ? p.channels.filter(c => c !== ch) : [...p.channels, ch],
    }));
  };

  // ── Review proposal ────────────────────────────────────────────
  const handleReview = async (approved: boolean) => {
    if (!selected) return;
    setReviewing(true);
    try {
      await api.patch(`/marketing/${selected.id}/review`, { approved, reviewNotes }, { token: token! });
      setSelected(null);
      setReviewNotes('');
      fetchData();
    } catch { /* silent */ }
    finally { setReviewing(false); }
  };

  // ── Status actions ─────────────────────────────────────────────
  const doAction = async (id: string, action: 'launch' | 'pause' | 'complete' | 'cancel') => {
    setActionLoading(id + action);
    try {
      await api.patch(`/marketing/${id}/${action}`, {}, { token: token! });
      fetchData();
    } catch { /* silent */ }
    finally { setActionLoading(null); }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-glamor-primary" /> Campañas de Marketing
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona campañas manuales y propuestas del agente IA</p>
        </div>
        <button
          onClick={() => { setForm({ ...emptyForm }); setFormError(''); setImagePreview(null); setShowCreate(true); }}
          className="flex items-center gap-2 h-10 px-4 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition"
        >
          <Plus className="w-4 h-4" /> Nueva campaña
        </button>
      </div>

      {/* KPI cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total',      value: stats.total,    color: 'text-foreground',     icon: <BarChart3 className="w-4 h-4 text-glamor-primary" /> },
            { label: 'Propuestas IA', value: stats.proposed, color: 'text-violet-600', icon: <Sparkles className="w-4 h-4 text-violet-500" /> },
            { label: 'Activas',    value: stats.active,   color: 'text-green-600',      icon: <Play className="w-4 h-4 text-green-500" /> },
            { label: 'Completadas', value: stats.completed, color: 'text-purple-600',   icon: <CheckCircle2 className="w-4 h-4 text-purple-500" /> },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-border-primary p-4">
              <div className="flex items-center gap-2 mb-1">
                {k.icon}
                <span className="text-xs text-muted-foreground">{k.label}</span>
              </div>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs + search */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex gap-1 border-b border-border-primary">
          {([
            { key: 'all',       label: 'Todas' },
            { key: 'proposals', label: `Propuestas IA${stats?.proposed > 0 ? ` (${stats.proposed})` : ''}` },
            { key: 'active',    label: 'Activas' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                tab === t.key ? 'border-glamor-primary text-glamor-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Buscar campañas..."
            value={search}
            onChange={e => { setSearch(e.target.value); fetchData(e.target.value); }}
            className="h-9 pl-9 pr-3 rounded-lg border border-border-primary text-sm focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 w-56"
          />
        </div>
      </div>

      {/* List */}
      {loading ? <LoadingSkeleton rows={4} cols={1} /> : (
        campaigns.length === 0 ? (
          <div className="bg-white rounded-xl border border-border-primary p-12 text-center">
            <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">
              {tab === 'proposals' ? 'No hay propuestas del agente IA pendientes de revisión' : 'Sin campañas aún — crea la primera o espera una propuesta del agente IA'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c: any) => {
              const st = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.draft;
              const channels: string[] = Array.isArray(c.channels) ? c.channels : (JSON.parse(c.channels || '[]'));
              return (
                <div key={c.id} className="bg-white rounded-xl border border-border-primary overflow-hidden">
                  {/* Banner image */}
                  {c.imageUrl && (
                    <div className="w-full h-36 overflow-hidden bg-surface-hover">
                      <img
                        src={c.imageUrl.startsWith('http') ? c.imageUrl : `${API_BASE.replace('/api/v1', '')}${c.imageUrl}`}
                        alt={c.name}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <div className="flex items-start gap-4 p-5">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.isAiProposed ? 'bg-violet-50' : 'bg-glamor-primary/10'}`}>
                      {c.isAiProposed
                        ? <Bot className="w-5 h-5 text-violet-600" />
                        : <Megaphone className="w-5 h-5 text-glamor-primary" />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-foreground">{c.name}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                        <span className="text-xs text-muted-foreground">{TYPE_LABELS[c.type] ?? c.type}</span>
                      </div>
                      {c.description && <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{c.description}</p>}

                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {channels.map((ch: string) => (
                          <span key={ch} className="text-xs bg-surface-hover text-muted-foreground px-2 py-0.5 rounded-full">
                            {CHANNEL_LABELS[ch] ?? ch}
                          </span>
                        ))}
                        {c.targetSegment && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {SEGMENTS.find(s => s.value === c.targetSegment)?.label ?? c.targetSegment}
                          </span>
                        )}
                      </div>

                      {c.isAiProposed && c.aiReason && (
                        <div className="bg-violet-50 border border-violet-100 rounded-lg p-3 mb-2">
                          <p className="text-xs font-medium text-violet-700 mb-0.5 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Justificación del agente IA
                          </p>
                          <p className="text-xs text-violet-600 line-clamp-2">{c.aiReason}</p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Creada {formatDate(c.createdAt)}
                        {c.scheduledAt && ` · Programada para ${formatDate(c.scheduledAt)}`}
                        {c.targetCount > 0 && ` · ${c.targetCount} destinatarios`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {c.status === 'proposed' && (
                        <>
                          <button
                            onClick={() => { setSelected(c); setReviewNotes(''); }}
                            className="flex items-center gap-1.5 h-8 px-3 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 transition"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Revisar
                          </button>
                        </>
                      )}
                      {c.status === 'draft' && (
                        <button
                          onClick={() => doAction(c.id, 'launch')}
                          disabled={actionLoading === c.id + 'launch'}
                          className="flex items-center gap-1.5 h-8 px-3 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition disabled:opacity-50"
                        >
                          {actionLoading === c.id + 'launch' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                          Lanzar
                        </button>
                      )}
                      {c.status === 'active' && (
                        <>
                          <button onClick={() => doAction(c.id, 'pause')}
                            disabled={actionLoading === c.id + 'pause'}
                            className="flex items-center gap-1.5 h-8 px-3 border border-border-primary text-muted-foreground rounded-lg text-xs hover:bg-surface-hover transition disabled:opacity-50">
                            <Pause className="w-3.5 h-3.5" /> Pausar
                          </button>
                          <button onClick={() => doAction(c.id, 'complete')}
                            disabled={actionLoading === c.id + 'complete'}
                            className="flex items-center gap-1.5 h-8 px-3 border border-border-primary text-muted-foreground rounded-lg text-xs hover:bg-surface-hover transition disabled:opacity-50">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Completar
                          </button>
                        </>
                      )}
                      {c.status === 'paused' && (
                        <button onClick={() => doAction(c.id, 'launch')}
                          disabled={actionLoading === c.id + 'launch'}
                          className="flex items-center gap-1.5 h-8 px-3 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition disabled:opacity-50">
                          <Play className="w-3.5 h-3.5" /> Reanudar
                        </button>
                      )}
                      {!['completed', 'cancelled'].includes(c.status) && (
                        <button onClick={() => doAction(c.id, 'cancel')}
                          disabled={actionLoading === c.id + 'cancel'}
                          className="h-8 px-3 border border-border-primary text-muted-foreground rounded-lg text-xs hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition disabled:opacity-50">
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ═══ CREATE MODAL ═══════════════════════════════════════════ */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
              <h3 className="text-lg font-bold text-foreground">Nueva campaña</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}

              <div>
                <label className={labelClass}>Nombre *</label>
                <input className={inputClass} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Promo de verano 2025" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tipo</label>
                  <select className={inputClass} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    {CAMPAIGN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Segmento objetivo</label>
                  <select className={inputClass} value={form.targetSegment} onChange={e => setForm(p => ({ ...p, targetSegment: e.target.value }))}>
                    {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Canales * <span className="text-xs text-muted-foreground font-normal">(selecciona uno o más)</span></label>
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map(ch => (
                    <button key={ch.value} type="button"
                      onClick={() => toggleChannel(ch.value)}
                      className={`h-8 px-3 rounded-lg text-xs font-medium border transition ${
                        form.channels.includes(ch.value)
                          ? 'bg-glamor-primary text-white border-glamor-primary'
                          : 'border-border-primary text-muted-foreground hover:bg-surface-hover'
                      }`}>
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Image banner ── */}
              <div>
                <label className={labelClass}>Imagen de banner <span className="text-xs text-muted-foreground font-normal">(opcional)</span></label>
                <div className="relative">
                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-border-primary group">
                      <img src={imagePreview} alt="Banner" className="w-full h-40 object-cover" />
                      <button
                        type="button"
                        onClick={() => { setImagePreview(null); setForm(p => ({ ...p, imageUrl: '' })); }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center gap-2 h-32 border-2 border-dashed rounded-xl cursor-pointer transition
                      ${imageUploading ? 'opacity-50 cursor-not-allowed' : 'border-border-primary hover:border-glamor-primary/50 hover:bg-surface-hover'}`}>
                      {imageUploading
                        ? <Loader2 className="w-6 h-6 text-glamor-primary animate-spin" />
                        : <><Upload className="w-6 h-6 text-muted-foreground" /><span className="text-sm text-muted-foreground">Haz clic para subir una imagen de banner</span><span className="text-xs text-muted-foreground">PNG, JPG, WEBP · Máx. 5MB</span></>
                      }
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={imageUploading}
                        onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass}>Asunto / Título</label>
                <input className={inputClass} value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Asunto del email o título del mensaje" />
              </div>

              <div>
                <label className={labelClass}>Mensaje *</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  placeholder="Escribe el mensaje principal de la campaña..."
                  className="w-full px-3 py-2 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary resize-none h-24 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Texto del botón (CTA)</label>
                  <input className={inputClass} value={form.ctaText} onChange={e => setForm(p => ({ ...p, ctaText: e.target.value }))} placeholder="Reservar ahora" />
                </div>
                <div>
                  <label className={labelClass}>Programar envío</label>
                  <input type="datetime-local" className={inputClass} value={form.scheduledAt} onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Descripción interna</label>
                <input className={inputClass} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Notas internas sobre esta campaña" />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-primary bg-surface-primary/30">
              <button onClick={() => setShowCreate(false)} className="h-10 px-4 rounded-lg border border-border-primary text-sm font-medium text-muted-foreground hover:bg-surface-hover transition">
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="flex items-center gap-2 h-10 px-6 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Crear campaña'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ REVIEW MODAL ═══════════════════════════════════════════ */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600" /> Revisar propuesta IA
              </h3>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-violet-700 mb-1">Justificación del agente</p>
                <p className="text-sm text-violet-800">{selected.aiReason}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-border-primary/40">
                  <span className="text-muted-foreground">Nombre</span>
                  <span className="font-medium text-foreground">{selected.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-primary/40">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="font-medium">{TYPE_LABELS[selected.type] ?? selected.type}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-primary/40">
                  <span className="text-muted-foreground">Canales</span>
                  <span className="font-medium">
                    {(Array.isArray(selected.channels) ? selected.channels : JSON.parse(selected.channels || '[]'))
                      .map((c: string) => CHANNEL_LABELS[c] ?? c).join(', ')}
                  </span>
                </div>
                {selected.targetSegment && (
                  <div className="flex justify-between py-1.5 border-b border-border-primary/40">
                    <span className="text-muted-foreground">Segmento</span>
                    <span className="font-medium">{SEGMENTS.find(s => s.value === selected.targetSegment)?.label ?? selected.targetSegment}</span>
                  </div>
                )}
                {selected.subject && (
                  <div className="flex justify-between py-1.5 border-b border-border-primary/40">
                    <span className="text-muted-foreground">Asunto</span>
                    <span className="font-medium">{selected.subject}</span>
                  </div>
                )}
                <div className="py-1.5">
                  <p className="text-muted-foreground mb-1">Mensaje</p>
                  <p className="text-foreground bg-surface-hover rounded-lg p-3 text-sm">{selected.message}</p>
                </div>
              </div>

              <div>
                <label className={labelClass}>Notas de revisión (opcional)</label>
                <textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Añade comentarios sobre tu decisión..."
                  className="w-full px-3 py-2 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 resize-none h-20 transition"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-primary bg-surface-primary/30">
              <button onClick={() => handleReview(false)} disabled={reviewing}
                className="flex items-center gap-2 h-10 px-4 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition disabled:opacity-50">
                {reviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Rechazar
              </button>
              <button onClick={() => handleReview(true)} disabled={reviewing}
                className="flex items-center gap-2 h-10 px-6 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition disabled:opacity-50">
                {reviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Aprobar campaña
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
