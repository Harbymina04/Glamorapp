'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Calculator, ArrowUpRight, ArrowDownRight, TrendingUp,
  RefreshCw, CheckCircle2, Clock, FileText, CreditCard,
  Building2, Shield, Settings, ChevronRight, Loader2, Store,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  monthIncome: number;
  monthExpenses: number;
  monthProfit: number;
  pendingInvoices: number;
  approvedInvoices: number;
  recentTransactions: any[];
}

interface FiscalConfig {
  id: string;
  businessName: string;
  idNumber: string;
  taxRegime: string;
  feEnvironment: string;
  feProvider: string;
  resolutionNumber?: string;
  resolutionPrefix?: string;
  currentInvoiceNumber: number;
}

export default function TenantAccountingPage() {
  const { token } = useAuthStore();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [fiscalConfig, setFiscalConfig] = useState<FiscalConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, fiscal] = await Promise.all([
        api.get('/accounting/dashboard', { token: token! }),
        api.get('/accounting/fiscal-config', { token: token! }),
      ]);
      setDashboard(dash);
      setFiscalConfig(fiscal);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const TAX_REGIME_LABELS: Record<string, string> = {
    responsable_iva: 'Responsable de IVA',
    no_responsable: 'No responsable de IVA',
    gran_contribuyente: 'Gran contribuyente',
    regimen_simple: 'Régimen simple',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contabilidad</h1>
          <p className="text-sm text-muted-foreground mt-1">Visión consolidada · Facturación electrónica DIAN</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Fiscal Config Status */}
          {fiscalConfig ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="font-medium text-green-800">{fiscalConfig.businessName}</p>
                  <p className="text-sm text-green-600">
                    NIT: {fiscalConfig.idNumber} · {TAX_REGIME_LABELS[fiscalConfig.taxRegime] ?? fiscalConfig.taxRegime} ·
                    Ambiente: {fiscalConfig.feEnvironment === 'production' ? 'Producción ✓' : 'Pruebas'}
                  </p>
                </div>
              </div>
              <Link
                href="/tenant/accounting/config"
                className="flex items-center gap-1 text-sm text-green-700 hover:text-green-900 font-medium"
              >
                <Settings className="w-4 h-4" />
                Editar
              </Link>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800">Configuración fiscal pendiente</p>
                  <p className="text-sm text-amber-600">Completa los datos del NIT para habilitar la facturación electrónica DIAN</p>
                </div>
              </div>
              <Link
                href="/tenant/accounting/config"
                className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition"
              >
                Configurar ahora
              </Link>
            </div>
          )}

          {/* KPIs */}
          {dashboard && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Ingresos del mes</span>
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(dashboard.monthIncome)}</p>
                <p className="text-xs text-muted-foreground mt-1">Todas las sucursales</p>
              </div>

              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Gastos del mes</span>
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(dashboard.monthExpenses)}</p>
                <p className="text-xs text-muted-foreground mt-1">Todas las sucursales</p>
              </div>

              <div className={`rounded-xl border p-5 shadow-sm ${dashboard.monthProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Utilidad neta</span>
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <p className={`text-2xl font-bold ${dashboard.monthProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(dashboard.monthProfit)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Consolidado empresa</p>
              </div>
            </div>
          )}

          {/* Quick access cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/tenant/accounting/invoices" className="bg-white rounded-xl border p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition" />
              </div>
              <h3 className="font-semibold mb-1">Facturas electrónicas</h3>
              <p className="text-sm text-muted-foreground">Historial de facturas DIAN de todas las sucursales</p>
              {dashboard && (
                <div className="mt-3 flex gap-3">
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                    {dashboard.pendingInvoices} pendientes
                  </span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    {dashboard.approvedInvoices} aprobadas
                  </span>
                </div>
              )}
            </Link>

            <Link href="/tenant/accounting/taxes" className="bg-white rounded-xl border p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-orange-600" />
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition" />
              </div>
              <h3 className="font-semibold mb-1">Resumen de impuestos</h3>
              <p className="text-sm text-muted-foreground">IVA, ReteFuente, ReteICA, ICA por período</p>
              <p className="text-xs text-muted-foreground mt-3">Declaraciones DIAN consolidadas</p>
            </Link>

            <Link href="/tenant/accounting/config" className="bg-white rounded-xl border p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition" />
              </div>
              <h3 className="font-semibold mb-1">Configuración fiscal</h3>
              <p className="text-sm text-muted-foreground">NIT, resolución DIAN, proveedor FE</p>
              {fiscalConfig?.resolutionPrefix && (
                <p className="text-xs text-muted-foreground mt-3">
                  Prefijo: <strong>{fiscalConfig.resolutionPrefix}</strong> · Consecutivo actual: <strong>{fiscalConfig.currentInvoiceNumber}</strong>
                </p>
              )}
            </Link>
          </div>

          {/* Recent transactions */}
          {dashboard?.recentTransactions?.length > 0 && (
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Transacciones recientes — todas las sucursales</h3>
                <Link href="/dashboard/accounting" className="text-sm text-primary hover:underline flex items-center gap-1">
                  Ver todas <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y">
                {dashboard.recentTransactions.slice(0, 8).map((tx: any) => (
                  <div key={tx.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.transactionDate)} · {tx.category}</p>
                    </div>
                    <span className={`text-sm font-semibold ${tx.transactionType === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.transactionType === 'income' ? '+' : '-'}{formatCurrency(tx.netAmount)}
                    </span>
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
