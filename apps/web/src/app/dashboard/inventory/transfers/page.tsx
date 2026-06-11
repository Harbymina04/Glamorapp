'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeftRight, Plus, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface Transfer {
  id: string;
  transferNumber: string;
  quantity: number;
  notes: string | null;
  createdAt: string;
  fromStore: { id: string; name: string };
  toStore: { id: string; name: string };
  fromProduct: { id: string; name: string; sku: string | null };
  toProduct: { id: string; name: string; sku: string | null };
}

export default function TransfersPage() {
  const { token, user } = useAuthStore();
  const storeId = user?.storeId ?? null;
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const limit = 20;

  const fetchTransfers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get(`/inventory/transfers?page=${page}&limit=${limit}`, { token });
      setTransfers(res.data ?? []);
      setTotal(res.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transferencias</h1>
          <p className="text-sm text-muted-foreground mt-1">Historial de movimientos entre sucursales</p>
        </div>
        <Link
          href="/dashboard/inventory/transfers/new"
          className="flex items-center gap-2 px-4 py-2 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary/90 transition"
        >
          <Plus className="w-4 h-4" />
          Nueva transferencia
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground text-sm">Cargando...</div>
      ) : transfers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ArrowLeftRight className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">Sin transferencias aún</p>
          <p className="text-muted-foreground text-sm mt-1">Crea una transferencia para mover stock entre sucursales</p>
          <Link
            href="/dashboard/inventory/transfers/new"
            className="mt-4 text-sm text-glamor-primary hover:underline"
          >
            Crear primera transferencia
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-border-primary overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Producto</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dirección</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Cantidad</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notas</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary">
                {transfers.map((t) => {
                  const isOutgoing = t.fromStore.id === storeId;
                  return (
                    <tr key={t.id} className="hover:bg-muted/20 transition">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {t.transferNumber}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{t.fromProduct.name}</p>
                        {t.fromProduct.sku && (
                          <p className="text-xs text-muted-foreground">{t.fromProduct.sku}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className={isOutgoing ? 'text-red-600 font-medium' : 'text-foreground'}>
                            {t.fromStore.name}
                          </span>
                          {isOutgoing
                            ? <ArrowRight className="w-3 h-3 text-red-400 shrink-0" />
                            : <ArrowLeft className="w-3 h-3 text-emerald-500 shrink-0" />
                          }
                          <span className={!isOutgoing ? 'text-emerald-600 font-medium' : 'text-foreground'}>
                            {t.toStore.name}
                          </span>
                          <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            isOutgoing
                              ? 'bg-red-50 text-red-600'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {isOutgoing ? 'Salida' : 'Entrada'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <span className={isOutgoing ? 'text-red-600' : 'text-emerald-600'}>
                          {isOutgoing ? '-' : '+'}{t.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                        {t.notes ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString('es-MX', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>{total} transferencias</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded hover:bg-muted disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 rounded hover:bg-muted disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
