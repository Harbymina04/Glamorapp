'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { Loader2, Plus, Key, UserX, UserCheck, ArrowLeft, Store, MapPin, Mail, Phone } from 'lucide-react';

interface StoreDetail {
  id: string; name: string; slug: string; email: string; phone: string;
  city: string; address: string; isActive: boolean;
  _count: { users: number; sales: number; customers: number; products: number };
}

interface UserData {
  id: string; email: string; firstName: string; lastName: string;
  role: string; isActive: boolean; lastLoginAt: string | null;
  store: { id: string; name: string };
}

const roleLabels: Record<string, string> = {
  store_admin: 'Admin Sucursal',
  cashier: 'Cajero',
  professional: 'Profesional',
  financial: 'Financiero',
  readonly: 'Solo Lectura',
};

export default function StoreDetailPage() {
  const { token } = useAuthStore();
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [store, setStore] = useState<StoreDetail | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'store_admin' });
  const [saving, setSaving] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [storeRes, usersRes] = await Promise.all([
        api.get(`/tenant/stores/${storeId}`, { token: token! }),
        api.get(`/tenant/users?storeId=${storeId}`, { token: token! }),
      ]);
      setStore(storeRes);
      setUsers(usersRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, storeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createUser = async () => {
    setSaving(true);
    try {
      await api.post('/tenant/users', { ...form, storeId }, { token: token! });
      setShowCreate(false);
      setForm({ email: '', password: '', firstName: '', lastName: '', role: 'store_admin' });
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Error al crear usuario');
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    if (!resetUserId || !newPassword) return;
    try {
      await api.post(`/tenant/users/${resetUserId}/reset-password`, { password: newPassword }, { token: token! });
      setResetUserId(null);
      setNewPassword('');
    } catch (e: any) {
      alert(e.message || 'Error');
    }
  };

  const toggleUser = async (u: UserData) => {
    try {
      await api.put(`/tenant/users/${u.id}/toggle`, { isActive: !u.isActive }, { token: token! });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-glamor-primary" /></div>;
  }

  if (!store) {
    return <div className="text-center py-12 text-muted-foreground">Sucursal no encontrada</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
        <ArrowLeft className="w-4 h-4" /> Volver a sucursales
      </button>

      {/* Store Info Card */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-glamor-primary/10 flex items-center justify-center">
              <Store className="w-7 h-7 text-glamor-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{store.name}</h1>
              <p className="text-sm text-muted-foreground">{store.slug}</p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                {store.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {store.city}</span>}
                {store.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {store.email}</span>}
                {store.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {store.phone}</span>}
              </div>
            </div>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${store.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {store.isActive ? 'Activa' : 'Inactiva'}
          </span>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{store._count.users}</p>
            <p className="text-xs text-muted-foreground">Usuarios</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{store._count.sales}</p>
            <p className="text-xs text-muted-foreground">Ventas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{store._count.customers}</p>
            <p className="text-xs text-muted-foreground">Clientes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{store._count.products}</p>
            <p className="text-xs text-muted-foreground">Productos</p>
          </div>
        </div>
      </div>

      {/* Users Section */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">Usuarios de esta sucursal</h2>
            <p className="text-xs text-muted-foreground">{users.length} usuario(s)</p>
          </div>
          <button
            onClick={() => { setForm({ email: '', password: '', firstName: '', lastName: '', role: 'store_admin' }); setShowCreate(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
        </div>

        {users.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No hay usuarios en esta sucursal</p>
            <button onClick={() => setShowCreate(true)} className="text-glamor-primary text-sm mt-2 hover:underline">
              Crear el primer usuario
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-surface-secondary">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Usuario</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Rol</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Estado</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-surface-hover/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-glamor-primary/10 text-glamor-primary px-2 py-0.5 rounded-full">
                      {roleLabels[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setResetUserId(u.id); setNewPassword(''); }} className="p-1.5 rounded hover:bg-surface-hover" title="Reset password">
                        <Key className="w-4 h-4 text-amber-500" />
                      </button>
                      <button onClick={() => toggleUser(u)} className="p-1.5 rounded hover:bg-surface-hover" title={u.isActive ? 'Desactivar' : 'Activar'}>
                        {u.isActive ? <UserX className="w-4 h-4 text-red-500" /> : <UserCheck className="w-4 h-4 text-green-500" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">Nuevo Usuario — {store.name}</h3>
            <div className="space-y-3">
              <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Nombre" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
              <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Apellido" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
              <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Contraseña" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              <select className="w-full px-3 py-2 border rounded-lg text-sm" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="store_admin">Admin Sucursal</option>
                <option value="cashier">Cajero</option>
                <option value="professional">Profesional</option>
                <option value="financial">Financiero</option>
                <option value="readonly">Solo Lectura</option>
              </select>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-surface-hover">Cancelar</button>
              <button onClick={createUser} disabled={saving || !form.email || !form.password} className="px-4 py-2 text-sm bg-glamor-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                {saving ? 'Creando...' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUserId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-4">Resetear Contraseña</h3>
            <input className="w-full px-3 py-2 border rounded-lg text-sm mb-4" placeholder="Nueva contraseña" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setResetUserId(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-surface-hover">Cancelar</button>
              <button onClick={resetPassword} disabled={!newPassword} className="px-4 py-2 text-sm bg-glamor-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
