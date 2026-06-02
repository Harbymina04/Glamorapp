'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Calculator, FileText, ArrowUpRight, ArrowDownRight,
  TrendingUp, DollarSign, Receipt, CreditCard, BarChart3,
  RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle,
  Building2, Settings, Shield, ChevronDown, Download,
  Filter, Search, Plus, Loader2, Eye, Printer,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────
interface DashboardData {
  monthIncome: number;
  monthExpenses: number;
  monthProfit: number;
  pendingInvoices: number;
  approvedInvoices: number;
  recentTransactions: Transaction[];
  taxSummary: any[];
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: string;
  status: string;
  receiverName: string;
  total: number;
  createdAt: string;
}

interface Transaction {
  id: string;
  transactionType: string;
  category: string;
  description: string;
  netAmount: number;
  transactionDate: string;
  status: string;
}

// ─── Helpers ────────────────────────────────────────────────────────
const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_dian: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-50 text-red-500',
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pending_dian: 'Enviada DIAN',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

const TX_TYPE_COLORS: Record<string, string> = {
  income: 'bg-green-100 text-green-700',
  expense: 'bg-red-100 text-red-700',
  transfer: 'bg-blue-100 text-blue-700',
  tax_payment: 'bg-orange-100 text-orange-700',
  adjustment: 'bg-purple-100 text-purple-700',
};

const TX_TYPE_LABELS: Record<string, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
  tax_payment: 'Pago impuesto',
  adjustment: 'Ajuste',
};

type Tab = 'resumen' | 'facturas' | 'transacciones' | 'impuestos' | 'configuracion';

