'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle, CreditCard, Smartphone, Building2, Store,
  Loader2, ShoppingBag, AlertCircle, ChevronDown, Truck,
} from 'lucide-react';
import { useStoreCart } from '@/stores/store-cart';
import { storeApi, formatCOP } from '@/lib/store-utils';
import { getToken } from '@/lib/auth';

// ─── Types ───────────────────────────────────────────────────────

interface PseBank {
  financialInstitutionCode: string;
  financialInstitutionName: string;
}

const PSE_DOC_TYPES = [
  { value: 'CC',  label: 'Cédula de ciudadanía' },
  { value: 'CE',  label: 'Cédula de extranjería' },
  { value: 'NIT', label: 'NIT' },
  { value: 'TI',  label: 'Tarjeta de identidad' },
  { value: 'PP',  label: 'Pasaporte' },
];

const PAYMENT_METHODS = [
  { id: 'pse',   label: 'PSE',               icon: <Building2 className="w-5 h-5" /> },
  { id: 'store', label: 'Pagar en tienda',   icon: <Store className="w-5 h-5" /> },
  { id: 'nequi', label: 'Nequi (próximamente)', icon: <Smartphone className="w-5 h-5" />, disabled: true },
  { id: 'card',  label: 'Tarjeta (próximamente)', icon: <CreditCard className="w-5 h-5" />, disabled: true },
];

const STEPS = ['Carrito', 'Datos', 'Pago', 'Confirmación'];

// ─── Component ───────────────────────────────────────────────────

