'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api, API_BASE_URL } from '@/lib/api-client';
import { Upload, Trash2, Loader2, CheckCircle2, ImageIcon, ExternalLink, Youtube, Save } from 'lucide-react';

const API_BASE = API_BASE_URL;

// Extract YouTube video ID from any URL format
function extractYoutubeId(input: string): string | null {
  if (!input.trim()) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // bare ID
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return null;
}

function buildEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1&loop=1&playlist=${videoId}`;
}

export default function PlatformConfigPage() {
  const { token } = useAuthStore();
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInput, setVideoInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [savingVideo, setSavingVideo] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    api.get('/admin/payouts/config', { token })
      .then(cfg => {
        setBannerUrl(cfg.storeBannerUrl ?? null);
        setLogoUrl(cfg.platformLogoUrl ?? null);
        const vid = cfg.storeVideoUrl ?? '';
        setVideoUrl(vid);
        setVideoInput(vid);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleLogoUpload = async (file: File) => {
    if (!token) return;
    setUploadingLogo(true); setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/api/v1/admin/payouts/config/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Error al subir');
      const data = await res.json();
      setLogoUrl(data.url);
      showSuccess('Logo actualizado correctamente');
    } catch (e: any) {
      setError(e.message || 'Error al subir el logo');
    } finally {
      setUploadingLogo(false);
      if (logoRef.current) logoRef.current.value = '';
    }
  };

  const handleLogoRemove = async () => {
    if (!token || !confirm('¿Eliminar el logo de la plataforma?')) return;
    setRemovingLogo(true);
    try {
      await api.put('/admin/payouts/config/logo/remove', {}, { token });
      setLogoUrl(null);
      showSuccess('Logo eliminado');
    } catch { setError('Error al eliminar el logo'); }
    finally { setRemovingLogo(false); }
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg); setError('');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleUpload = async (file: File) => {
    if (!token) return;
    setUploading(true); setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/api/v1/admin/payouts/config/banner`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Error al subir');
      const data = await res.json();
      setBannerUrl(data.url);
      showSuccess('Banner actualizado correctamente');
    } catch (e: any) {
      setError(e.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!token || !confirm('¿Eliminar el banner de la tienda?')) return;
    setRemoving(true);
    try {
      await api.put('/admin/payouts/config/banner/remove', {}, { token });
      setBannerUrl(null);
      showSuccess('Banner eliminado');
    } catch {
      setError('Error al eliminar el banner');
    } finally {
      setRemoving(false);
    }
  };

  const handleSaveVideo = async () => {
    if (!token) return;
    setSavingVideo(true); setError('');
    const trimmed = videoInput.trim();

    // Accept: full URL, embed URL, or bare ID
    let embedUrl = '';
    if (trimmed) {
      const id = extractYoutubeId(trimmed);
      if (!id) {
        setError('URL de YouTube no válida. Pega el enlace del video o el ID directamente.');
        setSavingVideo(false);
        return;
      }
      embedUrl = buildEmbedUrl(id);
    }

    try {
      await api.put('/admin/payouts/config', { storeVideoUrl: embedUrl || null }, { token });
      setVideoUrl(embedUrl);
      showSuccess(embedUrl ? 'Video actualizado' : 'Video eliminado');
    } catch {
      setError('Error al guardar el video');
    } finally {
      setSavingVideo(false);
    }
  };

  const videoId = videoUrl ? extractYoutubeId(videoUrl) : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración de Plataforma</h1>
        <p className="text-sm text-muted-foreground mt-1">Personaliza la apariencia de la tienda pública y el landing</p>
      </div>

      {/* Feedback */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4 shrink-0" />{success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-glamor-primary" /></div>
      ) : (
        <>
          {/* ── Logo de la plataforma ── */}
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-glamor-primary/10 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-glamor-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Logo de la plataforma</h2>
                <p className="text-sm text-muted-foreground">Aparece en el navbar de la tienda virtual. Recomendado: PNG transparente, alto máx 48 px.</p>
              </div>
            </div>

            {logoUrl ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 border rounded-xl bg-gray-50">
                  <img
                    src={logoUrl.startsWith('http') ? logoUrl : `${API_BASE}${logoUrl}`}
                    alt="Logo plataforma"
                    className="h-12 w-auto object-contain rounded"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => logoRef.current?.click()} disabled={uploadingLogo}
                      className="flex items-center gap-2 px-4 py-2 bg-glamor-primary text-white text-sm font-medium rounded-lg hover:bg-glamor-primary-hover transition disabled:opacity-50">
                      {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Cambiar logo
                    </button>
                    <button onClick={handleLogoRemove} disabled={removingLogo}
                      className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition disabled:opacity-50">
                      {removingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div onClick={() => logoRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-glamor-primary/40 hover:bg-glamor-primary/5 transition">
                {uploadingLogo
                  ? <Loader2 className="w-8 h-8 animate-spin text-glamor-primary mx-auto mb-2" />
                  : <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />}
                <p className="text-sm font-medium text-gray-600">{uploadingLogo ? 'Subiendo logo...' : 'Haz clic para subir el logo'}</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP o SVG · Máx 2 MB</p>
              </div>
            )}
            <input ref={logoRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
          </div>

          {/* ── Banner ── */}
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-glamor-primary/10 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-glamor-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Banner principal de la tienda</h2>
                <p className="text-sm text-muted-foreground">Fondo del hero en <code className="text-xs bg-gray-100 px-1 rounded">/tienda</code>. Recomendado: 1400×500 px.</p>
              </div>
            </div>

            {bannerUrl ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-gray-200">
                  <img
                    src={bannerUrl.startsWith('http') ? bannerUrl : `${API_BASE}${bannerUrl}`}
                    alt="Banner tienda"
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500/30 to-purple-500/30 pointer-events-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 bg-glamor-primary text-white text-sm font-medium rounded-lg hover:bg-glamor-primary-hover transition disabled:opacity-50">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? 'Subiendo...' : 'Cambiar imagen'}
                  </button>
                  <button onClick={handleRemove} disabled={removing}
                    className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition disabled:opacity-50">
                    {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Eliminar
                  </button>
                  <a href="/tienda" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition ml-auto">
                    <ExternalLink className="w-4 h-4" /> Ver tienda
                  </a>
                </div>
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-glamor-primary/50 hover:bg-gray-50 transition">
                {uploading
                  ? <Loader2 className="w-10 h-10 animate-spin text-glamor-primary mx-auto mb-3" />
                  : <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />}
                <p className="text-sm font-medium text-gray-600">{uploading ? 'Subiendo imagen...' : 'Haz clic para subir el banner'}</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG o WEBP · Máx 5 MB · 1400×500 px recomendado</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
          </div>

          {/* ── Video YouTube ── */}
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Youtube className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="font-semibold">Video demo (Landing page)</h2>
                <p className="text-sm text-muted-foreground">Se muestra en la sección "Demo en vivo" del landing. Se reproduce automáticamente al entrar.</p>
              </div>
            </div>

            {/* Input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">URL de YouTube o ID del video</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={videoInput}
                  onChange={e => setVideoInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... o el ID directamente"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-glamor-primary/30"
                />
                <button
                  onClick={handleSaveVideo}
                  disabled={savingVideo}
                  className="flex items-center gap-2 px-4 py-2 bg-glamor-primary text-white text-sm font-semibold rounded-lg hover:bg-glamor-primary-hover transition disabled:opacity-50"
                >
                  {savingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Acepta: <code className="bg-gray-100 px-1 rounded">youtube.com/watch?v=ID</code>, <code className="bg-gray-100 px-1 rounded">youtu.be/ID</code> o solo el ID.
              </p>
            </div>

            {/* Preview */}
            {videoId && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Vista previa</p>
                <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-black" style={{ aspectRatio: '16/9' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="Vista previa del video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
                {videoInput.trim() && (
                  <button
                    onClick={() => { setVideoInput(''); handleSaveVideo(); }}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Quitar video
                  </button>
                )}
              </div>
            )}

            {!videoId && !videoInput && (
              <div className="flex items-center justify-center h-24 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                Sin video configurado — el landing usará el video por defecto
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
