'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Scissors, Plus, Search, Pencil, Trash2, Loader2 } from 'lucide-react';

export default function ServicesPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search.trim()) params.set('search', search.trim());
      const res = await api.get(`/services?${params}`, { token });
      setServices(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => {
    if (!token) return;
    fetchServices();
  }, [fetchServices, token]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"? Se marcará como inactivo.`)) return;
    setDeletingId(id);
    try {
      await api.del(`/services/${id}`, { token: token! });
      setServices(prev => prev.filter(s => s.id !== id));
    } catch (e: any) {
      alert('No se pudo eliminar el servicio. Intenta de nuevo.');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = search.trim()
    ? services.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : services;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Servicios</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona los servicios ofrecidos en el salón</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/inventory/services/new')}
          className="flex items-center gap-2 h-10 px-4 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition"
        >
          <Plus className="w-4 h-4" /> Nuevo servicio
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Buscar servicios..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} resultados</span>
      </div>

      {loading ? (
        <LoadingSkeleton rows={8} cols={5} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-border-primary">
          <Scissors className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground text-sm">No se encontraron servicios</p>
          <button onClick={() => router.push('/dashboard/inventory/services/new')} className="mt-3 text-sm text-glamor-primary font-medium hover:underline">
            Crear primer servicio
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border-primary overflow-hidden shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary bg-surface-primary/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Servicio</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoría</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duración</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Precio</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s: any) => (
                <tr key={s.id} className="hover:bg-surface-hover/50 transition cursor-pointer" onClick={() => router.push(`/dashboard/inventory/services/${s.id}`)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.color || '#EF2D8F' }}>
                        <Scissors className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{s.name}</p>
                        {s.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{s.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{s.category || '—'}</td>
                  <td className="px-4 py-3 text-right text-sm text-muted-foreground">{s.durationMinutes} min</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-foreground">{formatCurrency(s.price)}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={s.isActive ? 'active' : 'inactive'} colors={{ active: 'bg-green-50 text-green-700 border-green-200', inactive: 'bg-gray-50 text-gray-600 border-gray-200' }} />
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => router.push(`/dashboard/inventory/services/${s.id}`)}
                        className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-glamor-primary transition"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        disabled={deletingId === s.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition disabled:opacity-50"
                        title="Eliminar"
                      >
                        {deletingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
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
