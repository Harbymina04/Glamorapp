'use client';

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import {
  FileText, Loader2, Calculator, AlertCircle, CheckCircle2,
  Printer, ChevronDown, Info, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

const BIMESTERS = [
  { value: 1, label: 'Enero - Febrero' },
  { value: 2, label: 'Marzo - Abril' },
  { value: 3, label: 'Mayo - Junio' },
  { value: 4, label: 'Julio - Agosto' },
  { value: 5, label: 'Septiembre - Octubre' },
  { value: 6, label: 'Noviembre - Diciembre' },
];

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const YEARS = [2024, 2025, 2026];

// ─── Helper Components ────────────────────────────────────────────────────────

function Field({ casilla, label, value, highlight = false, sub = false }: {
  casilla: string; label: string; value: number;
  highlight?: boolean; sub?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2.5 px-4 ${
      highlight ? 'bg-primary/5 border border-primary/20 rounded-lg font-semibold' :
      sub ? 'pl-8 border-b border-gray-100' : 'border-b border-gray-100'
    }`}>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-gray-400 w-8">{casilla}</span>
        <span className={`text-sm ${highlight ? 'text-primary font-semibold' : 'text-gray-700'}`}>{label}</span>
      </div>
      <span className={`font-mono text-sm tabular-nums ${
        highlight ? 'text-primary text-base font-bold' :
        value < 0 ? 'text-red-600' : 'text-gray-900'
      }`}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-y border-gray-200 mt-3 first:mt-0">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{children}</span>
    </div>
  );
}

function ResultBadge({ amount, label }: { amount: number; label: string }) {
  const isPaying = amount > 0;
  return (
    <div className={`flex items-center gap-3 rounded-xl p-4 ${
      isPaying ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'
    }`}>
      {isPaying
        ? <TrendingDown className="w-5 h-5 text-red-500 shrink-0" />
        : <TrendingUp className="w-5 h-5 text-green-500 shrink-0" />
      }
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wide ${isPaying ? 'text-red-500' : 'text-green-600'}`}>
          {label}
        </p>
        <p className={`text-2xl font-bold tabular-nums ${isPaying ? 'text-red-600' : 'text-green-700'}`}>
          {formatCurrency(Math.abs(amount))}
        </p>
      </div>
    </div>
  );
}

// ─── IVA Tab ──────────────────────────────────────────────────────────────────

