'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { Loader2, Plus, Store, Users, ShoppingCart, Pencil, Power, PowerOff, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StoreData {
  id: string; name: string; slug: string; email: string; phone: string;
  city: string; isActive: boolean;
  _count: { users: number; sales: number; customers: number };
}

export default function TenantStoresPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StoreData | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', email: '', phone: '', address: '', city: '' });
  const [saving, setSaving] = useState(false);

  const fetchStores = useCallback(async () => {
    try {
      const res = await api.get('/tenant/stores', { token: token! });
      setStores(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', slug: '', email: '', phone: '', address: '', city: '' });
    setShowModal(true);
  };

  const openEdit = (store: StoreData) => {
    setEditing(store);
    setForm({ name: store.name, slug: store.slug, email: store.email || '', phone: store.phone || '', address: '', city: store.city || '' });
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/tenant/stores/${editing.id}`, form, { token: token! });
      } else {
        await api.post('/tenant/stores', form, { token: token! });
      }
      setShowModal(false);
      fetchStores();
    } catch (e: any) {
      alert(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (store: StoreData) => {
    try {
      await api.put(`/tenant/stores/${store.id}/toggle`, { isActive: !store.isActive }, { token: token! });
      fetchStores();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-glamor-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sucursales</h1>
          <p className="text-sm text-muted-foreground mt-1">{stores.length} sucursal(es)</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition">
          <Plus className="w-4 h-4" /> Nueva Sucursal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stores.map(s => (
          <div
            key={s.id}
            onClick={() => router.push(`/tenant/stores/${s.id}`)}
            className={`bg-white rounded-xl border shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-glamor-primary/30 transition ${!s.isActive ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-glamor-primary/10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-glamor-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{s.name}</h3>
                  <p className="text-xs text-muted-foreground">{s.slug} {s.city ? `· ${s.city}` : ''}</p>
                </div>
              </div>
              <div className="flex gap-1 items-center">
                <button onClick={(e) => { e.stopPropagation(); openEdit(s); }} className="p-1.5 rounded hover:bg-surface-hover"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                <button onClick={(e) => { e.stopPropagation(); toggleActive(s); }} className="p-1.5 rounded hover:bg-surface-hover">
                  {s.isActive ? <PowerOff className="w-4 h-4 text-red-500" /> : <Power className="w-4 h-4 text-green-500" />}
                </button>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
              </div>
            </div>
            <div className="flex gap-6 mt-4 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground"><Users className="w-3.5 h-3.5" /> {s._count.users}</span>
              <span className="flex items-center gap-1 text-muted-foreground"><ShoppingCart className="w-3.5 h-3.5" /> {s._count.sales}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">{editing ? 'Editar Sucursal' : 'Nueva Sucursal'}</h3>
            <div className="space-y-3">
              <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Nombre" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Slug (ej: sucursal-norte)" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} disabled={!!editing} />
              <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Teléfono" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Dirección" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Ciudad" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-surface-hover">Cancelar</button>
              <button onClick={save} disabled={saving || !form.name || !form.slug} className="px-4 py-2 text-sm bg-glamor-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
