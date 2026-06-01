'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, CreditCard, Smartphone, Building2, Store, Loader2, ShoppingBag } from 'lucide-react';
import { useStoreCart } from '@/stores/store-cart';
import { storeApi, formatCOP } from '@/lib/store-utils';

const PAYMENT_METHODS = [
  { id: 'card', label: 'Tarjeta débito/crédito', icon: <CreditCard className="w-5 h-5" /> },
  { id: 'pse', label: 'PSE', icon: <Building2 className="w-5 h-5" /> },
  { id: 'nequi', label: 'Nequi', icon: <Smartphone className="w-5 h-5" /> },
  { id: 'store', label: 'Pagar en tienda', icon: <Store className="w-5 h-5" /> },
];

const STEPS = ['Carrito', 'Datos', 'Pago', 'Confirmación'];

export default function CheckoutPage() {
  const { items, total, clearCart } = useStoreCart();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('store');
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Group items by shop
  const grouped: Record<string, typeof items> = {};
  items.forEach(item => {
    const key = item.shopName || 'Tienda';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  const shopSubtotals = Object.entries(grouped).map(([shop, shopItems]) => ({
    shop,
    subtotal: shopItems.reduce((s, i) => s + i.price * i.qty, 0),
    tenantId: shopItems[0]?.tenantId,
  }));

  const handleSubmit = async () => {
    if (!form.name || !form.phone) return;
    setSubmitting(true);
    try {
      // Create one order per shop
      let lastOrder: any = null;
      for (const { shop, subtotal, tenantId } of shopSubtotals) {
        const shopItems = grouped[shop].map(i => ({ name: i.name, qty: i.qty, price: i.price }));
        lastOrder = await storeApi.post('/storefront/public/orders', {
          tenantId,
          buyerName: form.name,
          buyerPhone: form.phone,
          buyerEmail: form.email || undefined,
          buyerNotes: form.notes || undefined,
          items: shopItems,
          subtotal,
          total: subtotal,
          paymentMethod,
        });
      }
      setOrderNumber(lastOrder?.orderNumber || 'GA-XXXXX');
      clearCart();
      setStep(3);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // Success screen
  if (step === 3) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">¡Pedido realizado!</h1>
        <p className="text-gray-500 mb-4">Tu pedido ha sido registrado exitosamente.</p>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-8">
          <p className="text-xs text-gray-500 mb-1">Número de orden</p>
          <p className="text-xl font-mono font-bold text-[#EF2D8F]">{orderNumber}</p>
        </div>
        <p className="text-sm text-gray-500 mb-8">El salón procesará tu pedido y te contactará en breve.</p>
        <Link href="/tienda"
          className="inline-flex items-center gap-2 px-8 py-3 bg-[#EF2D8F] text-white rounded-full font-bold hover:bg-[#d4267e] transition">
          Seguir comprando
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500 mb-6">Tu carrito está vacío</p>
        <Link href="/tienda" className="px-8 py-3 bg-[#EF2D8F] text-white rounded-full font-bold hover:bg-[#d4267e] transition">
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-0 mb-10 max-w-lg mx-auto">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-0 flex-1">
            <div className={`flex flex-col items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i <= step ? 'bg-[#EF2D8F] text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {i + 1}
              </div>
              <p className="text-xs text-gray-500 mt-1 whitespace-nowrap">{s}</p>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mb-5 ${i < step ? 'bg-[#EF2D8F]' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Left: form */}
        <div className="col-span-2 space-y-6">
          {/* Items summary */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-gray-900">Resumen de productos</h3>
            {Object.entries(grouped).map(([shop, shopItems]) => (
              <div key={shop}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{shop}</p>
                {shopItems.map(item => (
                  <div key={item.productId} className="flex justify-between py-1.5 text-sm">
                    <span className="text-gray-700">{item.name} × {item.qty}</span>
                    <span className="font-semibold text-gray-900">{formatCOP(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Buyer info */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-gray-900">Tus datos</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Nombre completo *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
                  placeholder="Tu nombre completo" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Teléfono *</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
                  placeholder="+57 300 000 0000" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
                  placeholder="tu@email.com" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Notas adicionales</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 resize-none"
                  placeholder="Instrucciones especiales..." />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-gray-900">Método de pago</h3>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map(pm => (
                <button key={pm.id} onClick={() => setPaymentMethod(pm.id)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition text-left ${
                    paymentMethod === pm.id
                      ? 'border-[#EF2D8F] bg-pink-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <span className={paymentMethod === pm.id ? 'text-[#EF2D8F]' : 'text-gray-400'}>{pm.icon}</span>
                  <span className={`text-sm font-medium ${paymentMethod === pm.id ? 'text-[#EF2D8F]' : 'text-gray-700'}`}>{pm.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: summary */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 sticky top-24">
            <h3 className="font-bold text-gray-900">Tu pedido</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{items.reduce((s, i) => s + i.qty, 0)} productos de {Object.keys(grouped).length} tienda{Object.keys(grouped).length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCOP(total())}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Envío</span>
                <span className="font-medium">Gratis</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span>
                <span>{formatCOP(total())}</span>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={submitting || !form.name || !form.phone}
              className="w-full py-3.5 bg-[#EF2D8F] text-white rounded-xl font-bold hover:bg-[#d4267e] transition disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              {submitting ? 'Procesando...' : 'Confirmar pedido'}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Al confirmar aceptas los términos de servicio de Glamorapp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