function IvaLiquidation({ token }: { token: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const currentBimester = Math.ceil((now.getMonth() + 1) / 2);
  const [bimester, setBimester] = useState(currentBimester);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get(`/accounting/reports/iva-liquidation?year=${year}&bimester=${bimester}`, { token });
      setData(res);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar la liquidación');
    } finally { setLoading(false); }
  }, [token, year, bimester]);

  const handlePrint = () => {
    if (!data) return;
    const win = window.open('', '_blank', 'width=800,height=1000');
    if (!win) return;
    const f = data.form300;
    const fc = data.fiscalConfig;
    const bim = BIMESTERS.find(b => b.value === bimester)?.label;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Formulario 300 - IVA</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;padding:20px;max-width:700px;margin:auto}
    h1{font-size:16px;font-weight:bold;margin-bottom:4px}h2{font-size:13px;color:#555;margin-bottom:16px}
    .header{border:2px solid #333;padding:12px;margin-bottom:16px;border-radius:4px}
    .section-title{background:#f3f4f6;padding:6px 10px;font-weight:bold;font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin:8px 0 0;border-left:3px solid #6366f1}
    .row{display:flex;justify-content:space-between;align-items:center;padding:5px 10px;border-bottom:1px solid #f0f0f0}
    .casilla{font-family:monospace;color:#999;width:28px;font-size:10px}.label{flex:1;padding-left:8px}
    .value{font-family:monospace;font-weight:600;text-align:right;min-width:120px}
    .highlight{background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;margin:4px 0;padding:7px 10px}
    .result-pay{background:#fef2f2;border:2px solid #fca5a5;border-radius:6px;padding:12px;margin-top:12px;text-align:center}
    .result-favor{background:#f0fdf4;border:2px solid #86efac;border-radius:6px;padding:12px;margin-top:12px;text-align:center}
    .footer{margin-top:20px;border-top:1px dashed #ccc;padding-top:10px;font-size:10px;color:#888;text-align:center}
    @media print{body{padding:10px}}</style></head><body>
    <div class="header">
      <h1>FORMULARIO 300 — Declaración de IVA</h1>
      <h2>Pre-liquidación ${bim} ${year}</h2>
      ${fc ? `<p><strong>${fc.businessName}</strong> · ${fc.idType?.toUpperCase()}: ${fc.idNumber}-${fc.dv}</p>` : ''}
      <p style="color:#888;font-size:10px;margin-top:4px">⚠️ Este es un documento de pre-liquidación. Verifique con su contador antes de presentar.</p>
    </div>
    <div class="section-title">Ingresos gravados — IVA generado</div>
    <div class="row"><span class="casilla">C1</span><span class="label">Base gravable tarifa 19%</span><span class="value">${formatCurrency(f.casilla1_baseGravada19)}</span></div>
    <div class="row"><span class="casilla">C2</span><span class="label">IVA generado tarifa 19%</span><span class="value">${formatCurrency(f.casilla2_iva19)}</span></div>
    <div class="row"><span class="casilla">C3</span><span class="label">Base gravable tarifa 5%</span><span class="value">${formatCurrency(f.casilla3_baseGravada5)}</span></div>
    <div class="row"><span class="casilla">C4</span><span class="label">IVA generado tarifa 5%</span><span class="value">${formatCurrency(f.casilla4_iva5)}</span></div>
    <div class="row"><span class="casilla">C5</span><span class="label">Base operaciones excluidas/exentas</span><span class="value">${formatCurrency(f.casilla5_baseExcluida)}</span></div>
    <div class="row highlight"><span class="casilla">C6</span><span class="label"><strong>Total IVA generado</strong></span><span class="value">${formatCurrency(f.casilla6_ivaGeneradoTotal)}</span></div>
    <div class="section-title">IVA descontable y retenciones</div>
    <div class="row"><span class="casilla">C7</span><span class="label">IVA descontable en compras/gastos</span><span class="value">${formatCurrency(f.casilla7_ivaDescontable)}</span></div>
    <div class="row"><span class="casilla">C8</span><span class="label">Retenciones de IVA (ReteIVA)</span><span class="value">${formatCurrency(f.casilla8_reteIva)}</span></div>
    <div class="row"><span class="casilla">C9</span><span class="label">Saldo a favor período anterior</span><span class="value">${formatCurrency(f.casilla9_saldoFavorAnterior)}</span></div>
    <div class="row highlight"><span class="casilla">C10</span><span class="label"><strong>Total descuentos</strong></span><span class="value">${formatCurrency(f.casilla10_totalDescuentos)}</span></div>
    ${f.casilla11_ivaNetoPagar > 0
      ? `<div class="result-pay"><p style="font-weight:bold;color:#dc2626">IVA A PAGAR (C11)</p><p style="font-size:20px;font-weight:bold;color:#dc2626">${formatCurrency(f.casilla11_ivaNetoPagar)}</p></div>`
      : `<div class="result-favor"><p style="font-weight:bold;color:#16a34a">SALDO A FAVOR (C12)</p><p style="font-size:20px;font-weight:bold;color:#16a34a">${formatCurrency(f.casilla12_saldoFavorPeriodo)}</p></div>`
    }
    <div class="footer"><p>Documento generado el ${new Date().toLocaleString('es-CO')} · Pre-liquidación no oficial</p></div>
    </body></html>`);
    win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 500);
  };

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" /> Período de liquidación
        </h3>
        <div className="flex gap-4 flex-wrap items-end">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Año</label>
            <select value={year} onChange={e => setYear(+e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Bimestre (IVA se declara cada 2 meses)</label>
            <select value={bimester} onChange={e => setBimester(+e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {BIMESTERS.map(b => <option key={b.value} value={b.value}>Bimestre {b.value} — {b.label}</option>)}
            </select>
          </div>
          <button onClick={load} disabled={loading} className="px-5 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            Calcular
          </button>
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Esta pre-liquidación se calcula a partir de las facturas y transacciones registradas. Verifique con su contador antes de presentar ante la DIAN.
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {data && (
        <>
          {/* Header */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-indigo-50">
              <div>
                <h2 className="font-bold text-indigo-900">Formulario 300 — Declaración de IVA</h2>
                <p className="text-sm text-indigo-700 mt-0.5">
                  Bimestre {bimester} · {BIMESTERS.find(b => b.value === bimester)?.label} {year}
                  {data.fiscalConfig && <> · <strong>{data.fiscalConfig.businessName}</strong></>}
                </p>
              </div>
              <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition">
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>

            <div>
              <SectionTitle>IVA Generado (ventas)</SectionTitle>
              <Field casilla="C1" label="Base gravable tarifa general 19%" value={data.form300.casilla1_baseGravada19} />
              <Field casilla="C2" label="IVA generado tarifa 19%" value={data.form300.casilla2_iva19} sub />
              <Field casilla="C3" label="Base gravable tarifa diferencial 5%" value={data.form300.casilla3_baseGravada5} />
              <Field casilla="C4" label="IVA generado tarifa 5%" value={data.form300.casilla4_iva5} sub />
              <Field casilla="C5" label="Base operaciones excluidas / exentas (0%)" value={data.form300.casilla5_baseExcluida} />
              <Field casilla="C6" label="Total IVA generado (C2 + C4)" value={data.form300.casilla6_ivaGeneradoTotal} highlight />

              <SectionTitle>IVA Descontable y Retenciones</SectionTitle>
              <Field casilla="C7" label="IVA descontable en compras y gastos" value={data.form300.casilla7_ivaDescontable} />
              <Field casilla="C8" label="Retenciones de IVA sufridas (ReteIVA)" value={data.form300.casilla8_reteIva} />
              <Field casilla="C9" label="Saldo a favor período anterior" value={data.form300.casilla9_saldoFavorAnterior} />
              <Field casilla="C10" label="Total descuentos (C7 + C8 + C9)" value={data.form300.casilla10_totalDescuentos} highlight />
            </div>

            {/* Result */}
            <div className="p-5 space-y-3">
              {data.form300.casilla11_ivaNetoPagar > 0 ? (
                <ResultBadge amount={data.form300.casilla11_ivaNetoPagar} label="IVA a pagar (C11 = C6 − C10)" />
              ) : (
                <ResultBadge amount={0} label="Saldo a favor (C12 = C10 − C6)" />
              )}
              {data.form300.casilla12_saldoFavorPeriodo > 0 && (
                <ResultBadge amount={-data.form300.casilla12_saldoFavorPeriodo} label="Saldo a favor (C12)" />
              )}
            </div>
          </div>

          {/* Breakdown detail */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ventas del período</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Base gravada 19%</span><span className="font-medium">{formatCurrency(data.breakdown.ventas.baseGravada19)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Base gravada 5%</span><span className="font-medium">{formatCurrency(data.breakdown.ventas.baseGravada5)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Base excluida 0%</span><span className="font-medium">{formatCurrency(data.breakdown.ventas.baseExcluida)}</span></div>
                <div className="flex justify-between border-t pt-2 font-semibold"><span>Total IVA</span><span className="text-primary">{formatCurrency(data.breakdown.ventas.ivaTotal)}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Compras / Gastos</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total gastos</span><span className="font-medium">{formatCurrency(data.breakdown.compras.totalGastos)}</span></div>
                <div className="flex justify-between border-t pt-2 font-semibold"><span>IVA descontable</span><span className="text-green-600">{formatCurrency(data.breakdown.compras.ivaDescontable)}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Facturas emitidas</p>
              <div className="space-y-2 text-sm">
                {data.invoices?.map((inv: any) => (
                  <div key={inv.invoiceType} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">{inv.invoiceType.replace('_', ' ')}</span>
                    <span className="font-medium">{inv._count} · {formatCurrency(Number(inv._sum?.total || 0))}</span>
                  </div>
                ))}
                {(!data.invoices || data.invoices.length === 0) && (
                  <p className="text-muted-foreground text-xs">Sin facturas en el período</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── ReteFuente Tab ───────────────────────────────────────────────────────────

function RetefuenteLiquidation({ token }: { token: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get(`/accounting/reports/retefuente-liquidation?year=${year}&month=${month}`, { token });
      setData(res);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar');
    } finally { setLoading(false); }
  }, [token, year, month]);

  const handlePrint = () => {
    if (!data) return;
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) return;
    const f = data.form350;
    const fc = data.fiscalConfig;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Formulario 350 - ReteFuente</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;padding:20px;max-width:700px;margin:auto}
    h1{font-size:16px;font-weight:bold;margin-bottom:4px}h2{font-size:13px;color:#555;margin-bottom:16px}
    .header{border:2px solid #333;padding:12px;margin-bottom:16px;border-radius:4px}
    table{width:100%;border-collapse:collapse;margin:8px 0}th{background:#f3f4f6;padding:7px 10px;text-align:left;font-size:10px;font-weight:bold;border-bottom:2px solid #e5e7eb}
    td{padding:7px 10px;border-bottom:1px solid #f0f0f0;font-size:11px}.text-right{text-align:right}
    .highlight{background:#eff6ff;font-weight:bold}
    .result{border:2px solid #fca5a5;background:#fef2f2;border-radius:6px;padding:12px;margin-top:12px;text-align:center}
    .footer{margin-top:16px;font-size:10px;color:#888;text-align:center;border-top:1px dashed #ccc;padding-top:8px}
    @media print{body{padding:10px}}</style></head><body>
    <div class="header"><h1>FORMULARIO 350 — Retención en la Fuente</h1>
    <h2>Pre-liquidación ${MONTHS[month - 1]} ${year}</h2>
    ${fc ? `<p><strong>${fc.businessName}</strong> · NIT: ${fc.idNumber}-${fc.dv}</p>` : ''}</div>
    <table><thead><tr><th>Concepto</th><th class="text-right">Base gravable</th><th class="text-right">Tarifa</th><th class="text-right">Retención</th></tr></thead>
    <tbody>
    ${(data.byCategory || []).map((c: any) => `<tr><td>${c.label}</td><td class="text-right">${formatCurrency(c.baseGravable)}</td><td class="text-right">—</td><td class="text-right">${formatCurrency(c.retefuente)}</td></tr>`).join('')}
    <tr class="highlight"><td>Total ReteFuente practicada</td><td></td><td></td><td class="text-right">${formatCurrency(f.totalRetefuentePracticada)}</td></tr>
    <tr><td>ReteIVA practicada</td><td></td><td></td><td class="text-right">${formatCurrency(f.totalReteIvaPracticada)}</td></tr>
    <tr><td>ReteICA practicada</td><td></td><td></td><td class="text-right">${formatCurrency(f.totalReteIcaPracticada)}</td></tr>
    </tbody></table>
    <div class="result"><p style="font-weight:bold;color:#dc2626">TOTAL A PAGAR</p><p style="font-size:20px;font-weight:bold;color:#dc2626">${formatCurrency(f.totalAPagar)}</p></div>
    <div class="footer">Pre-liquidación generada el ${new Date().toLocaleString('es-CO')} · No oficial</div>
    </body></html>`);
    win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 500);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" /> Período mensual
        </h3>
        <div className="flex gap-4 flex-wrap items-end">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Año</label>
            <select value={year} onChange={e => setYear(+e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Mes</label>
            <select value={month} onChange={e => setMonth(+e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <button onClick={load} disabled={loading} className="px-5 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            Calcular
          </button>
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          ReteFuente se declara mensualmente. Esta pre-liquidación incluye las retenciones practicadas en ventas y transacciones del período.
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {data && (
        <>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-orange-50">
              <div>
                <h2 className="font-bold text-orange-900">Formulario 350 — Retención en la Fuente</h2>
                <p className="text-sm text-orange-700 mt-0.5">
                  {MONTHS[month - 1]} {year}
                  {data.fiscalConfig && <> · <strong>{data.fiscalConfig.businessName}</strong></>}
                </p>
              </div>
              <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition">
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>

            <div className="p-5">
              {/* By concept table */}
              {data.byCategory?.length > 0 ? (
                <div className="overflow-x-auto mb-5">
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-gray-50 border-b-2 border-gray-200">
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Concepto</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Base gravable</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Operaciones</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Retención</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.byCategory.map((c: any) => (
                        <tr key={c.category} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{c.label}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatCurrency(c.baseGravable)}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{c.count}</td>
                          <td className="px-4 py-3 text-right font-semibold text-orange-700">{formatCurrency(c.retefuente)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm mb-5">
                  No se encontraron retenciones practicadas en el período
                </div>
              )}

              {/* Totals */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                {[
                  { label: 'ReteFuente practicada', value: data.form350.totalRetefuentePracticada, color: 'orange' },
                  { label: 'ReteIVA practicada', value: data.form350.totalReteIvaPracticada, color: 'purple' },
                  { label: 'ReteICA practicada', value: data.form350.totalReteIcaPracticada, color: 'blue' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-xl p-4`}>
                    <p className={`text-xs font-semibold text-${color}-600 mb-1`}>{label}</p>
                    <p className={`text-xl font-bold text-${color}-700 font-mono`}>{formatCurrency(value)}</p>
                  </div>
                ))}
              </div>

              <ResultBadge amount={data.form350.totalAPagar} label="Total a pagar (Form. 350)" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'iva' | 'retefuente';

export default function LiquidacionPage() {
  const { token } = useAuthStore();
  const [tab, setTab] = useState<Tab>('iva');

  const tabs: { key: Tab; label: string; color: string }[] = [
    { key: 'iva', label: 'Pre-liquidación IVA (Form. 300)', color: 'indigo' },
    { key: 'retefuente', label: 'Pre-liquidación ReteFuente (Form. 350)', color: 'orange' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Pre-liquidación de impuestos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cálculo automático basado en facturas y transacciones registradas. Documento de apoyo para su contador.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition ${
              tab === t.key
                ? t.key === 'iva'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-orange-600 text-white border-orange-600'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'iva' && <IvaLiquidation token={token!} />}
      {tab === 'retefuente' && <RetefuenteLiquidation token={token!} />}
    </div>
  );
}
