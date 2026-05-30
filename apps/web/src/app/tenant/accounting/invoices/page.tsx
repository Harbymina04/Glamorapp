'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FileText, Loader2, Eye, Plus, Printer, X, Download, CheckCircle2, Clock, AlertCircle, XCircle, Ban } from 'lucide-react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft:        'bg-gray-100 text-gray-700',
  pending_dian: 'bg-yellow-100 text-yellow-700',
  approved:     'bg-green-100 text-green-700',
  rejected:     'bg-red-100 text-red-700',
  cancelled:    'bg-red-50 text-red-500',
};

const STATUS_LABELS: Record<string, string> = {
  draft:        'Borrador',
  pending_dian: 'Enviada DIAN',
  approved:     'Aprobada',
  rejected:     'Rechazada',
  cancelled:    'Cancelada',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft:        <Clock className="w-3.5 h-3.5" />,
  pending_dian: <Clock className="w-3.5 h-3.5" />,
  approved:     <CheckCircle2 className="w-3.5 h-3.5" />,
  rejected:     <AlertCircle className="w-3.5 h-3.5" />,
  cancelled:    <Ban className="w-3.5 h-3.5" />,
};

const TYPE_LABELS: Record<string, string> = {
  invoice:          'Factura venta',
  pos_invoice:      'Factura POS',
  credit_note:      'Nota crédito',
  debit_note:       'Nota débito',
  support_document: 'Doc. soporte',
};

// ─── Invoice PDF Modal ────────────────────────────────────────────────────────

