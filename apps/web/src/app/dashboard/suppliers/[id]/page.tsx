'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import {
  ArrowLeft, Building2, Phone, Mail, Globe, MapPin, FileText,
  Users, Package, Receipt, Clock, Plus, Trash2, Pencil,
  Save, X, Loader2, Star, TrendingDown, TrendingUp, DollarSign,
  AlertTriangle,
} from 'lucide-react';

const inputClass = 'w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition';
const labelClass = 'block text-sm font-medium text-foreground mb-1.5';

type Tab = 'info' | 'contacts' | 'products' | 'documents' | 'history';

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('info');

  // Modal state
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedSpId, setSelectedSpId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Forms
  const [contactForm, setContactForm] = useState({ name: '', position: '', email: '', phone: '', isPrimary: false, notes: '' });
  const [docForm, setDocForm] = useState({ docType: 'certificate', title: '', fileUrl: '', expiryDate: '', notes: '' });
  const [priceForm, setPriceForm] = useState({ newPrice: '', reason: '' });

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const getToken = () => useAuthStore.getState().token;

  const fetchDetail = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get(`/suppliers/${id}/detail`, { token });
      setSupplier(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // ── Contact handlers ──
  const openAddContact = () => {
    setEditingContactId(null);
    setContactForm({ name: '', position: '', email: '', phone: '', isPrimary: false, notes: '' });
    setError('');
    setShowContactModal(true);
  };

  const openEditContact = (c: any) => {
    setEditingContactId(c.id);
    setContactForm({
      name: c.name || '', position: c.position || '', email: c.email || '',
      phone: c.phone || '', isPrimary: c.isPrimary, notes: c.notes || '',
    });
    setError('');
    setShowContactModal(true);
  };

  const saveContact = async () => {
    if (!contactForm.name.trim()) { setError('El nombre es obligatorio'); return; }
    const token = getToken();
    if (!token) return;
    setSaving(true); setError('');
    try {
      const body: any = {
        name: contactForm.name.trim(),
        position: contactForm.position.trim() || null,
        email: contactForm.email.trim() || null,
        phone: contactForm.phone.trim() || null,
        isPrimary: contactForm.isPrimary,
        notes: contactForm.notes.trim() || null,
      };
      if (editingContactId) {
        await api.put(`/suppliers/${id}/contacts/${editingContactId}`, body, { token });
      } else {
        await api.post(`/suppliers/${id}/contacts`, body, { token });
      }
      setShowContactModal(false);
      fetchDetail();
    } catch (e: any) { setError(e.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const deleteContact = async (contactId: string, name: string) => {
    if (!confirm(`¿Eliminar contacto "${name}"?`)) return;
    const token = getToken();
    if (!token) return;
    try { await api.del(`/suppliers/${id}/contacts/${contactId}`, { token }); fetchDetail(); }
    catch { alert('No se pudo completar la operación. Intenta de nuevo.'); }
  };

  // ── Document handlers ──
  const openAddDoc = () => {
    setDocForm({ docType: 'certificate', title: '', fileUrl: '', expiryDate: '', notes: '' });
    setError('');
    setShowDocModal(true);
  };

  const saveDoc = async () => {
    if (!docForm.title.trim()) { setError('El título es obligatorio'); return; }
    const token = getToken();
    if (!token) return;
    setSaving(true); setError('');
    try {
      await api.post(`/suppliers/${id}/documents`, {
        docType: docForm.docType,
        title: docForm.title.trim(),
        fileUrl: docForm.fileUrl.trim() || null,
        expiryDate: docForm.expiryDate || null,
        notes: docForm.notes.trim() || null,
      }, { token });
      setShowDocModal(false);
      fetchDetail();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const deleteDoc = async (docId: string) => {
    if (!confirm('¿Eliminar documento?')) return;
    const token = getToken();
    if (!token) return;
    try { await api.del(`/suppliers/${id}/documents/${docId}`, { token }); fetchDetail(); }
    catch { alert('No se pudo completar la operación. Intenta de nuevo.'); }
  };

  // ── Product search ──
  const searchProducts = useCallback(async (q: string) => {
    if (q.length < 2) { setProductResults([]); return; }
    const token = getToken();
    if (!token) return;
    setSearching(true);
    try {
      const res = await api.get(`/products?search=${encodeURIComponent(q)}&limit=10`, { token });
      setProductResults(res.data || []);
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  }, []);

  // ── Price update ──
  const openPriceModal = (spId: string) => {
    setSelectedSpId(spId);
    setPriceForm({ newPrice: '', reason: '' });
    setError('');
    setShowPriceModal(true);
  };

  const savePrice = async () => {
    if (!priceForm.newPrice || parseFloat(priceForm.newPrice) <= 0) {
      setError('Ingrese un precio válido'); return;
    }
    const token = getToken();
    if (!token || !selectedSpId) return;
    setSaving(true); setError('');
    try {
      await api.put(`/suppliers/${id}/products/${selectedSpId}/price`, {
        newPrice: parseFloat(priceForm.newPrice),
        reason: priceForm.reason.trim() || 'Actualización de precio',
      }, { token });
      setShowPriceModal(false);
      fetchDetail();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const addProduct = async (productId: string) => {
    const token = getToken();
    if (!token) return;
    try {
      await api.post(`/suppliers/${id}/products`, { productId }, { token });
      fetchDetail();
    } catch (e: any) { alert(e.message); }
  };

  const removeProduct = async (spId: string) => {
    if (!confirm('¿Desvincular producto?')) return;
    const token = getToken();
    if (!token) return;
    try { await api.del(`/suppliers/${id}/products/${spId}`, { token }); fetchDetail(); }
    catch { alert('No se pudo completar la operación. Intenta de nuevo.'); }
  };

  // ── Loaders ──
  if (loading) return <LoadingSkeleton rows={8} cols={4} />;
  if (!supplier) return <div className="text-center py-16 text-muted-foreground">Proveedor no encontrado</div>;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'info', label: 'Info General', icon: <Building2 className="w-4 h-4" /> },
    { key: 'contacts', label: `Contactos (${supplier.contacts?.length || 0})`, icon: <Users className="w-4 h-4" /> },
    { key: 'products', label: `Productos (${supplier.supplierProducts?.length || 0})`, icon: <Package className="w-4 h-4" /> },
    { key: 'documents', label: `Documentos (${supplier.documents?.length || 0})`, icon: <FileText className="w-4 h-4" /> },
    { key: 'history', label: 'Historial', icon: <Clock className="w-4 h-4" /> },
  ];

  const DOC_TYPES: Record<string, string> = {
    certificate: 'Certificación', contract: 'Contrato', compliance: 'Cumplimiento',
    insurance: 'Seguro', tax: 'Fiscal', other: 'Otro',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-surface-hover">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{supplier.businessName}</h1>
          <p className="text-muted-foreground text-sm">{supplier.supplierNumber} · {supplier.category || 'Sin categoría'}</p>
        </div>
        <StatusBadge status={supplier.status} labels={{ active: 'Activo', inactive: 'Inactivo' }}
          colors={{ active: 'bg-green-50 text-green-700 border-green-200', inactive: 'bg-gray-50 text-gray-600 border-gray-200' }} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total compras', value: formatCurrency(supplier.totalSpent || 0), icon: <DollarSign />, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Órdenes', value: supplier.totalOrders || 0, icon: <Receipt />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Saldo pendiente', value: formatCurrency(supplier.currentBalance || 0), icon: <AlertTriangle />, color: 'text-amber-600 bg-amber-50' },
          { label: 'Última compra', value: supplier.lastPurchaseAt ? new Date(supplier.lastPurchaseAt).toLocaleDateString('es-MX') : '—', icon: <Clock />, color: 'text-purple-600 bg-purple-50' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl border border-border-primary bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.color}`}>{kpi.icon}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{String(kpi.value)}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border-primary">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === t.key ? 'border-glamor-primary text-glamor-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-border-primary shadow-card">
        {/* ── INFO TAB ── */}
        {tab === 'info' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Información General</h3>
              <InfoRow icon={<Building2 className="w-4 h-4" />} label="Razón social" value={supplier.businessName} />
              <InfoRow icon={<FileText className="w-4 h-4" />} label="RFC / Tax ID" value={supplier.taxId} />
              <InfoRow icon={<Globe className="w-4 h-4" />} label="Sitio web" value={supplier.website} link />
              <InfoRow icon={<MapPin className="w-4 h-4" />} label="Dirección" value={supplier.address} />
              <InfoRow icon={<FileText className="w-4 h-4" />} label="Categoría" value={supplier.category} />
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Condiciones Comerciales</h3>
              <InfoRow icon={<DollarSign className="w-4 h-4" />} label="Condiciones de pago" value={supplier.paymentTerms} />
              <InfoRow icon={<DollarSign className="w-4 h-4" />} label="Límite de crédito" value={formatCurrency(supplier.creditLimit)} />
              <InfoRow icon={<Receipt className="w-4 h-4" />} label="Método de pago pref." value={supplier.preferredPaymentMethod === 'transfer' ? 'Transferencia' : supplier.preferredPaymentMethod === 'cash' ? 'Efectivo' : supplier.preferredPaymentMethod === 'card' ? 'Tarjeta' : supplier.preferredPaymentMethod} />
              <InfoRow icon={<FileText className="w-4 h-4" />} label="Notas" value={supplier.notes} />
            </div>
          </div>
        )}

        {/* ── CONTACTS TAB ── */}
        {tab === 'contacts' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Contactos</h3>
              <button onClick={openAddContact}
                className="flex items-center gap-1.5 h-8 px-3 bg-glamor-primary text-white rounded-lg text-xs font-medium hover:bg-glamor-primary-hover transition">
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>
            {(!supplier.contacts || supplier.contacts.length === 0) ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Sin contactos registrados</p>
            ) : (
              <div className="space-y-3">
                {supplier.contacts.map((c: any) => (
                  <div key={c.id} className="flex items-start justify-between p-4 rounded-lg border border-border-primary hover:bg-surface-hover/30">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-glamor-primary/10 text-glamor-primary font-semibold text-sm">
                        {c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-foreground">{c.name}</p>
                          {c.isPrimary && <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded"><Star className="w-3 h-3" /> Principal</span>}
                        </div>
                        {c.position && <p className="text-xs text-muted-foreground">{c.position}</p>}
                        <div className="flex items-center gap-3 mt-1">
                          {c.email && <span className="text-xs text-blue-600 flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                          {c.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditContact(c)} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-glamor-primary"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteContact(c.id, c.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PRODUCTS TAB ── */}
        {tab === 'products' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Productos suministrados</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input placeholder="Buscar producto..." value={productSearch}
                    onChange={e => { setProductSearch(e.target.value); searchProducts(e.target.value); }}
                    className="h-8 w-48 rounded-lg border border-border-primary px-3 text-xs focus:outline-none focus:ring-2 focus:ring-glamor-primary/20" />
                  {productResults.length > 0 && (
                    <div className="absolute z-20 top-full mt-1 w-64 max-h-48 overflow-y-auto rounded-lg border border-border-primary bg-white shadow-lg">
                      {productResults.map((p: any) => (
                        <button key={p.id} onClick={() => { addProduct(p.id); setProductResults([]); setProductSearch(''); }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-surface-hover border-b border-border-primary last:border-0 flex items-center justify-between">
                          <span>{p.name}</span>
                          <span className="text-muted-foreground font-mono">{p.sku}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {(!supplier.supplierProducts || supplier.supplierProducts.length === 0) ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Sin productos asociados. Busca y agrega productos arriba.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border-primary bg-surface-primary/50">
                    <tr>
                      {['Producto', 'SKU Proveedor', 'Precio', 'Último cambio', 'Pref.', ''].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {supplier.supplierProducts.map((sp: any) => (
                      <tr key={sp.id} className="hover:bg-surface-hover/30">
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-foreground">{sp.product?.name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{sp.product?.sku}</p>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{sp.supplierSku || '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className="font-medium">{sp.supplierPrice ? formatCurrency(sp.supplierPrice) : '—'}</span>
                          {sp.prices?.length > 1 && (
                            <span className="ml-1 text-xs text-green-600">
                              <TrendingDown className="w-3 h-3 inline" />
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {sp.prices?.[0]?.effectiveDate ? new Date(sp.prices[0].effectiveDate).toLocaleDateString('es-MX') : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          {sp.isPreferred && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openPriceModal(sp.id)}
                              className="text-xs text-glamor-primary hover:underline">Actualizar precio</button>
                            <button onClick={() => removeProduct(sp.id)}
                              className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── DOCUMENTS TAB ── */}
        {tab === 'documents' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Documentos</h3>
              <button onClick={openAddDoc}
                className="flex items-center gap-1.5 h-8 px-3 bg-glamor-primary text-white rounded-lg text-xs font-medium hover:bg-glamor-primary-hover transition">
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>
            {(!supplier.documents || supplier.documents.length === 0) ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Sin documentos registrados</p>
            ) : (
              <div className="space-y-3">
                {supplier.documents.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between p-4 rounded-lg border border-border-primary">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{d.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-surface-primary text-muted-foreground">{DOC_TYPES[d.docType] || d.docType}</span>
                          {d.expiryDate && (
                            <span className="text-xs text-muted-foreground">
                              Vence: {new Date(d.expiryDate).toLocaleDateString('es-MX')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {d.fileUrl && (
                        <a href={d.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline mr-2">Ver</a>
                      )}
                      <button onClick={() => deleteDoc(d.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Historial de Transacciones</h3>
            <TransactionsList supplierId={id} />
          </div>
        )}
      </div>

      {/* ── Contact Modal ── */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowContactModal(false)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">{editingContactId ? 'Editar contacto' : 'Nuevo contacto'}</h3>
              <button onClick={() => setShowContactModal(false)} className="p-1 rounded-lg hover:bg-surface-hover"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
              <div>
                <label className={labelClass}>Nombre *</label>
                <input className={inputClass} value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre completo" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Cargo</label>
                  <input className={inputClass} value={contactForm.position} onChange={e => setContactForm(f => ({ ...f, position: e.target.value }))} placeholder="Ej: Gerente" />
                </div>
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input className={inputClass} value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input className={inputClass} type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={contactForm.isPrimary} onChange={e => setContactForm(f => ({ ...f, isPrimary: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-glamor-primary focus:ring-glamor-primary" />
                <span className="text-sm text-foreground">Contacto principal</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-surface-primary/30">
              <button onClick={() => setShowContactModal(false)} className="h-10 px-4 rounded-lg border text-sm text-muted-foreground hover:bg-surface-hover">Cancelar</button>
              <button onClick={saveContact} disabled={saving} className="flex items-center gap-2 h-10 px-6 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Document Modal ── */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDocModal(false)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Nuevo documento</h3>
              <button onClick={() => setShowDocModal(false)} className="p-1 rounded-lg hover:bg-surface-hover"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
              <div>
                <label className={labelClass}>Tipo</label>
                <select className={inputClass} value={docForm.docType} onChange={e => setDocForm(f => ({ ...f, docType: e.target.value }))}>
                  {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Título *</label>
                <input className={inputClass} value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Certificado ISO 9001" />
              </div>
              <div>
                <label className={labelClass}>URL del archivo</label>
                <input className={inputClass} value={docForm.fileUrl} onChange={e => setDocForm(f => ({ ...f, fileUrl: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <label className={labelClass}>Fecha de vencimiento</label>
                <input className={inputClass} type="date" value={docForm.expiryDate} onChange={e => setDocForm(f => ({ ...f, expiryDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-surface-primary/30">
              <button onClick={() => setShowDocModal(false)} className="h-10 px-4 rounded-lg border text-sm text-muted-foreground hover:bg-surface-hover">Cancelar</button>
              <button onClick={saveDoc} disabled={saving} className="flex items-center gap-2 h-10 px-6 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Price Modal ── */}
      {showPriceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPriceModal(false)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Actualizar precio</h3>
              <button onClick={() => setShowPriceModal(false)} className="p-1 rounded-lg hover:bg-surface-hover"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
              <div>
                <label className={labelClass}>Nuevo precio *</label>
                <input className={inputClass} type="number" min="0.01" step="0.01" value={priceForm.newPrice}
                  onChange={e => setPriceForm(f => ({ ...f, newPrice: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className={labelClass}>Razón del cambio</label>
                <input className={inputClass} value={priceForm.reason} onChange={e => setPriceForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Ej: Ajuste por inflación" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-surface-primary/30">
              <button onClick={() => setShowPriceModal(false)} className="h-10 px-4 rounded-lg border text-sm text-muted-foreground hover:bg-surface-hover">Cancelar</button>
              <button onClick={savePrice} disabled={saving} className="flex items-center gap-2 h-10 px-6 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper components ──
function InfoRow({ icon, label, value, link }: { icon: React.ReactNode; label: string; value?: string | null; link?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {link ? (
          <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline">{value}</a>
        ) : (
          <p className="text-sm text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

function TransactionsList({ supplierId }: { supplierId: string }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    api.get(`/suppliers/${supplierId}/transactions?limit=50`, { token })
      .then(res => setTransactions(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [supplierId]);

  if (loading) return <LoadingSkeleton rows={3} cols={4} />;
  if (!transactions.length) return <p className="text-muted-foreground text-sm py-8 text-center">Sin transacciones registradas</p>;

  return (
    <div className="space-y-2">
      {transactions.map((t: any, i: number) => (
        <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-border-primary hover:bg-surface-hover/30">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Receipt className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{t.reference}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(t.date).toLocaleDateString('es-MX')} · {t.itemCount} items
              {t.items?.length > 0 && ` (${t.items.slice(0, 3).join(', ')}${t.items.length > 3 ? '...' : ''})`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{formatCurrency(t.amount)}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              t.status === 'received' ? 'bg-green-50 text-green-700' :
              t.status === 'cancelled' ? 'bg-red-50 text-red-700' :
              t.status === 'partial' ? 'bg-amber-50 text-amber-700' :
              'bg-gray-50 text-gray-600'
            }`}>
              {t.status === 'pending' ? 'Pendiente' : t.status === 'received' ? 'Recibida' : t.status === 'partial' ? 'Parcial' : t.status === 'cancelled' ? 'Cancelada' : t.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
