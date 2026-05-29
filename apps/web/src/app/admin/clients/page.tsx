'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  Loader2, Search, Building2, Users, Store, Crown, CreditCard,
  Clock, AlertCircle, CheckCircle2, ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

interface TenantData {
  id: string; name: string; slug: string; plan: string;
  isActive: boolean; createdAt: string;
  subscription: {
    id: string; planName: string; planSlug: string;
    status: string; billingCycle: string;
    monthlyPrice: number;
    trialEndsAt: string | null; trialDaysLeft: number | null;
    currentPeriodEnd: string | null;
  } | null;
  stats: { users: number; stores: number };
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
  expired: 'bg-amber-100 text-amber-700',
};

const statusLabels: Record<string, string> = {
  active: 'Activo',
  trial: 'Prueba',
  cancelled: 'Cancelado',
  expired: 'Expirado',
};

const billingLabels: Record<string, string> = {
  monthly: 'Mensual',
  yearly: 'Anual',
};

export default function AdminClientsPage() {
  const { token } = useAuthStore();
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await api.get(`/admin/plans/tenants?${params}`, { token: token! });
      setTenants(res || []);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => { if (token) fetchTenants(); }, [fetchTenants, token]);

  const activeCount = tenants.filter(t => t.subscription?.status === 'active').length;
  const trialCount = tenants.filter(t => t.subscription?.status === 'trial').length;

  if (loading && tenants.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-glamor-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes SaaS</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Todos los tenants registrados en la plataforma
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-border-primary p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Building2 className="w-4 h-4" /> Total clientes
          </div>
          <p className="text-2xl font-bold text-foreground">{tenants.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-border-primary p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" /> Activos
          </div>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-border-primary p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Clock className="w-4 h-4 text-blue-500" /> En prueba
          </div>
          <p className="text-2xl font-bold text-blue-600">{trialCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-border-primary p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Users className="w-4 h-4" /> Total usuarios
          </div>
          <p className="text-2xl font-bold text-foreground">
            {tenants.reduce((sum, t) => sum + t.stats.users, 0)}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full h-10 pl-10 pr-4 rounded-lg border text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-border-primary overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-hover border-b border-border-primary">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Cliente</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Plan</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Facturación</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Precio</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Trial</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Usuarios</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Acción</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map(t => (
              <tr key={t.id} className="border-b border-border-light hover:bg-surface-hover/50 transition">
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.slug}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {t.subscription ? (
                    <div className="flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-sm font-medium">{t.subscription.planName}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin plan</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {t.subscription ? (
                    <StatusBadge
                      status={t.subscription.status}
                      colors={statusColors}
                      labels={statusLabels}
                    />
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {t.subscription
                    ? billingLabels[t.subscription.billingCycle] || t.subscription.billingCycle
                    : '-'}
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  {t.subscription ? formatCurrency(t.subscription.monthlyPrice) : '-'}
                </td>
                <td className="px-4 py-3">
                  {t.subscription?.trialDaysLeft != null ? (
                    <span className={`text-sm font-medium ${
                      t.subscription.trialDaysLeft <= 3 ? 'text-red-600' :
                      t.subscription.trialDaysLeft <= 7 ? 'text-amber-600' : 'text-blue-600'
                    }`}>
                      {t.subscription.trialDaysLeft} días
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3 text-muted-foreground" /> {t.stats.users}</span>
                    <span className="flex items-center gap-1"><Store className="w-3 h-3 text-muted-foreground" /> {t.stats.stores}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/clients/${t.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-glamor-primary hover:underline"
                  >
                    Ver detalle <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                No hay clientes registrados.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
