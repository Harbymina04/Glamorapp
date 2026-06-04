'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { Loader2, Search, Filter, ChevronLeft, ChevronRight, Shield } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  action: string;
  module: string;
  entityType: string;
  entityId?: string;
  description?: string;
  userEmail?: string;
  userName?: string;
  storeId?: string;
  createdAt: string;
  ipAddress?: string;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

// ─── Action color map ─────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  create:           'bg-green-100 text-green-700 border-green-200',
  update:           'bg-blue-100 text-blue-700 border-blue-200',
  delete:           'bg-red-100 text-red-700 border-red-200',
  sale:             'bg-purple-100 text-purple-700 border-purple-200',
  void_sale:        'bg-orange-100 text-orange-700 border-orange-200',
  inventory_change: 'bg-amber-100 text-amber-700 border-amber-200',
  config_change:    'bg-gray-100 text-gray-700 border-gray-200',
  login:            'bg-teal-100 text-teal-700 border-teal-200',
  logout:           'bg-slate-100 text-slate-600 border-slate-200',
  ai_action:        'bg-indigo-100 text-indigo-700 border-indigo-200',
};

const ACTION_LABELS: Record<string, string> = {
  create:           'Creación',
  update:           'Actualización',
  delete:           'Eliminación',
  sale:             'Venta',
  void_sale:        'Anulación',
  inventory_change: 'Inventario',
  config_change:    'Config',
  login:            'Login',
  logout:           'Logout',
  ai_action:        'IA',
};

const MODULE_LABELS: Record<string, string> = {
  sales:        'Ventas',
  inventory:    'Inventario',
  users:        'Usuarios',
  cash_register:'Caja',
  customers:    'Clientes',
  products:     'Productos',
  appointments: 'Citas',
  expenses:     'Gastos',
  suppliers:    'Proveedores',
  purchases:    'Compras',
};

// ─── Props ────────────────────────────────────────────────────────

interface AuditLogTableProps {
  endpoint: string;           // e.g. '/admin/audit-logs'
  token: string;
  showStoreFilter?: boolean;
  modulesEndpoint?: string;
  extraParams?: Record<string, string>;  // e.g. { tenantId: '...' }
}

// ─── Component ───────────────────────────────────────────────────

export function AuditLogTable({
  endpoint, token, showStoreFilter = false, modulesEndpoint, extraParams = {},
}: AuditLogTableProps) {
  const [data, setData]         = useState<AuditLogEntry[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [modules, setModules]   = useState<string[]>([]);

  const [filters, setFilters] = useState({
    search: '', module: '', action: '', from: '', to: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const LIMIT = 50;

  // Serialize extraParams to avoid infinite loop from new object reference on each render
  const extraParamsStr = JSON.stringify(extraParams);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...JSON.parse(extraParamsStr),
      });
      if (appliedFilters.search) params.set('search', appliedFilters.search);
      if (appliedFilters.module) params.set('module', appliedFilters.module);
      if (appliedFilters.action) params.set('action', appliedFilters.action);
      if (appliedFilters.from)   params.set('from',   appliedFilters.from);
      if (appliedFilters.to)     params.set('to',     appliedFilters.to);

      const res: AuditLogResponse = await api.get(`${endpoint}?${params}`, { token });
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch { setData([]); }
    finally  { setLoading(false); }
  }, [endpoint, token, page, appliedFilters, extraParamsStr]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    if (!modulesEndpoint) return;
    api.get(modulesEndpoint, { token })
      .then((mods: string[]) => setModules(mods))
      .catch(() => {});
  }, [modulesEndpoint, token]);

  const applyFilters = () => { setPage(1); setAppliedFilters({ ...filters }); };
  const resetFilters = () => {
    const empty = { search: '', module: '', action: '', from: '', to: '' };
    setFilters(empty);
    setPage(1);
    setAppliedFilters(empty);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              placeholder="Buscar usuario, descripción..."
              className="w-full pl-9 pr-3 py-2 border border-border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
            />
          </div>
          {/* Module */}
          <select
            value={filters.module}
            onChange={e => setFilters(f => ({ ...f, module: e.target.value }))}
            className="px-3 py-2 border border-border-primary rounded-lg text-sm focus:outline-none bg-white"
          >
            <option value="">Todos los módulos</option>
            {(modules.length > 0 ? modules : Object.keys(MODULE_LABELS)).map(m => (
              <option key={m} value={m}>{MODULE_LABELS[m] || m}</option>
            ))}
          </select>
          {/* Action */}
          <select
            value={filters.action}
            onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
            className="px-3 py-2 border border-border-primary rounded-lg text-sm focus:outline-none bg-white"
          >
            <option value="">Todas las acciones</option>
            {Object.entries(ACTION_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          {/* Date from */}
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={filters.from}
              onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
              className="px-3 py-2 border border-border-primary rounded-lg text-sm focus:outline-none" />
            <input type="date" value={filters.to}
              onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
              className="px-3 py-2 border border-border-primary rounded-lg text-sm focus:outline-none" />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={resetFilters}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border-primary rounded-lg hover:bg-surface-hover transition">
            Limpiar
          </button>
          <button onClick={applyFilters}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-glamor-primary text-white rounded-lg hover:bg-glamor-primary-hover transition">
            <Filter className="w-4 h-4" /> Filtrar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-glamor-primary" />
            <h3 className="font-semibold">Registro de actividad</h3>
          </div>
          <span className="text-xs text-muted-foreground">{total.toLocaleString()} registros</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-glamor-primary" /></div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">No hay registros para los filtros seleccionados</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-surface-secondary text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium">Acción</th>
                  <th className="text-left px-4 py-3 font-medium">Módulo</th>
                  <th className="text-left px-4 py-3 font-medium">Descripción</th>
                  <th className="text-left px-4 py-3 font-medium">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map(log => (
                  <tr key={log.id} className="hover:bg-surface-hover/50">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-muted-foreground capitalize">
                        {MODULE_LABELS[log.module] || log.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm truncate" title={log.description || ''}>
                        {log.description || <span className="text-muted-foreground italic">—</span>}
                      </p>
                      {log.entityId && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          #{log.entityId.slice(-8)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{log.userName || '—'}</p>
                      <p className="text-xs text-muted-foreground">{log.userEmail || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                      {log.ipAddress || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Página {page} de {totalPages} · {total} registros
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg border border-border-primary hover:bg-surface-hover disabled:opacity-40 transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 rounded-lg border border-border-primary hover:bg-surface-hover disabled:opacity-40 transition">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
