'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Receipt, Download, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function IvaReportPage() {
  const { token } = useAuthStore();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const localDate = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return localDate(d);
  });
  const [dateTo, setDateTo] = useState(() => localDate(new Date()));

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get(`/reports/iva?dateFrom=${dateFrom}&dateTo=${dateTo}`, { token });
      setData(res);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [token, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ['Tarifa IVA', 'Base gravable', 'IVA recaudado', 'Num. ítems'],
      ...data.byRate.map((r: any) => [
        `${r.ivaRate}%`,
        Number(r.baseImponible).toFixed(2),
        Number(r.ivaTotal).toFixed(2),
        r.numItems,
      ]),
      [],
      ['TOTAL', Number(data.summary.subtotal).toFixed(2), Number(data.summary.totalIva).toFixed(2), ''],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `reporte_iva_${dateFrom}_${dateTo}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const inputClass = 'h-9 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition';

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-surface-hover">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-6 h-6 text-glamor-primary" /> Reporte IVA
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">IVA recaudado por tasa — Colombia (DIAN)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} disabled={loading} className="p-2 rounded-lg border border-border-primary hover:bg-surface-hover transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleExportCSV} disabled={!data} className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border-primary text-sm font-medium hover:bg-surface-hover transition disabled:opacity-50">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 bg-white rounded-xl border border-border-primary p-4">
        <span className="text-sm font-medium text-foreground">Período</span>
        <input type="date" className={inputClass} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <span className="text-muted-foreground text-sm">—</span>
        <input type="date" className={inputClass} value={dateTo} onChange={e => setDateTo(e.target.value)} />
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-border-primary p-12 text-center text-sm text-muted-foreground animate-pulse">
          Calculando IVA...
        </div>
      ) : !data ? (
        <div className="bg-white rounded-xl border border-border-primary p-12 text-center text-sm text-muted-foreground">
          Sin datos para el período seleccionado
        </div>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Ventas completadas', value: data.summary.totalSales, format: 'number' },
              { label: 'Base gravable total', value: data.summary.subtotal, format: 'currency' },
              { label: 'IVA total recaudado', value: data.summary.totalIva, format: 'currency' },
              { label: 'Total con IVA', value: data.summary.totalWithIva, format: 'currency' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-xl border border-border-primary p-4 shadow-card">
                <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                <p className="text-xl font-bold text-foreground">
                  {card.format === 'currency' ? formatCurrency(card.value) : card.value}
                </p>
              </div>
            ))}
          </div>

          {/* Desglose por tasa */}
          <div className="bg-white rounded-xl border border-border-primary shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border-primary">
              <h2 className="font-semibold text-foreground">Desglose por tarifa IVA</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Información para declaración de IVA ante la DIAN</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary bg-surface-primary/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Tarifa</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Base gravable</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">IVA recaudado</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Ítems vendidos</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">% del total IVA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.byRate.map((r: any) => {
                  const pct = data.summary.totalIva > 0
                    ? ((Number(r.ivaTotal) / Number(data.summary.totalIva)) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <tr key={r.ivaRate} className="hover:bg-surface-hover/50 transition">
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          r.ivaRate === 19 ? 'bg-blue-100 text-blue-700' :
                          r.ivaRate === 5  ? 'bg-green-100 text-green-700' :
                                            'bg-gray-100 text-gray-600'
                        }`}>
                          {r.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-medium text-foreground">
                        {formatCurrency(r.baseImponible)}
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-semibold text-foreground">
                        {formatCurrency(r.ivaTotal)}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-muted-foreground">
                        {r.numItems.toLocaleString('es-CO')}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-muted-foreground">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-primary bg-surface-primary/30">
                  <td className="px-5 py-3 text-sm font-bold text-foreground">TOTAL</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-foreground">
                    {formatCurrency(Number(data.summary.subtotal) - Number(data.summary.totalDiscounts))}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-glamor-primary">
                    {formatCurrency(data.summary.totalIva)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Nota DIAN */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Nota para declaración DIAN:</p>
            <p>Este reporte muestra el IVA recaudado (IVA generado). Para la declaración bimestral debes restar el IVA descontable de tus compras (IVA pagado a proveedores). El saldo neto es el IVA a pagar o a favor.</p>
            <p className="mt-1">Período declarado: <strong>{dateFrom}</strong> al <strong>{dateTo}</strong></p>
          </div>
        </>
      )}
    </div>
  );
}