// ─── Page ──────────────────────────────────────────────────────────
export default function AccountingPage() {
  const { user, token } = useAuthStore();
  const isTenantAdmin = user?.role === 'tenant_admin' || user?.role === 'superadmin';
  const [activeTab, setActiveTab] = useState<Tab>('resumen');
  const [loading, setLoading] = useState(false);

  // Dashboard
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  // Invoices
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [invoiceFilter, setInvoiceFilter] = useState('');

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [txFilter, setTxFilter] = useState('');

  // Tax Summary
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [taxMonth, setTaxMonth] = useState(new Date().getMonth() + 1);
  const [taxSummary, setTaxSummary] = useState<any>(null);

  // Fiscal Config
  const [fiscalConfig, setFiscalConfig] = useState<any>(null);
  const [fiscalForm, setFiscalForm] = useState<any>({});
  const [savingFiscal, setSavingFiscal] = useState(false);
  const [fiscalSaved, setFiscalSaved] = useState(false);

  // Invoice PDF viewer
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/accounting/dashboard', { token: token! });
      setDashboard(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const loadInvoices = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(invoicePage), limit: '20' });
      if (invoiceFilter) params.set('status', invoiceFilter);
      const data = await api.get(`/accounting/invoices?${params}`, { token: token! });
      setInvoices(data.data || []);
      setInvoiceTotal(data.total || 0);
    } catch { /* ignore */ }
  }, [invoicePage, invoiceFilter]);

  const loadTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(txPage), limit: '20' });
      if (txFilter) params.set('type', txFilter);
      const data = await api.get(`/accounting/transactions?${params}`, { token: token! });
      setTransactions(data.data || []);
      setTxTotal(data.total || 0);
    } catch { /* ignore */ }
  }, [txPage, txFilter]);

  const loadTaxSummary = useCallback(async () => {
    try {
      const data = await api.get(`/accounting/tax-summary?year=${taxYear}&month=${taxMonth}`, { token: token! });
      setTaxSummary(data);
    } catch { /* ignore */ }
  }, [taxYear, taxMonth]);

  const loadFiscalConfig = useCallback(async () => {
    try {
      const data = await api.get('/accounting/fiscal-config', { token: token! });
      setFiscalConfig(data);
      if (data) setFiscalForm(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (activeTab === 'resumen') loadDashboard();
    if (activeTab === 'facturas') loadInvoices();
    if (activeTab === 'transacciones') loadTransactions();
    if (activeTab === 'impuestos') loadTaxSummary();
    if (activeTab === 'configuracion') loadFiscalConfig();
  }, [activeTab, loadDashboard, loadInvoices, loadTransactions, loadTaxSummary, loadFiscalConfig]);

  const handleSaveFiscalConfig = async () => {
    setSavingFiscal(true);
    // Remove read-only fields before sending
    const { id, createdAt, updatedAt, tenantId, storeId, isActive, currentInvoiceNumber, cnCurrentNumber, dnCurrentNumber, tenant, store, invoices, ...payload } = fiscalForm;
    try {
      await api.put('/accounting/fiscal-config', payload, { token: token! });
      setFiscalSaved(true);
      setTimeout(() => setFiscalSaved(false), 3000);
    } catch { /* ignore */ }
    finally { setSavingFiscal(false); }
  };

  // Tabs available depend on role:
  // store_admin: resumen, facturas, transacciones
  // tenant_admin: all tabs
  const tabs: { key: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { key: 'resumen', label: 'Resumen', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'facturas', label: 'Facturas', icon: <FileText className="w-4 h-4" /> },
    { key: 'transacciones', label: 'Transacciones', icon: <CreditCard className="w-4 h-4" /> },
    { key: 'impuestos', label: 'Impuestos', icon: <Receipt className="w-4 h-4" />, adminOnly: true },
    { key: 'configuracion', label: 'Configuración fiscal', icon: <Settings className="w-4 h-4" />, adminOnly: true },
  ].filter(t => !t.adminOnly || isTenantAdmin) as { key: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contabilidad</h1>
          <p className="text-sm text-muted-foreground mt-1">Facturación electrónica DIAN · Impuestos · Reportes</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (activeTab === 'resumen') loadDashboard();
              if (activeTab === 'facturas') loadInvoices();
              if (activeTab === 'transacciones') loadTransactions();
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── RESUMEN TAB ── */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : dashboard ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">Ingresos del mes</span>
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <ArrowUpRight className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(dashboard.monthIncome)}</p>
                </div>
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">Gastos del mes</span>
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                      <ArrowDownRight className="w-4 h-4 text-red-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(dashboard.monthExpenses)}</p>
                </div>
                <div className={`rounded-xl border p-5 shadow-sm ${dashboard.monthProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">Utilidad neta</span>
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <p className={`text-2xl font-bold ${dashboard.monthProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(dashboard.monthProfit)}
                  </p>
                </div>
              </div>

              {/* Invoice Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h3 className="font-semibold mb-4">Estado de facturas</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm">Pendientes DIAN</span>
                      </div>
                      <span className="font-medium">{dashboard.pendingInvoices}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Aprobadas</span>
                      </div>
                      <span className="font-medium">{dashboard.approvedInvoices}</span>
                    </div>
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h3 className="font-semibold mb-4">Transacciones recientes</h3>
                  <div className="space-y-2">
                    {dashboard.recentTransactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between py-1">
                        <div>
                          <p className="text-sm font-medium truncate max-w-[180px]">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(tx.transactionDate)}</p>
                        </div>
                        <span className={`text-sm font-semibold ${tx.transactionType === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.transactionType === 'income' ? '+' : '-'}{formatCurrency(tx.netAmount)}
                        </span>
                      </div>
                    ))}
                    {dashboard.recentTransactions.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Sin transacciones aún</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border p-12 text-center">
              <Calculator className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No se pudo cargar el resumen contable</p>
              <button onClick={loadDashboard} className="mt-4 px-4 py-2 text-sm bg-primary text-white rounded-lg">
                Reintentar
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── FACTURAS TAB ── */}
      {activeTab === 'facturas' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            {['', 'draft', 'pending_dian', 'approved', 'rejected', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => { setInvoiceFilter(status); setInvoicePage(1); }}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  invoiceFilter === status ? 'bg-primary text-white border-primary' : 'border-border hover:bg-muted'
                }`}
              >
                {status === '' ? 'Todas' : INVOICE_STATUS_LABELS[status] || status}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Número</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 capitalize">{inv.invoiceType.replace('_', ' ')}</td>
                      <td className="px-4 py-3 truncate max-w-[180px]">{inv.receiverName}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(inv.total)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${INVOICE_STATUS_COLORS[inv.status] || 'bg-gray-100'}`}>
                          {INVOICE_STATUS_LABELS[inv.status] || inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.createdAt)}</td>
                      <td className="px-4 py-3">
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
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No hay facturas para mostrar
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {invoiceTotal > 20 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                <span>{invoiceTotal} facturas en total</span>
                <div className="flex gap-2">
                  <button disabled={invoicePage === 1} onClick={() => setInvoicePage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Anterior</button>
                  <button disabled={invoicePage * 20 >= invoiceTotal} onClick={() => setInvoicePage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Siguiente</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TRANSACCIONES TAB ── */}
      {activeTab === 'transacciones' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            {['', 'income', 'expense', 'transfer', 'tax_payment', 'adjustment'].map((type) => (
              <button
                key={type}
                onClick={() => { setTxFilter(type); setTxPage(1); }}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  txFilter === type ? 'bg-primary text-white border-primary' : 'border-border hover:bg-muted'
                }`}
              >
                {type === '' ? 'Todas' : TX_TYPE_LABELS[type] || type}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoría</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descripción</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Monto</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(tx.transactionDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${TX_TYPE_COLORS[tx.transactionType] || 'bg-gray-100'}`}>
                          {TX_TYPE_LABELS[tx.transactionType] || tx.transactionType}
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize">{tx.category.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 truncate max-w-[200px]">{tx.description}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${tx.transactionType === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.transactionType === 'income' ? '+' : '-'}{formatCurrency(tx.netAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${tx.status === 'confirmed' ? 'bg-green-100 text-green-700' : tx.status === 'voided' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {tx.status === 'confirmed' ? 'Confirmada' : tx.status === 'voided' ? 'Anulada' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No hay transacciones registradas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {txTotal > 20 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                <span>{txTotal} transacciones en total</span>
                <div className="flex gap-2">
                  <button disabled={txPage === 1} onClick={() => setTxPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Anterior</button>
                  <button disabled={txPage * 20 >= txTotal} onClick={() => setTxPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Siguiente</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── IMPUESTOS TAB ── */}
      {activeTab === 'impuestos' && (
        <div className="space-y-6">
          {/* Period selector */}
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Período de consulta</h3>
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Año</label>
                <select
                  value={taxYear}
                  onChange={(e) => setTaxYear(parseInt(e.target.value))}
                  className="border rounded-lg px-3 py-2 text-sm"
                >
                  {[2024, 2025, 2026].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Mes</label>
                <select
                  value={taxMonth}
                  onChange={(e) => setTaxMonth(parseInt(e.target.value))}
                  className="border rounded-lg px-3 py-2 text-sm"
                >
                  {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadTaxSummary}
                  className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90"
                >
                  Consultar
                </button>
              </div>
            </div>
          </div>

          {taxSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: 'iva', label: 'IVA (19%)', color: 'blue', desc: 'Impuesto al valor agregado' },
                { key: 'retefuente', label: 'ReteFuente', color: 'orange', desc: 'Retención en la fuente' },
                { key: 'reteIva', label: 'ReteIVA', color: 'purple', desc: 'Retención de IVA' },
                { key: 'reteIca', label: 'ReteICA', color: 'pink', desc: 'Retención de ICA' },
                { key: 'ica', label: 'ICA', color: 'green', desc: 'Industria y comercio' },
              ].map((tax) => (
                <div key={tax.key} className="bg-white rounded-xl border p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{tax.label}</h4>
                      <p className="text-xs text-muted-foreground">{tax.desc}</p>
                    </div>
                    <Receipt className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold mt-3">
                    {formatCurrency(taxSummary.taxes?.[tax.key] || 0)}
                  </p>
                </div>
              ))}
              <div className="bg-primary/5 border-primary/20 border rounded-xl p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">Total facturado</h4>
                    <p className="text-xs text-muted-foreground">Bruto del período</p>
                  </div>
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold mt-3 text-primary">
                  {formatCurrency(taxSummary.grossAmount || 0)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CONFIGURACIÓN TAB ── */}
      {activeTab === 'configuracion' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-5 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Configuración fiscal</h3>
                  <p className="text-sm text-muted-foreground">Datos para facturación electrónica DIAN</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Datos empresa */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Datos de la empresa</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Razón social *</label>
                    <input
                      type="text"
                      value={fiscalForm.businessName || ''}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, businessName: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Ej: GLAMOR SAS"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Nombre comercial</label>
                    <input
                      type="text"
                      value={fiscalForm.tradeName || ''}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, tradeName: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Ej: Glamorapp"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Tipo de identificación</label>
                    <select
                      value={fiscalForm.idType || 'nit'}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, idType: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="nit">NIT</option>
                      <option value="cc">Cédula de ciudadanía</option>
                      <option value="ce">Cédula de extranjería</option>
                      <option value="pasaporte">Pasaporte</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Número de identificación *</label>
                    <input
                      type="text"
                      value={fiscalForm.idNumber || ''}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, idNumber: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Ej: 900123456"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">DV (dígito verificación)</label>
                    <input
                      type="text"
                      maxLength={1}
                      value={fiscalForm.dv || ''}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, dv: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="0-9"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Régimen tributario</label>
                    <select
                      value={fiscalForm.taxRegime || 'responsable_iva'}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, taxRegime: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="responsable_iva">Responsable de IVA</option>
                      <option value="no_responsable">No responsable de IVA</option>
                      <option value="gran_contribuyente">Gran contribuyente</option>
                      <option value="regimen_simple">Régimen simple</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dirección y contacto */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dirección fiscal</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium mb-1 block">Dirección *</label>
                    <input
                      type="text"
                      value={fiscalForm.fiscalAddress || ''}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, fiscalAddress: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Correo fiscal *</label>
                    <input
                      type="email"
                      value={fiscalForm.fiscalEmail || ''}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, fiscalEmail: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Teléfono fiscal</label>
                    <input
                      type="text"
                      value={fiscalForm.fiscalPhone || ''}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, fiscalPhone: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Resolución DIAN */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Resolución DIAN</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Número resolución</label>
                    <input
                      type="text"
                      value={fiscalForm.resolutionNumber || ''}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, resolutionNumber: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Prefijo factura</label>
                    <input
                      type="text"
                      value={fiscalForm.resolutionPrefix || ''}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, resolutionPrefix: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="FV"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Ambiente</label>
                    <select
                      value={fiscalForm.feEnvironment || 'sandbox'}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, feEnvironment: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="sandbox">Pruebas (sandbox)</option>
                      <option value="production">Producción</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Desde consecutivo</label>
                    <input
                      type="number"
                      value={fiscalForm.resolutionFrom || ''}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, resolutionFrom: parseInt(e.target.value) })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Hasta consecutivo</label>
                    <input
                      type="number"
                      value={fiscalForm.resolutionTo || ''}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, resolutionTo: parseInt(e.target.value) })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Proveedor FE</label>
                    <select
                      value={fiscalForm.feProvider || 'none'}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, feProvider: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="none">Sin proveedor</option>
                      <option value="siigo">Siigo</option>
                      <option value="alegra">Alegra</option>
                      <option value="facturama">Facturama</option>
                      <option value="custom">API personalizada</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Save button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                {fiscalSaved && (
                  <span className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Configuración guardada
                  </span>
                )}
                <button
                  onClick={handleSaveFiscalConfig}
                  disabled={savingFiscal}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-60"
                >
                  {savingFiscal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Guardar configuración
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice PDF Modal */}
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

// ─── Invoice PDF Modal ────────────────────────────────────────────────────────

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  '10': 'Efectivo', '42': 'Transferencia', '48': 'Tarjeta débito',
  '49': 'Tarjeta crédito', '71': 'Nequi / Daviplata', '20': 'Cheque',
};

const TYPE_LABELS: Record<string, string> = {
  invoice: 'Factura venta', pos_invoice: 'Factura POS',
  credit_note: 'Nota crédito', debit_note: 'Nota débito',
  support_document: 'Doc. soporte',
};

function InvoicePDFModal({ invoice, fiscalConfig, onClose }: { invoice: any; fiscalConfig: any; onClose: () => void }) {
  const fmt = (n: any) => formatCurrency(Number(n) || 0);
  const date = (d: string) => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

  const handlePrint = () => {
    const content = document.getElementById('invoice-pdf-content')?.innerHTML || '';
    const win = window.open('', '_blank', 'width=900,height=1100');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Factura ${invoice.invoiceNumber}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:32px;max-width:794px;margin:auto}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:24px}.box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px}
    .label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:6px}
    table{width:100%;border-collapse:collapse;margin:8px 0}th{background:#f9fafb;padding:8px 10px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb}
    td{padding:10px;font-size:12px;border-bottom:1px solid #f3f4f6}.text-right{text-align:right}
    .totals-row{display:flex;justify-content:space-between;padding:4px 0;font-size:12px}
    .total-final{font-size:16px;font-weight:bold;border-top:2px solid #111;padding-top:8px;margin-top:4px}
    @media print{body{padding:10px}}</style>
    </head><body>${content}</body></html>`);
    win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-100 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[95vh] flex flex-col">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 bg-white rounded-t-2xl border-b">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="w-4 h-4 text-primary" />
            Factura {invoice.invoiceNumber}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${INVOICE_STATUS_COLORS[invoice.status] || 'bg-gray-100'}`}>
              {INVOICE_STATUS_LABELS[invoice.status] || invoice.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition">
              <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><XCircle className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div id="invoice-pdf-content" className="bg-white shadow-sm rounded-xl mx-auto" style={{ maxWidth: 794, padding: '40px 48px', minHeight: 900 }}>

            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{fiscalConfig?.businessName || 'Glamorapp'}</h1>
                {fiscalConfig?.tradeName && fiscalConfig.tradeName !== fiscalConfig.businessName && (
                  <p className="text-sm text-gray-500 mt-0.5">{fiscalConfig.tradeName}</p>
                )}
                <p className="text-sm text-gray-600 mt-1">{fiscalConfig?.idType?.toUpperCase() || 'NIT'}: {fiscalConfig?.idNumber || '—'}{fiscalConfig?.dv ? `-${fiscalConfig.dv}` : ''}</p>
                {fiscalConfig?.fiscalAddress && <p className="text-xs text-gray-500 mt-0.5">{fiscalConfig.fiscalAddress}, {fiscalConfig.cityCode}</p>}
                {fiscalConfig?.fiscalEmail && <p className="text-xs text-gray-500">{fiscalConfig.fiscalEmail}</p>}
              </div>
              <div className="text-right">
                <div className="inline-block border-2 border-primary/20 rounded-xl px-5 py-3 bg-primary/5">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{TYPE_LABELS[invoice.invoiceType] || invoice.invoiceType}</p>
                  <p className="text-2xl font-bold text-primary mt-0.5">{invoice.invoiceNumber}</p>
                  <p className="text-xs text-gray-500 mt-1">{date(invoice.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Resolution */}
            {fiscalConfig?.resolutionNumber && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 mb-6 text-xs text-gray-600">
                Resolución DIAN N° <strong>{fiscalConfig.resolutionNumber}</strong>
                {fiscalConfig.resolutionPrefix && <> · Prefijo <strong>{fiscalConfig.resolutionPrefix}</strong></>}
                {fiscalConfig.resolutionFrom && <> · Del {fiscalConfig.resolutionFrom} al {fiscalConfig.resolutionTo}</>}
              </div>
            )}

            {/* Parties */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Emisor</p>
                <p className="font-semibold text-gray-900">{fiscalConfig?.businessName || 'Glamorapp'}</p>
                <p className="text-sm text-gray-600">{fiscalConfig?.idType?.toUpperCase() || 'NIT'}: {fiscalConfig?.idNumber}{fiscalConfig?.dv ? `-${fiscalConfig.dv}` : ''}</p>
                {fiscalConfig?.fiscalPhone && <p className="text-xs text-gray-500 mt-1">Tel: {fiscalConfig.fiscalPhone}</p>}
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Receptor</p>
                <p className="font-semibold text-gray-900">{invoice.receiverName}</p>
                {invoice.receiverIdNumber && <p className="text-sm text-gray-600">{invoice.receiverIdType?.toUpperCase()}: {invoice.receiverIdNumber}</p>}
                {invoice.receiverEmail && <p className="text-sm text-gray-600">{invoice.receiverEmail}</p>}
                {invoice.receiverPhone && <p className="text-xs text-gray-500">Tel: {invoice.receiverPhone}</p>}
                {invoice.receiverAddress && <p className="text-xs text-gray-500">{invoice.receiverAddress}</p>}
              </div>
            </div>

            {/* Payment info */}
            <div className="flex gap-6 mb-6 text-sm">
              <span className="text-gray-500">Condición: <strong>{invoice.paymentMeansCode === '1' ? 'Contado' : 'Crédito'}</strong></span>
              <span className="text-gray-500">Método: <strong>{PAYMENT_METHOD_LABELS[invoice.paymentMethodCode] || invoice.paymentMethodCode || '—'}</strong></span>
              {invoice.dueDate && <span className="text-gray-500">Vence: <strong>{date(invoice.dueDate)}</strong></span>}
            </div>

            {/* Items */}
            <table className="w-full mb-6" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                  {['Descripción', 'Cant.', 'Precio unit.', 'Desc.', 'IVA', 'Total'].map((h, i) => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: i === 0 ? 'left' : 'right', fontSize: 11, fontWeight: 600, color: '#6b7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item: any, i: number) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '10px', fontSize: 12 }}>
                      <p className="font-medium text-gray-900">{item.description}</p>
                      {item.code && <p className="text-xs text-gray-400">{item.code}</p>}
                    </td>
                    <td style={{ padding: '10px', fontSize: 12, textAlign: 'right' }}>{Number(item.quantity)}</td>
                    <td style={{ padding: '10px', fontSize: 12, textAlign: 'right' }}>{fmt(item.unitPrice)}</td>
                    <td style={{ padding: '10px', fontSize: 12, textAlign: 'right', color: '#dc2626' }}>{Number(item.discountRate) > 0 ? `-${Number(item.discountRate).toFixed(0)}%` : '—'}</td>
                    <td style={{ padding: '10px', fontSize: 12, textAlign: 'right' }}>{Number(item.ivaRate)}%</td>
                    <td style={{ padding: '10px', fontSize: 12, textAlign: 'right', fontWeight: 600 }}>{fmt(item.total)}</td>
                  </tr>
                ))}
                {(!invoice.items || invoice.items.length === 0) && (
                  <tr><td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>Sin ítems registrados</td></tr>
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-6">
              <div style={{ minWidth: 260 }}>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-10"><span className="text-gray-500">Subtotal</span><span>{fmt(invoice.subtotal)}</span></div>
                  {Number(invoice.discountAmount) > 0 && <div className="flex justify-between gap-10 text-red-600"><span>Descuentos</span><span>-{fmt(invoice.discountAmount)}</span></div>}
                  {Number(invoice.ivaAmount) > 0 && <div className="flex justify-between gap-10"><span className="text-gray-500">IVA</span><span>{fmt(invoice.ivaAmount)}</span></div>}
                  {Number(invoice.retefuenteAmount) > 0 && <div className="flex justify-between gap-10 text-gray-500"><span>ReteFuente</span><span>-{fmt(invoice.retefuenteAmount)}</span></div>}
                </div>
                <div className="flex justify-between gap-10 mt-3 pt-3 border-t-2 border-gray-900">
                  <span className="font-bold text-base">TOTAL</span>
                  <span className="font-bold text-xl text-primary">{fmt(invoice.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="border border-gray-200 rounded-lg p-4 mb-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Observaciones</p>
                <p className="text-gray-700">{invoice.notes}</p>
              </div>
            )}

            {/* DIAN status */}
            {invoice.status === 'approved' && invoice.cufe && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Validada por la DIAN</p>
                <p className="text-xs font-mono text-green-600 break-all">{invoice.cufe}</p>
              </div>
            )}
            {invoice.status === 'rejected' && invoice.dianRejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-red-700 mb-1">Rechazada por la DIAN</p>
                <p className="text-xs text-red-600">{invoice.dianRejectionReason}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-dashed border-gray-300 text-center text-xs text-gray-400">
              <p>Generada el {date(invoice.createdAt)} · {fiscalConfig?.businessName || 'Glamorapp'}</p>
              {fiscalConfig?.resolutionNumber && <p className="mt-0.5">Autorización DIAN: Resolución N° {fiscalConfig.resolutionNumber}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
