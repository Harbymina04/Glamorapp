'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useStoreCart } from '@/stores/store-cart';
import { Tag } from 'lucide-react';
import { formatCOP } from '@/lib/store-utils';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const router = useRouter();
  const { items, updateQty, removeItem, total, totalDiscountAmount, count } = useStoreCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Use empty state until client hydrates to avoid mismatch
  const clientItems        = mounted ? items : [];
  const clientCount        = mounted ? count() : 0;
  const clientTotal        = mounted ? total() : 0;
  const clientSavings      = mounted ? totalDiscountAmount() : 0;

  // Group by shopName
  const grouped: Record<string, typeof items> = {};
  clientItems.forEach(item => {
    const shop = item.shopName || 'Tienda';
    if (!grouped[shop]) grouped[shop] = [];
    grouped[shop].push(item);
  });

  const handleCheckout = () => {
    onClose();
    router.push('/tienda/checkout');
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#EF2D8F]" />
            Tu carrito <span className="text-sm font-normal text-gray-500">({clientCount} ítems)</span>
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {clientItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
              <ShoppingBag className="w-16 h-16 text-gray-200" />
              <div>
                <p className="font-semibold text-gray-600">Tu carrito está vacío</p>
                <p className="text-sm text-gray-400 mt-1">Agrega productos de tu salón favorito</p>
              </div>
            </div>
          ) : (
            Object.entries(grouped).map(([shop, shopItems]) => (
              <div key={shop}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-1 border-b border-gray-100">
                  {shop}
                </p>
                <div className="space-y-3">
                  {shopItems.map(item => (
                    <div key={item.productId} className="flex gap-3">
                      {/* Image */}
                      <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-pink-100 to-purple-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        {item.originalPrice ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs text-gray-400 line-through">{formatCOP(item.originalPrice)}</p>
                            <p className="text-sm font-bold text-red-600">{formatCOP(item.price)}</p>
                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded-full font-bold">-{item.discountPercent}%</span>
                          </div>
                        ) : (
                          <p className="text-sm font-bold text-gray-900">{formatCOP(item.price)}</p>
                        )}
                      </div>
                      {/* Controls */}
                      <div className="flex flex-col items-end gap-1">
                        <button onClick={() => removeItem(item.productId)} className="p-1 text-gray-400 hover:text-red-500 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-1">
                          <button onClick={() => updateQty(item.productId, item.qty - 1)}
                            className="p-0.5 hover:text-[#EF2D8F] transition">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-semibold w-5 text-center">{item.qty}</span>
                          <button onClick={() => updateQty(item.productId, item.qty + 1)}
                            className="p-0.5 hover:text-[#EF2D8F] transition">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {clientItems.length > 0 && (
          <div className="border-t border-gray-200 px-5 py-4 space-y-3">
            {clientSavings > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                <Tag className="w-3.5 h-3.5 shrink-0" />
                <span>Ahorras <strong>{formatCOP(clientSavings)}</strong> con descuentos</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total</span>
              <span className="font-semibold text-gray-900">{formatCOP(clientTotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span>Envío</span>
              <span className="font-semibold">Gratis</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900">
              <span>A pagar</span>
              <span>{formatCOP(clientTotal)}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full py-3 bg-[#EF2D8F] text-white rounded-xl font-semibold hover:bg-[#d4267e] transition text-sm"
            >
              Ir al checkout →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
