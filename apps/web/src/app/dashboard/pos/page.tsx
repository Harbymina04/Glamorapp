'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore, getApplicableDiscount } from '@/stores/cart-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import {
  Package, ShoppingCart, Minus, Plus, Trash2, User, CreditCard,
  Search, Banknote, Loader2, CheckCircle2, X, Landmark, Smartphone,
  Percent, Printer, Clock, RefreshCw, Eye, Undo2, Pause, Play,
  UserPlus, Barcode, AlertTriangle, ArrowRightLeft, Square, CircleDollarSign,
  ArrowDownToLine, ArrowUpFromLine, ClipboardList, DollarSign,
  FileText, FilePlus, Send, FileCheck, Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScopeGate } from '@/hooks/use-plan-gate';

type PaymentMethod = 'cash' | 'card' | 'transfer';
type ViewMode = 'pos' | 'history' | 'register';

interface SplitPayment { method: PaymentMethod; amount: string; }
interface HeldSale { id: string; cart: any; customerId: string; customerName: string; discountPercent: number; timestamp: number; }
// performedBy: map from cart item id → { userId, userName }
type PerformerMap = Record<string, { userId: string; userName: string }>;

function POSContent() {
  const { token, user } = useAuthStore();
  const cart = useCartStore();
  const searchParams = useSearchParams();
  const preloadOrderId = searchParams.get('orderId');

  // Pre-load cart from a storefront order (Cobrar en POS)
  useEffect(() => {
    if (!preloadOrderId || !token) return;
    api.get(`/storefront/orders/${preloadOrderId}/pos-cart`, { token })
      .then((data: any) => {
        if (!data?.cartItems?.length) return;
        cart.clearCart();
        data.cartItems.forEach((item: any) => {
          cart.addItem({
            productId: item.productId,
            itemType: 'product' as const,
            name: item.name,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            discountAmount: 0,
            ivaRate: Number(item.ivaRate ?? 19),
            isIvaExcluded: item.isIvaExcluded ?? false,
          });
        });
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadOrderId, token]);
  const [products, setProducts] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [skuSearch, setSkuSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState<'products' | 'services'>('products');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [lastSale, setLastSale] = useState<any>(null);
  const [saleNotes, setSaleNotes] = useState('');

  // Customer
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ firstName: '', lastName: '', phone: '' });
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);

  // Discount & Payment
  const [discountInput, setDiscountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [useSplitPayment, setUseSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([
    { method: 'cash', amount: '' }, { method: 'card', amount: '' },
  ]);
  const [cashReceived, setCashReceived] = useState('');

  // View & History
  const [viewMode, setViewMode] = useState<ViewMode>('pos');
  const [sales, setSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [showSaleDetail, setShowSaleDetail] = useState<any>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Refund
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [refundItems, setRefundItems] = useState<{ saleItemId: string; quantity: number }[]>([]);
  const [refundReason, setRefundReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('cash');
  const [refunding, setRefunding] = useState(false);

  // Held sales
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);

  // Performer (collaborator) per service item
  const [performers, setPerformers] = useState<PerformerMap>({});
  const [collaborators, setCollaborators] = useState<any[]>([]);

  // Electronic invoice modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceSaleData, setInvoiceSaleData] = useState<any>(null);
  const [invoiceResult, setInvoiceResult] = useState<any>(null);

  // Quotation modal
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  // Discount campaigns
  const [activeDiscounts, setActiveDiscounts] = useState<any[]>([]);

  // Cash Register
  const [registerSession, setRegisterSession] = useState<any>(null);
  const [showOpenRegister, setShowOpenRegister] = useState(false);
  const [showCloseRegister, setShowCloseRegister] = useState(false);
  const [showCashMovement, setShowCashMovement] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [closingBalance, setClosingBalance] = useState('');
  const [registerNotes, setRegisterNotes] = useState('');
  const [selectedRegisterId, setSelectedRegisterId] = useState('');
  const [registers, setRegisters] = useState<any[]>([]);
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [movementDesc, setMovementDesc] = useState('');
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [pastSessions, setPastSessions] = useState<any[]>([]);

  // Held sales are kept in memory only (no localStorage) to avoid
  // persisting sensitive financial data in the browser.

  // Load products
  useEffect(() => {
    if (!token) return;
    api.get(selectedTab === 'products' ? '/products?limit=50' : '/services', { token: token! })
      .then(res => setProducts(res.data || []))
      .catch(console.error);
  }, [selectedTab, token]);

  // Load collaborators (store users) once
  useEffect(() => {
    if (!token) return;
    api.get('/users?limit=100', { token: token! })
      .then(res => setCollaborators(
        (res.data || []).filter((u: any) => u.isActive !== false && u.role === 'professional')
      ))
      .catch(() => {});
  }, [token]);

  // Tax rates are now per-product — this effect is kept only as a no-op fallback
  // to avoid breaking any code that references it. IVA is calculated per item in the cart.

  // Load active discount campaigns
  useEffect(() => {
    if (!token) return;
    api.get('/discounts/active', { token })
      .then((data: any[]) => {
        setActiveDiscounts(data || []);
        cart.setDiscounts(data || []);
      })
      .catch(() => {});
  }, [token]);

  // Load store tax mode (taxInclusive) so cart totals match the backend
  useEffect(() => {
    if (!token) return;
    api.get('/settings/pos-config', { token })
      .then((cfg: any) => {
        if (cfg && typeof cfg.taxInclusive === 'boolean') cart.setTaxInclusive(cfg.taxInclusive);
      })
      .catch(() => {});
  }, [token]);

  // Load cash register session
  useEffect(() => {
    if (!token) return;
    api.get('/cash-register/session/active', { token })
      .then(res => { if (res && res.id) setRegisterSession(res); else setRegisterSession(null); })
      .catch(() => setRegisterSession(null));
  }, [token]);

  // SKU search
  useEffect(() => {
    if (!skuSearch.trim() || !token) return;
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/products?search=${encodeURIComponent(skuSearch)}&limit=5`, { token });
        const match = (res.data || []).find((p: any) => p.sku === skuSearch || p.barcode === skuSearch);
        if (match) { addToCart(match); setSkuSearch(''); }
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [skuSearch]);

  const searchCustomers = async (q: string) => {
    setCustomerSearch(q);
    if (q.length < 2) { setCustomers([]); return; }
    setSearchingCustomers(true);
    try { const res = await api.get(`/customers?search=${encodeURIComponent(q)}&limit=10`, { token: token! }); setCustomers(res.data || []); }
    catch { setCustomers([]); }
    finally { setSearchingCustomers(false); }
  };

  const assignCustomer = (c: any) => { cart.setCustomer(c.id, `${c.firstName} ${c.lastName}`); setShowCustomerModal(false); setCustomerSearch(''); };
  const assignQuickCustomer = async () => {
    if (!quickCustomer.firstName.trim()) return;
    try {
      const c = await api.post('/customers', {
        firstName: quickCustomer.firstName.trim(), lastName: quickCustomer.lastName.trim() || '.',
        phone: quickCustomer.phone.trim() || undefined,
      }, { token: token! });
      assignCustomer(c);
      setShowQuickCustomer(false);
      setQuickCustomer({ firstName: '', lastName: '', phone: '' });
    } catch (e: any) { setError(e.message || 'Error al crear cliente'); }
  };

  const addToCart = (item: any) => {
    const stock = selectedTab === 'products' ? item.currentStock : 999;
    const existingInCart = cart.items.find(i => i.productId === item.id);
    const currentQty = existingInCart?.quantity || 0;
    if (selectedTab === 'products' && currentQty >= stock) {
      setError(`Stock insuficiente: ${item.name} (${stock} disponible${currentQty > 0 ? `, ${currentQty} en carrito` : ''})`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    setError('');

    const unitPrice = selectedTab === 'products' ? Number(item.salePrice) : Number(item.price);
    // IVA per product: stored in product.ivaRate, services default to 19% in Colombia
    const ivaRate = selectedTab === 'products' ? Number(item.ivaRate ?? 19) : 19;
    const isIvaExcluded = selectedTab === 'products' ? (item.isIvaExcluded ?? false) : false;

    // Apply campaign discount automatically
    const applicable = getApplicableDiscount(
      {
        productId:  selectedTab === 'products' ? item.id : undefined,
        serviceId:  selectedTab === 'services' ? item.id : undefined,
        itemType:   selectedTab === 'products' ? 'product' : 'service',
        categoryId: item.categoryId ?? undefined,
      },
      activeDiscounts,
    );
    const discountPct    = applicable ? Number(applicable.discountPercent) : 0;
    const discountAmount = discountPct > 0 ? (unitPrice * discountPct) / 100 : 0;

    cart.addItem({
      productId:              selectedTab === 'products' ? item.id : undefined,
      serviceId:              selectedTab === 'services' ? item.id : undefined,
      itemType:               selectedTab === 'products' ? 'product' : 'service',
      name:                   item.name,
      unitPrice,
      quantity:               1,
      discountAmount,
      ivaRate,
      isIvaExcluded,
      appliedDiscountPercent: discountPct,
      discountId:             applicable?.id,
      categoryId:             item.categoryId ?? undefined,
    });
  };

  const subtotal = cart.getSubtotal(); const discount = cart.getDiscountAmount();
  const tax = cart.getTax(); const total = cart.getTotal();
  const change = paymentMethod === 'cash' && !useSplitPayment ? Math.max(0, parseFloat(cashReceived) - total) : 0;

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(filter.toLowerCase()))
  );

  const handleCobrar = () => {
    if (cart.items.length === 0) return; setError('');
    setPaymentMethod('cash'); setUseSplitPayment(false); setCashReceived('');
    setSplitPayments([{ method: 'cash', amount: '' }, { method: 'card', amount: '' }]);
    setShowPaymentModal(true);
  };

  const applyDiscount = () => {
    const pct = parseFloat(discountInput);
    if (isNaN(pct) || pct < 0 || pct > 100) cart.setDiscount(0);
    else cart.setDiscount(pct);
  };

  const getPaymentAmounts = () => {
    if (!useSplitPayment) return [{ paymentMethod, amount: total }];
    return splitPayments.filter(p => p.amount && parseFloat(p.amount) > 0).map(p => ({ paymentMethod: p.method, amount: parseFloat(p.amount) }));
  };

  const splitTotal = splitPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const splitRemaining = total - splitTotal;

  const handleConfirmPayment = async () => {
    setProcessing(true); setError('');
    try {
      const sale = await api.post('/sales', {
        customerId: cart.customerId || undefined, discountPercent: cart.discountPercent,
        items: cart.items.map(i => ({
          productId: i.productId, serviceId: i.serviceId, itemType: i.itemType,
          name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, discountAmount: i.discountAmount,
          ivaRate: i.ivaRate, isIvaExcluded: i.isIvaExcluded,
          // Include performer for service items
          performedBy: i.itemType === 'service' ? (performers[i.id]?.userId || undefined) : undefined,
        })),
        notes: saleNotes || undefined,
      }, { token: token! });
      const payments = getPaymentAmounts();
      await api.post(`/sales/${sale.id}/complete`, { payments }, { token: token! });

      // If sale came from a storefront order, link them
      if (preloadOrderId) {
        await api.post(`/storefront/orders/${preloadOrderId}/link-sale`, { saleId: sale.id }, { token: token! }).catch(() => {});
      }

      const completedSale = await api.get(`/sales/${sale.id}`, { token: token! });
      setLastSale(completedSale);
      cart.clearCart(); setDiscountInput(''); setSaleNotes(''); setPerformers({}); setShowPaymentModal(false);
      // Refresh register session
      if (registerSession) {
        api.get('/cash-register/reconciliation', { token }).then(r => { if (r) setReconciliation(r); }).catch(() => {});
      }
    } catch (e: any) { setError(e.message || 'Error al procesar la venta'); }
    finally { setProcessing(false); }
  };

  const handleCancelSale = async (saleId: string) => {
    if (!confirm('¿Anular esta venta?')) return;
    setCancellingId(saleId);
    try { await api.post(`/sales/${saleId}/cancel`, { reason: 'Anulación desde POS' }, { token: token! }); fetchSales(); }
    catch { alert('No se pudo completar la operación. Intenta de nuevo.'); }
    finally { setCancellingId(null); }
  };

  // Held sales
  const holdSale = () => {
    if (cart.items.length === 0) return;
    const sale: HeldSale = {
      id: Date.now().toString(), cart: { items: [...cart.items], customerId: cart.customerId, customerName: cart.customerName, discountPercent: cart.discountPercent },
      customerId: cart.customerId, customerName: cart.customerName, discountPercent: cart.discountPercent, timestamp: Date.now()
    };
    const updated = [...heldSales, sale];
    setHeldSales(updated);
    // held sales stay in memory only
    cart.clearCart(); setDiscountInput('');
  };

  const resumeSale = (sale: HeldSale) => {
    cart.clearCart();
    if (sale.cart.customerId) cart.setCustomer(sale.cart.customerId, sale.cart.customerName || '');
    if (sale.cart.discountPercent) cart.setDiscount(sale.cart.discountPercent);
    sale.cart.items.forEach((i: any) => cart.addItem(i));
    setDiscountInput(sale.cart.discountPercent ? String(sale.cart.discountPercent) : '');
    const updated = heldSales.filter(h => h.id !== sale.id);
    setHeldSales(updated);
    // held sales stay in memory only
  };

  const removeHeldSale = (id: string) => {
    const updated = heldSales.filter(h => h.id !== id);
    setHeldSales(updated);
    // held sales stay in memory only
  };

  // Cash Register
  const openRegister = async () => {
    setProcessing(true);
    try { const s = await api.post('/cash-register/session/open', { openingBalance: parseFloat(openingBalance) || 0, notes: registerNotes, registerId: selectedRegisterId || undefined }, { token: token! }); setRegisterSession(s); setShowOpenRegister(false); setOpeningBalance('0'); setRegisterNotes(''); setSelectedRegisterId(''); }
    catch (e: any) { setError(e.message); }
    finally { setProcessing(false); }
  };

  const closeRegister = async () => {
    setProcessing(true);
    try { await api.post('/cash-register/session/close', { closingBalance: parseFloat(closingBalance) || 0, notes: registerNotes }, { token: token! }); setRegisterSession(null); setShowCloseRegister(false); setClosingBalance(''); setRegisterNotes(''); }
    catch (e: any) { setError(e.message); }
    finally { setProcessing(false); }
  };

  const addMovement = async () => {
    if (!movementAmount || parseFloat(movementAmount) <= 0 || !movementReason.trim()) return;
    setProcessing(true);
    try { await api.post('/cash-register/movement', { type: movementType, amount: parseFloat(movementAmount), reason: movementReason, description: movementDesc }, { token: token! }); setShowCashMovement(false); setMovementAmount(''); setMovementReason(''); setMovementDesc(''); setMovementType('in'); fetchRegisterData(); }
    catch (e: any) { setError(e.message); }
    finally { setProcessing(false); }
  };

  const fetchRegisterData = async () => {
    if (!token) return;
    const s = await api.get('/cash-register/session/active', { token }).catch(() => null);
    setRegisterSession(s && s.id ? s : null);
    if (s && s.id) {
      const r = await api.get('/cash-register/reconciliation', { token }).catch(() => null);
      setReconciliation(r);
    }
    // Always load past sessions for history
    const sessionsRes = await api.get('/cash-register/sessions?limit=20', { token }).catch(() => null);
    setPastSessions(sessionsRes || []);
  };

  const fetchSales = async () => { setLoadingSales(true); try { const res = await api.get('/sales?limit=50', { token: token! }); setSales(res.data || []); } catch { setSales([]); } finally { setLoadingSales(false); } };

  const openRefundModal = (sale: any) => { setSelectedSale(sale); setRefundItems(sale.items.map((i: any) => ({ saleItemId: i.id, quantity: 0 }))); setRefundReason(''); setRefundMethod((sale.payments?.[0]?.paymentMethod as PaymentMethod) || 'cash'); setShowRefundModal(true); };

  const handleRefund = async () => {
    const itemsToRefund = refundItems.filter(i => i.quantity > 0);
    if (itemsToRefund.length === 0 || !refundReason) return;
    setRefunding(true);
    try { await api.post(`/sales/${selectedSale.id}/refund`, { items: itemsToRefund, reason: refundReason, refundMethod }, { token: token! }); setShowRefundModal(false); fetchSales(); }
    catch { alert('No se pudo completar la operación. Intenta de nuevo.'); }
    finally { setRefunding(false); }
  };

  const handlePrint = () => {
    if (!lastSale) return;
    const now = new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    const pm = lastSale.payments || [];
    const paymentLabels: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' };

    // Build IVA breakdown from sale items (group by ivaRate)
    const ivaMap = new Map<number, { base: number; amount: number }>();
    (lastSale.items || []).forEach((i: any) => {
      const rate = Number(i.ivaRate ?? 19);
      const amount = Number(i.ivaAmount ?? 0);
      const base = Number(i.total) - amount;
      const prev = ivaMap.get(rate) ?? { base: 0, amount: 0 };
      ivaMap.set(rate, { base: prev.base + base, amount: prev.amount + amount });
    });
    const ivaRows = Array.from(ivaMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([rate, v]) =>
        `<div class="row" style="font-size:11px"><span>IVA ${rate}% (base $${v.base.toLocaleString('es-CO', {minimumFractionDigits:0})})</span><span>$${v.amount.toLocaleString('es-CO', {minimumFractionDigits:0})}</span></div>`
      ).join('');

    const win = window.open('', '_blank', 'width=300,height=700');
    if (win) {
      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket ${lastSale.saleNumber}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;width:80mm;padding:8px}.center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:6px 0}.row{display:flex;justify-content:space-between;margin:2px 0}@media print{body{-webkit-print-color-adjust:exact}}</style></head><body>
<div class="center bold" style="font-size:14px">Glamorapp</div>
<div class="center" style="font-size:11px">Beauty Studio</div>
<div class="line"></div>
<div class="center bold">${lastSale.saleNumber}</div>
<div class="center" style="font-size:11px">${now}</div>
${lastSale.customer ? `<div class="center" style="font-size:11px">Cliente: ${lastSale.customer.firstName} ${lastSale.customer.lastName}</div>` : ''}
<div class="center" style="font-size:11px">Atendió: ${user?.firstName || ''} ${user?.lastName || ''}</div>
<div class="line"></div>
${(lastSale.items || []).map((i: any) => `<div class="row"><span>${i.name} x${i.quantity}</span><span>$${Number(i.unitPrice * i.quantity - (i.discountAmount || 0)).toLocaleString('es-CO', {minimumFractionDigits:0})}</span></div>`).join('')}
<div class="line"></div>
<div class="row"><span>Subtotal (sin IVA)</span><span>$${(Number(lastSale.total) - Number(lastSale.taxAmount)).toLocaleString('es-CO', {minimumFractionDigits:0})}</span></div>
${Number(lastSale.discountAmount) > 0 ? `<div class="row"><span>Descuento (${lastSale.discountPercent}%)</span><span>-$${Number(lastSale.discountAmount).toLocaleString('es-CO', {minimumFractionDigits:0})}</span></div>` : ''}
${ivaRows}
<div class="row bold"><span>TOTAL</span><span>$${Number(lastSale.total).toLocaleString('es-CO', {minimumFractionDigits:0})}</span></div>
<div class="line"></div>
${pm.map((p: any) => `<div class="row" style="font-size:11px"><span>${paymentLabels[p.paymentMethod] || p.paymentMethod}</span><span>$${Number(p.amount).toLocaleString('es-CO', {minimumFractionDigits:0})}</span></div>`).join('')}
<div class="line"></div>
<div class="center" style="font-size:10px">Documento equivalente POS</div>
<div class="center" style="font-size:10px">Precios incluyen IVA</div>
<div class="center" style="font-size:11px">¡Gracias por tu preferencia!</div>
</body></html>`);
      win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 500);
    }
  };

  const handlePrintInvoice = (inv: any) => {
    const now = new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    const win = window.open('', '_blank', 'width=680,height=900');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Factura ${inv.invoiceNumber}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;padding:24px;max-width:680px;margin:auto}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:16px;border-bottom:2px solid #333}
    .title{font-size:20px;font-weight:bold;color:#333}.subtitle{font-size:11px;color:#666;margin-top:2px}
    .badge{background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;padding:8px 14px;text-align:right}
    .badge-num{font-size:18px;font-weight:bold;color:#111}.badge-date{font-size:10px;color:#666;margin-top:2px}
    .section{margin:14px 0}.section-title{font-size:11px;font-weight:bold;color:#666;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}.field{margin-bottom:5px}
    .field-label{font-size:10px;color:#888}.field-value{font-size:12px;font-weight:500}
    table{width:100%;border-collapse:collapse;margin:10px 0}
    th{background:#f9fafb;text-align:left;padding:7px 8px;font-size:11px;color:#555;border-bottom:2px solid #e5e7eb}
    td{padding:7px 8px;font-size:11px;border-bottom:1px solid #f3f4f6}.text-right{text-align:right}
    .totals{margin-left:auto;width:240px;margin-top:10px}
    .total-row{display:flex;justify-content:space-between;padding:4px 0;font-size:12px}
    .total-final{font-size:16px;font-weight:bold;border-top:2px solid #333;padding-top:8px;margin-top:4px}
    .footer{margin-top:20px;padding-top:12px;border-top:1px dashed #ccc;text-align:center;font-size:10px;color:#888}
    .status{display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:bold;background:#dcfce7;color:#15803d}
    @media print{body{padding:10px}}</style></head><body>
    <div class="header">
      <div><div class="title">💅 Glamorapp</div><div class="subtitle">Factura Electrónica de Venta</div></div>
      <div class="badge"><div class="badge-num">${inv.invoiceNumber || 'BORRADOR'}</div><div class="badge-date">${now}</div><div style="margin-top:4px"><span class="status">${inv.status === 'approved' ? 'Aprobada DIAN' : inv.status === 'draft' ? 'Borrador' : inv.status}</span></div></div>
    </div>
    <div class="two-col">
      <div class="section"><div class="section-title">Emisor</div>
        <div class="field"><div class="field-label">Razón social</div><div class="field-value">${inv.fiscalConfig?.businessName || 'Glamorapp'}</div></div>
        <div class="field"><div class="field-label">NIT</div><div class="field-value">${inv.fiscalConfig?.idNumber || ''}-${inv.fiscalConfig?.dv || ''}</div></div>
      </div>
      <div class="section"><div class="section-title">Receptor</div>
        <div class="field"><div class="field-label">Nombre</div><div class="field-value">${inv.receiverName}</div></div>
        ${inv.receiverIdNumber ? `<div class="field"><div class="field-label">${inv.receiverIdType?.toUpperCase() || 'ID'}</div><div class="field-value">${inv.receiverIdNumber}</div></div>` : ''}
        ${inv.receiverEmail ? `<div class="field"><div class="field-label">Email</div><div class="field-value">${inv.receiverEmail}</div></div>` : ''}
        ${inv.receiverPhone ? `<div class="field"><div class="field-label">Teléfono</div><div class="field-value">${inv.receiverPhone}</div></div>` : ''}
      </div>
    </div>
    <div class="section"><div class="section-title">Ítems</div>
    <table><thead><tr><th>Descripción</th><th class="text-right">Cant.</th><th class="text-right">Precio unit.</th><th class="text-right">IVA</th><th class="text-right">Total</th></tr></thead>
    <tbody>${(inv.items || []).map((it: any) => `<tr><td>${it.description}</td><td class="text-right">${it.quantity}</td><td class="text-right">$${Number(it.unitPrice).toLocaleString('es-CO')}</td><td class="text-right">${it.ivaRate || 0}%</td><td class="text-right">$${Number(it.total).toLocaleString('es-CO')}</td></tr>`).join('')}</tbody></table></div>
    <div class="totals">
      <div class="total-row"><span>Subtotal</span><span>$${Number(inv.subtotal).toLocaleString('es-CO')}</span></div>
      ${Number(inv.discountAmount) > 0 ? `<div class="total-row" style="color:#dc2626"><span>Descuentos</span><span>-$${Number(inv.discountAmount).toLocaleString('es-CO')}</span></div>` : ''}
      <div class="total-row"><span>IVA</span><span>$${Number(inv.ivaAmount).toLocaleString('es-CO')}</span></div>
      <div class="total-row total-final"><span>TOTAL</span><span>$${Number(inv.total).toLocaleString('es-CO')}</span></div>
    </div>
    ${inv.notes ? `<div class="section" style="margin-top:14px"><div class="section-title">Observaciones</div><p style="font-size:11px;color:#555">${inv.notes}</p></div>` : ''}
    <div class="footer"><p>Resolución DIAN N° ${inv.fiscalConfig?.resolutionNumber || '—'} · Generada el ${now}</p><p>¡Gracias por preferirnos!</p></div>
    </body></html>`);
    win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 500);
  };

  if (lastSale) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="bg-white rounded-2xl border border-border-primary shadow-card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">¡Venta completada!</h2>
          <p className="text-muted-foreground text-sm mb-4">Venta {lastSale.saleNumber}</p>
          {lastSale.customer && <p className="text-sm text-muted-foreground mb-4">Cliente: {lastSale.customer.firstName} {lastSale.customer.lastName}</p>}
          <div className="bg-surface-primary/50 rounded-xl p-4 mb-6 text-left space-y-2">
            {lastSale.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm"><span className="text-foreground">{item.name} <span className="text-muted-foreground">x{item.quantity}</span></span><span className="font-medium">{formatCurrency(item.total)}</span></div>
            ))}
            <div className="border-t border-border-primary pt-2 mt-2 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(lastSale.subtotal)}</span></div>
              {Number(lastSale.discountAmount) > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Descuento ({lastSale.discountPercent}%)</span><span className="text-red-500">-{formatCurrency(lastSale.discountAmount)}</span></div>}
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA</span><span>{formatCurrency(lastSale.taxAmount)}</span></div>
              <div className="flex justify-between text-base font-bold pt-1 border-t border-border-primary"><span>Total</span><span className="text-glamor-primary">{formatCurrency(lastSale.total)}</span></div>
            </div>
          </div>
          {invoiceResult && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <FileCheck className="w-4 h-4 shrink-0" />
                <span>Factura <strong>{invoiceResult.invoiceNumber}</strong> generada</span>
              </div>
              <button onClick={() => handlePrintInvoice(invoiceResult)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">
                <Printer className="w-3.5 h-3.5" /> Imprimir factura
              </button>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex gap-3">
              <button onClick={handlePrint} className="flex-1 h-11 border-2 border-glamor-primary text-glamor-primary hover:bg-glamor-primary/5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> Ticket</button>
              {!invoiceResult && (
                <button onClick={() => { setInvoiceSaleData(lastSale); setShowInvoiceModal(true); }} className="flex-1 h-11 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 rounded-lg font-semibold text-sm flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" /> Factura electrónica
                </button>
              )}
            </div>
            <button onClick={() => { setLastSale(null); setInvoiceResult(null); }} className="w-full h-11 bg-glamor-primary hover:bg-glamor-primary-hover text-white rounded-lg font-semibold text-sm">Nueva venta</button>
          </div>
        </div>

        {/* Invoice modal — must be inside the early return block */}
        {showInvoiceModal && invoiceSaleData && (
          <ElectronicInvoiceModal
            sale={invoiceSaleData}
            token={token!}
            onClose={() => setShowInvoiceModal(false)}
            onSuccess={(inv: any) => { setInvoiceResult(inv); setShowInvoiceModal(false); }}
            onPrint={handlePrintInvoice}
          />
        )}
      </div>
    );
  }

  const methodLabel: Record<PaymentMethod, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' };
  const methodIcon: Record<PaymentMethod, React.ReactNode> = { cash: <Banknote className="w-5 h-5" />, card: <CreditCard className="w-5 h-5" />, transfer: <Smartphone className="w-5 h-5" /> };
  const methods: PaymentMethod[] = ['cash', 'card', 'transfer'];

  return (
    <div className="flex gap-6 h-[calc(100vh-120px)]">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — Row 1: Navigation + tabs */}
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => { setViewMode('pos'); setLastSale(null); }} className={cn('px-3 py-2 rounded-lg text-sm font-medium transition', viewMode === 'pos' ? 'bg-glamor-primary text-white' : 'bg-white border border-border-primary text-muted-foreground')}><ShoppingCart className="w-4 h-4 inline mr-1" />Vender</button>
          <button onClick={() => { setViewMode('history'); fetchSales(); }} className={cn('px-3 py-2 rounded-lg text-sm font-medium transition', viewMode === 'history' ? 'bg-glamor-primary text-white' : 'bg-white border border-border-primary text-muted-foreground')}><Clock className="w-4 h-4 inline mr-1" />Historial</button>
          <button onClick={() => { setViewMode('register'); fetchRegisterData(); }} className={cn('px-3 py-2 rounded-lg text-sm font-medium transition', viewMode === 'register' ? 'bg-glamor-primary text-white' : 'bg-white border border-border-primary text-muted-foreground')}><CircleDollarSign className="w-4 h-4 inline mr-1" />Caja</button>

          {viewMode === 'pos' && <>
            <div className="w-px h-6 bg-border-primary mx-1" />
            <button onClick={() => setSelectedTab('products')} className={cn('px-3 py-2 rounded-lg text-sm font-medium transition', selectedTab === 'products' ? 'bg-glamor-primary text-white' : 'bg-white border border-border-primary text-muted-foreground')}>Productos</button>
            <button onClick={() => setSelectedTab('services')} className={cn('px-3 py-2 rounded-lg text-sm font-medium transition', selectedTab === 'services' ? 'bg-glamor-primary text-white' : 'bg-white border border-border-primary text-muted-foreground')}>Servicios</button>
          </>}
        </div>

        {/* Top bar — Row 2: Search fields + register warning */}
        {viewMode === 'pos' && <>
          <div className="flex items-center gap-3 mb-3">
            {/* SKU search */}
            <div className="relative w-44">
              <Barcode className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={skuSearch} onChange={e => setSkuSearch(e.target.value)} placeholder="SKU/Código" className="w-full h-9 pl-8 pr-2 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20" />
            </div>
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Buscar productos..." className="w-full h-9 pl-9 pr-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20" />
            </div>
          </div>
          {/* Register warning when no session open */}
          {!registerSession && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <span className="text-sm text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Debes abrir la caja para realizar ventas
              </span>
              <button onClick={() => { setViewMode('register'); setTimeout(() => setShowOpenRegister(true), 100); }}
                className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition">
                Abrir caja
              </button>
            </div>
          )}
        </>}

        <div className="flex-1 overflow-auto">
          {viewMode === 'pos' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map(item => {
                const stock = selectedTab === 'products' ? item.currentStock : 999;
                const imgUrl = item.images?.[0]?.url || item.imageUrl;
                const itemDiscount = getApplicableDiscount(
                  { productId: selectedTab === 'products' ? item.id : undefined, serviceId: selectedTab === 'services' ? item.id : undefined, itemType: selectedTab === 'products' ? 'product' : 'service', categoryId: item.categoryId },
                  activeDiscounts,
                );
                const basePrice = selectedTab === 'products' ? Number(item.salePrice) : Number(item.price);
                const discountedPrice = itemDiscount ? basePrice * (1 - Number(itemDiscount.discountPercent) / 100) : null;
                return (
                <button key={item.id} onClick={() => addToCart(item)} className="bg-white rounded-xl border border-border-primary p-3 text-left hover:border-glamor-primary/40 hover:shadow-card-hover transition">
                  <div className="w-full h-20 rounded-lg bg-surface-hover flex items-center justify-center mb-2 overflow-hidden relative">
                    {imgUrl ? <img src={imgUrl.startsWith('http') ? imgUrl : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}${imgUrl}`} alt={item.name} className="w-full h-full object-cover" /> : <Package className="w-8 h-8 text-muted-foreground" />}
                    {selectedTab === 'products' && stock <= (item.minStock || 5) && (
                      <span className={cn('absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold', stock === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700')}>
                        {stock === 0 ? 'Sin stock' : `Quedan ${stock}`}
                      </span>
                    )}
                    {itemDiscount && (
                      <span className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {Number(itemDiscount.discountPercent)}% OFF
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  {discountedPrice != null ? (
                    <div className="mt-0.5">
                      <p className="text-[11px] text-muted-foreground line-through leading-tight">{formatCurrency(basePrice)}</p>
                      <p className="text-sm font-bold text-red-600 leading-tight">{formatCurrency(discountedPrice)}</p>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-glamor-primary mt-0.5">{formatCurrency(basePrice)}</p>
                  )}
                  {item.sku && <p className="text-[10px] text-muted-foreground truncate">{item.sku}</p>}
                </button>
              )})}
            </div>
          )}

          {viewMode === 'history' && (
            <div className="bg-white rounded-xl border border-border-primary overflow-hidden">
              {loadingSales ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div> :
               sales.length === 0 ? <div className="text-center py-16 text-muted-foreground text-sm">No hay ventas recientes</div> :
               <div className="overflow-auto max-h-full">
                <table className="w-full text-sm">
                  <thead className="bg-surface-primary/50 text-left"><tr><th className="px-4 py-3 font-medium text-muted-foreground">Venta</th><th className="px-4 py-3 font-medium text-muted-foreground">Cliente</th><th className="px-4 py-3 font-medium text-muted-foreground">Total</th><th className="px-4 py-3 font-medium text-muted-foreground">Estado</th><th className="px-4 py-3 font-medium text-muted-foreground">Fecha</th><th className="px-4 py-3 font-medium text-muted-foreground">Acciones</th></tr></thead>
                  <tbody className="divide-y divide-border-primary">
                    {sales.map((s: any) => (
                      <tr key={s.id} className="hover:bg-surface-hover/50">
                        <td className="px-4 py-3 font-medium">{s.saleNumber}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.customer ? `${s.customer.firstName} ${s.customer.lastName}` : '—'}</td>
                        <td className="px-4 py-3 font-medium">{formatCurrency(s.total)}</td>
                        <td className="px-4 py-3">
                          {s.status === 'completed' && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Completada</span>}
                          {s.status === 'cancelled' && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Anulada</span>}
                          {s.status === 'refunded' && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Devuelta</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(s.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setLastSale(s); setViewMode('pos'); }} title="Ver detalle" className="p-1.5 rounded hover:bg-surface-hover text-muted-foreground"><Eye className="w-4 h-4" /></button>
                            <button onClick={() => { setLastSale(s); setTimeout(() => handlePrint(), 200); }} title="Imprimir ticket" className="p-1.5 rounded hover:bg-surface-hover text-muted-foreground"><Printer className="w-4 h-4" /></button>
                            {s.status === 'completed' && (
                              <>
                                {!s.invoiceId && (
                                  <button onClick={() => { setInvoiceSaleData(s); setInvoiceResult(null); setShowInvoiceModal(true); }} title="Generar factura electrónica" className="p-1.5 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600"><FileText className="w-4 h-4" /></button>
                                )}
                                <button onClick={() => openRefundModal(s)} title="Devolución" className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"><Undo2 className="w-4 h-4" /></button>
                                <button onClick={() => handleCancelSale(s.id)} disabled={cancellingId === s.id} title="Anular" className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600">{cancellingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
            </div>
          )}

          {viewMode === 'register' && (
            <div className="space-y-4">
              {!registerSession ? (
                <div className="bg-white rounded-xl border border-border-primary p-6 shadow-card text-center">
                  <CircleDollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="text-muted-foreground text-sm mb-4">No hay caja abierta</p>
                  <button onClick={() => setShowOpenRegister(true)} className="px-6 py-2.5 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition">Abrir caja</button>
                </div>
              ) : (
                <>
                  {/* Register status */}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" /><span className="font-semibold text-green-800 text-sm">Caja abierta</span></div>
                      <span className="text-xs text-green-600">{new Date(registerSession.openedAt).toLocaleString('es-MX')}</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Abierta por: {registerSession.openedByUser?.firstName} {registerSession.openedByUser?.lastName}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => { setMovementType('in'); setShowCashMovement(true); }} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition flex items-center gap-1"><ArrowDownToLine className="w-3 h-3" /> Entrada</button>
                      <button onClick={() => { setMovementType('out'); setShowCashMovement(true); }} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition flex items-center gap-1"><ArrowUpFromLine className="w-3 h-3" /> Salida</button>
                      <button onClick={() => setShowCloseRegister(true)} className="ml-auto px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition">Cerrar caja</button>
                    </div>
                  </div>

                  {/* Reconciliation */}
                  {reconciliation && (
                    <div className="bg-white rounded-xl border border-border-primary p-6 shadow-card">
                      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-glamor-primary" /> Cuadre de caja</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-surface-primary/50 rounded-lg"><p className="text-xs text-muted-foreground">Saldo inicial</p><p className="text-lg font-bold">{formatCurrency(reconciliation.summary.openingBalance)}</p></div>
                        <div className="p-3 bg-surface-primary/50 rounded-lg"><p className="text-xs text-muted-foreground">Ventas efectivo</p><p className="text-lg font-bold text-green-600">{formatCurrency(reconciliation.summary.cashSales)}</p></div>
                        <div className="p-3 bg-surface-primary/50 rounded-lg"><p className="text-xs text-muted-foreground">Ventas tarjeta</p><p className="text-lg font-bold">{formatCurrency(reconciliation.summary.cardSales)}</p></div>
                        <div className="p-3 bg-surface-primary/50 rounded-lg"><p className="text-xs text-muted-foreground">Ventas transferencia</p><p className="text-lg font-bold">{formatCurrency(reconciliation.summary.transferSales)}</p></div>
                        <div className="p-3 bg-surface-primary/50 rounded-lg"><p className="text-xs text-muted-foreground">Entradas extra</p><p className="text-lg font-bold text-green-600">{formatCurrency(reconciliation.summary.cashIns)}</p></div>
                        <div className="p-3 bg-surface-primary/50 rounded-lg"><p className="text-xs text-muted-foreground">Salidas</p><p className="text-lg font-bold text-red-600">{formatCurrency(reconciliation.summary.cashOuts)}</p></div>
                        <div className="p-3 bg-glamor-primary/10 rounded-lg col-span-2"><p className="text-xs text-muted-foreground">Efectivo esperado</p><p className="text-xl font-bold text-glamor-primary">{formatCurrency(reconciliation.summary.expectedCash)}</p></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Ventas del turno: {reconciliation.summary.salesCount} · Total: {formatCurrency(reconciliation.summary.totalSales)}</p>
                    </div>
                  )}

                  {/* Recent movements */}
                  {registerSession.movements?.length > 0 && (
                    <div className="bg-white rounded-xl border border-border-primary overflow-hidden shadow-card">
                      <h3 className="px-4 py-2.5 font-semibold text-foreground text-sm border-b border-border-primary">Últimos movimientos</h3>
                      <table className="w-full text-sm">
                        <thead className="bg-surface-primary/50"><tr><th className="text-left px-4 py-2 text-xs text-muted-foreground">Tipo</th><th className="text-left px-4 py-2 text-xs text-muted-foreground">Motivo</th><th className="text-right px-4 py-2 text-xs text-muted-foreground">Monto</th><th className="text-right px-4 py-2 text-xs text-muted-foreground">Hora</th></tr></thead>
                        <tbody className="divide-y divide-border">
                          {registerSession.movements.slice(0, 10).map((m: any) => (
                            <tr key={m.id}><td className="px-4 py-2"><span className={cn('text-xs font-medium', m.type === 'in' ? 'text-green-600' : 'text-red-600')}>{m.type === 'in' ? '+' : '-'}{formatCurrency(m.amount)}</span></td><td className="px-4 py-2 text-xs text-muted-foreground">{m.reason}</td><td className="px-4 py-2 text-right text-xs font-medium">{formatCurrency(m.amount)}</td><td className="px-4 py-2 text-right text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* Session History */}
              {pastSessions.filter(s => s.status === 'closed').length > 0 && (
                <div className="bg-white rounded-xl border border-border-primary overflow-hidden shadow-card">
                  <h3 className="px-4 py-2.5 font-semibold text-foreground text-sm border-b border-border-primary flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Historial de cierres
                  </h3>
                  <table className="w-full text-sm">
                    <thead className="bg-surface-primary/50">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground">Apertura</th>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground">Cierre</th>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground">Abrió</th>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground">Cerró</th>
                        <th className="text-right px-4 py-2 text-xs text-muted-foreground">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pastSessions.filter(s => s.status === 'closed').slice(0, 10).map((s: any) => (
                        <tr key={s.id}>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {new Date(s.openedAt).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {s.closedAt ? new Date(s.closedAt).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="px-4 py-2 text-xs">{s.openedByUser?.firstName} {s.openedByUser?.lastName?.charAt(0)}.</td>
                          <td className="px-4 py-2 text-xs">{s.closedByUser ? `${s.closedByUser.firstName} ${s.closedByUser.lastName?.charAt(0)}.` : '—'}</td>
                          <td className={cn('px-4 py-2 text-xs text-right font-medium', Number(s.difference || 0) === 0 ? 'text-green-600' : 'text-red-600')}>
                            {s.difference != null ? (Number(s.difference) >= 0 ? '+' : '') + formatCurrency(s.difference) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right - Cart */}
      {viewMode === 'pos' && (
      <div className="w-96 bg-white rounded-xl border border-border-primary flex flex-col shadow-card">
        <div className="p-4 border-b border-border-primary">
          <div className="flex items-center gap-2 mb-3"><ShoppingCart className="w-5 h-5 text-glamor-primary" /><h2 className="font-semibold text-foreground">Venta actual</h2></div>
          {/* Customer selector */}
          <div className="flex gap-1">
            <button onClick={() => setShowCustomerModal(true)} className={cn('flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition', cart.customerName ? 'border-glamor-primary/40 bg-glamor-primary/5 text-foreground' : 'border-border-primary text-muted-foreground hover:bg-surface-hover')}>
              <User className="w-4 h-4" />{cart.customerName || 'Asignar cliente'}
              {cart.customerName && <X className="w-3.5 h-3.5 ml-auto hover:text-red-500" onClick={e => { e.stopPropagation(); cart.setCustomer('', ''); }} />}
            </button>
            <button onClick={() => { setQuickCustomer({ firstName: '', lastName: '', phone: '' }); setShowQuickCustomer(true); }} className="p-2 rounded-lg border border-border-primary text-muted-foreground hover:bg-glamor-primary/10 hover:text-glamor-primary transition" title="Cliente rápido"><UserPlus className="w-4 h-4" /></button>
          </div>

          {/* Held sales */}
          {heldSales.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border-primary">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Pause className="w-3 h-3" /> Ventas pausadas</p>
              <div className="flex flex-wrap gap-1">
                {heldSales.map(h => (
                  <div key={h.id} className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs">
                    <span className="font-medium">{h.cart.items.length} items</span>
                    <span className="text-muted-foreground">{formatCurrency(h.cart.items.reduce((s: number, i: any) => s + i.unitPrice * i.quantity, 0))}</span>
                    <button onClick={() => resumeSale(h)} className="text-green-600 hover:text-green-800"><Play className="w-3 h-3" /></button>
                    <button onClick={() => removeHeldSale(h.id)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && <div className="mx-4 mt-2 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}<button onClick={() => setError('')} className="ml-auto"><X className="w-3 h-3" /></button></div>}

        {/* Cart items */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {cart.items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Agrega productos o servicios</div>
          ) : cart.items.map(item => (
            <div key={item.id} className="py-2 border-b border-border-primary/50">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  {(item.appliedDiscountPercent ?? 0) > 0 ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs text-muted-foreground line-through">{formatCurrency(item.unitPrice)} c/u</p>
                      <p className="text-xs font-medium text-red-600">{formatCurrency(item.unitPrice - item.discountAmount)} c/u</p>
                      <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded font-bold">-{item.appliedDiscountPercent ?? 0}%</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.unitPrice)} c/u</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => cart.updateQuantity(item.id, item.quantity - 1)} className="p-1 rounded hover:bg-surface-hover"><Minus className="w-3.5 h-3.5" /></button>
                  <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                  <button onClick={() => cart.updateQuantity(item.id, item.quantity + 1)} className="p-1 rounded hover:bg-surface-hover"><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <button onClick={() => { cart.removeItem(item.id); setPerformers(p => { const n = {...p}; delete n[item.id]; return n; }); }} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
              {/* Performer selector — only for services */}
              {item.itemType === 'service' && collaborators.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <User className="w-3 h-3 text-glamor-primary shrink-0" />
                  <select
                    value={performers[item.id]?.userId || ''}
                    onChange={e => {
                      const col = collaborators.find((c: any) => c.id === e.target.value);
                      if (col) setPerformers(p => ({ ...p, [item.id]: { userId: col.id, userName: `${col.firstName} ${col.lastName}` } }));
                      else setPerformers(p => { const n = {...p}; delete n[item.id]; return n; });
                    }}
                    className="flex-1 text-xs border border-glamor-primary/30 rounded-lg px-2 py-1 bg-glamor-primary/5 text-glamor-primary focus:outline-none"
                  >
                    <option value="">— ¿Quién lo realiza? —</option>
                    {collaborators.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="p-4 border-t border-border-primary space-y-2 bg-surface-primary/50">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-muted-foreground shrink-0" />
            {activeDiscounts.length > 0 && (
              <div className="flex items-center gap-2 px-2 py-1.5 mb-1 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                <Percent className="w-3.5 h-3.5 text-green-600 shrink-0" />
                <span><strong>{activeDiscounts.length}</strong> campaña{activeDiscounts.length > 1 ? 's' : ''} activa{activeDiscounts.length > 1 ? 's' : ''}</span>
              </div>
            )}
            <input type="number" min="0" max="100" value={discountInput} onChange={e => setDiscountInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyDiscount()} onBlur={applyDiscount} placeholder="Descuento %" className="flex-1 h-8 px-2 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20" />
            <span className="text-xs text-muted-foreground w-10 text-right">{cart.discountPercent > 0 ? `${cart.discountPercent}%` : ''}</span>
          </div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Descuento</span><span className="text-red-500">-{formatCurrency(discount)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA{cart.taxInclusive ? ' (incluido)' : ''}</span><span>{formatCurrency(tax)}</span></div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-border-primary"><span>Total</span><span className="text-glamor-primary">{formatCurrency(total)}</span></div>
          {/* Notes */}
          <input value={saleNotes} onChange={e => setSaleNotes(e.target.value)} placeholder="Notas de venta (opcional)" className="w-full h-8 px-2 rounded-lg border border-border-primary text-xs bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20" />
          <ScopeGate module="pos" action="create">
            <button onClick={registerSession ? handleCobrar : () => { setViewMode('register'); setTimeout(() => setShowOpenRegister(true), 100); }} disabled={cart.items.length === 0} className={cn('w-full h-12 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2', registerSession ? 'bg-glamor-primary hover:bg-glamor-primary-hover text-white disabled:opacity-50' : 'bg-amber-50 border-2 border-amber-300 text-amber-700 hover:bg-amber-100')}><CreditCard className="w-5 h-5" /> {registerSession ? `Cobrar ${formatCurrency(total)}` : 'Abre la caja para cobrar'}</button>
          </ScopeGate>
          {/* Hold sale */}
          {cart.items.length > 0 && (
            <div className="flex gap-2">
              <button onClick={holdSale} className="flex-1 h-9 border border-amber-300 text-amber-700 bg-amber-50 rounded-lg text-sm font-medium hover:bg-amber-100 transition flex items-center justify-center gap-1.5"><Pause className="w-3.5 h-3.5" /> Pausar</button>
              <button onClick={() => setShowQuoteModal(true)} className="flex-1 h-9 border border-indigo-300 text-indigo-700 bg-indigo-50 rounded-lg text-sm font-medium hover:bg-indigo-100 transition flex items-center justify-center gap-1.5"><FilePlus className="w-3.5 h-3.5" /> Cotización</button>
            </div>
          )}
        </div>
      </div>
      )}

      {/* MODALS — Payment */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/40" onClick={() => !processing && setShowPaymentModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
            <div className="p-6 pb-2"><div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-foreground">Cobrar venta</h3><button onClick={() => !processing && setShowPaymentModal(false)} disabled={processing} className="p-1.5 rounded-lg hover:bg-surface-hover"><X className="w-5 h-5" /></button></div></div>
            <div className="flex-1 overflow-auto px-6">
              <div className="bg-surface-primary/50 rounded-xl p-4 mb-4 space-y-1.5 text-sm">
                {cart.items.map(item => <div key={item.id} className="flex justify-between"><span>{item.name} x{item.quantity}</span><span className="font-medium">{formatCurrency(item.unitPrice * item.quantity)}</span></div>)}
                <div className="border-t border-border-primary pt-2 mt-2 space-y-1"><div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-red-500"><span>Descuento ({cart.discountPercent}%)</span><span>-{formatCurrency(discount)}</span></div>}
                <div className="flex justify-between text-muted-foreground"><span>IVA{cart.taxInclusive ? ' (incluido)' : ''}</span><span>{formatCurrency(tax)}</span></div>
                <div className="flex justify-between font-bold text-base pt-1 border-t border-border-primary"><span>Total</span><span className="text-glamor-primary">{formatCurrency(total)}</span></div></div>
              </div>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2"><label className="text-sm font-medium text-foreground">Método de pago</label>
                  {!useSplitPayment && <button onClick={() => setUseSplitPayment(true)} className="text-xs text-glamor-primary hover:underline">Pago mixto</button>}
                  {useSplitPayment && <button onClick={() => setUseSplitPayment(false)} className="text-xs text-muted-foreground hover:underline">Pago único</button>}
                </div>
                {!useSplitPayment && <div className="space-y-2">
                  {methods.map(m => <button key={m} onClick={() => setPaymentMethod(m)} className={cn('w-full flex items-center gap-3 p-3 rounded-xl border-2 transition', paymentMethod === m ? 'border-glamor-primary bg-glamor-primary/5' : 'border-border-primary hover:border-glamor-primary/30')}>
                    <span className={paymentMethod === m ? 'text-glamor-primary' : 'text-muted-foreground'}>{methodIcon[m]}</span>
                    <div className="text-left"><p className="text-sm font-medium text-foreground">{methodLabel[m]}</p></div>
                    {paymentMethod === m && <div className="ml-auto w-4 h-4 rounded-full bg-glamor-primary flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-white" /></div>}
                  </button>)}
                  {/* Cash received + change */}
                  {paymentMethod === 'cash' && (
                    <div className="mt-3 space-y-2 p-3 bg-green-50 rounded-xl border border-green-200">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-green-600" />
                        <input type="number" min="0" step="0.01" value={cashReceived} onChange={e => setCashReceived(e.target.value)} placeholder="Recibido" className="flex-1 h-9 px-3 rounded-lg border border-green-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300" />
                      </div>
                      {change > 0 && (
                        <div className="flex justify-between items-center bg-white rounded-lg p-2">
                          <span className="text-sm font-medium text-green-700">Cambio:</span>
                          <span className="text-lg font-bold text-green-600">{formatCurrency(change)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>}
                {useSplitPayment && <div className="space-y-3">{splitPayments.map((sp, i) => <div key={i} className="flex items-center gap-2"><select value={sp.method} onChange={e => { const u = [...splitPayments]; u[i] = { ...u[i], method: e.target.value as PaymentMethod }; setSplitPayments(u); }} className="h-10 px-2 rounded-lg border border-border-primary text-sm bg-white"><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option></select><input type="number" min="0" step="0.01" value={sp.amount} onChange={e => { const u = [...splitPayments]; u[i] = { ...u[i], amount: e.target.value }; setSplitPayments(u); }} placeholder="Monto" className="flex-1 h-10 px-3 rounded-lg border border-border-primary text-sm bg-white" /></div>)}<div className="flex justify-between text-xs text-muted-foreground"><span>Total: {formatCurrency(splitTotal)}</span><span className={splitRemaining < -0.01 ? 'text-red-500' : splitRemaining > 0.01 ? 'text-amber-500' : 'text-green-600'}>{splitRemaining < -0.01 ? `Exceso: ${formatCurrency(Math.abs(splitRemaining))}` : splitRemaining > 0.01 ? `Falta: ${formatCurrency(splitRemaining)}` : '✓ Exacto'}</span></div></div>}
              </div>
            </div>
            <div className="p-6 pt-0 space-y-4">
              <div><label className="block text-sm font-medium text-foreground mb-1.5">Total a cobrar</label><div className="w-full h-12 px-4 rounded-lg border border-border-primary bg-surface-hover flex items-center text-lg font-bold text-foreground">{formatCurrency(total)}</div></div>
              {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
              <div className="flex gap-3"><button onClick={() => setShowPaymentModal(false)} disabled={processing} className="flex-1 h-11 rounded-lg border border-border-primary text-sm font-medium text-muted-foreground hover:bg-surface-hover">Cancelar</button><button onClick={handleConfirmPayment} disabled={processing || (useSplitPayment && Math.abs(splitRemaining) > 0.01)} className="flex-1 h-11 bg-glamor-primary hover:bg-glamor-primary-hover text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2">{processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : <><Banknote className="w-4 h-4" /> Confirmar</>}</button></div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS — Customer selection, Quick Customer, Refund, Open Register, Close Register, Cash Movement */}
      {showCustomerModal && <CustomerModal search={customerSearch} setSearch={searchCustomers} customers={customers} loading={searchingCustomers} onSelect={assignCustomer} onClose={() => { setShowCustomerModal(false); setCustomerSearch(''); }} />}
      {showQuickCustomer && <QuickCustomerModal qc={quickCustomer} setQc={setQuickCustomer} onSave={assignQuickCustomer} onClose={() => setShowQuickCustomer(false)} />}
      {showRefundModal && selectedSale && <RefundModal sale={selectedSale} items={refundItems} setItems={setRefundItems} reason={refundReason} setReason={setRefundReason} method={refundMethod} setMethod={setRefundMethod} onRefund={handleRefund} loading={refunding} onClose={() => setShowRefundModal(false)} />}
      {showOpenRegister && <OpenRegisterModal balance={openingBalance} setBalance={setOpeningBalance} notes={registerNotes} setNotes={setRegisterNotes} selectedRegisterId={selectedRegisterId} setSelectedRegisterId={setSelectedRegisterId} registers={registers} setRegisters={setRegisters} token={token} onOpen={openRegister} loading={processing} onClose={() => setShowOpenRegister(false)} />}
      {showCloseRegister && <CloseRegisterModal balance={closingBalance} setBalance={setClosingBalance} notes={registerNotes} setNotes={setRegisterNotes} reconciliation={reconciliation} onClose={closeRegister} loading={processing} onCancel={() => setShowCloseRegister(false)} />}
      {showCashMovement && <CashMovementModal type={movementType} setType={setMovementType} amount={movementAmount} setAmount={setMovementAmount} reason={movementReason} setReason={setMovementReason} desc={movementDesc} setDesc={setMovementDesc} onSave={addMovement} loading={processing} onClose={() => setShowCashMovement(false)} />}
      {showInvoiceModal && invoiceSaleData && (
        <ElectronicInvoiceModal
          sale={invoiceSaleData}
          token={token!}
          onClose={() => setShowInvoiceModal(false)}
          onSuccess={(inv) => {
            setInvoiceResult(inv);
            setShowInvoiceModal(false);
            // Refresh history if we're in history view
            if (viewMode === 'history') fetchSales();
          }}
          onPrint={handlePrintInvoice}
        />
      )}
      {showQuoteModal && (
        <QuoteModal
          items={cart.items}
          customerName={cart.customerName}
          discountPercent={cart.discountPercent}
          subtotal={subtotal}
          discount={discount}
          tax={tax}
          total={total}
          token={token!}
          storeName={user?.firstName ? `Glamorapp` : 'Glamorapp'}
          userName={`${user?.firstName || ''} ${user?.lastName || ''}`}
          onClose={() => setShowQuoteModal(false)}
        />
      )}
    </div>
  );
}

export default function POSPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-glamor-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <POSContent />
    </Suspense>
  );
}

// ─── Modal Components ──────────────────────────────────────────

function CustomerModal({ search, setSearch, customers, loading, onSelect, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold">Seleccionar cliente</h3><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover"><X className="w-5 h-5" /></button></div>
        <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="w-full h-10 pl-9 pr-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20" /></div>
        <div className="max-h-64 overflow-auto space-y-1">
          {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div> : customers.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No encontrado</p> : customers.map((c: any) => <button key={c.id} onClick={() => onSelect(c)} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover text-left"><div className="w-9 h-9 rounded-full bg-glamor-primary/10 flex items-center justify-center text-sm font-semibold text-glamor-primary">{c.firstName?.[0]}{c.lastName?.[0]}</div><div><p className="text-sm font-medium">{c.firstName} {c.lastName}</p><p className="text-xs text-muted-foreground">{c.phone || c.email || 'Sin contacto'}</p></div></button>)}
        </div>
      </div>
    </div>
  );
}

function QuickCustomerModal({ qc, setQc, onSave, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-lg font-bold mb-4">Cliente rápido</h3>
        <div className="space-y-3">
          <input autoFocus placeholder="Nombre" value={qc.firstName} onChange={(e: any) => setQc({ ...qc, firstName: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm" />
          <input placeholder="Apellido" value={qc.lastName} onChange={(e: any) => setQc({ ...qc, lastName: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm" />
          <input placeholder="Teléfono (opcional)" value={qc.phone} onChange={(e: any) => setQc({ ...qc, phone: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm" />
        </div>
        <div className="flex gap-3 mt-4"><button onClick={onClose} className="flex-1 h-10 rounded-lg border border-border-primary text-sm">Cancelar</button><button onClick={onSave} className="flex-1 h-10 bg-glamor-primary text-white rounded-lg text-sm font-medium">Crear y asignar</button></div>
      </div>
    </div>
  );
}

function RefundModal({ sale, items, setItems, reason, setReason, method, setMethod, onRefund, loading, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="p-6 pb-2"><div className="flex items-center justify-between"><h3 className="text-lg font-bold">Devolución — {sale.saleNumber}</h3><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover"><X className="w-5 h-5" /></button></div></div>
        <div className="flex-1 overflow-auto px-6">
          {sale.items?.map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-border-primary mb-2">
              <div className="flex-1"><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.quantity} x {formatCurrency(item.unitPrice)}</p></div>
              <div className="flex items-center gap-2"><button onClick={() => setItems(items.map((i: any) => i.saleItemId === item.id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i))} className="w-7 h-7 rounded border flex items-center justify-center"><Minus className="w-3 h-3" /></button><span className="text-sm font-medium w-6 text-center">{items.find((i: any) => i.saleItemId === item.id)?.quantity || 0}</span><button onClick={() => setItems(items.map((i: any) => i.saleItemId === item.id && i.quantity < item.quantity ? { ...i, quantity: i.quantity + 1 } : i))} className="w-7 h-7 rounded border flex items-center justify-center"><Plus className="w-3 h-3" /></button></div>
            </div>
          ))}
          <select value={reason} onChange={(e: any) => setReason(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm mb-3"><option value="">Motivo...</option><option value="Producto defectuoso">Producto defectuoso</option><option value="Cambio de opinión">Cambio de opinión</option><option value="Error en venta">Error en venta</option><option value="Otro">Otro</option></select>
          <div className="flex gap-2 mb-4">{(['cash', 'card', 'transfer'] as PaymentMethod[]).map(m => <button key={m} onClick={() => setMethod(m)} className={cn('flex-1 h-10 rounded-lg border-2 text-sm font-medium', method === m ? 'border-glamor-primary bg-glamor-primary/5 text-glamor-primary' : 'border-border-primary text-muted-foreground')}>{m === 'cash' ? 'Efectivo' : m === 'card' ? 'Tarjeta' : 'Transf.'}</button>)}</div>
        </div>
        <div className="p-6 pt-0 flex gap-3"><button onClick={onClose} className="flex-1 h-11 rounded-lg border text-sm">Cancelar</button><button onClick={onRefund} disabled={loading || !reason} className="flex-1 h-11 bg-red-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Devolver'}</button></div>
      </div>
    </div>
  );
}

function OpenRegisterModal({ balance, setBalance, notes, setNotes, selectedRegisterId, setSelectedRegisterId, registers, setRegisters, token, onOpen, loading, onClose }: any) {
  useEffect(() => {
    if (token) {
      api.get('/cash-register/registers', { token }).then((r: any) => {
        const active = Array.isArray(r) ? r.filter((x: any) => x.isActive !== false) : [];
        setRegisters(active);
        if (active.length === 1 && !selectedRegisterId) setSelectedRegisterId(active[0].id);
      }).catch(() => {});
    }
  }, [token]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><CircleDollarSign className="w-5 h-5 text-green-600" /> Abrir caja</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Caja</label>
            <select value={selectedRegisterId} onChange={(e: any) => setSelectedRegisterId(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm">
              <option value="">Seleccionar caja...</option>
              {registers.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Saldo inicial</label><input type="number" min="0" step="0.01" value={balance} onChange={(e: any) => setBalance(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm" autoFocus /></div>
          <div><label className="block text-sm font-medium mb-1">Notas</label><input value={notes} onChange={(e: any) => setNotes(e.target.value)} placeholder="Opcional" className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm" /></div>
        </div>
        <div className="flex gap-3 mt-5"><button onClick={onClose} className="flex-1 h-10 rounded-lg border text-sm">Cancelar</button><button onClick={onOpen} disabled={loading} className="flex-1 h-10 bg-green-600 text-white rounded-lg text-sm font-medium">{loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Abrir'}</button></div>
      </div>
    </div>
  );
}

function CloseRegisterModal({ balance, setBalance, notes, setNotes, reconciliation, onClose: onCloseFn, loading, onCancel }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-lg font-bold mb-4">Cerrar caja</h3>
        {reconciliation && <div className="mb-4 p-3 bg-surface-primary/50 rounded-lg text-sm"><p className="text-muted-foreground">Efectivo esperado:</p><p className="text-xl font-bold text-glamor-primary">{formatCurrency(reconciliation.summary.expectedCash)}</p></div>}
        <div className="space-y-3">
          <div><label className="block text-sm font-medium mb-1">Efectivo contado</label><input type="number" min="0" step="0.01" value={balance} onChange={(e: any) => setBalance(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm" autoFocus /></div>
          <div><label className="block text-sm font-medium mb-1">Notas</label><input value={notes} onChange={(e: any) => setNotes(e.target.value)} placeholder="Opcional" className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm" /></div>
        </div>
        <div className="flex gap-3 mt-5"><button onClick={onCancel} className="flex-1 h-10 rounded-lg border text-sm">Cancelar</button><button onClick={onCloseFn} disabled={loading} className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm font-medium">{loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Cerrar caja'}</button></div>
      </div>
    </div>
  );
}

function CashMovementModal({ type, setType, amount, setAmount, reason, setReason, desc, setDesc, onSave, loading, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-lg font-bold mb-4">{type === 'in' ? 'Entrada de efectivo' : 'Salida de efectivo'}</h3>
        <div className="space-y-3">
          <div className="flex gap-2"><button onClick={() => setType('in')} className={cn('flex-1 h-10 rounded-lg border-2 text-sm font-medium', type === 'in' ? 'border-green-500 bg-green-50 text-green-700' : 'border-border-primary text-muted-foreground')}>Entrada</button><button onClick={() => setType('out')} className={cn('flex-1 h-10 rounded-lg border-2 text-sm font-medium', type === 'out' ? 'border-red-500 bg-red-50 text-red-700' : 'border-border-primary text-muted-foreground')}>Salida</button></div>
          <input type="number" min="0.01" step="0.01" value={amount} onChange={(e: any) => setAmount(e.target.value)} placeholder="Monto" className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm" autoFocus />
          <select value={reason} onChange={(e: any) => setReason(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm"><option value="">Motivo...</option><option value="Gastos varios">Gastos varios</option><option value="Retiro de efectivo">Retiro de efectivo</option><option value="Ingreso extra">Ingreso extra</option><option value="Propina">Propina</option><option value="Cambio">Cambio</option></select>
          <input value={desc} onChange={(e: any) => setDesc(e.target.value)} placeholder="Descripción (opcional)" className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm" />
        </div>
        <div className="flex gap-3 mt-5"><button onClick={onClose} className="flex-1 h-10 rounded-lg border text-sm">Cancelar</button><button onClick={onSave} disabled={loading || !reason || !amount} className={cn('flex-1 h-10 text-white rounded-lg text-sm font-medium disabled:opacity-50', type === 'in' ? 'bg-green-600' : 'bg-red-600')}>{loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Registrar'}</button></div>
      </div>
    </div>
  );
}

// ─── Electronic Invoice Modal ─────────────────────────────────────────────────

const ID_TYPES_INV = [
  { value: 'cc', label: 'CC' }, { value: 'nit', label: 'NIT' },
  { value: 'ce', label: 'CE' }, { value: 'pasaporte', label: 'Pasaporte' },
];
const PAYMENT_METHODS_INV = [
  { value: '10', label: 'Efectivo' }, { value: '42', label: 'Transferencia' },
  { value: '48', label: 'Tarjeta débito' }, { value: '49', label: 'Tarjeta crédito' },
  { value: '71', label: 'Nequi / Daviplata' },
];

function ElectronicInvoiceModal({ sale, token, onClose, onSuccess, onPrint }: any) {
  const [receiverName, setReceiverName] = useState(
    sale.customer ? `${sale.customer.firstName} ${sale.customer.lastName}` : ''
  );
  const [receiverIdType, setReceiverIdType] = useState(sale.customer?.idType || 'cc');
  const [receiverIdNumber, setReceiverIdNumber] = useState(sale.customer?.idNumber || '');
  const [receiverEmail, setReceiverEmail] = useState(sale.customer?.email || '');
  const [receiverPhone, setReceiverPhone] = useState(sale.customer?.phone || '');
  const [paymentMethodCode, setPaymentMethodCode] = useState('10');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!receiverName.trim()) { setError('El nombre del receptor es obligatorio'); return; }
    setSaving(true); setError('');
    try {
      // Map sale items to invoice items
      const items = (sale.items || []).map((it: any) => ({
        itemType: it.serviceId ? 'service' : 'product',
        productId: it.productId || undefined,
        serviceId: it.serviceId || undefined,
        description: it.name,
        quantity: it.quantity,
        unitMeasure: it.serviceId ? '58' : '94',
        unitPrice: Number(it.unitPrice),
        discountRate: it.discountAmount > 0 ? (it.discountAmount / (it.unitPrice * it.quantity)) * 100 : 0,
        ivaRate: 19,
        code: it.product?.sku || it.service?.code || '',
      }));
      const payload = {
        saleId: sale.id,
        invoiceType: 'pos_invoice',
        customerId: sale.customerId || undefined,
        receiverName, receiverIdType, receiverIdNumber, receiverEmail, receiverPhone,
        paymentMeansCode: '1',
        paymentMethodCode,
        notes: notes || undefined,
        items,
      };
      const result = await api.post('/accounting/invoices', payload, { token });
      onSuccess(result);
    } catch (e: any) {
      setError(e?.message || 'Error al generar la factura');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => !saving && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold">Factura electrónica</h3>
          </div>
          <button onClick={() => !saving && onClose()} className="p-1.5 rounded-lg hover:bg-surface-hover"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {/* Sale summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
            <p className="font-semibold text-blue-800 mb-2">Venta {sale.saleNumber}</p>
            <div className="space-y-1">
              {(sale.items || []).map((it: any) => (
                <div key={it.id} className="flex justify-between text-blue-700">
                  <span>{it.name} x{it.quantity}</span>
                  <span>{formatCurrency(it.total)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-blue-900 border-t border-blue-200 pt-1 mt-1">
                <span>Total</span><span>{formatCurrency(sale.total)}</span>
              </div>
            </div>
          </div>

          {/* Receiver */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Datos del receptor</p>
            <div className="space-y-3">
              <input value={receiverName} onChange={e => setReceiverName(e.target.value)} placeholder="Nombre / Razón social *" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <div className="flex gap-2">
                <select value={receiverIdType} onChange={e => setReceiverIdType(e.target.value)} className="w-28 border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {ID_TYPES_INV.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input value={receiverIdNumber} onChange={e => setReceiverIdNumber(e.target.value)} placeholder="Número de identificación" className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex gap-2">
                <input value={receiverEmail} onChange={e => setReceiverEmail(e.target.value)} placeholder="Correo electrónico" type="email" className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} placeholder="Teléfono" className="w-36 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Método de pago</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS_INV.map(m => (
                <button key={m.value} type="button" onClick={() => setPaymentMethodCode(m.value)}
                  className={cn('px-3 py-1.5 text-xs rounded-lg border-2 transition font-medium',
                    paymentMethodCode === m.value ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                  )}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones para la factura (opcional)" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="p-5 border-t flex gap-3">
          <button onClick={() => !saving && onClose()} className="flex-1 h-11 border rounded-lg text-sm font-medium hover:bg-muted transition">Cancelar</button>
          <button onClick={handleCreate} disabled={saving} className="flex-1 h-11 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-60 transition">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</> : <><FileText className="w-4 h-4" /> Generar factura</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Quote Modal ──────────────────────────────────────────────────────────────

function QuoteModal({ items, customerName, discountPercent, subtotal, discount, tax, total, token, storeName, userName, onClose }: any) {
  const [clientName, setClientName] = useState(customerName || '');
  const [clientEmail, setClientEmail] = useState('');
  const [validDays, setValidDays] = useState('3');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');

  const validUntil = new Date(Date.now() + parseInt(validDays || '3') * 86400000)
    .toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

  const handlePrint = () => {
    const now = new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    const win = window.open('', '_blank', 'width=680,height=900');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cotización</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;padding:24px;max-width:680px;margin:auto}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:16px;border-bottom:2px solid #333}
    .title{font-size:20px;font-weight:bold;color:#6d28d9}.subtitle{font-size:11px;color:#666;margin-top:2px}
    .badge{background:#f5f3ff;border:1px solid #c4b5fd;border-radius:6px;padding:8px 14px;text-align:right}
    .badge-num{font-size:14px;font-weight:bold;color:#4c1d95}.section-title{font-size:11px;font-weight:bold;color:#666;text-transform:uppercase;letter-spacing:0.05em;margin:12px 0 6px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
    table{width:100%;border-collapse:collapse;margin:8px 0}th{background:#f9fafb;text-align:left;padding:7px 8px;font-size:11px;color:#555;border-bottom:2px solid #e5e7eb}
    td{padding:7px 8px;font-size:11px;border-bottom:1px solid #f3f4f6}.text-right{text-align:right}
    .totals{margin-left:auto;width:220px;margin-top:8px}.total-row{display:flex;justify-content:space-between;padding:3px 0;font-size:12px}
    .total-final{font-size:16px;font-weight:bold;border-top:2px solid #6d28d9;padding-top:8px;margin-top:4px;color:#4c1d95}
    .validity{background:#f5f3ff;border:1px solid #c4b5fd;border-radius:8px;padding:10px;margin-top:14px;font-size:11px;color:#5b21b6}
    .footer{margin-top:20px;padding-top:12px;border-top:1px dashed #ccc;text-align:center;font-size:10px;color:#888}
    @media print{body{padding:10px}}</style></head><body>
    <div class="header">
      <div><div class="title">💅 ${storeName}</div><div class="subtitle">Cotización — ${now}</div></div>
      <div class="badge"><div class="badge-num">COTIZACIÓN</div><div style="font-size:10px;color:#666;margin-top:2px">Atendido por: ${userName}</div></div>
    </div>
    ${clientName ? `<div><span style="font-size:11px;color:#666">Cliente: </span><strong>${clientName}</strong></div>` : ''}
    <div class="section-title">Ítems</div>
    <table><thead><tr><th>Descripción</th><th class="text-right">Cant.</th><th class="text-right">Precio unit.</th><th class="text-right">Total</th></tr></thead>
    <tbody>${items.map((it: any) => `<tr><td>${it.name}</td><td class="text-right">${it.quantity}</td><td class="text-right">$${Number(it.unitPrice).toLocaleString('es-CO')}</td><td class="text-right">$${Number(it.unitPrice * it.quantity).toLocaleString('es-CO')}</td></tr>`).join('')}</tbody></table>
    <div class="totals">
      <div class="total-row"><span>Subtotal</span><span>$${Number(subtotal).toLocaleString('es-CO')}</span></div>
      ${discount > 0 ? `<div class="total-row" style="color:#dc2626"><span>Descuento (${discountPercent}%)</span><span>-$${Number(discount).toLocaleString('es-CO')}</span></div>` : ''}
      <div class="total-row"><span>IVA</span><span>$${Number(tax).toLocaleString('es-CO')}</span></div>
      <div class="total-row total-final"><span>TOTAL</span><span>$${Number(total).toLocaleString('es-CO')}</span></div>
    </div>
    <div class="validity">⏰ Esta cotización es válida hasta el <strong>${validUntil}</strong></div>
    ${notes ? `<div style="margin-top:12px;font-size:11px;color:#555"><strong>Observaciones:</strong> ${notes}</div>` : ''}
    <div class="footer"><p>¡Gracias por contactarnos! · ${storeName}</p></div>
    </body></html>`);
    win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const handleSendEmail = async () => {
    if (!clientEmail.trim()) { setSendError('Ingresa el correo del cliente'); return; }
    setSending(true); setSendError('');
    try {
      // POST to a quote-by-email endpoint (if it exists) or show success message
      await api.post('/quotes/send-email', {
        clientName, clientEmail, validDays: parseInt(validDays),
        notes, items, subtotal, discount, tax, total, discountPercent,
      }, { token });
      setSent(true);
    } catch {
      // Endpoint may not exist yet — show message to print instead
      setSendError('El envío por email no está disponible aún. Usa "Imprimir" para generar el PDF.');
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        <div className="p-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FilePlus className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold">Cotización</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {/* Items summary */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-1.5 text-sm">
            {items.map((it: any) => (
              <div key={it.id} className="flex justify-between text-indigo-700">
                <span>{it.name} <span className="text-indigo-400">x{it.quantity}</span></span>
                <span>{formatCurrency(it.unitPrice * it.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-indigo-200 pt-2 mt-1 space-y-0.5">
              {discount > 0 && <div className="flex justify-between text-xs text-red-600"><span>Descuento ({discountPercent}%)</span><span>-{formatCurrency(discount)}</span></div>}
              <div className="flex justify-between text-xs text-indigo-500"><span>IVA</span><span>{formatCurrency(tax)}</span></div>
              <div className="flex justify-between font-bold text-indigo-900"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>
          </div>

          <div className="space-y-3">
            <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre del cliente" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Correo electrónico del cliente" type="email" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">Válida por</label>
              <select value={validDays} onChange={e => setValidDays(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="1">1 día</option>
                <option value="3">3 días</option>
                <option value="7">7 días</option>
                <option value="15">15 días</option>
                <option value="30">30 días</option>
              </select>
            </div>
            <p className="text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg">⏰ Válida hasta: <strong>{validUntil}</strong></p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones (opcional)" rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>

          {sent && <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Cotización enviada al correo del cliente.</p>}
          {sendError && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{sendError}</p>}
        </div>

        <div className="p-5 border-t space-y-2">
          <div className="flex gap-2">
            <button onClick={handlePrint} className="flex-1 h-11 border-2 border-indigo-500 text-indigo-700 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-50 transition">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={handleSendEmail} disabled={sending} className="flex-1 h-11 bg-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-60 transition">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {sending ? 'Enviando...' : 'Enviar por email'}
            </button>
          </div>
          <button onClick={onClose} className="w-full h-9 border rounded-lg text-sm text-muted-foreground hover:bg-muted transition">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
