'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import {
  Store, Palette, CreditCard, Bell, ShoppingCart,
  Save, Loader2, CheckCircle2, AlertCircle,
  Upload, X, Plus, Pencil, Trash2,
  QrCode, Smartphone, Link, RefreshCw, Wifi, WifiOff, Copy, Check,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────

interface StoreSettings {
  // General
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  currency: string;
  timezone: string;
  locale: string;
  dateFormat: string;
  timeFormat: string;
  unitSystem: string;
  slogan: string;
  // Appearance
  primaryColor: string;
  theme: string;
  logoUrl: string;
  // Sales
  taxInclusive: boolean;
  allowDiscounts: boolean;
  autoPrintReceipt: boolean;
  requireCustomerOnSale: boolean;
  lowStockAlert: boolean;
  defaultPage: string;
  sessionDurationMinutes: number;
  initialFolioNumber: number;
}

// ─── Constants ───────────────────────────────────────────────────

const TABS = [
  { id: 'general', label: 'General', icon: Store },
  { id: 'appearance', label: 'Apariencia', icon: Palette },
  { id: 'sales', label: 'Ventas', icon: CreditCard },
  { id: 'pos', label: 'Ventas POS', icon: ShoppingCart },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
];

const CURRENCIES = ['MXN', 'USD', 'COP', 'ARS', 'CLP', 'PEN', 'EUR'];
const TIMEZONES = [
  'America/Mexico_City', 'America/Bogota', 'America/Lima',
  'America/Santiago', 'America/Argentina/Buenos_Aires',
  'America/New_York', 'America/Los_Angeles', 'Europe/Madrid',
];
const LOCALES = ['es', 'es-MX', 'es-CO', 'es-AR', 'en', 'pt'];
const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const TIME_FORMATS = ['12h', '24h'];
const UNIT_SYSTEMS = ['metric', 'imperial'];
const THEMES = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Sistema' },
];
const DEFAULT_PAGES = [
  { value: 'dashboard', label: 'Inicio' },
  { value: 'pos', label: 'Ventas POS' },
  { value: 'appointments', label: 'Agendamiento' },
  { value: 'inventory', label: 'Inventario' },
];

const EMPTY_SETTINGS: StoreSettings = {
  name: '', email: '', phone: '', address: '', city: '', state: '',
  country: '', zipCode: '', currency: 'MXN', timezone: 'America/Mexico_City',
  locale: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '12h',
  unitSystem: 'metric', slogan: '',
  primaryColor: '#EF2D8F', theme: 'light', logoUrl: '',
  taxInclusive: true, allowDiscounts: true, autoPrintReceipt: false,
  requireCustomerOnSale: false, lowStockAlert: true,
  defaultPage: 'dashboard', sessionDurationMinutes: 60, initialFolioNumber: 1,
};

