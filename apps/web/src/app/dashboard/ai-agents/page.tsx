'use client';

import { PlanGate } from '@/hooks/use-plan-gate';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from '@/components/shared/stat-card';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { useRouter } from 'next/navigation';
import {
  Bot, Sparkles, AlertTriangle, DollarSign,
  TrendingUp, Package, Users, Calendar,
  Megaphone, Wallet, Truck, BookOpen,
  RefreshCw, Clock, Zap, ChevronRight,
  CheckCircle, PauseCircle, XCircle, Settings2,
} from 'lucide-react';

// ─── Agent metadata ───────────────────────────────────────────────

const AGENT_META: Record<string, {
  icon: any;
  gradient: string;
  bg: string;
  description: string;
}> = {
  sales:        { icon: TrendingUp,  gradient: 'from-pink-500 to-rose-500',     bg: 'bg-pink-50',    description: 'Analiza tendencias, ticket promedio y oportunidades de crecimiento en ventas.' },
  inventory:    { icon: Package,     gradient: 'from-purple-500 to-indigo-500', bg: 'bg-purple-50',  description: 'Detecta stock bajo, productos sin rotación y optimiza niveles de inventario.' },
  customers:    { icon: Users,       gradient: 'from-blue-500 to-cyan-500',     bg: 'bg-blue-50',    description: 'Identifica clientes en riesgo, segmenta y sugiere acciones de retención.' },
  appointments: { icon: Calendar,    gradient: 'from-orange-500 to-amber-500',  bg: 'bg-orange-50',  description: 'Optimiza agenda, detecta cancelaciones recurrentes y maximiza ocupación.' },
  marketing:    { icon: Megaphone,   gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-50',   description: 'Propone campañas, promociones y mensajes personalizados por segmento.' },
  financial:    { icon: Wallet,      gradient: 'from-red-500 to-pink-500',      bg: 'bg-red-50',     description: 'Monitorea márgenes, gastos y genera alertas de salud financiera.' },
  suppliers:    { icon: Truck,       gradient: 'from-indigo-500 to-blue-500',   bg: 'bg-indigo-50',  description: 'Optimiza órdenes de compra, detecta retrasos y negocia mejores condiciones.' },
  catalog:      { icon: BookOpen,    gradient: 'from-teal-500 to-green-500',    bg: 'bg-teal-50',    description: 'Revisa precios, categorías y sugiere ajustes al catálogo de productos.' },
};

// ─── Status config ────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; icon: any }> = {
  active:         { label: 'Activo',    color: 'text-green-700 bg-green-50 border-green-200',  dot: 'bg-green-500 animate-pulse', icon: CheckCircle },
  paused:         { label: 'Pausado',   color: 'text-gray-600 bg-gray-50 border-gray-200',     dot: 'bg-gray-400',                icon: PauseCircle },
  pending_config: { label: 'Sin conf.', color: 'text-orange-700 bg-orange-50 border-orange-200', dot: 'bg-orange-400',            icon: Settings2 },
  error:          { label: 'Error',     color: 'text-red-700 bg-red-50 border-red-200',         dot: 'bg-red-500',                icon: XCircle },
};

const FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'paused', label: 'Pausados' },
  { value: 'pending_config', label: 'Sin configurar' },
  { value: 'error', label: 'Error' },
];

// ─── Helpers ──────────────────────────────────────────────────────

function relativeTime(date: string | null | undefined): string {
  if (!date) return 'Nunca ejecutado';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Hace un momento';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days}d`;
}

// ─── Agent Card ───────────────────────────────────────────────────

