'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { ArrowLeft, Loader2, Package, CheckCircle, XCircle, AlertCircle, Clock, Truck } from 'lucide-react';

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

export default function PurchaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuthStore();
  const purchaseId = params.id as string;

  const [purchase, setPurchase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!token) return;
    fetchPurchase();
  }, [token, purchaseId]);

  const fetchPurchase = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/purchases/${purchaseId}`, { token: token! });
      setPurchase(data);
      // Initialize receive quantities to pending amounts
      const qtys: Record<string, number> = {};
      data.items?.forEach((item: any) => {
        qtys[item.id] = Math.max(0, item.quantity - item.receivedQuantity);
      });
      setReceiveQtys(qtys);
    } catch (e: any) {
      setError('Compra no encontrada');
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async () => {
    if (!purchase) return;
    setReceiving(true);
    setError('');
    try {
      const items = Object.entries(receiveQtys)
        .filter(([_, qty]) => qty > 0)
        .map(([itemId, quantityReceived]) => ({ itemId, quantityReceived }));

      if (items.length === 0) {
        setError('No hay cantidades para recibir');
        setReceiving(false);
        return;
      }

      await api.post(`/purchases/${purchaseId}/receive`, { items }, { token: token! });
      await fetchPurchase(); // Reload
    } catch (e: any) {
      setError(e.message || 'Error al recibir');
    } finally {
      setReceiving(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('¿Cancelar esta orden de compra?')) return;
    setCancelling(true);
    setError('');
    try {
      await api.post(`/purchases/${purchaseId}/cancel`, {}, { token: token! });
      await fetchPurchase();
    } catch (e: any) {
      setError(e.message || 'Error al cancelar');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-surface-hover rounded" />
          <div className="h-64 bg-white rounded-xl border border-border-primary" />
        </div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="max-w-3xl">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <div className="text-center py-16 bg-white rounded-xl border border-border-primary">
          <p className="text-muted-foreground">{error || 'Compra no encontrada'}</p>
        </div>
      </div>
    );
  }

  const isPending = purchase.status === 'pending';
  const isPartial = purchase.status === 'partial';
  const isReceived = purchase.status === 'received';
  const isCancelled = purchase.status === 'cancelled';
  const canReceive = isPending || isPartial;
  const canCancel = isPending || isPartial;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-surface-hover">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{purchase.purchaseNumber}</h1>
              <StatusBadge status={purchase.status} colors={PURCHASE_STATUS_COLORS} />
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              {purchase.supplier?.businessName} · {new Date(purchase.createdAt).toLocaleDateString('es-MX')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canReceive && (
            <button
              onClick={handleReceive}
              disabled={receiving}
              className="flex items-center gap-2 h-9 px-4 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
            >
              {receiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              {receiving ? 'Recibiendo...' : 'Recibir'}
            </button>
          )}
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex items-center gap-2 h-9 px-4 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition disabled:opacity-50"
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Cancelar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-border-primary p-4 shadow-card">
          <p className="text-xs text-muted-foreground mb-1">Proveedor</p>
          <p className="text-sm font-semibold text-foreground">{purchase.supplier?.businessName}</p>
          <p className="text-xs text-muted-foreground">{purchase.supplier?.supplierNumber}</p>
        </div>
        <div className="bg-white rounded-xl border border-border-primary p-4 shadow-card">
          <p className="text-xs text-muted-foreground mb-1">Total</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(purchase.total)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border-primary p-4 shadow-card">
          <p className="text-xs text-muted-foreground mb-1">Estado pago</p>
          <StatusBadge status={purchase.paymentStatus} colors={PAYMENT_STATUS_COLORS} />
        </div>
        <div className="bg-white rounded-xl border border-border-primary p-4 shadow-card">
          <p className="text-xs text-muted-foreground mb-1">Items</p>
          <p className="text-lg font-bold text-foreground">{purchase.items?.length || 0}</p>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white rounded-xl border border-border-primary overflow-hidden shadow-card">
        <div className="px-4 py-3 border-b border-border-primary bg-surface-primary/30">
          <h2 className="font-semibold text-foreground text-sm">Productos</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-primary bg-surface-primary/50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Producto</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase w-20">Cant.</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase w-24">Precio</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase w-24">Subtotal</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase w-24">Recibido</th>
              {canReceive && <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase w-28">Recibir ahora</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {purchase.items?.map((item: any) => {
              const remaining = item.quantity - item.receivedQuantity;
              const isItemReceived = remaining <= 0;
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isItemReceived ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-orange-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.product?.name}</p>
                        <p className="text-xs text-muted-foreground">{item.product?.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-foreground">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-sm text-foreground">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-foreground">{formatCurrency(item.total)}</td>
                  <td className="px-4 py-3 text-center">
                    {isItemReceived ? (
                      <span className="text-sm font-medium text-green-600">{item.receivedQuantity}/{item.quantity}</span>
                    ) : (
                      <span className="text-sm font-medium text-orange-600">{item.receivedQuantity}/{item.quantity}</span>
                    )}
                  </td>
                  {canReceive && (
                    <td className="px-4 py-3 text-center">
                      {isItemReceived ? (
                        <span className="text-xs text-green-600 font-medium">Completo ✓</span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          max={remaining}
                          value={receiveQtys[item.id] ?? 0}
                          onChange={e => setReceiveQtys(prev => ({ ...prev, [item.id]: parseInt(e.target.value) || 0 }))}
                          className="w-16 h-8 text-center rounded border border-border-primary text-sm focus:outline-none focus:ring-1 focus:ring-glamor-primary/30"
                        />
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {purchase.notes && (
        <div className="mt-4 bg-white rounded-xl border border-border-primary p-4 shadow-card">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notas</p>
          <p className="text-sm text-foreground">{purchase.notes}</p>
        </div>
      )}

      {/* Received info */}
      {purchase.receivedAt && (
        <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="w-4 h-4" />
          Recibida el {new Date(purchase.receivedAt).toLocaleDateString('es-MX')} a las {new Date(purchase.receivedAt).toLocaleTimeString('es-MX')}
        </div>
      )}
    </div>
  );
}
