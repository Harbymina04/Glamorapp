'use client';

import { PlanGate } from '@/hooks/use-plan-gate';
import { useEffect, useState, useCallback, useRef } from 'react';
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
  Zap, Terminal, History, Activity, ChevronDown, ChevronUp,
  AlertTriangle, Lightbulb, Target, BarChart2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────

interface StructuredDescription {
  problema: string;
  accion_concreta: string;
  impacto_esperado: string;
  como_medir?: string;
}

/** Returns true if the string looks like raw LLM tool-call JSON (not user-facing content) */
function isToolCallJson(text: string): boolean {
  try {
    const t = text.trim();
    if (!t.startsWith('[') && !t.startsWith('{')) return false;
    const parsed = JSON.parse(t);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.every(
      (item: any) => item && typeof item === 'object' && ('name' in item || 'id' in item) && !('problema' in item),
    );
  } catch {
    return false;
  }
}

function parseDescription(raw: string): StructuredDescription | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.problema) {
      // Sanitize accion_concreta — if it's raw tool-call JSON, replace with placeholder
      if (parsed.accion_concreta && isToolCallJson(parsed.accion_concreta)) {
        parsed.accion_concreta = 'El agente analizó los datos. Ejecuta el análisis nuevamente para obtener pasos detallados.';
      }
      return parsed;
    }
  } catch {}
  return null;
}

// ─── Recommendation Card ─────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { label: string; color: string; border: string; icon: any }> = {
  critical: { label: 'Crítico', color: 'text-red-700 bg-red-50', border: 'border-l-red-500', icon: AlertCircle },
  high:     { label: 'Alto',    color: 'text-orange-700 bg-orange-50', border: 'border-l-orange-400', icon: AlertTriangle },
  medium:   { label: 'Medio',   color: 'text-blue-700 bg-blue-50', border: 'border-l-blue-400', icon: Lightbulb },
  low:      { label: 'Bajo',    color: 'text-gray-600 bg-gray-50', border: 'border-l-gray-300', icon: Lightbulb },
};

const TYPE_LABELS: Record<string, string> = {
  revenue: 'Ingresos', cost_saving: 'Ahorro', customer_experience: 'Clientes',
  efficiency: 'Eficiencia', marketing: 'Marketing', inventory: 'Inventario',
  pricing: 'Precios', other: 'General', analysis: 'Análisis',
};

function ActionSteps({ text }: { text: string }) {
  // Split by numbered lines (1. ... \n 2. ...) or newlines
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  const isNumbered = lines.some(l => /^\d+\./.test(l));

  if (isNumbered || lines.length > 1) {
    return (
      <ol className="space-y-1.5 list-none">
        {lines.map((line, i) => {
          const clean = line.replace(/^\d+\.\s*/, '');
          const num = line.match(/^(\d+)\./)?.[1] || String(i + 1);
          return (
            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
              <span className="shrink-0 w-5 h-5 rounded-full bg-glamor-primary/10 text-glamor-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {num}
              </span>
              <span>{clean}</span>
            </li>
          );
        })}
      </ol>
    );
  }

  return <p className="text-sm text-foreground">{text}</p>;
}