function InvoicePDFModal({ invoice, fiscalConfig, onClose }: {
  invoice: any;
  fiscalConfig: any;
  onClose: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  const fmt = (n: any) => formatCurrency(Number(n) || 0);
  const date = (d: string) => new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const handlePrint = () => {
    const content = contentRef.current?.innerHTML || '';
    const win = window.open('', '_blank', 'width=900,height=1100');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Factura ${invoice.invoiceNumber}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: white; padding: 32px; }
        ${printStyles}
      </style>
    </head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-100 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[95vh] flex flex-col">

        {/* Modal toolbar */}
        <div className="flex items-center justify-between px-5 py-3 bg-white rounded-t-2xl border-b">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="w-4 h-4 text-primary" />
            Factura {invoice.invoiceNumber}
            <span className={`ml-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[invoice.status] || 'bg-gray-100'}`}>
              {STATUS_ICONS[invoice.status]}
              {STATUS_LABELS[invoice.status] || invoice.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PDF content */}
        <div className="flex-1 overflow-auto p-6">
          <div ref={contentRef} className="bg-white shadow-sm rounded-xl mx-auto" style={{ maxWidth: 794, padding: '40px 48px', minHeight: 1000 }}>

            {/* ── Header ── */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {fiscalConfig?.businessName || 'Glamorapp'}
                </h1>
                {fiscalConfig?.tradeName && fiscalConfig.tradeName !== fiscalConfig.businessName && (
                  <p className="text-sm text-gray-500 mt-0.5">{fiscalConfig.tradeName}</p>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  {fiscalConfig?.idType?.toUpperCase() || 'NIT'}: {fiscalConfig?.idNumber || '—'}
                  {fiscalConfig?.dv ? `-${fiscalConfig.dv}` : ''}
                </p>
                {fiscalConfig?.fiscalAddress && (
                  <p className="text-xs text-gray-500 mt-0.5">{fiscalConfig.fiscalAddress}, {fiscalConfig.cityCode}</p>
                )}
                {fiscalConfig?.fiscalEmail && (
                  <p className="text-xs text-gray-500">{fiscalConfig.fiscalEmail}</p>
                )}
              </div>

              <div className="text-right">
                <div className="inline-block border-2 border-primary/20 rounded-xl px-5 py-3 bg-primary/5">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{TYPE_LABELS[invoice.invoiceType] || invoice.invoiceType}</p>
                  <p className="text-2xl font-bold text-primary mt-0.5">{invoice.invoiceNumber}</p>
                  <p className="text-xs text-gray-500 mt-1">{date(invoice.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* ── Resolution banner ── */}
            {fiscalConfig?.resolutionNumber && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 mb-6 text-xs text-gray-600">
                Resolución DIAN N° <strong>{fiscalConfig.resolutionNumber}</strong>
                {fiscalConfig.resolutionPrefix && <> · Prefijo <strong>{fiscalConfig.resolutionPrefix}</strong></>}
                {fiscalConfig.resolutionFrom && <> · Del {fiscalConfig.resolutionFrom} al {fiscalConfig.resolutionTo}</>}
                {invoice.cufe && <> · CUFE: <span className="font-mono">{invoice.cufe.slice(0, 20)}...</span></>}
              </div>
            )}

            {/* ── Parties ── */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Emisor</p>
                <p className="font-semibold text-gray-900">{fiscalConfig?.businessName || 'Glamorapp'}</p>
                <p className="text-sm text-gray-600">{fiscalConfig?.idType?.toUpperCase() || 'NIT'}: {fiscalConfig?.idNumber}{fiscalConfig?.dv ? `-${fiscalConfig.dv}` : ''}</p>
                <p className="text-sm text-gray-600">{fiscalConfig?.taxRegime?.replace(/_/g, ' ')}</p>
                {fiscalConfig?.fiscalPhone && <p className="text-xs text-gray-500 mt-1">Tel: {fiscalConfig.fiscalPhone}</p>}
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Receptor</p>
                <p className="font-semibold text-gray-900">{invoice.receiverName}</p>
                {invoice.receiverIdNumber && (
                  <p className="text-sm text-gray-600">{invoice.receiverIdType?.toUpperCase()}: {invoice.receiverIdNumber}</p>
                )}
                {invoice.receiverEmail && <p className="text-sm text-gray-600">{invoice.receiverEmail}</p>}
                {invoice.receiverPhone && <p className="text-xs text-gray-500">Tel: {invoice.receiverPhone}</p>}
                {invoice.receiverAddress && <p className="text-xs text-gray-500">{invoice.receiverAddress}</p>}
                {invoice.receiverTaxRegime && <p className="text-xs text-gray-500 mt-1">{invoice.receiverTaxRegime.replace(/_/g, ' ')}</p>}
              </div>
            </div>

            {/* ── Payment info ── */}
            <div className="flex gap-6 mb-6 text-sm">
              <div>
                <span className="text-gray-500">Condición de pago: </span>
                <span className="font-medium">{invoice.paymentMeansCode === '1' ? 'Contado' : 'Crédito'}</span>
              </div>
              <div>
                <span className="text-gray-500">Método: </span>
                <span className="font-medium">{{
                  '10': 'Efectivo', '42': 'Transferencia', '48': 'Tarjeta débito',
                  '49': 'Tarjeta crédito', '71': 'Nequi / Daviplata', '20': 'Cheque',
                }[invoice.paymentMethodCode] || invoice.paymentMethodCode || '—'}</span>
              </div>
              {invoice.dueDate && (
                <div>
                  <span className="text-gray-500">Vence: </span>
                  <span className="font-medium">{date(invoice.dueDate)}</span>
                </div>
              )}
            </div>

            {/* ── Items table ── */}
            <table className="w-full mb-6" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                  <th style={thStyle}>Descripción</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: 60 }}>Cant.</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: 100 }}>Precio unit.</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: 80 }}>Desc.</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: 60 }}>IVA</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: 100 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item: any, i: number) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={tdStyle}>
                      <p className="font-medium text-gray-900">{item.description}</p>
                      {item.code && <p className="text-xs text-gray-400">{item.code}</p>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(item.quantity)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(item.unitPrice)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#dc2626' }}>
                      {Number(item.discountRate) > 0 ? `-${Number(item.discountRate).toFixed(0)}%` : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(item.ivaRate)}%</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Totals ── */}
            <div className="flex justify-end mb-6">
              <div style={{ minWidth: 260 }}>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-10">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{fmt(invoice.subtotal)}</span>
                  </div>
                  {Number(invoice.discountAmount) > 0 && (
                    <div className="flex justify-between gap-10 text-red-600">
                      <span>Descuentos</span>
                      <span>-{fmt(invoice.discountAmount)}</span>
                    </div>
                  )}
                  {Number(invoice.ivaAmount) > 0 && (
                    <div className="flex justify-between gap-10">
                      <span className="text-gray-500">IVA</span>
                      <span>{fmt(invoice.ivaAmount)}</span>
                    </div>
                  )}
                  {Number(invoice.retefuenteAmount) > 0 && (
                    <div className="flex justify-between gap-10 text-gray-500">
                      <span>ReteFuente</span>
                      <span>-{fmt(invoice.retefuenteAmount)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between gap-10 mt-3 pt-3 border-t-2 border-gray-900">
                  <span className="font-bold text-base">TOTAL</span>
                  <span className="font-bold text-xl text-primary">{fmt(invoice.total)}</span>
                </div>
              </div>
            </div>

            {/* ── Notes ── */}
            {invoice.notes && (
              <div className="border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Observaciones</p>
                <p className="text-sm text-gray-700">{invoice.notes}</p>
              </div>
            )}

            {/* ── DIAN status ── */}
            {invoice.status === 'approved' && invoice.cufe && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Validada por la DIAN
                </p>
                <p className="text-xs font-mono text-green-600 break-all">{invoice.cufe}</p>
              </div>
            )}
            {invoice.status === 'rejected' && invoice.dianRejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-red-700 mb-1">Rechazada por la DIAN</p>
                <p className="text-xs text-red-600">{invoice.dianRejectionReason}</p>
              </div>
            )}

            {/* ── Footer ── */}
            <div className="mt-8 pt-4 border-t border-dashed border-gray-300 text-center text-xs text-gray-400">
              <p>Documento generado el {date(invoice.createdAt)} · {fiscalConfig?.businessName || 'Glamorapp'}</p>
              {fiscalConfig?.resolutionNumber && (
                <p className="mt-0.5">Autorización DIAN: Resolución N° {fiscalConfig.resolutionNumber}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};
const tdStyle: React.CSSProperties = {
  padding: '10px 10px',
  fontSize: 12,
  verticalAlign: 'top',
};
const printStyles = `
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th { padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; background: #f9fafb; }
  td { padding: 10px 10px; font-size: 12px; border-bottom: 1px solid #f3f4f6; }
  .text-right { text-align: right !important; }
`;

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TenantInvoicesPage() {
  const { token } = useAuthStore();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [fiscalConfig, setFiscalConfig] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Load fiscal config once for invoice header
  useEffect(() => {
    if (!token) return;
    api.get('/accounting/fiscal-config', { token })
      .then(d => setFiscalConfig(d))
      .catch(() => {});
  }, [token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (statusFilter) params.set('status', statusFilter);
      const data = await api.get(`/accounting/invoices?${params}`, { token: token! });
      setInvoices(data.data || []);
      setTotal(data.total || 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token, page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Facturas electrónicas</h1>
          <p className="text-sm text-muted-foreground mt-1">Todas las sucursales · {total} facturas en total</p>
        </div>
        <Link
          href="/tenant/accounting/invoices/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva factura
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['', 'draft', 'pending_dian', 'approved', 'rejected', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              statusFilter === s ? 'bg-primary text-white border-primary' : 'border-border hover:bg-muted'
            }`}
          >
            {s === '' ? 'Todas' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Número</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Ver</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{TYPE_LABELS[inv.invoiceType] || inv.invoiceType}</td>
                    <td className="px-4 py-3 truncate max-w-[160px]">{inv.receiverName}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(Number(inv.total))}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status] || 'bg-gray-100'}`}>
                        {STATUS_ICONS[inv.status]}
                        {STATUS_LABELS[inv.status] || inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(inv.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        title="Ver factura"
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No hay facturas para mostrar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {total > 25 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
            <span>Página {page} · {total} en total</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Anterior</button>
              <button disabled={page * 25 >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* PDF Modal */}
      {selectedInvoice && (
        <InvoicePDFModal
          invoice={selectedInvoice}
          fiscalConfig={fiscalConfig}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