export default function CheckoutPage() {
  const { items, total, subtotalBeforeDiscounts, totalDiscountAmount, clearCart } = useStoreCart();
  const [step, setStep]             = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pse');

  // Buyer form
  const [form, setForm] = useState({
    name: '', phone: '', email: '', notes: '',
  });
  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Delivery (solo carritos de una tienda; multi-tienda = recoger en tienda)
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [commerceCfg, setCommerceCfg] = useState<{
    acceptsDelivery: boolean; deliveryFee: number; minOrderAmount: number; freeDeliveryThreshold: number;
  } | null>(null);

  // PSE-specific fields
  const [pseBanks, setPseBanks]     = useState<PseBank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [pseForm, setPseForm] = useState({
    bankCode: '',
    userType: '0',        // '0' natural, '1' empresa
    docType: 'CC',
    docNumber: '',
  });
  const setPse = (k: string, v: string) => setPseForm(f => ({ ...f, [k]: v }));

  // Load PSE banks when PSE is selected
  useEffect(() => {
    if (paymentMethod !== 'pse' || pseBanks.length > 0) return;
    setBanksLoading(true);
    storeApi.get('/payments/pse/banks')
      .then((data: PseBank[]) => setPseBanks(data))
      .catch(() => setPseBanks([]))
      .finally(() => setBanksLoading(false));
  }, [paymentMethod]);

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
    items: shopItems,
  }));

  const singleShop = shopSubtotals.length === 1;

  // Config de comercio (envío/mínimo) del único tenant del carrito
  useEffect(() => {
    if (!singleShop || !shopSubtotals[0]?.tenantId) { setCommerceCfg(null); return; }
    storeApi.get(`/storefront/public/commerce/${shopSubtotals[0].tenantId}`)
      .then((cfg: any) => setCommerceCfg({
        acceptsDelivery: !!cfg?.acceptsDelivery,
        deliveryFee: Number(cfg?.deliveryFee ?? 0),
        minOrderAmount: Number(cfg?.minOrderAmount ?? 0),
        freeDeliveryThreshold: Number(cfg?.freeDeliveryThreshold ?? 0),
      }))
      .catch(() => setCommerceCfg(null));
  }, [singleShop, shopSubtotals[0]?.tenantId]);

  const isDelivery  = singleShop && deliveryMethod === 'delivery' && !!commerceCfg?.acceptsDelivery;
  // Envío gratis al superar el umbral (misma regla que createOrder en el backend)
  const freeThreshold  = commerceCfg?.freeDeliveryThreshold ?? 0;
  const freeDelivery   = freeThreshold > 0 && total() >= freeThreshold;
  const missingForFree = freeThreshold > 0 && !freeDelivery ? freeThreshold - total() : 0;
  const deliveryFee = isDelivery && !freeDelivery ? (commerceCfg?.deliveryFee ?? 0) : 0;
  const belowMinOrder = singleShop && (commerceCfg?.minOrderAmount ?? 0) > 0
    && total() < (commerceCfg!.minOrderAmount);

  // ── Submit ──────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.name || !form.phone) return;
    if (paymentMethod === 'pse' && shopSubtotals.length > 1) {
      // Una transacción PSE solo puede pagar UN pedido: con varias tiendas se
      // cobraría todo el carrito contra un pedido y los demás quedarían impagos.
      setSubmitError('PSE está disponible para una tienda a la vez. Paga cada tienda por separado o elige "Pagar en tienda".');
      return;
    }
    if (paymentMethod === 'pse' && (!pseForm.bankCode || !pseForm.docNumber || !form.email)) {
      setSubmitError('Para PSE completa: banco, tipo y número de documento, y correo electrónico.');
      return;
    }
    if (isDelivery && !deliveryAddress.trim()) {
      setSubmitError('Escribe la dirección de entrega para el domicilio.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      // 1. Create one order per shop
      let createdOrder: any = null;
      for (const { shop, subtotal, tenantId, items: shopItems } of shopSubtotals) {
        const orderItems = shopItems.map(i => ({
          productId: i.productId,
          name: i.name,
          qty: i.qty,
          price: i.price,
        }));
        // subtotal/total are recomputed server-side from authoritative
        // product prices — do not send them (rejected by validation).
        createdOrder = await storeApi.post('/storefront/public/orders', {
          tenantId,
          buyerName: form.name,
          buyerPhone: form.phone,
          buyerEmail: form.email || undefined,
          buyerNotes: form.notes || undefined,
          items: orderItems,
          paymentMethod,
          // Domicilio solo aplica en carritos de una tienda
          deliveryMethod: isDelivery ? 'delivery' : 'pickup',
          deliveryAddress: isDelivery ? deliveryAddress.trim() : undefined,
        }, getToken()); // token opcional → asocia el pedido a la cuenta si hay sesión
      }

      const orderNum: string = createdOrder?.orderNumber || 'GA-XXXXX';

      // 2. If PSE → create Wompi transaction and redirect to bank
      if (paymentMethod === 'pse') {
        const { shop, subtotal, tenantId } = shopSubtotals[0];
        const returnUrl = `${window.location.origin}/tienda/pago-resultado`;

        // Cobrar el total AUTORITATIVO del pedido (calculado por el servidor,
        // con descuentos aplicados). Si difiere del total local, el webhook
        // rechazaría el pago por monto insuficiente (AMOUNT_MISMATCH).
        const tx = await storeApi.post('/payments/pse/create', {
          orderNumber: orderNum,
          tenantId,
          amountCOP: Number(createdOrder?.total ?? total()),
          buyerFullName: form.name,
          buyerEmail: form.email,
          buyerPhone: form.phone,
          bankCode: pseForm.bankCode,
          userType: parseInt(pseForm.userType) as 0 | 1,
          docType: pseForm.docType,
          docNumber: pseForm.docNumber,
          redirectUrl: returnUrl,
        });

        clearCart();
        // Redirect to bank portal
        if (tx.redirectUrl) {
          window.location.href = tx.redirectUrl;
        } else {
          setOrderNumber(orderNum);
          setStep(3);
        }
        return;
      }

      // 3. Non-PSE → show confirmation screen
      setOrderNumber(orderNum);
      clearCart();
      setStep(3);

    } catch (e: any) {
      setSubmitError(e?.message || 'Ocurrió un error al procesar el pedido. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen (non-PSE) ──────────────────────────────────

  if (step === 3) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">¡Pedido realizado!</h1>
        <p className="text-gray-500 mb-4">Tu pedido fue registrado exitosamente.</p>
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

  // ── Main checkout form ──────────────────────────────────────

  const pseMissing   = paymentMethod === 'pse' && (!pseForm.bankCode || !pseForm.docNumber || !form.email);
  const pseMultiShop = paymentMethod === 'pse' && Object.keys(grouped).length > 1;
  const addressMissing = isDelivery && !deliveryAddress.trim();
  const canSubmit    = !submitting && !!form.name && !!form.phone
    && !pseMissing && !pseMultiShop && !addressMissing && !belowMinOrder;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-0 mb-10 max-w-lg mx-auto">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-0 flex-1">
            <div className={`flex flex-col items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i <= step ? 'bg-[#EF2D8F] text-white' : 'bg-gray-100 text-gray-400'
              }`}>{i + 1}</div>
              <p className="text-xs text-gray-500 mt-1 whitespace-nowrap">{s}</p>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mb-5 ${i < step ? 'bg-[#EF2D8F]' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-8">

        {/* ── Left: forms ── */}
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
                <input value={form.name} onChange={e => setF('name', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
                  placeholder="Tu nombre completo" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Teléfono *</label>
                <input value={form.phone} onChange={e => setF('phone', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
                  placeholder="+57 300 000 0000" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Email {paymentMethod === 'pse' && <span className="text-[#EF2D8F]">*</span>}
                </label>
                <input type="email" value={form.email} onChange={e => setF('email', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
                  placeholder="tu@email.com" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Notas adicionales</label>
                <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 resize-none"
                  placeholder="Instrucciones especiales..." />
              </div>
            </div>
          </div>

          {/* Delivery method (solo carritos de una tienda con domicilio activo) */}
          {singleShop && commerceCfg?.acceptsDelivery && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-gray-900">Entrega</h3>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setDeliveryMethod('pickup')}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition text-left ${
                    deliveryMethod === 'pickup' ? 'border-[#EF2D8F] bg-pink-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <Store className={`w-5 h-5 ${deliveryMethod === 'pickup' ? 'text-[#EF2D8F]' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${deliveryMethod === 'pickup' ? 'text-[#EF2D8F]' : 'text-gray-700'}`}>
                    Recoger en tienda
                  </span>
                </button>
                <button onClick={() => setDeliveryMethod('delivery')}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition text-left ${
                    deliveryMethod === 'delivery' ? 'border-[#EF2D8F] bg-pink-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <Truck className={`w-5 h-5 ${deliveryMethod === 'delivery' ? 'text-[#EF2D8F]' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${deliveryMethod === 'delivery' ? 'text-[#EF2D8F]' : 'text-gray-700'}`}>
                    Domicilio {freeDelivery || commerceCfg.deliveryFee === 0 ? '(gratis)' : `(+${formatCOP(commerceCfg.deliveryFee)})`}
                  </span>
                </button>
              </div>
              {deliveryMethod === 'delivery' && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Dirección de entrega *</label>
                  <textarea value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} rows={2}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 resize-none"
                    placeholder="Calle, número, barrio, ciudad, referencias..." />
                </div>
              )}
            </div>
          )}

          {/* Payment method selector */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-gray-900">Método de pago</h3>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map(pm => (
                <button key={pm.id} onClick={() => !pm.disabled && setPaymentMethod(pm.id)}
                  disabled={pm.disabled}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition text-left ${
                    pm.disabled
                      ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                      : paymentMethod === pm.id
                      ? 'border-[#EF2D8F] bg-pink-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <span className={pm.disabled ? 'text-gray-300' : paymentMethod === pm.id ? 'text-[#EF2D8F]' : 'text-gray-400'}>
                    {pm.icon}
                  </span>
                  <span className={`text-sm font-medium ${pm.disabled ? 'text-gray-400' : paymentMethod === pm.id ? 'text-[#EF2D8F]' : 'text-gray-700'}`}>
                    {pm.label}
                  </span>
                </button>
              ))}
            </div>

            {/* PSE extra fields */}
            {pseMultiShop && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Tu carrito tiene productos de varias tiendas. PSE está disponible para una tienda
                  a la vez: paga cada tienda por separado o elige <strong>Pagar en tienda</strong>.
                </p>
              </div>
            )}
            {paymentMethod === 'pse' && !pseMultiShop && (
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos para PSE</p>

                {/* Bank selector */}
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Banco *</label>
                  <div className="relative">
                    <select
                      value={pseForm.bankCode}
                      onChange={e => setPse('bankCode', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 bg-white"
                    >
                      <option value="">
                        {banksLoading ? 'Cargando bancos...' : 'Selecciona tu banco'}
                      </option>
                      {pseBanks.map(b => (
                        <option key={b.financialInstitutionCode} value={b.financialInstitutionCode}>
                          {b.financialInstitutionName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* User type */}
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Tipo de persona *</label>
                  <div className="flex gap-3">
                    {[{ v: '0', l: 'Natural' }, { v: '1', l: 'Jurídica' }].map(opt => (
                      <button key={opt.v} type="button" onClick={() => setPse('userType', opt.v)}
                        className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition ${
                          pseForm.userType === opt.v ? 'border-[#EF2D8F] text-[#EF2D8F] bg-pink-50' : 'border-gray-200 text-gray-700'
                        }`}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Doc type + number */}
                <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 block mb-1">Tipo de documento *</label>
                    <div className="relative">
                      <select
                        value={pseForm.docType}
                        onChange={e => setPse('docType', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 bg-white"
                      >
                        {PSE_DOC_TYPES.map(d => (
                          <option key={d.value} value={d.value}>{d.value} — {d.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-gray-600 block mb-1">Número de documento *</label>
                    <input
                      value={pseForm.docNumber}
                      onChange={e => setPse('docNumber', e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
                      placeholder="1234567890"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                {/* PSE info note */}
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <Building2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    Serás redirigido al portal de tu banco para completar el pago de forma segura.
                    Procesado por <strong>Wompi</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: order summary ── */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 sticky top-24">
            <h3 className="font-bold text-gray-900">Tu pedido</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{items.reduce((s, i) => s + i.qty, 0)} productos de {Object.keys(grouped).length} tienda{Object.keys(grouped).length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span><span>{formatCOP(subtotalBeforeDiscounts())}</span>
              </div>
              {totalDiscountAmount() > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>🎉 Descuentos</span>
                  <span>-{formatCOP(totalDiscountAmount())}</span>
                </div>
              )}
              <div className={`flex justify-between ${deliveryFee > 0 ? 'text-gray-600' : 'text-green-600'}`}>
                <span>Envío</span>
                <span className="font-medium">
                  {isDelivery ? (deliveryFee > 0 ? formatCOP(deliveryFee) : 'Gratis') : 'Recoger en tienda'}
                </span>
              </div>
              {isDelivery && missingForFree > 0 && (
                <div className="flex items-start gap-2 p-2.5 bg-pink-50 border border-pink-100 rounded-lg text-xs text-[#EF2D8F]">
                  <Truck className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Agrega {formatCOP(missingForFree)} más y el envío te sale <strong>gratis</strong>.</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span><span>{formatCOP(total() + deliveryFee)}</span>
              </div>
              {belowMinOrder && (
                <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>El pedido mínimo de esta tienda es {formatCOP(commerceCfg!.minOrderAmount)}.</span>
                </div>
              )}
            </div>

            {submitError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full py-3.5 bg-[#EF2D8F] text-white rounded-xl font-bold hover:bg-[#d4267e] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</>
                : paymentMethod === 'pse'
                ? <><Building2 className="w-5 h-5" /> Pagar con PSE</>
                : <><CheckCircle className="w-5 h-5" /> Confirmar pedido</>
              }
            </button>

            {paymentMethod === 'pse' && (
              <p className="text-xs text-gray-400 text-center">
                Pago seguro procesado por Wompi · Bancolombia
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
