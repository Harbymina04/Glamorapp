'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft, Plus, Trash2, Search, Loader2, Save,
  ChevronDown, User, Package, Scissors, AlertCircle, CheckCircle2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvoiceItem {
  id: string; // local only
  itemType: 'product' | 'service' | 'other';
  productId?: string;
  serviceId?: string;
  code: string;
  description: string;
  quantity: number;
  unitMeasure: string;
  unitPrice: number;
  discountRate: number;
  ivaRate: number;
  isIvaExcluded: boolean;
  // computed
  subtotal: number;
  discountAmount: number;
  ivaAmount: number;
  total: number;
}

const UNIT_MEASURES = [
  { value: '94', label: 'Unidad (und)' },
  { value: '58', label: 'Servicio (srv)' },
  { value: 'HUR', label: 'Hora (hr)' },
  { value: 'KGM', label: 'Kilogramo (kg)' },
  { value: 'GRM', label: 'Gramo (g)' },
  { value: 'LTR', label: 'Litro (L)' },
  { value: 'MLT', label: 'Mililitro (mL)' },
];

const IVA_RATES = [
  { value: 0, label: '0% — Excluido/Exento' },
  { value: 5, label: '5% — IVA reducido' },
  { value: 19, label: '19% — IVA general' },
];

const INVOICE_TYPES = [
  { value: 'invoice', label: 'Factura de venta' },
  { value: 'pos_invoice', label: 'Factura POS' },
  { value: 'credit_note', label: 'Nota crédito' },
  { value: 'debit_note', label: 'Nota débito' },
  { value: 'support_document', label: 'Documento soporte' },
];

const PAYMENT_MEANS = [
  { value: '1', label: 'Contado' },
  { value: '2', label: 'Crédito' },
];

const PAYMENT_METHODS = [
  { value: '10', label: 'Efectivo' },
  { value: '42', label: 'Transferencia bancaria' },
  { value: '48', label: 'Tarjeta débito' },
  { value: '49', label: 'Tarjeta crédito' },
  { value: '20', label: 'Cheque' },
  { value: '71', label: 'Nequi / Daviplata' },
];

const ID_TYPES = [
  { value: 'cc', label: 'Cédula (CC)' },
  { value: 'nit', label: 'NIT' },
  { value: 'ce', label: 'Cédula extranjería (CE)' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'ti', label: 'Tarjeta identidad (TI)' },
];

function newItem(): InvoiceItem {
  return {
    id: crypto.randomUUID(),
    itemType: 'service',
    code: '',
    description: '',
    quantity: 1,
    unitMeasure: '58',
    unitPrice: 0,
    discountRate: 0,
    ivaRate: 19,
    isIvaExcluded: false,
    subtotal: 0,
    discountAmount: 0,
    ivaAmount: 0,
    total: 0,
  };
}

function computeItem(item: InvoiceItem): InvoiceItem {
  const base = item.quantity * item.unitPrice;
  const discountAmount = base * (item.discountRate / 100);
  const taxableBase = base - discountAmount;
  const ivaAmount = item.isIvaExcluded ? 0 : taxableBase * (item.ivaRate / 100);
  return {
    ...item,
    subtotal: base,
    discountAmount,
    ivaAmount,
    total: taxableBase + ivaAmount,
  };
}

// ─── Customer search dropdown ────────────────────────────────────────────────

