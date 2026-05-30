'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { Building2, Shield, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export default function TenantFiscalConfigPage() {
  const { token } = useAuthStore();
  const [form, setForm] = useState<any>({
    businessName: '', tradeName: '', idType: 'nit', idNumber: '', dv: '',
    personType: 'juridica', taxRegime: 'responsable_iva',
    fiscalAddress: '', cityCode: '', departmentCode: '', countryCode: 'CO',
    fiscalEmail: '', fiscalPhone: '',
    economicActivityCode: '', economicActivityDesc: '',
    feProvider: 'none', feEnvironment: 'sandbox',
    resolutionNumber: '', resolutionPrefix: '',
    resolutionFrom: '', resolutionTo: '',
    cnPrefix: '', dnPrefix: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.get('/accounting/fiscal-config', { token: token! });
      if (data) {
        const { id, createdAt, updatedAt, tenantId, storeId, isActive, currentInvoiceNumber, cnCurrentNumber, dnCurrentNumber, ...rest } = data;
        setForm((prev: any) => ({ ...prev, ...rest }));
      }
    } catch { /* ignore — might not exist yet */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put('/accounting/fiscal-config', {
        ...form,
        resolutionFrom: form.resolutionFrom ? parseInt(form.resolutionFrom) : undefined,
        resolutionTo: form.resolutionTo ? parseInt(form.resolutionTo) : undefined,
      }, { token: token! });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const field = (key: string, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <input
        type={type}
        value={form[key] ?? ''}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );

  const select = (key: string, label: string, options: { value: string; label: string }[]) => (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <select
        value={form[key] ?? ''}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configuración Fiscal</h1>
        <p className="text-sm text-muted-foreground mt-1">Datos de la empresa para facturación electrónica DIAN — aplica a todas las sucursales</p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm divide-y">

        {/* Datos empresa */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Datos de la empresa</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('businessName', 'Razón social *', 'text', 'Ej: GLAMOR SAS')}
            {field('tradeName', 'Nombre comercial', 'text', 'Ej: Glamorapp')}
            {select('idType', 'Tipo de identificación', [
              { value: 'nit', label: 'NIT' },
              { value: 'cc', label: 'Cédula de ciudadanía' },
              { value: 'ce', label: 'Cédula de extranjería' },
              { value: 'pasaporte', label: 'Pasaporte' },
            ])}
            {field('idNumber', 'Número de identificación *', 'text', 'Ej: 900123456')}
            {field('dv', 'Dígito de verificación', 'text', '0-9')}
            {select('personType', 'Tipo de persona', [
              { value: 'juridica', label: 'Persona jurídica' },
              { value: 'natural', label: 'Persona natural' },
            ])}
            {select('taxRegime', 'Régimen tributario', [
              { value: 'responsable_iva', label: 'Responsable de IVA' },
              { value: 'no_responsable', label: 'No responsable de IVA' },
              { value: 'gran_contribuyente', label: 'Gran contribuyente' },
              { value: 'regimen_simple', label: 'Régimen simple' },
            ])}
            {field('economicActivityCode', 'Código actividad económica', 'text', 'Ej: 9602')}
          </div>
          <div className="grid grid-cols-1 gap-4">
            {field('economicActivityDesc', 'Descripción actividad económica', 'text', 'Ej: Peluquería y otros tratamientos de belleza')}
          </div>
        </div>

        {/* Dirección y contacto */}
        <div className="p-5 space-y-4">
          <h3 className="font-semibold">Dirección y contacto fiscal</h3>
          <div className="grid grid-cols-1 gap-4">
            {field('fiscalAddress', 'Dirección fiscal *', 'text', 'Ej: Calle 123 # 45-67, Bogotá')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {field('cityCode', 'Código ciudad', 'text', '11001')}
            {field('departmentCode', 'Código departamento', 'text', '11')}
            {field('countryCode', 'País', 'text', 'CO')}
            {field('fiscalEmail', 'Correo fiscal *', 'email', 'contabilidad@empresa.co')}
            {field('fiscalPhone', 'Teléfono fiscal', 'text', '6011234567')}
          </div>
        </div>

        {/* Resolución DIAN */}
        <div className="p-5 space-y-4">
          <h3 className="font-semibold">Resolución DIAN</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {field('resolutionNumber', 'Número de resolución', 'text', '18760000001')}
            {field('resolutionPrefix', 'Prefijo factura', 'text', 'FV')}
            {field('cnPrefix', 'Prefijo nota crédito', 'text', 'NC')}
            {field('dnPrefix', 'Prefijo nota débito', 'text', 'ND')}
            {field('resolutionFrom', 'Desde consecutivo', 'number', '1')}
            {field('resolutionTo', 'Hasta consecutivo', 'number', '1000')}
          </div>
        </div>

        {/* Proveedor FE */}
        <div className="p-5 space-y-4">
          <h3 className="font-semibold">Proveedor facturación electrónica</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {select('feProvider', 'Proveedor tecnológico', [
              { value: 'none', label: 'Sin proveedor (manual)' },
              { value: 'siigo', label: 'Siigo' },
              { value: 'alegra', label: 'Alegra' },
              { value: 'facturama', label: 'Facturama' },
              { value: 'custom', label: 'API personalizada' },
            ])}
            {select('feEnvironment', 'Ambiente', [
              { value: 'sandbox', label: 'Pruebas (habilitación DIAN)' },
              { value: 'production', label: 'Producción ✓' },
            ])}
            {form.feProvider !== 'none' && (
              <>
                {field('feProviderApiKey', 'API Key del proveedor', 'password')}
                {field('feProviderApiSecret', 'API Secret del proveedor', 'password')}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 flex items-center justify-between">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              Configuración guardada correctamente
            </div>
          )}
          {!error && !saved && <div />}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-60 transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Guardar configuración fiscal
          </button>
        </div>
      </div>
    </div>
  );
}
