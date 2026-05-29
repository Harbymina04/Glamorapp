'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { Plug, Save, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export default function MarketingIntegrationsPage() {
  const { token } = useAuthStore();
  const [config, setConfig] = useState({
    metaAccessToken: '',
    metaAdAccountId: '',
    googleApiKey: '',
    serperApiKey: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!token) return;
    api.get('/tenant/marketing-config', { token })
      .then((data: any) => setConfig(data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await api.put('/tenant/marketing-config', config, { token });
      setToast({ message: 'Configuración guardada correctamente', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Error al guardar', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const toggleShow = (field: string) => {
    setShowFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-glamor-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Plug className="w-6 h-6 text-glamor-primary" />
          Integraciones de Marketing
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configura las APIs de Meta, Google y otras plataformas. Estas credenciales se usarán en todas las sucursales por el Agente de Marketing.
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Meta Ads */}
        <div className="bg-white rounded-xl border border-border-primary p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">Meta</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Meta Ads (Facebook / Instagram)</h3>
              <p className="text-xs text-muted-foreground">Para analizar campañas, métricas y audiencias</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Token de Acceso
                <span className="text-muted-foreground font-normal ml-1">— con permisos ads_read</span>
              </label>
              <div className="relative">
                <input
                  type={showFields['metaAccessToken'] ? 'text' : 'password'}
                  value={config.metaAccessToken}
                  onChange={e => setConfig(prev => ({ ...prev, metaAccessToken: e.target.value }))}
                  placeholder="EAA..."
                  className="w-full h-10 px-3 pr-10 rounded-lg border border-border-primary text-sm bg-white font-mono focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
                />
                <button type="button" onClick={() => toggleShow('metaAccessToken')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
                  {showFields['metaAccessToken'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Obtenlo en <a href="https://developers.facebook.com/tools/explorer/" target="_blank" className="text-glamor-primary underline">Facebook Developers</a> → Graph API Explorer
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">ID de Cuenta Publicitaria</label>
              <input
                type="text"
                value={config.metaAdAccountId}
                onChange={e => setConfig(prev => ({ ...prev, metaAdAccountId: e.target.value }))}
                placeholder="act_1234567890"
                className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white font-mono focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lo encuentras en <a href="https://business.facebook.com/settings/ad-accounts" target="_blank" className="text-glamor-primary underline">Business Settings</a> → Cuentas Publicitarias
              </p>
            </div>
          </div>
        </div>

        {/* Google */}
        <div className="bg-white rounded-xl border border-border-primary p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <span className="text-red-600 font-bold text-sm">G</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Google APIs</h3>
              <p className="text-xs text-muted-foreground">Google Trends, Analytics y Business Profile</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Google API Key</label>
              <div className="relative">
                <input
                  type={showFields['googleApiKey'] ? 'text' : 'password'}
                  value={config.googleApiKey}
                  onChange={e => setConfig(prev => ({ ...prev, googleApiKey: e.target.value }))}
                  placeholder="AIza..."
                  className="w-full h-10 px-3 pr-10 rounded-lg border border-border-primary text-sm bg-white font-mono focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
                />
                <button type="button" onClick={() => toggleShow('googleApiKey')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
                  {showFields['googleApiKey'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-glamor-primary underline">Google Cloud Console</a> → APIs y Servicios → Credenciales
              </p>
            </div>
          </div>
        </div>

        {/* Serper (Google Search) */}
        <div className="bg-white rounded-xl border border-border-primary p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 font-bold text-sm">S</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Serper — Búsqueda Web</h3>
              <p className="text-xs text-muted-foreground">Para investigación de mercado y tendencias en tiempo real</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">API Key</label>
            <div className="relative">
              <input
                type={showFields['serperApiKey'] ? 'text' : 'password'}
                value={config.serperApiKey}
                onChange={e => setConfig(prev => ({ ...prev, serperApiKey: e.target.value }))}
                placeholder="..."
                className="w-full h-10 px-3 pr-10 rounded-lg border border-border-primary text-sm bg-white font-mono focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
              />
              <button type="button" onClick={() => toggleShow('serperApiKey')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
                {showFields['serperApiKey'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Gratis (2500 búsquedas/mes) en <a href="https://serper.dev" target="_blank" className="text-glamor-primary underline">serper.dev</a>
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 h-12 px-6 bg-glamor-primary hover:bg-glamor-primary-hover text-white rounded-xl text-sm font-medium transition disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border animate-slide-up ${
          toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
