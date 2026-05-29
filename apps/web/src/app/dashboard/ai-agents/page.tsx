'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { useRouter } from 'next/navigation';
import {
  Bot, Sparkles, AlertTriangle, DollarSign,
  TrendingUp, Package, Users, Calendar,
  Megaphone, Wallet, Truck, BookOpen,
  RefreshCw, Filter,
} from 'lucide-react';

// ─── Agent icons & colors ────────────────────────────────────────

const AGENT_ICONS: Record<string, any> = {
  sales: TrendingUp, inventory: Package, customers: Users, appointments: Calendar,
  marketing: Megaphone, financial: DollarSign, suppliers: Truck, catalog: BookOpen,
};

const AGENT_COLORS: Record<string, string> = {
  sales: 'from-pink-500 to-rose-500', inventory: 'from-purple-500 to-indigo-500',
  customers: 'from-blue-500 to-cyan-500', appointments: 'from-orange-500 to-yellow-500',
  marketing: 'from-green-500 to-emerald-500', financial: 'from-red-500 to-pink-500',
  suppliers: 'from-indigo-500 to-blue-500', catalog: 'from-teal-500 to-green-500',
};

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'paused', label: 'Pausados' },
  { value: 'pending_config', label: 'Pendientes' },
  { value: 'error', label: 'Error' },
];

// ─── Page ────────────────────────────────────────────────────────

export default function AIAgentsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [agents, setAgents] = useState<any[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadAgents = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/ai-agents', { token });
      setAgents(res.data || []);
    } catch (err) {
      console.error('Failed to load agents', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  // Apply status filter
  useEffect(() => {
    if (!statusFilter) {
      setFilteredAgents(agents);
    } else {
      setFilteredAgents(agents.filter(a => a.status === statusFilter));
    }
  }, [agents, statusFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAgents();
  };

  // ─── Stats ──────────────────────────────────────────────────

  const activeCount = agents.filter(a => a.status === 'active').length;
  const totalActions = agents.reduce((s, a) => s + (a.totalActions || 0), 0);
  const totalAlerts = agents.reduce((s, a) => s + (a.alertsGenerated || 0), 0);
  const totalImpact = agents.reduce((s, a) => s + Number(a.estimatedImpact || 0), 0);

  // ─── Loading ────────────────────────────────────────────────

  if (loading) return <LoadingSkeleton rows={3} cols={4} />;

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Centro de Agentes IA</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Agentes inteligentes que optimizan tu negocio automáticamente
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border-primary text-sm bg-white
                focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 h-9 px-3 border border-border-primary rounded-lg text-sm
              hover:bg-surface-hover transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Agentes activos"
          value={`${activeCount}/${agents.length}`}
          icon={<Bot className="w-5 h-5 text-purple-500" />}
        />
        <StatCard
          title="Acciones totales"
          value={String(totalActions)}
          icon={<Sparkles className="w-5 h-5 text-glamor-primary" />}
        />
        <StatCard
          title="Alertas generadas"
          value={String(totalAlerts)}
          icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
        />
        <StatCard
          title="Impacto estimado"
          value={formatCurrency(totalImpact)}
          icon={<DollarSign className="w-5 h-5 text-green-500" />}
        />
      </div>

      {/* Agents Grid */}
      {filteredAgents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-border-primary">
          <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {statusFilter ? 'No hay agentes con ese estado' : 'No hay agentes configurados'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {statusFilter ? 'Prueba con otro filtro' : 'Los agentes IA aparecerán aquí cuando estén configurados'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAgents.map((agent: any) => {
            const Icon = AGENT_ICONS[agent.slug] || Bot;
            const gradientColor = AGENT_COLORS[agent.slug] || 'from-glamor-primary to-purple-500';

            return (
              <div
                key={agent.id}
                onClick={() => router.push(`/dashboard/ai-agents/${agent.id}`)}
                className="group bg-white rounded-xl border border-border-primary p-5
                  hover:shadow-lg hover:border-glamor-primary/30 transition-all duration-200 cursor-pointer"
              >
                {/* Top row: icon + status */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradientColor}
                    flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <StatusBadge
                    status={agent.status}
                    colors={{
                      active: 'bg-green-50 text-green-700 border-green-200',
                      paused: 'bg-gray-50 text-gray-600 border-gray-200',
                      pending_config: 'bg-orange-50 text-orange-700 border-orange-200',
                      error: 'bg-red-50 text-red-700 border-red-200',
                    }}
                  />
                </div>

                {/* Name + description */}
                <h3 className="font-semibold text-foreground mb-1 group-hover:text-glamor-primary transition-colors">
                  {agent.name}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                  {agent.description || 'Sin descripción'}
                </p>

                {/* Bottom stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border-light">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {agent.totalActions || 0} acciones
                  </span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(agent.estimatedImpact || 0)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
