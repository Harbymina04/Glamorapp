'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import {
  Zap, CheckCircle2, XCircle, Loader2, AlertCircle,
  Eye, EyeOff, ExternalLink, Shield, Info, Wifi, WifiOff,
} from 'lucide-react';

// ─── Providers catalog ───────────────────────────────────────────
const PROVIDERS = [
  {
    id: 'none',
    name: 'Sin proveedor',
    description: 'Gestión manual de facturas. No envía automáticamente a la DIAN.',
    logo: '📄',
    docs: null,
    needsKey: false,
    needsSecret: false,
    extraFields: [],
    badge: null,
  },
  {
    id: 'siigo',
    name: 'Siigo',
    description: 'Proveedor tecnológico habilitado por la DIAN. Integración via API REST.',
    logo: '🔵',
    docs: 'https://siigonube.siigo.com/api-developers',
    needsKey: true,
    needsSecret: true,
    keyLabel: 'Usuario API (email)',
    secretLabel: 'Access Key',
    extraFields: [{ key: 'partnerKey', label: 'Partner Key (opcional)', type: 'text' }],
    badge: 'Más popular',
  },
  {
    id: 'alegra',
    name: 'Alegra',
    description: 'Software contable colombiano con FE integrada. Autenticación Basic Auth.',
    logo: '🟢',
    docs: 'https://developer.alegra.com',
    needsKey: true,
    needsSecret: true,
    keyLabel: 'Email de la cuenta',
    secretLabel: 'Token de API',
    extraFields: [],
    badge: null,
  },
  {
    id: 'facturama',
    name: 'Facturama',
    description: 'Proveedor multipaís con soporte para Colombia. Sandbox disponible.',
    logo: '🟠',
    docs: 'https://documentacion.facturama.mx',
    needsKey: true,
    needsSecret: true,
    keyLabel: 'Usuario',
    secretLabel: 'Contraseña',
    extraFields: [],
    badge: null,
  },
  {
    id: 'custom',
    name: 'API Personalizada',
    description: 'Conecta tu propio proveedor tecnológico habilitado por la DIAN via webhook.',
    logo: '⚙️',
    docs: null,
    needsKey: true,
    needsSecret: false,
    keyLabel: 'URL base del API',
    extraFields: [
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password' },
      { key: 'authHeader', label: 'Header de autenticación', type: 'text', placeholder: 'Ej: Bearer token123' },
    ],
    badge: 'Avanzado',
  },
];

interface TestResult {
  success: boolean;
  message: string;
  provider: string;
  environment?: string;
}