function AgentCard({ agent, onClick }: { agent: any; onClick: () => void }) {
  const meta = AGENT_META[agent.slug] || {
    icon: Bot,
    gradient: 'from-glamor-primary to-purple-500',
    bg: 'bg-purple-50',
    description: agent.description || '',
  };
  const Icon = meta.icon;
  const status = STATUS_CONFIG[agent.status] || STATUS_CONFIG.paused;
  const StatusIcon = status.icon;

  const hasPending = (agent.pendingRecommendations ?? 0) > 0;

  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-2xl border border-border-primary overflow-hidden
        hover:shadow-xl hover:border-glamor-primary/30 transition-all duration-300 cursor-pointer"
    >
      {/* Gradient accent bar at top */}
      <div className={`h-1 w-full bg-gradient-to-r ${meta.gradient} opacity-70 group-hover:opacity-100 transition-opacity`} />

      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${meta.gradient}
            flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-6 h-6 text-white" />
          </div>

          <div className="flex items-center gap-2">
            {/* Pending badge */}
            {hasPending && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold">
                <Sparkles className="w-3 h-3" />
                {agent.pendingRecommendations}
              </span>
            )}
            {/* Status pill */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${status.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
        </div>

        {/* Name */}
        <h3 className="font-bold text-foreground text-sm mb-1 group-hover:text-glamor-primary transition-colors">
          {agent.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
          {meta.description || agent.description || 'Sin descripción'}
        </p>

        {/* Provider + last run */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          {agent.aiProvider ? (
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium
              ${agent.aiProvider === 'deepseek'
                ? 'bg-purple-50 text-purple-600 border-purple-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              {agent.aiProvider === 'deepseek' ? '⚡' : '🤖'}
              {agent.aiProvider === 'deepseek' ? 'DeepSeek' : 'Claude'}
            </span>
          ) : <span />}

          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {relativeTime(agent.lastRunAt)}
          </span>
        </div>

        {/* Bottom metrics */}
        <div className="flex items-center justify-between pt-3 border-t border-border-light">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-purple-400" />
              {agent.totalActions || 0} análisis
            </span>
            {(agent.alertsGenerated ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-orange-500">
                <AlertTriangle className="w-3 h-3" />
                {agent.alertsGenerated} alertas
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {(agent.estimatedImpact ?? 0) > 0 && (
              <span className="text-xs font-bold text-green-600">
                {formatCurrency(agent.estimatedImpact)}
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-glamor-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

function AIAgentsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [agents, setAgents] = useState<any[]>([]);
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

  const handleRefresh = () => { setRefreshing(true); loadAgents(); };

  // ─── Derived stats ───────────────────────────────────────────

  const activeCount   = agents.filter(a => a.status === 'active').length;
  const totalActions  = agents.reduce((s, a) => s + (a.totalActions || 0), 0);
  const totalAlerts   = agents.reduce((s, a) => s + (a.alertsGenerated || 0), 0);
  const totalImpact   = agents.reduce((s, a) => s + Number(a.estimatedImpact || 0), 0);
  const totalPending  = agents.reduce((s, a) => s + (a.pendingRecommendations || 0), 0);

  const filtered = statusFilter
    ? agents.filter(a => a.status === statusFilter)
    : agents;

  if (loading) return <LoadingSkeleton rows={3} cols={4} />;

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bot className="w-6 h-6 text-glamor-primary" />
            Centro de Agentes IA
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeCount} de {agents.length} agentes activos
            {totalPending > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-medium">
                <Sparkles className="w-3 h-3" />
                {totalPending} recomendación{totalPending !== 1 ? 'es' : ''} pendiente{totalPending !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 h-9 px-3 border border-border-primary rounded-lg text-sm
              hover:bg-surface-hover transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Agentes activos"
          value={`${activeCount}/${agents.length}`}
          icon={<Bot className="w-5 h-5 text-purple-500" />}
        />
        <StatCard
          title="Recomendaciones pendientes"
          value={String(totalPending)}
          icon={<Sparkles className="w-5 h-5 text-orange-500" />}
        />
        <StatCard
          title="Alertas generadas"
          value={String(totalAlerts)}
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
        />
        <StatCard
          title="Impacto estimado"
          value={formatCurrency(totalImpact)}
          icon={<DollarSign className="w-5 h-5 text-green-500" />}
        />
      </div>

      {/* ── Filter pills ── */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {FILTER_OPTIONS.map(opt => {
          const count = opt.value
            ? agents.filter(a => a.status === opt.value).length
            : agents.length;
          return (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition ${
                statusFilter === opt.value
                  ? 'bg-glamor-primary text-white border-glamor-primary'
                  : 'bg-white text-muted-foreground border-border-primary hover:border-glamor-primary/40 hover:text-foreground'
              }`}
            >
              {opt.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                statusFilter === opt.value ? 'bg-white/20 text-white' : 'bg-surface-primary text-muted-foreground'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Grid ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-border-primary border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-surface-primary flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            {statusFilter ? 'No hay agentes con ese estado' : 'No hay agentes configurados'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {statusFilter ? 'Prueba con otro filtro' : 'Los agentes IA aparecerán aquí cuando estén configurados'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((agent: any) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => router.push(`/dashboard/ai-agents/${agent.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AIAgentsPageWithGate() {
  return <PlanGate feature="ai_agents"><AIAgentsPage /></PlanGate>;
}