function CustomerSearch({ token, onSelect }: { token: string; onSelect: (c: any) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await api.get(`/customers?search=${encodeURIComponent(q)}&limit=8`, { token });
      setResults(data.data || []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 300);
  }, [query, search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar cliente por nombre, teléfono o cédula/NIT..."
          className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 top-full mt-1 w-full bg-white border rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {results.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onSelect(c); setQuery(c.firstName + ' ' + c.lastName); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                {c.firstName?.[0]}{c.lastName?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.firstName} {c.lastName}</p>
                <p className="text-xs text-muted-foreground">{c.idType?.toUpperCase()} {c.idNumber} · {c.phone}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Item row ────────────────────────────────────────────────────────────────

function ItemRow({
  item, index, onUpdate, onRemove, token,
}: { item: InvoiceItem; index: number; onUpdate: (item: InvoiceItem) => void; onRemove: () => void; token: string }) {
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setProductResults([]); return; }
    try {
      const [prods, svcs] = await Promise.all([
        api.get(`/catalog/products?search=${encodeURIComponent(q)}&limit=5`, { token }).catch(() => ({ data: [] })),
        api.get(`/services?search=${encodeURIComponent(q)}&limit=5`, { token }).catch(() => ({ data: [] })),
      ]);
      setProductResults([
        ...(prods.data || []).map((p: any) => ({ ...p, _type: 'product' })),
        ...(svcs.data || []).map((s: any) => ({ ...s, _type: 'service' })),
      ]);
    } catch { setProductResults([]); }
  }, [token]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => searchProducts(productSearch), 300);
  }, [productSearch, searchProducts]);

  const set = (patch: Partial<InvoiceItem>) => onUpdate(computeItem({ ...item, ...patch }));

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-white relative">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ítem #{index + 1}</span>
        <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Type + Product search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
          <div className="flex gap-1">
            {(['product', 'service', 'other'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => set({ itemType: t })}
                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${item.itemType === t ? 'bg-primary text-white border-primary' : 'border-border hover:bg-muted'}`}
              >
                {t === 'product' ? <Package className="w-3 h-3 mx-auto" /> : t === 'service' ? <Scissors className="w-3 h-3 mx-auto" /> : 'Otro'}
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2 relative">
          <label className="text-xs text-muted-foreground mb-1 block">Descripción / Producto</label>
          {(item.itemType === 'product' || item.itemType === 'service') ? (
            <div className="relative">
              <input
                value={item.description || productSearch}
                onChange={e => {
                  setProductSearch(e.target.value);
                  set({ description: e.target.value });
                  setShowProductSearch(true);
                }}
                onFocus={() => setShowProductSearch(true)}
                placeholder="Buscar o escribir descripción..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {showProductSearch && productResults.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {productResults.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        const isProduct = p._type === 'product';
                        set({
                          itemType: isProduct ? 'product' : 'service',
                          productId: isProduct ? p.id : undefined,
                          serviceId: !isProduct ? p.id : undefined,
                          description: p.name,
                          code: p.sku || p.code || '',
                          unitPrice: isProduct ? (p.salePrice || p.price || 0) : (p.price || 0),
                          ivaRate: p.ivaRate ?? 19,
                          unitMeasure: isProduct ? '94' : '58',
                        });
                        setProductSearch('');
                        setShowProductSearch(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/40 text-left text-sm"
                    >
                      {p._type === 'product' ? <Package className="w-3.5 h-3.5 text-blue-500 shrink-0" /> : <Scissors className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                      <span className="truncate">{p.name}</span>
                      <span className="ml-auto text-muted-foreground text-xs shrink-0">{formatCurrency(p.salePrice || p.price || 0)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <input
              value={item.description}
              onChange={e => set({ description: e.target.value })}
              placeholder="Descripción del ítem..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}
        </div>
      </div>

      {/* Quantities & prices */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Cantidad</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={item.quantity}
            onChange={e => set({ quantity: parseFloat(e.target.value) || 0 })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Unidad</label>
          <select
            value={item.unitMeasure}
            onChange={e => set({ unitMeasure: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {UNIT_MEASURES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Precio unitario</label>
          <input
            type="number"
            min="0"
            value={item.unitPrice}
            onChange={e => set({ unitPrice: parseFloat(e.target.value) || 0 })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Descuento %</label>
          <input
            type="number"
            min="0"
            max="100"
            value={item.discountRate}
            onChange={e => set({ discountRate: parseFloat(e.target.value) || 0 })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* IVA */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">IVA:</label>
          <div className="flex gap-1">
            {IVA_RATES.map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => set({ ivaRate: r.value, isIvaExcluded: r.value === 0 })}
                className={`px-2.5 py-1 text-xs rounded border transition-colors ${item.ivaRate === r.value ? 'bg-primary text-white border-primary' : 'border-border hover:bg-muted'}`}
              >
                {r.value}%
              </button>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="ml-auto flex gap-4 text-sm">
          {item.discountAmount > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Descuento</p>
              <p className="font-medium text-red-500">-{formatCurrency(item.discountAmount)}</p>
            </div>
          )}
          {item.ivaAmount > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">IVA {item.ivaRate}%</p>
              <p className="font-medium">{formatCurrency(item.ivaAmount)}</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total ítem</p>
            <p className="font-bold text-primary">{formatCurrency(item.total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewInvoicePage() {
  const router = useRouter();
  const { token } = useAuthStore();

  // Header fields
  const [invoiceType, setInvoiceType] = useState('invoice');
  const [paymentMeansCode, setPaymentMeansCode] = useState('1');
  const [paymentMethodCode, setPaymentMethodCode] = useState('10');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Receiver
  const [receiverName, setReceiverName] = useState('');
  const [receiverIdType, setReceiverIdType] = useState('cc');
  const [receiverIdNumber, setReceiverIdNumber] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverTaxRegime, setReceiverTaxRegime] = useState('simplificado');
  const [customerId, setCustomerId] = useState('');

  // Items
  const [items, setItems] = useState<InvoiceItem[]>([computeItem(newItem())]);

  // UI
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fill receiver from selected customer
  const handleSelectCustomer = (c: any) => {
    setCustomerId(c.id);
    setReceiverName(`${c.firstName} ${c.lastName}`);
    setReceiverIdType(c.idType || 'cc');
    setReceiverIdNumber(c.idNumber || '');
    setReceiverEmail(c.email || '');
    setReceiverPhone(c.phone || '');
    setReceiverAddress(c.address || '');
    setReceiverTaxRegime(c.taxRegime || 'simplificado');
  };

  // Totals
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const totalDiscount = items.reduce((s, i) => s + i.discountAmount, 0);
  const totalIva = items.reduce((s, i) => s + i.ivaAmount, 0);
  const grandTotal = items.reduce((s, i) => s + i.total, 0);

  const updateItem = (id: string, updated: InvoiceItem) =>
    setItems(prev => prev.map(i => i.id === id ? updated : i));

  const removeItem = (id: string) =>
    setItems(prev => prev.filter(i => i.id !== id));

  const addItem = () => setItems(prev => [...prev, computeItem(newItem())]);

  const handleSubmit = async (asDraft = false) => {
    setError('');
    setSuccess('');

    if (!receiverName.trim()) { setError('El nombre del receptor es obligatorio.'); return; }
    if (items.length === 0) { setError('Agrega al menos un ítem.'); return; }
    if (items.some(i => !i.description.trim())) { setError('Todos los ítems deben tener descripción.'); return; }
    if (items.some(i => i.unitPrice <= 0)) { setError('El precio unitario debe ser mayor a 0.'); return; }

    setSaving(true);
    try {
      const payload = {
        invoiceType,
        customerId: customerId || undefined,
        receiverName,
        receiverIdType,
        receiverIdNumber,
        receiverEmail,
        receiverPhone,
        receiverAddress,
        receiverTaxRegime,
        paymentMeansCode,
        paymentMethodCode,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        internalNotes: internalNotes || undefined,
        items: items.map(({ id, subtotal, discountAmount, ivaAmount, total, ...rest }) => rest),
      };

      const result = await api.post('/accounting/invoices', payload, { token: token! });
      setSuccess(`Factura ${result.invoiceNumber} creada exitosamente`);
      setTimeout(() => router.push('/tenant/accounting/invoices'), 1800);
    } catch (e: any) {
      setError(e?.message || 'Error al crear la factura. Verifica los datos e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Nueva factura</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Facturación electrónica DIAN</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Invoice type & payment */}
      <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-base">Tipo y forma de pago</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tipo de documento</label>
            <select
              value={invoiceType}
              onChange={e => setInvoiceType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {INVOICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Condición de pago</label>
            <select
              value={paymentMeansCode}
              onChange={e => setPaymentMeansCode(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {PAYMENT_MEANS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Método de pago</label>
            <select
              value={paymentMethodCode}
              onChange={e => setPaymentMethodCode(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
        {paymentMeansCode === '2' && (
          <div className="max-w-xs">
            <label className="text-xs text-muted-foreground mb-1 block">Fecha de vencimiento</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}
      </div>

      {/* Receiver */}
      <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-base flex items-center gap-2">
          <User className="w-4 h-4" /> Datos del receptor
        </h2>

        {/* Customer search */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Buscar cliente existente</label>
          <CustomerSearch token={token!} onSelect={handleSelectCustomer} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Nombre / Razón social *</label>
            <input
              value={receiverName}
              onChange={e => setReceiverName(e.target.value)}
              placeholder="Nombre completo o razón social"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tipo de identificación</label>
            <select
              value={receiverIdType}
              onChange={e => setReceiverIdType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Número de identificación</label>
            <input
              value={receiverIdNumber}
              onChange={e => setReceiverIdNumber(e.target.value)}
              placeholder="123456789"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Correo electrónico</label>
            <input
              type="email"
              value={receiverEmail}
              onChange={e => setReceiverEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Teléfono</label>
            <input
              value={receiverPhone}
              onChange={e => setReceiverPhone(e.target.value)}
              placeholder="+57 300 000 0000"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Dirección</label>
            <input
              value={receiverAddress}
              onChange={e => setReceiverAddress(e.target.value)}
              placeholder="Calle 00 # 00 - 00, Ciudad"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Régimen tributario</label>
            <select
              value={receiverTaxRegime}
              onChange={e => setReceiverTaxRegime(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="simplificado">No responsable de IVA (simplificado)</option>
              <option value="responsable_iva">Responsable de IVA (común)</option>
              <option value="gran_contribuyente">Gran contribuyente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Ítems de la factura</h2>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Agregar ítem
          </button>
        </div>

        {items.map((item, i) => (
          <ItemRow
            key={item.id}
            item={item}
            index={i}
            onUpdate={updated => updateItem(item.id, updated)}
            onRemove={() => removeItem(item.id)}
            token={token!}
          />
        ))}

        {items.length === 0 && (
          <div className="border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay ítems. Agrega al menos uno para continuar.</p>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-base">Observaciones</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notas para el cliente</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Observaciones que aparecerán en la factura..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notas internas</label>
            <textarea
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
              rows={3}
              placeholder="Notas solo visibles para tu equipo..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Totals + Actions */}
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end justify-between">
          {/* Totals */}
          <div className="space-y-1.5 text-sm min-w-[220px]">
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between gap-8">
                <span className="text-muted-foreground">Descuentos</span>
                <span className="font-medium text-red-500">-{formatCurrency(totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground">IVA</span>
              <span className="font-medium">{formatCurrency(totalIva)}</span>
            </div>
            <div className="border-t pt-1.5 flex justify-between gap-8">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg text-primary">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Creando...' : 'Crear factura'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