// ─── Toast ───────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border animate-slide-up ${
      type === 'success'
        ? 'bg-green-50 border-green-200 text-green-800'
        : 'bg-red-50 border-red-200 text-red-800'
    }`}>
      {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 p-0.5 rounded hover:bg-black/5"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ─── Input Components ────────────────────────────────────────────

function InputGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white
        focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary
        disabled:bg-surface-hover disabled:text-muted-foreground transition"
    />
  );
}

function SelectInput({ value, onChange, options, disabled }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white
        focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary
        disabled:bg-surface-hover disabled:text-muted-foreground transition"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-light last:border-b-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          checked ? 'bg-glamor-primary' : 'bg-gray-300'
        }`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`} />
      </button>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, token } = useAuthStore();

  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<StoreSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // POS tab state
  const [posRegisters, setPosRegisters] = useState<any[]>([]);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [editingRegister, setEditingRegister] = useState<any>(null);
  const [registerFormName, setRegisterFormName] = useState('');
  const [registerFormDesc, setRegisterFormDesc] = useState('');
  const [invoiceTemplate, setInvoiceTemplate] = useState<any>({});
  const [ticketTemplate, setTicketTemplate] = useState<any>({});
  const [posSettings, setPosSettings] = useState<any>({});

  // WhatsApp bridge state
  const [waLoading, setWaLoading] = useState(false);
  const [waStatus, setWaStatus] = useState<{ status: string; connected: boolean } | null>(null);
  const [waQrUrl, setWaQrUrl] = useState<string | null>(null);
  const [waQrError, setWaQrError] = useState('');
  const [pairPhone, setPairPhone] = useState('');
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [pairError, setPairError] = useState('');
  const [pairLoading, setPairLoading] = useState(false);
  const [pairSuccess, setPairSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  // Load settings
  const loadSettings = useCallback(async () => {
    const currentToken = useAuthStore.getState().token;
    if (!currentToken) {
      setLoading(false);
      setError('No hay sesión activa');
      return;
    }
    try {
      setLoading(true);
      const data = await api.get('/settings', { token: currentToken });
      setSettings({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        country: data.country || '',
        zipCode: data.zipCode || '',
        currency: data.currency || 'MXN',
        timezone: data.timezone || 'America/Mexico_City',
        locale: data.locale || 'es',
        dateFormat: data.dateFormat || 'DD/MM/YYYY',
        timeFormat: data.timeFormat || '12h',
        unitSystem: data.unitSystem || 'metric',
        slogan: data.slogan || '',
        primaryColor: data.primaryColor || '#EF2D8F',
        theme: data.theme || 'light',
        logoUrl: data.logoUrl || '',
        taxInclusive: data.taxInclusive ?? true,
        allowDiscounts: data.allowDiscounts ?? true,
        autoPrintReceipt: data.autoPrintReceipt ?? false,
        requireCustomerOnSale: data.requireCustomerOnSale ?? false,
        lowStockAlert: data.lowStockAlert ?? true,
        defaultPage: data.defaultPage || 'dashboard',
        sessionDurationMinutes: data.sessionDurationMinutes || 60,
        initialFolioNumber: data.initialFolioNumber || 1,
      });
      // POS data
      setInvoiceTemplate(data.invoiceTemplate || {});
      setTicketTemplate(data.ticketTemplate || {});
      setPosSettings(data.posSettings || {});
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  // Save section
  const saveSection = async (section: 'general' | 'appearance' | 'sales' | 'pos') => {
    const currentToken = useAuthStore.getState().token;
    if (!currentToken) {
      setToast({ message: 'No hay sesión activa', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      let body: any = {};
      if (section === 'general') {
        body = {
          name: settings.name, email: settings.email, phone: settings.phone,
          address: settings.address, city: settings.city, state: settings.state,
          country: settings.country, zipCode: settings.zipCode, currency: settings.currency,
          timezone: settings.timezone, locale: settings.locale,
          dateFormat: settings.dateFormat, timeFormat: settings.timeFormat,
          unitSystem: settings.unitSystem, slogan: settings.slogan,
        };
      } else if (section === 'appearance') {
        body = {
          primaryColor: settings.primaryColor,
          theme: settings.theme,
          logoUrl: settings.logoUrl,
        };
      } else if (section === 'sales') {
        body = {
          taxInclusive: settings.taxInclusive,
          allowDiscounts: settings.allowDiscounts,
          autoPrintReceipt: settings.autoPrintReceipt,
          requireCustomerOnSale: settings.requireCustomerOnSale,
          lowStockAlert: settings.lowStockAlert,
          defaultPage: settings.defaultPage,
          sessionDurationMinutes: Number(settings.sessionDurationMinutes),
          initialFolioNumber: Number(settings.initialFolioNumber),
        };
      } else if (section === 'pos') {
        body = {
          invoiceTemplate,
          ticketTemplate,
          posSettings,
        };
      }
      await api.put(`/settings/${section}`, body, { token: currentToken });
      setToast({ message: 'Configuración guardada correctamente', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Error al guardar', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Update field helper
  const update = (field: keyof StoreSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  // ─── POS: Cash Register CRUD helpers ──────────────────────────

  const fetchRegisters = async () => {
    const currentToken = useAuthStore.getState().token;
    if (!currentToken) return;
    try {
      const res = await api.get('/cash-register/registers', { token: currentToken });
      setPosRegisters(res || []);
    } catch {}
  };

  useEffect(() => { fetchRegisters(); }, []);

  const saveRegister = async () => {
    const currentToken = useAuthStore.getState().token;
    if (!currentToken || !registerFormName.trim()) return;
    try {
      if (editingRegister) {
        await api.put(`/cash-register/registers/${editingRegister.id}`, { name: registerFormName, description: registerFormDesc }, { token: currentToken });
      } else {
        await api.post('/cash-register/registers', { name: registerFormName, description: registerFormDesc }, { token: currentToken });
      }
      setShowRegisterForm(false);
      setEditingRegister(null);
      setRegisterFormName('');
      setRegisterFormDesc('');
      fetchRegisters();
      setToast({ message: editingRegister ? 'Caja actualizada' : 'Caja creada', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Error', type: 'error' });
    }
  };

  const deleteRegister = async (id: string) => {
    const currentToken = useAuthStore.getState().token;
    if (!currentToken) return;
    try {
      await api.del(`/cash-register/registers/${id}`, { token: currentToken });
      fetchRegisters();
      setToast({ message: 'Caja eliminada', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Error', type: 'error' });
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // WHATSAPP BRIDGE HELPERS
  // ═══════════════════════════════════════════════════════════════

  const fetchWaStatus = async () => {
    setWaLoading(true);
    setWaQrError('');
    try {
      const currentToken = useAuthStore.getState().token;
      const data = await api.get('/whatsapp/bridge/status', { token: currentToken! });
      setWaStatus(data);
    } catch (e: any) {
      setWaStatus({ status: 'unreachable', connected: false });
    }
    setWaLoading(false);
  };

  const fetchQr = async () => {
    setWaLoading(true);
    setWaQrError('');
    setWaQrUrl(null);
    try {
      const currentToken = useAuthStore.getState().token;
      const res = await fetch('/api/v1/whatsapp/bridge/qr', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // Show friendly messages for known states
        if (err.status === 'connected' || err.status === 'already_connected') {
          setWaQrError('WhatsApp ya está vinculado. No se necesita QR.');
        } else {
          setWaQrError(err.error || 'QR no disponible');
        }
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (waQrUrl) URL.revokeObjectURL(waQrUrl);
      setWaQrUrl(url);
    } catch (e: any) {
      setWaQrError(e.message || 'Error al obtener QR');
    }
    setWaLoading(false);
  };

  const handlePair = async () => {
    if (!pairPhone.trim()) return setPairError('Ingresa un número de teléfono');
    setPairLoading(true);
    setPairError('');
    setPairCode(null);
    setPairSuccess('');
    try {
      const currentToken = useAuthStore.getState().token;
      const data = await api.post('/whatsapp/bridge/pair', { phone: pairPhone }, { token: currentToken! });
      if (data.success && data.code) {
        setPairCode(data.code);
        setPairSuccess(data.message || 'Código generado. Revisa tu WhatsApp.');
      } else {
        setPairError(data.error || 'Error al generar código');
      }
    } catch (e: any) {
      setPairError(e.message || 'Error de conexión');
    }
    setPairLoading(false);
  };

  // Load WA status when notifications tab opens
  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchWaStatus();
    }
    return () => {
      if (waQrUrl) URL.revokeObjectURL(waQrUrl);
    };
  }, [activeTab]); // eslint-disable-line

  // ─── Loading State ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-glamor-primary" />
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-muted-foreground">{error}</p>
        <button onClick={loadSettings} className="px-4 py-2 bg-glamor-primary text-white rounded-lg text-sm">Reintentar</button>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">Personaliza la experiencia de tu negocio</p>
      </div>

      <div className="flex gap-6">
        {/* ─── Sidebar Tabs ──────────────────────────────────── */}
        <div className="w-56 shrink-0">
          <div className="bg-white rounded-xl border border-border-primary overflow-hidden">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition border-l-2 ${
                    activeTab === tab.id
                      ? 'border-glamor-primary text-glamor-primary bg-glamor-50'
                      : 'border-transparent text-muted-foreground hover:bg-surface-hover'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Content Panel ─────────────────────────────────── */}
        <div className="flex-1 bg-white rounded-xl border border-border-primary p-6 min-h-[500px]">

          {/* ======== GENERAL ======== */}
          {activeTab === 'general' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-foreground">Información general</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Datos principales de tu negocio</p>
                </div>
                <button
                  onClick={() => saveSection('general')}
                  disabled={saving}
                  className="flex items-center gap-2 h-10 px-5 bg-glamor-primary hover:bg-glamor-primary-hover text-white rounded-lg text-sm font-medium transition disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar cambios
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Nombre de la tienda *">
                  <TextInput value={settings.name} onChange={v => update('name', v)} placeholder="Glamorapp Beauty Studio" />
                </InputGroup>
                <InputGroup label="Email">
                  <TextInput value={settings.email} onChange={v => update('email', v)} type="email" placeholder="contacto@tutienda.com" />
                </InputGroup>
                <InputGroup label="Teléfono">
                  <TextInput value={settings.phone} onChange={v => update('phone', v)} placeholder="+52 555 123 4567" />
                </InputGroup>
                <InputGroup label="Eslogan">
                  <TextInput value={settings.slogan} onChange={v => update('slogan', v)} placeholder="Belleza que transforma" />
                </InputGroup>
              </div>

              <div className="mt-4">
                <InputGroup label="Dirección">
                  <TextInput value={settings.address} onChange={v => update('address', v)} placeholder="Av. Principal #123" />
                </InputGroup>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <InputGroup label="Ciudad">
                  <TextInput value={settings.city} onChange={v => update('city', v)} placeholder="Ciudad de México" />
                </InputGroup>
                <InputGroup label="Estado / Provincia">
                  <TextInput value={settings.state} onChange={v => update('state', v)} placeholder="CDMX" />
                </InputGroup>
                <InputGroup label="País">
                  <TextInput value={settings.country} onChange={v => update('country', v)} placeholder="México" />
                </InputGroup>
                <InputGroup label="Código postal">
                  <TextInput value={settings.zipCode} onChange={v => update('zipCode', v)} placeholder="06600" />
                </InputGroup>
              </div>

              <h4 className="font-semibold text-foreground mt-6 mb-3 text-sm">Formato regional</h4>
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Moneda">
                  <SelectInput value={settings.currency} onChange={v => update('currency', v)}
                    options={CURRENCIES.map(c => ({ value: c, label: c }))} />
                </InputGroup>
                <InputGroup label="Zona horaria">
                  <SelectInput value={settings.timezone} onChange={v => update('timezone', v)}
                    options={TIMEZONES.map(t => ({ value: t, label: t }))} />
                </InputGroup>
                <InputGroup label="Idioma">
                  <SelectInput value={settings.locale} onChange={v => update('locale', v)}
                    options={LOCALES.map(l => ({ value: l, label: l }))} />
                </InputGroup>
                <InputGroup label="Sistema de unidades">
                  <SelectInput value={settings.unitSystem} onChange={v => update('unitSystem', v)}
                    options={UNIT_SYSTEMS.map(u => ({ value: u, label: u === 'metric' ? 'Métrico' : 'Imperial' }))} />
                </InputGroup>
                <InputGroup label="Formato de fecha">
                  <SelectInput value={settings.dateFormat} onChange={v => update('dateFormat', v)}
                    options={DATE_FORMATS.map(d => ({ value: d, label: d }))} />
                </InputGroup>
                <InputGroup label="Formato de hora">
                  <SelectInput value={settings.timeFormat} onChange={v => update('timeFormat', v)}
                    options={TIME_FORMATS.map(t => ({ value: t, label: t }))} />
                </InputGroup>
              </div>
            </div>
          )}

          {/* ======== APPEARANCE ======== */}
          {activeTab === 'appearance' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-foreground">Apariencia</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Personaliza la identidad visual de tu sistema</p>
                </div>
                <button
                  onClick={() => saveSection('appearance')}
                  disabled={saving}
                  className="flex items-center gap-2 h-10 px-5 bg-glamor-primary hover:bg-glamor-primary-hover text-white rounded-lg text-sm font-medium transition disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar cambios
                </button>
              </div>

              <div className="space-y-6 max-w-lg">
                <InputGroup label="Color principal">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={settings.primaryColor}
                        onChange={e => update('primaryColor', e.target.value)}
                        className="w-10 h-10 rounded-lg border border-border-primary cursor-pointer"
                      />
                    </div>
                    <TextInput value={settings.primaryColor} onChange={v => update('primaryColor', v)} />
                    {/* Preview */}
                    <div
                      className="w-10 h-10 rounded-lg border border-border-primary"
                      style={{ backgroundColor: settings.primaryColor }}
                    />
                  </div>
                </InputGroup>

                <InputGroup label="Tema">
                  <SelectInput value={settings.theme} onChange={v => update('theme', v)} options={THEMES} />
                </InputGroup>

                <InputGroup label="Logo">
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border-primary flex items-center justify-center bg-surface-hover overflow-hidden">
                      {settings.logoUrl ? (
                        <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Upload className="w-5 h-5" />
                          <span className="text-[10px]">Logo</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <TextInput
                        value={settings.logoUrl}
                        onChange={v => update('logoUrl', v)}
                        placeholder="https://... o /uploads/logo.png"
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">URL del logo. Recomendado: PNG cuadrado, mínimo 200x200px</p>
                    </div>
                  </div>
                </InputGroup>
              </div>
            </div>
          )}

          {/* ======== SALES ======== */}
          {activeTab === 'sales' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-foreground">Configuración de ventas</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Define cómo se gestionan las ventas en tu negocio</p>
                </div>
                <button
                  onClick={() => saveSection('sales')}
                  disabled={saving}
                  className="flex items-center gap-2 h-10 px-5 bg-glamor-primary hover:bg-glamor-primary-hover text-white rounded-lg text-sm font-medium transition disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar cambios
                </button>
              </div>

              {/* Toggles */}
              <div className="bg-surface-hover rounded-xl p-1">
                <Toggle
                  checked={settings.taxInclusive}
                  onChange={v => update('taxInclusive', v)}
                  label="Precios con impuesto incluido"
                  description="Si se activa, los precios mostrados en POS ya incluyen IVA"
                />
                <Toggle
                  checked={settings.allowDiscounts}
                  onChange={v => update('allowDiscounts', v)}
                  label="Permitir descuentos"
                  description="Habilita la opción de aplicar descuentos en ventas"
                />
                <Toggle
                  checked={settings.autoPrintReceipt}
                  onChange={v => update('autoPrintReceipt', v)}
                  label="Impresión automática de recibos"
                  description="Imprime el recibo automáticamente al completar una venta"
                />
                <Toggle
                  checked={settings.requireCustomerOnSale}
                  onChange={v => update('requireCustomerOnSale', v)}
                  label="Requerir cliente en venta"
                  description="Obliga a asociar un cliente a cada venta"
                />
                <Toggle
                  checked={settings.lowStockAlert}
                  onChange={v => update('lowStockAlert', v)}
                  label="Alertas de stock bajo"
                  description="Notifica cuando productos alcanzan el nivel mínimo de inventario"
                />
              </div>

              <h4 className="font-semibold text-foreground mt-6 mb-3 text-sm">Opciones avanzadas</h4>
              <div className="grid grid-cols-2 gap-4 max-w-lg">
                <InputGroup label="Página de inicio por defecto">
                  <SelectInput value={settings.defaultPage} onChange={v => update('defaultPage', v)} options={DEFAULT_PAGES} />
                </InputGroup>
                <InputGroup label="Duración de sesión (minutos)">
                  <TextInput
                    type="number"
                    value={String(settings.sessionDurationMinutes)}
                    onChange={v => update('sessionDurationMinutes', Math.max(1, Number(v)))}
                    placeholder="60"
                  />
                </InputGroup>
                <InputGroup label="Número de folio inicial">
                  <TextInput
                    type="number"
                    value={String(settings.initialFolioNumber)}
                    onChange={v => update('initialFolioNumber', Math.max(0, Number(v)))}
                    placeholder="1"
                  />
                </InputGroup>
              </div>
            </div>
          )}

          {/* ======== POS ======== */}
          {activeTab === 'pos' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-foreground">Ventas POS</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Cajas registradoras, facturación y tickets</p>
                </div>
                <button
                  onClick={() => saveSection('pos')}
                  disabled={saving}
                  className="flex items-center gap-2 h-10 px-5 bg-glamor-primary hover:bg-glamor-primary-hover text-white rounded-lg text-sm font-medium transition disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar cambios
                </button>
              </div>

              {/* ── Cash Registers ── */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm text-foreground">Cajas registradoras</h4>
                  <button
                    onClick={() => { setEditingRegister(null); setRegisterFormName(''); setRegisterFormDesc(''); setShowRegisterForm(true); }}
                    className="flex items-center gap-1.5 h-8 px-3 bg-glamor-primary text-white rounded-lg text-xs font-medium hover:bg-glamor-primary-hover transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nueva caja
                  </button>
                </div>
                {posRegisters.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center bg-surface-hover rounded-lg">No hay cajas creadas. Crea una para empezar.</p>
                ) : (
                  <div className="space-y-2">
                    {posRegisters.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-surface-hover rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{r.name}</p>
                          {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditingRegister(r); setRegisterFormName(r.name); setRegisterFormDesc(r.description || ''); setShowRegisterForm(true); }}
                            className="p-1.5 rounded hover:bg-surface-primary text-muted-foreground"
                          ><Pencil className="w-4 h-4" /></button>
                          <button
                            onClick={() => deleteRegister(r.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
                          ><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Invoice Template ── */}
              <div className="mb-6">
                <h4 className="font-medium text-sm text-foreground mb-3">Plantilla de factura</h4>
                <p className="text-xs text-muted-foreground mb-3">Define qué campos se incluyen en las facturas enviadas a clientes</p>
                <div className="bg-surface-hover rounded-xl p-1">
                  <Toggle checked={invoiceTemplate.showLogo !== false} onChange={v => setInvoiceTemplate({...invoiceTemplate, showLogo: v})} label="Mostrar logo" />
                  <Toggle checked={invoiceTemplate.showStoreInfo !== false} onChange={v => setInvoiceTemplate({...invoiceTemplate, showStoreInfo: v})} label="Datos de la tienda" />
                  <Toggle checked={invoiceTemplate.showCustomerInfo !== false} onChange={v => setInvoiceTemplate({...invoiceTemplate, showCustomerInfo: v})} label="Datos del cliente" />
                  <Toggle checked={invoiceTemplate.showPaymentInfo !== false} onChange={v => setInvoiceTemplate({...invoiceTemplate, showPaymentInfo: v})} label="Método de pago" />
                  <Toggle checked={invoiceTemplate.showTaxBreakdown !== false} onChange={v => setInvoiceTemplate({...invoiceTemplate, showTaxBreakdown: v})} label="Desglose de impuestos" />
                  <div className="flex items-center justify-between py-3 px-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">Mensaje de pie</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Texto al final de la factura</p>
                    </div>
                    <input
                      type="text"
                      value={invoiceTemplate.footerMessage || ''}
                      onChange={e => setInvoiceTemplate({...invoiceTemplate, footerMessage: e.target.value})}
                      placeholder="¡Gracias por tu compra!"
                      className="w-48 h-9 px-3 rounded-lg border border-border-primary text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* ── Ticket Template ── */}
              <div className="mb-6">
                <h4 className="font-medium text-sm text-foreground mb-3">Plantilla de ticket</h4>
                <p className="text-xs text-muted-foreground mb-3">Define qué se incluye en el ticket que se imprime en caja</p>
                <div className="bg-surface-hover rounded-xl p-1">
                  <Toggle checked={ticketTemplate.showLogo !== false} onChange={v => setTicketTemplate({...ticketTemplate, showLogo: v})} label="Mostrar logo" />
                  <Toggle checked={ticketTemplate.showStoreInfo !== false} onChange={v => setTicketTemplate({...ticketTemplate, showStoreInfo: v})} label="Datos de la tienda" />
                  <Toggle checked={ticketTemplate.showSeller !== false} onChange={v => setTicketTemplate({...ticketTemplate, showSeller: v})} label="Nombre del vendedor" />
                  <Toggle checked={ticketTemplate.showBarcode !== false} onChange={v => setTicketTemplate({...ticketTemplate, showBarcode: v})} label="Código de barras" />
                  <Toggle checked={ticketTemplate.showQR !== false} onChange={v => setTicketTemplate({...ticketTemplate, showQR: v})} label="Código QR" />
                  <div className="flex items-center justify-between py-3 px-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">Mensaje de pie</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Texto al final del ticket</p>
                    </div>
                    <input
                      type="text"
                      value={ticketTemplate.footerMessage || ''}
                      onChange={e => setTicketTemplate({...ticketTemplate, footerMessage: e.target.value})}
                      placeholder="¡Gracias por tu visita!"
                      className="w-48 h-9 px-3 rounded-lg border border-border-primary text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* ── POS Settings ── */}
              <div>
                <h4 className="font-medium text-sm text-foreground mb-3">Ajustes POS</h4>
                <div className="bg-surface-hover rounded-xl p-1">
                  <Toggle checked={posSettings.autoOpenDrawer !== false} onChange={v => setPosSettings({...posSettings, autoOpenDrawer: v})} label="Abrir cajón al cobrar" description="Abre automáticamente el cajón de dinero al completar venta" />
                  <Toggle checked={posSettings.playSound !== false} onChange={v => setPosSettings({...posSettings, playSound: v})} label="Sonido de venta" description="Reproduce un sonido al completar una venta" />
                  <Toggle checked={posSettings.requireCustomerForTicket !== false} onChange={v => setPosSettings({...posSettings, requireCustomerForTicket: v})} label="Cliente obligatorio para factura" description="Solo permite imprimir factura si la venta tiene cliente asignado" />
                </div>
              </div>

              {/* ── Register Form Modal ── */}
              {showRegisterForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setShowRegisterForm(false)} />
                  <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 z-10">
                    <h4 className="text-lg font-bold mb-4">{editingRegister ? 'Editar caja' : 'Nueva caja'}</h4>
                    <div className="space-y-3">
                      <div><label className="block text-sm font-medium mb-1">Nombre</label><input value={registerFormName} onChange={e => setRegisterFormName(e.target.value)} className="w-full h-10 px-3 rounded-lg border text-sm" autoFocus /></div>
                      <div><label className="block text-sm font-medium mb-1">Descripción</label><input value={registerFormDesc} onChange={e => setRegisterFormDesc(e.target.value)} placeholder="Opcional" className="w-full h-10 px-3 rounded-lg border text-sm" /></div>
                    </div>
                    <div className="flex gap-3 mt-5">
                      <button onClick={() => setShowRegisterForm(false)} className="flex-1 h-10 rounded-lg border text-sm">Cancelar</button>
                      <button onClick={saveRegister} className="flex-1 h-10 bg-glamor-primary text-white rounded-lg text-sm font-medium">{editingRegister ? 'Guardar' : 'Crear'}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======== NOTIFICATIONS ======== */}
          {activeTab === 'notifications' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-foreground">Notificaciones</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Configura WhatsApp y las alertas del sistema</p>
                </div>
              </div>

              {/* ── WHATSAPP CONNECTION ── */}
              <div className="mb-6 p-5 bg-white rounded-xl border border-border-primary">
                <div className="flex items-center gap-2 mb-4">
                  <Smartphone className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-foreground">WhatsApp</h4>
                  {!waLoading && waStatus && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                      waStatus.connected
                        ? 'bg-green-100 text-green-700'
                        : waStatus.status === 'unreachable'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {waStatus.connected ? 'Conectado' : waStatus.status === 'unreachable' ? 'Sin conexión' : waStatus.status}
                    </span>
                  )}
                  {waLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  Vincula tu WhatsApp Business para enviar recordatorios, confirmaciones y recibir comandos de clientes.
                </p>

                {/* Status refresh button */}
                <button
                  onClick={fetchWaStatus}
                  disabled={waLoading}
                  className="flex items-center gap-2 h-9 px-4 mb-4 rounded-lg border border-border-primary text-sm font-medium text-muted-foreground hover:bg-surface-hover transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${waLoading ? 'animate-spin' : ''}`} />
                  Verificar estado
                </button>

                {/* QR Code Section */}
                <div className="border-t border-border-primary pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <QrCode className="w-4 h-4 text-glamor-primary" />
                    <h5 className="text-sm font-semibold text-foreground">Código QR</h5>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Escanea este código con WhatsApp → Dispositivos vinculados para conectar.
                  </p>

                  {waQrUrl ? (
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white rounded-lg border-2 border-glamor-primary/30 inline-block">
                        <img src={waQrUrl} alt="WhatsApp QR" className="w-52 h-52" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={fetchQr}
                          disabled={waLoading}
                          className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border-primary text-sm font-medium text-muted-foreground hover:bg-surface-hover transition"
                        >
                          <RefreshCw className={`w-4 h-4 ${waLoading ? 'animate-spin' : ''}`} />
                          Regenerar QR
                        </button>
                        <p className="text-xs text-muted-foreground">El QR expira después de un tiempo. Si no funciona, regenera.</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {waQrError && (
                        <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {waQrError}
                        </div>
                      )}
                      <button
                        onClick={fetchQr}
                        disabled={waLoading}
                        className="flex items-center gap-2 h-10 px-5 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition disabled:opacity-50"
                      >
                        {waLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                        Generar código QR
                      </button>
                    </div>
                  )}
                </div>

                {/* Pairing Code Section */}
                <div className="border-t border-border-primary pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Link className="w-4 h-4 text-glamor-primary" />
                    <h5 className="text-sm font-semibold text-foreground">Código de emparejamiento</h5>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Más fácil que el QR: ingresa tu número de WhatsApp y recibirás un código para vincular.
                  </p>

                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="tel"
                      value={pairPhone}
                      onChange={e => setPairPhone(e.target.value)}
                      placeholder="+52 1 55 1234 5678"
                      className="w-64 h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition"
                    />
                    <button
                      onClick={handlePair}
                      disabled={pairLoading}
                      className="flex items-center gap-2 h-10 px-5 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition disabled:opacity-50"
                    >
                      {pairLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                      Generar código
                    </button>
                  </div>

                  {pairError && (
                    <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {pairError}
                    </div>
                  )}

                  {pairCode && (
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                      <p className="text-sm font-medium text-green-800 mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {pairSuccess}
                      </p>
                      <div className="flex items-center gap-3">
                        <code className="text-2xl font-bold text-green-900 tracking-[0.3em] bg-white px-4 py-2 rounded-lg border border-green-200 select-all">
                          {pairCode}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(pairCode);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="p-2 rounded-lg border border-green-300 hover:bg-green-100 transition text-green-700"
                          title="Copiar código"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-green-700 mt-2">
                        Ingresa este código en tu WhatsApp cuando aparezca la notificación de vinculación.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── PENDING NOTIFICATIONS ── */}
              <h4 className="font-semibold text-foreground mb-3 text-sm">Próximamente</h4>
              <div className="bg-surface-hover rounded-xl p-1">
                <div className="flex items-center justify-between py-4 px-4 border-b border-border-light last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">Stock bajo</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Cuando un producto alcanza su nivel mínimo</p>
                  </div>
                  <span className="text-xs text-muted-foreground bg-gray-200 px-2 py-0.5 rounded">Próximamente</span>
                </div>
                <div className="flex items-center justify-between py-4 px-4 border-b border-border-light last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">Recordatorio de citas</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Recordatorios automáticos a clientes antes de su cita</p>
                  </div>
                  <span className="text-xs text-muted-foreground bg-gray-200 px-2 py-0.5 rounded">Próximamente</span>
                </div>
                <div className="flex items-center justify-between py-4 px-4 border-b border-border-light last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">Resumen diario</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Resumen de ventas y actividades al final del día</p>
                  </div>
                  <span className="text-xs text-muted-foreground bg-gray-200 px-2 py-0.5 rounded">Próximamente</span>
                </div>
                <div className="flex items-center justify-between py-4 px-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Agentes IA</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Notificaciones de recomendaciones y análisis de IA</p>
                  </div>
                  <span className="text-xs text-muted-foreground bg-gray-200 px-2 py-0.5 rounded">Próximamente</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ─── Toast ──────────────────────────────────────────── */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
