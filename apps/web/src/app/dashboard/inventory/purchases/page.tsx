'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Plus, Search, ShoppingCart, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const PURCHASE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange-50 text-orange-700 border-orange-200',
  received: 'bg-green-50 text-green-700 border-green-200',
  partial: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange-50 text-orange-700 border-orange-200',
  paid: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-gray-50 text-gray-600 border-gray-200',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  received: 'Recibida',
  partial: 'Parcial',
  cancelled: 'Cancelada',
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagada',
  cancelled: 'Cancelada',
};

export default function PurchasesPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchPurchases = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/purchases?${params}`, { token });
      setPurchases(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const totals = {
    pending: purchases.filter(p => p.status === 'pending').length,
    received: purchases.filter(p => p.status === 'received').length,
    totalSpent: purchases
      .filter(p => p.status === 'received')
      .reduce((s, p) => s + Number(p.total || 0), 0),
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'received': return <CheckCircle className="w-4 h-4" />;
      case 'partial': return <AlertCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Órdenes de Compra</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona compras a proveedores</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/inventory/purchases/new')}
          className="flex items-center gap-2 h-10 px-4 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition"
        >
          <Plus className="w-4 h-4" /> Nueva compra
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-border-primary p-4 shadow-card">
          <p className="text-xs text-muted-foreground mb-1">Total órdenes</p>
          <p className="text-2xl font-bold text-foreground">{purchases.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-border-primary p-4 shadow-card">
          <p className="text-xs text-muted-foreground mb-1">Pendientes recibir</p>
          <p className="text-2xl font-bold text-orange-600">{totals.pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-border-primary p-4 shadow-card">
          <p className="text-xs text-muted-foreground mb-1">Total gastado</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.totalSpent)}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Buscar por número OC..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border-primary text-sm bg-white text-muted-foreground focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="received">Recibidas</option>
          <option value="partial">Parciales</option>
          <option value="cancelled">Canceladas</option>
        </select>
        <span className="text-xs text-muted-foreground">{purchases.length} resultados</span>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} cols={6} />
      ) : purchases.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-border-primary">
          <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground text-sm">No hay órdenes de compra</p>
          <button onClick={() => router.push('/dashboard/inventory/purchases/new')} className="mt-3 text-sm text-glamor-primary font-medium hover:underline">
            Crear primera compra
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border-primary overflow-hidden shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary bg-surface-primary/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">OC</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Proveedor</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pago</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {purchases.map((p: any) => (
                <tr
                  key={p.id}
                  className="hover:bg-surface-hover/50 transition cursor-pointer"
                  onClick={() => router.push(`/dashboard/inventory/purchases/${p.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(p.status)}
                      <span className="font-medium text-foreground text-sm">{p.purchaseNumber}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {p.supplier?.businessName || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                    {formatCurrency(p.total)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={p.status} colors={PURCHASE_STATUS_COLORS} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={p.paymentStatus} colors={PAYMENT_STATUS_COLORS} />
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString('es-MX')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
