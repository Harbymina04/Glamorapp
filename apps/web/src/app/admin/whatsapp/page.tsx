'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import {
  Loader2, Wifi, WifiOff, RefreshCw, Phone, Clock,
  CheckCircle2, XCircle, AlertTriangle, ExternalLink,
  Play, Square, Activity,
} from 'lucide-react';

interface SessionInfo {
  sessionId: string;
  phone: string | null;
  status: string;
  connected: boolean;
  startedAt: string;
}

interface BridgeStatus {
  uptime: number;
  totalSessions: number;
  connectedSessions: number;
  sessions: SessionInfo[];
  error?: string;
}

interface TenantSession {
  sessionId: string;
  phone: string | null;
  status: string;
  connected: boolean;
  startedAt: string;
  error?: string;
}

const statusBadge: Record<string, { color: string; label: string }> = {
  connected: { color: 'bg-green-100 text-green-700', label: 'Conectado' },
  qr_ready: { color: 'bg-amber-100 text-amber-700', label: 'QR Pendiente' },
  initializing: { color: 'bg-blue-100 text-blue-700', label: 'Inicializando' },
  reconnecting: { color: 'bg-orange-100 text-orange-700', label: 'Reconectando' },
  disconnected: { color: 'bg-red-100 text-red-700', label: 'Desconectado' },
  logged_out: { color: 'bg-red-100 text-red-700', label: 'Sesión Cerrada' },
  not_started: { color: 'bg-gray-100 text-gray-700', label: 'No Iniciada' },
  error: { color: 'bg-red-100 text-red-700', label: 'Error' },
};

export default function AdminWhatsAppPage() {
  const { token } = useAuthStore();
  const [bridge, setBridge] = useState<BridgeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingTenant, setCheckingTenant] = useState<string | null>(null);

  const fetchBridgeStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/whatsapp/bridge/status', { token: token! });
      setBridge(res);
      setError('');
    } catch (e: any) {
      setError(e.message || 'No se pudo conectar al bridge');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBridgeStatus();
  }, [fetchBridgeStatus]);

  const checkTenantSession = async (sessionId: string) => {
    // We need tenantId, not sessionId. For now just refresh.
    // In the future, this would call /admin/tenants/:id/session
    fetchBridgeStatus();
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">WhatsApp Bridge</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoreo del servidor bridge multi-sesión
          </p>
        </div>
        <button
          onClick={fetchBridgeStatus}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border-primary hover:bg-surface-hover transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Bridge no disponible</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && !bridge && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-glamor-primary" />
        </div>
      )}

      {/* Bridge Overview KPIs */}
      {bridge && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-border-primary shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{formatUptime(bridge.uptime)}</p>
                  <p className="text-xs text-muted-foreground">Uptime</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-border-primary shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{bridge.totalSessions}</p>
                  <p className="text-xs text-muted-foreground">Sesiones Totales</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-border-primary shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{bridge.connectedSessions}</p>
                  <p className="text-xs text-muted-foreground">Conectadas</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-border-primary shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {bridge.totalSessions - bridge.connectedSessions}
                  </p>
                  <p className="text-xs text-muted-foreground">Desconectadas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="bg-white rounded-xl border border-border-primary shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border-primary">
              <h2 className="text-lg font-semibold text-foreground">Sesiones Activas</h2>
            </div>

            {bridge.sessions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Phone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No hay sesiones activas en el bridge</p>
                <p className="text-sm mt-1">
                  Los tenants deben configurar su número de WhatsApp desde su dashboard.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-primary bg-surface-secondary">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Sesión</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Teléfono</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Estado</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Iniciada</th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-primary">
                    {bridge.sessions.map((s) => {
                      const badge = statusBadge[s.status] || statusBadge.error;
                      return (
                        <tr key={s.sessionId} className="hover:bg-surface-hover/50 transition">
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-foreground">
                              {s.sessionId.substring(0, 12)}...
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {s.phone || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                              {s.connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(s.startedAt).toLocaleTimeString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => checkTenantSession(s.sessionId)}
                              disabled={checkingTenant === s.sessionId}
                              className="inline-flex items-center gap-1 text-xs text-glamor-primary hover:underline disabled:opacity-50"
                            >
                              {checkingTenant === s.sessionId ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3 h-3" />
                              )}
                              Verificar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-2 text-sm">
            {bridge.error ? (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-600">Bridge offline — {bridge.error}</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-green-600">Bridge online — puerto 8082</span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