function RecommendationCard({
  rec,
  onAccept,
  onReject,
}: {
  rec: any;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const structured = parseDescription(rec.description || '');
  const pConfig = PRIORITY_CONFIG[rec.priority] || PRIORITY_CONFIG.medium;
  const PIcon = pConfig.icon;

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-orange-50 text-orange-700 border-orange-200',
    accepted: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    expired: 'bg-gray-50 text-gray-500 border-gray-200',
  };

  return (
    <div className={`border-l-4 ${pConfig.border} bg-white rounded-r-xl border border-l-[4px] border-y border-r border-border-primary overflow-hidden transition-all`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left px-5 py-4 hover:bg-surface-hover transition"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`shrink-0 p-1.5 rounded-lg ${pConfig.color}`}>
              <PIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[rec.status] || STATUS_COLORS.pending}`}>
                  {rec.status === 'accepted' && <Check className="w-3 h-3" />}
                  {rec.status === 'rejected' && <X className="w-3 h-3" />}
                  {rec.status === 'pending' ? 'Pendiente' : rec.status === 'accepted' ? 'Aceptada' : rec.status === 'rejected' ? 'Rechazada' : 'Expirada'}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${pConfig.color} border-current/20`}>
                  {pConfig.label}
                </span>
                {rec.type && (
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-surface-primary border border-border-primary">
                    {TYPE_LABELS[rec.type] || rec.type}
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-foreground text-sm leading-snug">{rec.title}</h4>

              {/* Preview of problema when collapsed */}
              {!expanded && structured?.problema && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{structured.problema}</p>
              )}
              {!expanded && !structured && rec.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rec.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {rec.estimatedImpact && (
              <span className="text-sm font-bold text-green-600 whitespace-nowrap">
                +{formatCurrency(rec.estimatedImpact)}
              </span>
            )}
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-border-light">
          {structured ? (
            <>
              {/* Problema */}
              {structured.problema && (
                <div className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Problema detectado</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{structured.problema}</p>
                </div>
              )}

              {/* Acción concreta */}
              {structured.accion_concreta && (
                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">Pasos a seguir</span>
                  </div>
                  <ActionSteps text={structured.accion_concreta} />
                </div>
              )}

              {/* Impacto + Medición */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {structured.impacto_esperado && (
                  <div className="bg-green-50/50 rounded-xl p-3.5 border border-green-100">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Target className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-green-700">Impacto esperado</span>
                    </div>
                    <p className="text-sm text-foreground">{structured.impacto_esperado}</p>
                  </div>
                )}
                {structured.como_medir && (
                  <div className="bg-purple-50/50 rounded-xl p-3.5 border border-purple-100">
                    <div className="flex items-center gap-2 mb-1.5">
                      <BarChart2 className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-purple-700">Cómo medir</span>
                    </div>
                    <p className="text-sm text-foreground">{structured.como_medir}</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Fallback: plain text
            <div className="pt-4">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{rec.description}</p>
            </div>
          )}

          {/* Actions */}
          {rec.status === 'pending' && (
            <div className="flex gap-2 pt-2 border-t border-border-light">
              <button
                onClick={() => onAccept(rec.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition"
              >
                <Check className="w-4 h-4" /> Aplicar recomendación
              </button>
              <button
                onClick={() => onReject(rec.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border-primary text-sm text-muted-foreground hover:bg-surface-hover transition"
              >
                <X className="w-4 h-4" /> Descartar
              </button>
            </div>
          )}

          {rec.status !== 'pending' && rec.reviewedAt && (
            <p className="text-xs text-muted-foreground pt-1 border-t border-border-light">
              {rec.status === 'accepted' ? 'Aceptada' : 'Rechazada'} el{' '}
              {new Date(rec.reviewedAt).toLocaleString('es-CO')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border ${
      type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
    }`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 p-0.5 rounded hover:bg-black/5"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ─── Config Modal ─────────────────────────────────────────────────

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

  const inputClass = 'w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-border-primary w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" /> Configurar Agente
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover transition">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nombre del agente</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Objetivo / instrucciones adicionales</label>
            <textarea value={objective} onChange={e => setObjective(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 resize-none"
              placeholder="¿Qué debe priorizar este agente en sus análisis?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Frecuencia de análisis</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)} className={inputClass}>
                <option value="hourly">Cada hora</option>
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nivel de autonomía</label>
              <select value={autonomy} onChange={e => setAutonomy(e.target.value)} className={inputClass}>
                <option value="recommend_only">Solo recomendar</option>
                <option value="draft_changes">Borrador de cambios</option>
                <option value="auto_execute">Ejecución automática</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Proveedor de IA</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'deepseek', label: 'DeepSeek', desc: 'Rápido y económico · Recomendado' },
                { value: 'claude', label: 'Claude', desc: 'Alta calidad · Requiere API key' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAiProvider(opt.value)}
                  className={`p-3 rounded-xl border-2 text-left transition ${
                    aiProvider === opt.value
                      ? 'border-glamor-primary bg-glamor-primary/5'
                      : 'border-border-primary hover:border-glamor-primary/40'
                  }`}
                >
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 border border-border-primary rounded-lg text-sm hover:bg-surface-hover transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 bg-glamor-primary hover:bg-glamor-primary-hover text-white rounded-lg text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Log Line ─────────────────────────────────────────────────────

function LogLine({ line, index }: { line: string; index: number }) {
  const isError = line.includes('❌') || line.includes('Error');
  const isTool = line.includes('🔧');
  const isSuccess = line.includes('✅') || line.includes('completado');
  const isWarning = line.includes('⚠️');
  const isStart = line.includes('🚀') || line.includes('🧠');

  const color = isError ? 'text-red-400' : isTool ? 'text-yellow-300' : isSuccess ? 'text-green-400'
    : isWarning ? 'text-orange-400' : isStart ? 'text-blue-400' : 'text-gray-300';

  // Extract timestamp and message
  const match = line.match(/\[(.+?)\]\s*(.*)/);
  const ts = match?.[1] ? new Date(match[1]).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
  const msg = match?.[2] || line;

  return (
    <div className={`flex items-start gap-3 py-0.5 hover:bg-white/5 rounded px-1 ${color}`}>
      <span className="text-gray-600 text-xs shrink-0 w-4 text-right select-none">{index + 1}</span>
      {ts && <span className="text-gray-600 text-xs shrink-0 font-mono">{ts}</span>}
      <span className="text-xs font-mono leading-relaxed">{msg}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

function AIAgentDetailPage() {
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
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [runProgress, setRunProgress] = useState<{ iteration: number; tool: string } | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'executions' | 'logs'>('recommendations');
  const [recFilter, setRecFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

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

  // ─── Parse progress hints from logs ────────────────────────────
  const parseProgress = (logs: string[]) => {
    let iteration = 0;
    let tool = '';
    for (let i = logs.length - 1; i >= 0; i--) {
      const l = logs[i];
      if (!iteration) {
        const m = l.match(/Iteración\s+(\d+)\//);
        if (m) iteration = parseInt(m[1], 10);
      }
      if (!tool) {
        const m = l.match(/🔧\s+(\w+)\(/);
        if (m) { tool = m[1]; break; }
      }
      if (iteration && tool) break;
    }
    return { iteration, tool };
  };

  // ─── Stop polling helpers ───────────────────────────────────────
  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (pollTimeoutRef.current) { clearTimeout(pollTimeoutRef.current); pollTimeoutRef.current = null; }
  };

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), []);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (activeTab === 'logs') logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveLogs, activeTab]);

  const handleRunAgent = async () => {
    if (!agent || !token) return;
    setRunning(true);
    setRunResult(null);
    setLiveLogs([]);
    setRunProgress(null);
    setActiveTab('logs');
    stopPolling();

    try {
      // POST returns immediately with executionId
      const { executionId } = await api.post(`/ai-agents/${agent.id}/run`, {}, { token });

      // Poll execution record every 2 s
      pollRef.current = setInterval(async () => {
        try {
          const exec = await api.get(`/ai-agents/executions/${executionId}`, { token });
          const logs: string[] = Array.isArray(exec.logs) ? exec.logs : [];
          setLiveLogs(logs);
          setRunProgress(parseProgress(logs));

          if (exec.status === 'completed' || exec.status === 'failed') {
            stopPolling();
            setRunResult(exec);
            setRunning(false);
            setRunProgress(null);

            if (exec.status === 'completed') {
              await loadData();
              const newRecs = (exec.result as any)?.recommendations?.length ?? 0;
              setToast({
                message: `Análisis completado · ${exec.iterations ?? '?'} iteraciones · ${newRecs} recomendación${newRecs !== 1 ? 'es' : ''}`,
                type: 'success',
              });
              if (newRecs > 0) setActiveTab('recommendations');
            } else {
              setToast({ message: exec.summary || 'Error durante la ejecución', type: 'error' });
            }
          }
        } catch { /* keep polling on transient errors */ }
      }, 2000);

      // Safety timeout: 6 minutes
      pollTimeoutRef.current = setTimeout(() => {
        stopPolling();
        setRunning(false);
        setRunProgress(null);
        setToast({ message: 'Tiempo de espera agotado. El agente puede seguir corriendo en segundo plano.', type: 'error' });
      }, 360_000);

    } catch (err: any) {
      stopPolling();
      setRunning(false);
      setToast({ message: err.message || 'Error al iniciar el agente', type: 'error' });
    }
  };

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

  const handleAcceptRec = async (recId: string) => {
    if (!token) return;
    try {
      await api.post(`/ai-agents/recommendations/${recId}/accept`, {}, { token });
      setRecommendations(prev => prev.map(r => r.id === recId ? { ...r, status: 'accepted', reviewedAt: new Date().toISOString() } : r));
      setToast({ message: 'Recomendación aceptada ✓', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Error al aceptar', type: 'error' });
    }
  };

  const handleRejectRec = async (recId: string) => {
    if (!token) return;
    try {
      await api.post(`/ai-agents/recommendations/${recId}/reject`, {}, { token });
      setRecommendations(prev => prev.map(r => r.id === recId ? { ...r, status: 'rejected', reviewedAt: new Date().toISOString() } : r));
      setToast({ message: 'Recomendación descartada', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Error', type: 'error' });
    }
  };

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

  if (loading) return <LoadingSkeleton rows={5} cols={4} />;
  if (!agent) return (
    <div className="text-center py-16">
      <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
      <h3 className="text-lg font-semibold">Agente no encontrado</h3>
      <button onClick={() => router.push('/dashboard/ai-agents')} className="mt-2 text-sm text-glamor-primary hover:underline">Volver</button>
    </div>
  );

  const perf = agent.performance || {};
  const filteredRecs = recFilter === 'all' ? recommendations : recommendations.filter(r => r.status === recFilter);

  const pendingCount = recommendations.filter(r => r.status === 'pending').length;

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
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 font-medium">
                  {agent.aiProvider === 'deepseek' ? '⚡ DeepSeek' : '🤖 Claude'}
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-1">{agent.description || 'Sin descripción'}</p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0 flex-wrap">
          <button onClick={() => setShowConfig(true)}
            className="flex items-center gap-2 h-10 px-4 border border-border-primary rounded-lg text-sm hover:bg-surface-hover transition">
            <Settings className="w-4 h-4" /> Configurar
          </button>
          <button onClick={handleToggleStatus} disabled={actionLoading}
            className={`flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-medium transition disabled:opacity-60 ${
              agent.status === 'active'
                ? 'border border-border-primary hover:bg-surface-hover'
                : 'bg-glamor-primary text-white hover:bg-glamor-primary-hover'
            }`}>
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" />
              : agent.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {agent.status === 'active' ? 'Pausar' : 'Activar'}
          </button>
          <button onClick={handleRunAgent} disabled={running}
            className="flex items-center gap-2 h-10 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {running ? 'Analizando...' : 'Analizar ahora'}
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

      {/* Metadata */}
      <div className="bg-white rounded-xl border border-border-primary p-5 mb-6">
        <h3 className="font-semibold text-foreground mb-2">Objetivo del agente</h3>
        <p className="text-sm text-muted-foreground">{agent.objective || 'Sin objetivo definido.'}</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-xs text-muted-foreground">
          <span>Frecuencia: <strong className="text-foreground capitalize">{agent.analysisFrequency || 'daily'}</strong></span>
          <span>Autonomía: <strong className="text-foreground capitalize">{(agent.autonomyLevel || 'recommend_only').replace(/_/g, ' ')}</strong></span>
          <span>Última ejecución: <strong className="text-foreground">
            {agent.lastRunAt ? new Date(agent.lastRunAt).toLocaleString('es-CO') : 'Nunca'}
          </strong></span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-border-primary overflow-hidden">
        <div className="flex border-b border-border-primary bg-surface-primary/30">
          {(['recommendations', 'executions', 'logs'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium transition border-b-2 relative ${
                activeTab === tab
                  ? 'border-glamor-primary text-glamor-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              <span className="flex items-center gap-2">
                {tab === 'recommendations' && <Sparkles className="w-4 h-4" />}
                {tab === 'executions' && <History className="w-4 h-4" />}
                {tab === 'logs' && <Terminal className="w-4 h-4" />}
                {tab === 'recommendations' ? 'Recomendaciones' : tab === 'executions' ? 'Historial' : 'Logs'}
                {tab === 'recommendations' && pendingCount > 0 && (
                  <span className="ml-1 w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">
                    {pendingCount}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        {/* ── Recommendations Tab ── */}
        {activeTab === 'recommendations' && (
          <div>
            {/* Sub-filter */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border-light bg-surface-primary/20">
              {(['all', 'pending', 'accepted', 'rejected'] as const).map(f => (
                <button key={f} onClick={() => setRecFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    recFilter === f
                      ? 'bg-glamor-primary text-white'
                      : 'border border-border-primary text-muted-foreground hover:border-glamor-primary/40'
                  }`}>
                  {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : f === 'accepted' ? 'Aceptadas' : 'Rechazadas'}
                  <span className="ml-1.5 opacity-70">
                    {f === 'all' ? recommendations.length : recommendations.filter(r => r.status === f).length}
                  </span>
                </button>
              ))}
            </div>

            {filteredRecs.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {recommendations.length === 0
                    ? 'No hay recomendaciones aún. Ejecuta el agente para generarlas.'
                    : 'No hay recomendaciones con este filtro.'}
                </p>
                {recommendations.length === 0 && (
                  <button onClick={handleRunAgent} disabled={running}
                    className="mt-4 flex items-center gap-2 mx-auto h-9 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60">
                    {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {running ? 'Analizando...' : 'Analizar ahora'}
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {filteredRecs.map((r: any) => (
                  <RecommendationCard
                    key={r.id}
                    rec={r}
                    onAccept={handleAcceptRec}
                    onReject={handleRejectRec}
                  />
                ))}
              </div>
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
              </div>
            ) : (
              executions.map((e: any) => (
                <button key={e.id} className="w-full px-5 py-4 hover:bg-surface-hover transition text-left"
                  onClick={() => {
                    setRunResult(e);
                    setLiveLogs(Array.isArray(e.logs) ? e.logs : []);
                    setActiveTab('logs');
                  }}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={e.status} colors={{
                        running: 'bg-blue-50 text-blue-700', completed: 'bg-green-50 text-green-700',
                        failed: 'bg-red-50 text-red-700',
                      }} />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(e.startedAt).toLocaleString('es-CO')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {e.iterations} iteraciones · {e.durationMs ? `${(e.durationMs / 1000).toFixed(1)}s` : '–'}
                        </p>
                      </div>
                    </div>
                    {e.summary && (
                      <p className="text-xs text-muted-foreground truncate max-w-xs hidden sm:block">{e.summary.slice(0, 80)}</p>
                    )}
                    <span className="text-xs text-muted-foreground shrink-0">Ver logs →</span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* ── Logs Tab ── */}
        {activeTab === 'logs' && (
          <div className="p-4 space-y-3">
            {/* Live progress banner */}
            {running && (
              <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
                <div className="flex items-center gap-3 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-600" />
                  <span className="text-sm font-semibold">Analizando datos del negocio...</span>
                </div>
                {runProgress && (
                  <div className="flex items-center gap-4 text-xs text-blue-600 ml-7">
                    {runProgress.iteration > 0 && (
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        Iteración {runProgress.iteration} / 8
                      </span>
                    )}
                    {runProgress.tool && (
                      <span className="flex items-center gap-1 font-mono bg-blue-100 px-2 py-0.5 rounded">
                        🔧 {runProgress.tool}
                      </span>
                    )}
                  </div>
                )}
                {/* Progress bar */}
                {runProgress?.iteration ? (
                  <div className="mt-2 ml-7 h-1.5 rounded-full bg-blue-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${Math.min((runProgress.iteration / 8) * 100, 100)}%` }}
                    />
                  </div>
                ) : null}
              </div>
            )}

            {/* Log terminal */}
            {(liveLogs.length > 0 || (runResult?.logs && runResult.logs.length > 0)) ? (
              <div className="bg-gray-900 rounded-xl p-4 font-mono max-h-[480px] overflow-y-auto">
                {(liveLogs.length > 0 ? liveLogs : runResult?.logs ?? []).map((line: string, i: number) => (
                  <LogLine key={i} line={line} index={i} />
                ))}
                <div ref={logsEndRef} />
              </div>
            ) : !running ? (
              <div className="py-12 text-center text-muted-foreground">
                <Terminal className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin logs para mostrar</p>
                <p className="text-xs mt-1">Ejecuta el agente o selecciona una ejecución del historial</p>
              </div>
            ) : null}

            {/* Execution summary */}
            {runResult?.summary && !running && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Resumen de ejecución</p>
                <p className="text-sm text-green-800">{runResult.summary}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showConfig && <ConfigModal agent={agent} onClose={() => setShowConfig(false)} onSave={handleSaveConfig} saving={actionLoading} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function AIAgentDetailPageWithGate() {
  return <PlanGate feature="ai_agents"><AIAgentDetailPage /></PlanGate>;
}
