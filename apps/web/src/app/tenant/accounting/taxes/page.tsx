'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { Receipt, DollarSign, Loader2 } from 'lucide-react';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function TenantTaxesPage() {
  const { token } = useAuthStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/accounting/tax-summary?year=${year}&month=${month}`, { token: token! });
      setSummary(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token, year, month]);

  useEffect(() => { load(); }, [load]);

  const taxes = [
    { key: 'iva', label: 'IVA', desc: 'Impuesto al valor agregado (19%)', color: 'blue' },
    { key: 'retefuente', label: 'ReteFuente', desc: 'Retención en la fuente', color: 'orange' },
    { key: 'reteIva', label: 'ReteIVA', desc: 'Retención de IVA', color: 'purple' },
    { key: 'reteIca', label: 'ReteICA', desc: 'Retención de ICA', color: 'pink' },
    { key: 'ica', label: 'ICA', desc: 'Industria y comercio', color: 'green' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    pink: 'bg-pink-50 border-pink-200 text-pink-700',
    green: 'bg-green-50 border-green-200 text-green-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Resumen de impuestos</h1>
        <p className="text-sm text-muted-foreground mt-1">Consolidado de todas las sucursales</p>
      </div>

      {/* Period selector */}
      <div className="bg-white rounded-xl border p-5 shadow-sm">
        <h3 className="font-semibold mb-4">Período de consulta</h3>
        <div className="flex gap-4 flex-wrap items-end">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Año</label>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="border rounded-lg px-3 py-2 text-sm">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Mes</label>
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="border rounded-lg px-3 py-2 text-sm">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <button onClick={load} disabled={loading} className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Consultar'}
          </button>
        </div>
      </div>

      {summary && (
        <>
          {/* Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total facturado bruto</span>
                <DollarSign className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-primary">{formatCurrency(summary.grossAmount)}</p>
              <p className="text-xs text-muted-foreground mt-1">{MONTHS[month - 1]} {year} · Todas las sucursales</p>
            </div>
            <div className="bg-white rounded-xl border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total neto</span>
                <Receipt className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{formatCurrency(summary.netAmount)}</p>
              <p className="text-xs text-muted-foreground mt-1">Después de retenciones</p>
            </div>
          </div>

          {/* Tax breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {taxes.map(tax => (
              <div key={tax.key} className={`rounded-xl border p-5 ${colorMap[tax.color]}`}>
                <p className="font-semibold mb-1">{tax.label}</p>
                <p className="text-xs mb-3 opacity-75">{tax.desc}</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.taxes?.[tax.key] || 0)}</p>
              </div>
            ))}
          </div>

          {/* Per-store breakdown */}
          {summary.byStore?.length > 0 && (
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Desglose por sucursal</h3>
              </div>
              <div className="divide-y">
                {summary.byStore.map((s: any) => (
                  <div key={s.storeId} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{s.storeId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(s._sum?.grossAmount || 0)}</p>
                      <p className="text-xs text-muted-foreground">IVA: {formatCurrency(s._sum?.ivaAmount || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