export default function FeProviderPage() {
  const { token } = useAuthStore();

  // Current config from DB
  const [current, setCurrent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedProvider, setSelectedProvider] = useState('none');
  const [environment, setEnvironment] = useState('sandbox');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [extraConfig, setExtraConfig] = useState<Record<string, string>>({});
  const [showSecret, setShowSecret] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Actions
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/accounting/fiscal-config', { token: token! });
      if (data) {
        setCurrent(data);
        setSelectedProvider(data.feProvider || 'none');
        setEnvironment(data.feEnvironment || 'sandbox');
        setApiKey(data.feProviderApiKey || '');
        setApiSecret(data.feProviderApiSecret || '');
        setExtraConfig(data.feProviderConfig || {});
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const provider = PROVIDERS.find(p => p.id === selectedProvider) ?? PROVIDERS[0];

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setTestResult(null);
    try {
      await api.put('/accounting/fe-provider', {
        feProvider: selectedProvider,
        feEnvironment: environment,
        feProviderApiKey: apiKey || undefined,
        feProviderApiSecret: apiSecret || undefined,
        feProviderConfig: extraConfig,
      }, { token: token! });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      load();
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.post('/accounting/fe-provider/test', {}, { token: token! });
      setTestResult(result);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Error al probar conexión', provider: selectedProvider });
    } finally { setTesting(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show warning if fiscal config doesn't exist yet
  if (!current) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Proveedor Tecnológico FE</h1>
          <p className="text-sm text-muted-foreground mt-1">Configura el proveedor de facturación electrónica DIAN</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Primero completa la configuración fiscal</p>
            <p className="text-sm text-amber-700 mt-1">
              Antes de configurar el proveedor FE necesitas guardar los datos del NIT y la resolución DIAN.
            </p>
            <a href="/tenant/accounting/config" className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-amber-800 underline hover:no-underline">
              Ir a Configuración fiscal →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Proveedor Tecnológico FE</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configura el proveedor habilitado por la DIAN para envío de facturas electrónicas
        </p>
      </div>

      {/* Current status banner */}
      {current.feProvider && current.feProvider !== 'none' && (
        <div className={`rounded-xl border p-4 flex items-center justify-between ${
          current.feEnvironment === 'production' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            <Zap className={`w-5 h-5 shrink-0 ${current.feEnvironment === 'production' ? 'text-green-600' : 'text-blue-600'}`} />
            <div>
              <p className={`font-medium ${current.feEnvironment === 'production' ? 'text-green-800' : 'text-blue-800'}`}>
                {PROVIDERS.find(p => p.id === current.feProvider)?.name ?? current.feProvider} configurado
              </p>
              <p className={`text-sm ${current.feEnvironment === 'production' ? 'text-green-600' : 'text-blue-600'}`}>
                Ambiente: {current.feEnvironment === 'production' ? '🟢 Producción' : '🔵 Pruebas (sandbox)'}
              </p>
            </div>
          </div>
          <button
            onClick={handleTest}
            disabled={testing}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition ${
              current.feEnvironment === 'production'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:opacity-60`}
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
            Probar conexión
          </button>
        </div>
      )}

      {/* Test result */}
      {testResult && (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${
          testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          {testResult.success
            ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            : <WifiOff className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          }
          <div>
            <p className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {testResult.success ? 'Conexión exitosa' : 'Error de conexión'}
            </p>
            <p className={`text-sm mt-0.5 ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
              {testResult.message}
            </p>
          </div>
        </div>
      )}

      {/* Provider selector */}
      <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
        <h3 className="font-semibold">Selecciona el proveedor tecnológico</h3>
        <div className="grid grid-cols-1 gap-3">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedProvider(p.id);
                setTestResult(null);
              }}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selectedProvider === p.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/30 hover:bg-muted/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.logo}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      {p.badge && (
                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                          {p.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{p.description}</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center ${
                  selectedProvider === p.id ? 'border-primary bg-primary' : 'border-border'
                }`}>
                  {selectedProvider === p.id && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
              {p.docs && (
                <a
                  href={p.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1 mt-2 ml-11 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ver documentación
                </a>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Credentials form — only when a provider is selected */}
      {selectedProvider !== 'none' && (
        <div className="bg-white rounded-xl border shadow-sm divide-y">
          {/* Environment */}
          <div className="p-5 space-y-3">
            <h3 className="font-semibold">Ambiente</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'sandbox', label: 'Pruebas / Habilitación', desc: 'Para pruebas con la DIAN. No genera documentos reales.', color: 'blue' },
                { value: 'production', label: 'Producción', desc: 'Facturas reales enviadas a la DIAN. Solo cuando estés habilitado.', color: 'green' },
              ].map(env => (
                <button
                  key={env.value}
                  onClick={() => setEnvironment(env.value)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    environment === env.value
                      ? env.color === 'green' ? 'border-green-500 bg-green-50' : 'border-blue-500 bg-blue-50'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <p className={`font-medium text-sm ${environment === env.value && env.color === 'green' ? 'text-green-800' : environment === env.value ? 'text-blue-800' : ''}`}>
                    {env.value === 'production' ? '🟢' : '🔵'} {env.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{env.desc}</p>
                </button>
              ))}
            </div>
            {environment === 'production' && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  <strong>¡Atención!</strong> En producción las facturas son documentos tributarios legales. Asegúrate de estar habilitado por la DIAN antes de activar este ambiente.
                </p>
              </div>
            )}
          </div>

          {/* API Credentials */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Credenciales de acceso</h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5" />
                Cifradas en reposo
              </div>
            </div>

            {/* API Key */}
            {provider.needsKey && (
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {provider.keyLabel ?? 'API Key'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={provider.id === 'custom' ? 'https://api.miproveedordian.com' : ''}
                    className="w-full border rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* API Secret */}
            {provider.needsSecret && (
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {(provider as any).secretLabel ?? 'API Secret'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={apiSecret}
                    onChange={e => setApiSecret(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Extra fields per provider */}
            {provider.extraFields.map((f: any) => (
              <div key={f.key}>
                <label className="text-sm font-medium mb-1 block">{f.label}</label>
                <input
                  type={f.type ?? 'text'}
                  value={extraConfig[f.key] ?? ''}
                  onChange={e => setExtraConfig({ ...extraConfig, [f.key]: e.target.value })}
                  placeholder={f.placeholder ?? ''}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            ))}

            {/* Info box per provider */}
            {selectedProvider === 'siigo' && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  El <strong>Usuario API</strong> es el email registrado en Siigo. El <strong>Access Key</strong> se genera en
                  Configuración → Opciones API en tu cuenta Siigo.
                </p>
              </div>
            )}
            {selectedProvider === 'alegra' && (
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Info className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <p className="text-xs text-green-700">
                  El <strong>Token de API</strong> se obtiene en Mi perfil → Token de API en tu cuenta de Alegra.
                </p>
              </div>
            )}
            {selectedProvider === 'facturama' && (
              <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-700">
                  Usa las credenciales del portal Facturama. Para pruebas el sandbox tiene credenciales separadas de producción.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1">
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <XCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              {saved && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Configuración guardada correctamente
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleTest}
                disabled={testing || saving || !apiKey}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted disabled:opacity-40 transition"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                Probar conexión
              </button>
              <button
                onClick={handleSave}
                disabled={saving || testing}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-60 transition"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Guardar proveedor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save button for 'none' */}
      {selectedProvider === 'none' && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-60 transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Guardar configuración
          </button>
        </div>
      )}
    </div>
  );
}
