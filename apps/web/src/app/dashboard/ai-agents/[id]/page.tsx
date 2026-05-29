'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { StatCard } from '@/components/shared/stat-card';
import {
  Bot, Sparkles, TrendingUp, CheckCircle, XCircle, ArrowLeft,
  Play, Pause, Settings, Check, X, Loader2, AlertCircle,
  Zap, Clock, Terminal, History, Activity, BarChart3,
} from 'lucide-react';

// ─── Toast ───────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border animate-slide-up ${
      type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
    }`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 p-0.5 rounded hover:bg-black/5"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ─── Config Modal ────────────────────────────────────────────────

function ConfigModal({ agent, onClose, onSave, saving }: {
  agent: any; onClose: () => void; onSave: (data: any) => void; saving: boolean;
}) {
  const [name, setName] = useState(agent.name || '');
  const [objective, setObjective] = useState(agent.objective || '');
  const [frequency, setFrequency] = useState(agent.analysisFrequency || 'daily');
  const [autonomy, setAutonomy] = useState(agent.autonomyLevel || 'recommend_only');
  const [aiProvider, setAiProvider] = useState(agent.aiProvider || 'deepseek');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, objective, analysisFrequency: frequency, autonomyLevel: autonomy, aiProvider });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-border-primary w-full max-w-lg mx-4 p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Configurar Agente</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover transition">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nombre</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Objetivo</label>
            <textarea value={objective} onChange={e => setObjective(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 resize-none"
              placeholder="¿Qué debe analizar y recomendar este agente?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Frecuencia</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white">
                <option value="hourly">Cada hora</option>
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Autonomía</label>
              <select value={autonomy} onChange={e => setAutonomy(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white">
                <option value="recommend_only">Solo recomendar</option>
                <option value="draft_changes">Borrador de cambios</option>
                <option value="auto_execute">Ejecución automática</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Proveedor IA</label>
            <select value={aiProvider} onChange={e => setAiProvider(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white">
              <option value="deepseek">DeepSeek (recomendado)</option>
              <option value="claude">Claude (Anthropic)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {aiProvider === 'deepseek' ? 'DeepSeek: rápido, económico, excelente para análisis.' : 'Claude: alta calidad, requiere ANTHROPIC_API_KEY.'}
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 px-4 border border-border-primary rounded-lg text-sm hover:bg-surface-hover transition">Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 px-4 bg-glamor-primary hover:bg-glamor-primary-hover text-white rounded-lg text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function AIAgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuthStore();

  const [agent, setAgent] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'executions' | 'logs'>('recommendations');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadData = useCallback(async () => {
    const id = params?.id;
    if (!id || !token) return;
    try {
      const [agentRes, recsRes, perfRes, execRes] = await Promise.all([
        api.get(`/ai-agents/${id}`, { token }),
        api.get(`/ai-agents/${id}/recommendations`, { token }),
        api.get(`/ai-agents/${id}/performance`, { token }),
        api.get(`/ai-agents/${id}/executions`, { token }),
      ]);
      setAgent({ ...agentRes, performance: perfRes });
      setRecommendations(recsRes.data || []);
      setExecutions(execRes.data || []);
    } catch (err: any) {
      console.error('Failed to load agent', err);
    } finally {
      setLoading(false);
    }
  }, [params?.id, token]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Run Agent ──────────────────────────────────────────────

  const handleRunAgent = async () => {
    if (!agent || !token) return;
    setRunning(true);
    setRunResult(null);
    setActiveTab('logs');
    try {
      const result = await api.post(`/ai-agents/${agent.id}/run`, {}, { token });
      setRunResult(result);
      setToast({ message: `Agente ejecutado: ${result.iterations} iteraciones, ${result.recommendations?.length || 0} recomendaciones`, type: 'success' });
      // Reload data
      await loadData();
    } catch (err: any) {
      setToast({ message: err.message || 'Error al ejecutar agente', type: 'error' });
    } finally {
      setRunning(false);
    }
  };

  // ─── Activate / Pause ──────────────────────────────────────

  const handleToggleStatus = async () => {
    if (!agent || !token) return;
    setActionLoading(true);
    try {
      const action = agent.status === 'active' ? 'pause' : 'activate';
      await api.post(`/ai-agents/${agent.id}/${action}`, {}, { token });
      setAgent((prev: any) => ({ ...prev, status: action === 'pause' ? 'paused' : 'active' }));
      setToast({ message: `Agente ${action === 'pause' ? 'pausado' : 'activado'}`, type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Error', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Accept / Reject ───────────────────────────────────────

  const handleAcceptRec = async (recId: string) => {
    if (!token) return;
    try {
      await api.post(`/ai-agents/recommendations/${recId}/accept`, {}, { token });
      setRecommendations(prev => prev.map(r => r.id === recId ? { ...r, status: 'accepted' } : r));
      setToast({ message: 'Recomendación aceptada', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Error al aceptar', type: 'error' });
    }
  };

  const handleRejectRec = async (recId: string) => {
    if (!token) return;
    try {
      await api.post(`/ai-agents/recommendations/${recId}/reject`, {}, { token });
      setRecommendations(prev => prev.map(r => r.id === recId ? { ...r, status: 'rejected' } : r));
      setToast({ message: 'Recomendación rechazada', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Error', type: 'error' });
    }
  };

  // ─── Save Config ───────────────────────────────────────────

  const handleSaveConfig = async (data: any) => {
    if (!agent || !token) return;
    setActionLoading(true);
    try {
      const updated = await api.put(`/ai-agents/${agent.id}`, data, { token });
      setAgent((prev: any) => ({ ...prev, ...updated }));
      setShowConfig(false);
      setToast({ message: 'Configuración guardada', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Error', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Loading / Not Found ───────────────────────────────────

  if (loading) return <LoadingSkeleton rows={5} cols={4} />;
  if (!agent) return (
    <div className="text-center py-16">
      <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
      <h3 className="text-lg font-semibold">Agente no encontrado</h3>
      <button onClick={() => router.push('/dashboard/ai-agents')} className="mt-2 text-sm text-glamor-primary hover:underline">Volver</button>
    </div>
  );

  const perf = agent.performance || {};

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div>
      {/* Back */}
      <button onClick={() => router.push('/dashboard/ai-agents')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition">
        <ArrowLeft className="w-4 h-4" /> Volver a agentes
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-glamor-primary to-purple-600 flex items-center justify-center shrink-0">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{agent.name}</h1>
              <StatusBadge status={agent.status} colors={{
                active: 'bg-green-50 text-green-700 border-green-200',
                paused: 'bg-gray-50 text-gray-600 border-gray-200',
                pending_config: 'bg-orange-50 text-orange-700 border-orange-200',
                error: 'bg-red-50 text-red-700 border-red-200',
              }} />
              {agent.aiProvider && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                  {agent.aiProvider === 'deepseek' ? 'DeepSeek' : 'Claude'}
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-1">{agent.description || 'Sin descripción'}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setShowConfig(true)}
            className="flex items-center gap-2 h-10 px-4 border border-border-primary rounded-lg text-sm hover:bg-surface-hover transition">
            <Settings className="w-4 h-4" /> Configurar
          </button>
          <button onClick={handleToggleStatus} disabled={actionLoading}
            className={`flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-medium transition disabled:opacity-60 ${
              agent.status === 'active' ? 'border border-border-primary hover:bg-surface-hover' : 'bg-glamor-primary text-white hover:bg-glamor-primary-hover'
            }`}>
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> :
              agent.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {agent.status === 'active' ? 'Pausar' : 'Activar'}
          </button>
          {/* RUN NOW BUTTON */}
          <button onClick={handleRunAgent} disabled={running}
            className="flex items-center gap-2 h-10 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {running ? 'Ejecutando...' : 'Ejecutar ahora'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Recomendaciones" value={String(perf.totalRecommendations || 0)}
          icon={<Sparkles className="w-5 h-5 text-purple-500" />} />
        <StatCard title="Aceptadas" value={String(perf.accepted || 0)}
          icon={<CheckCircle className="w-5 h-5 text-green-500" />} />
        <StatCard title="Tasa aceptación" value={`${perf.acceptanceRate || 0}%`}
          icon={<TrendingUp className="w-5 h-5 text-blue-500" />} />
        <StatCard title="Ejecuciones" value={String(executions.length)}
          icon={<Activity className="w-5 h-5 text-orange-500" />} />
      </div>

      {/* Objective + metadata */}
      <div className="bg-white rounded-xl border border-border-primary p-5 mb-6">
        <h3 className="font-semibold text-foreground mb-2">Objetivo</h3>
        <p className="text-sm text-muted-foreground">
          {agent.objective || 'Sin objetivo definido.'}
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-xs text-muted-foreground">
          <span>Frecuencia: <strong className="text-foreground capitalize">{agent.analysisFrequency || 'daily'}</strong></span>
          <span>Autonomía: <strong className="text-foreground capitalize">{(agent.autonomyLevel || 'recommend_only').replace(/_/g, ' ')}</strong></span>
          <span>Proveedor: <strong className="text-foreground">{agent.aiProvider === 'claude' ? 'Claude (Anthropic)' : 'DeepSeek'}</strong></span>
          <span>Última ejecución: <strong className="text-foreground">
            {agent.lastRunAt ? new Date(agent.lastRunAt).toLocaleString('es-CO') : 'Nunca'}
          </strong></span>
          <span>Acciones totales: <strong className="text-foreground">{agent.totalActions || 0}</strong></span>
        </div>
      </div>

      {/* Tabs: Recommendations | Executions | Logs */}
      <div className="bg-white rounded-xl border border-border-primary overflow-hidden">
        <div className="flex border-b border-border-primary bg-surface-primary/30">
          {(['recommendations', 'executions', 'logs'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium transition border-b-2 ${
                activeTab === tab
                  ? 'border-glamor-primary text-glamor-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              <span className="flex items-center gap-2">
                {tab === 'recommendations' && <Sparkles className="w-4 h-4" />}
                {tab === 'executions' && <History className="w-4 h-4" />}
                {tab === 'logs' && <Terminal className="w-4 h-4" />}
                {tab === 'recommendations' && 'Recomendaciones'}
                {tab === 'executions' && 'Historial'}
                {tab === 'logs' && 'Logs'}
              </span>
            </button>
          ))}
        </div>

        {/* ── Recommendations Tab ── */}
        {activeTab === 'recommendations' && (
          <div className="divide-y divide-border-light">
            {recommendations.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No hay recomendaciones aún</p>
                <p className="text-xs mt-1">Ejecuta el agente para generar recomendaciones</p>
              </div>
            ) : (
              recommendations.map((r: any) => (
                <div key={r.id} className="px-5 py-4 hover:bg-surface-hover transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <StatusBadge status={r.priority} colors={{
                          low: 'bg-gray-50 text-gray-600', medium: 'bg-blue-50 text-blue-700',
                          high: 'bg-orange-50 text-orange-700', critical: 'bg-red-50 text-red-700',
                        }} />
                        <StatusBadge status={r.status} colors={{
                          pending: 'bg-orange-50 text-orange-700', accepted: 'bg-green-50 text-green-700',
                          rejected: 'bg-red-50 text-red-700', expired: 'bg-gray-50 text-gray-600',
                        }} />
                        {r.type && <span className="text-xs text-muted-foreground capitalize">{r.type.replace(/_/g, ' ')}</span>}
                      </div>
                      <h4 className="font-semibold text-foreground">{r.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{r.description?.slice(0, 500)}</p>
                      {r.reason && <p className="text-xs text-muted-foreground mt-2 italic">"{r.reason}"</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {r.estimatedImpact && (
                        <span className="text-sm font-semibold text-green-600 whitespace-nowrap">+{formatCurrency(r.estimatedImpact)}</span>
                      )}
                      {r.status === 'pending' && (
                        <div className="flex gap-1.5">
                          <button onClick={() => handleAcceptRec(r.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition">
                            <Check className="w-3 h-3" /> Aceptar
                          </button>
                          <button onClick={() => handleRejectRec(r.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition">
                            <X className="w-3 h-3" /> Rechazar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Executions Tab ── */}
        {activeTab === 'executions' && (
          <div className="divide-y divide-border-light">
            {executions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin ejecuciones registradas</p>
                <p className="text-xs mt-1">El historial de ejecuciones aparecerá aquí</p>
              </div>
            ) : (
              executions.map((e: any) => (
                <div key={e.id} className="px-5 py-4 hover:bg-surface-hover transition cursor-pointer"
                  onClick={() => { setRunResult(e); setActiveTab('logs'); }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={e.status} colors={{
                        running: 'bg-blue-50 text-blue-700', completed: 'bg-green-50 text-green-700',
                        failed: 'bg-red-50 text-red-700',
                      }} />
                      <div>
                        <span className="text-sm font-medium text-foreground">
                          {new Date(e.startedAt).toLocaleString('es-CO')}
                        </span>
                        <span className="text-xs text-muted-foreground ml-3">
                          {e.iterations} iteraciones · {(e.durationMs / 1000).toFixed(1)}s
                        </span>
                      </div>
                    </div>
                    {e.summary && (
                      <p className="text-xs text-muted-foreground truncate max-w-xs">{e.summary.slice(0, 80)}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Logs Tab ── */}
        {activeTab === 'logs' && (
          <div className="p-4">
            {runResult?.logs ? (
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 max-h-96 overflow-y-auto">
                {runResult.logs.map((line: string, i: number) => (
                  <div key={i} className="leading-relaxed">
                    <span className="text-gray-500 mr-2">{i + 1}</span>
                    {line}
                  </div>
                ))}
              </div>
            ) : running ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-glamor-primary mb-3" />
                <p className="text-sm text-muted-foreground">Ejecutando agente...</p>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Terminal className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin logs para mostrar</p>
                <p className="text-xs mt-1">Ejecuta el agente para ver los logs en tiempo real</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showConfig && <ConfigModal agent={agent} onClose={() => setShowConfig(false)} onSave={handleSaveConfig} saving={actionLoading} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
