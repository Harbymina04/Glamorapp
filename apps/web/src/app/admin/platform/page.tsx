'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api, API_BASE_URL } from '@/lib/api-client';
import { Upload, Trash2, Loader2, CheckCircle2, ImageIcon, ExternalLink } from 'lucide-react';

const API_BASE = API_BASE_URL;

export default function PlatformConfigPage() {
  const { token } = useAuthStore();
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    api.get('/admin/payouts/config', { token })
      .then(cfg => setBannerUrl(cfg.storeBannerUrl ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

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

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración de Plataforma</h1>
        <p className="text-sm text-muted-foreground mt-1">Personaliza la apariencia de la tienda pública</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-glamor-primary" /></div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-glamor-primary/10 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-glamor-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Banner principal de la tienda</h2>
              <p className="text-sm text-muted-foreground">Imagen de fondo del hero en <code className="text-xs bg-gray-100 px-1 rounded">/tienda</code>. Tamaño recomendado: 1400×500 px.</p>
            </div>
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

          {/* Current banner preview */}
          {bannerUrl ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Banner actual</p>
              <div className="relative rounded-xl overflow-hidden border border-gray-200">
                <img
                  src={bannerUrl.startsWith('http') ? bannerUrl : `${API_BASE}${bannerUrl}`}
                  alt="Banner tienda"
                  className="w-full h-40 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/30 to-purple-500/30 pointer-events-none" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-glamor-primary text-white text-sm font-medium rounded-lg hover:bg-glamor-primary-hover transition disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Subiendo...' : 'Cambiar imagen'}
                </button>
                <button
                  onClick={handleRemove}
                  disabled={removing}
                  className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                >
                  {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Eliminar
                </button>
                <a
                  href="/tienda"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition ml-auto"
                >
                  <ExternalLink className="w-4 h-4" /> Ver tienda
                </a>
              </div>
            </div>
          ) : (
            /* Upload dropzone */
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-glamor-primary/50 hover:bg-gray-50 transition"
            >
              {uploading ? (
                <Loader2 className="w-10 h-10 animate-spin text-glamor-primary mx-auto mb-3" />
              ) : (
                <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              )}
              <p className="text-sm font-medium text-gray-600">
                {uploading ? 'Subiendo imagen...' : 'Haz clic para subir el banner'}
              </p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG o WEBP · Máx 5 MB · 1400×500 px recomendado</p>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
        </div>
      )}
    </div>
  );
}
