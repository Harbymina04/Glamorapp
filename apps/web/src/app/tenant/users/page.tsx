'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { Loader2, Plus, Key, UserX, UserCheck, Mail } from 'lucide-react';

interface UserData {
  id: string; email: string; firstName: string; lastName: string;
  role: string; isActive: boolean; lastLoginAt: string | null;
  store: { id: string; name: string };
}

interface StoreInfo {
  id: string; name: string; slug: string;
}

const roleLabels: Record<string, string> = {
  store_admin: 'Admin Sucursal',
  cashier: 'Cajero',
  professional: 'Profesional',
  financial: 'Financiero',
  readonly: 'Solo Lectura',
};

export default function TenantUsersPage() {
  const { token, stores: authStores } = useAuthStore();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'store_admin', storeId: '' });
  const [saving, setSaving] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/tenant/users', { token: token! });
      setUsers(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const createUser = async () => {
    setSaving(true);
    try {
      await api.post('/tenant/users', form, { token: token! });
      setShowModal(false);
      setForm({ email: '', password: '', firstName: '', lastName: '', role: 'store_admin', storeId: '' });
      fetchUsers();
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
      alert('Contraseña actualizada');
    } catch (e: any) {
      alert(e.message || 'Error');
    }
  };

  const toggleUser = async (u: UserData) => {
    try {
      await api.put(`/tenant/users/${u.id}/toggle`, { isActive: !u.isActive }, { token: token! });
      fetchUsers();
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
          <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-1">{users.length} usuarios en todas las sucursales</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition">
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border-primary shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-primary bg-surface-secondary">
              <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Usuario</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Rol</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Sucursal</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Estado</th>
              <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-primary">
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
                <td className="px-4 py-3 text-sm text-muted-foreground">{u.store?.name || '—'}</td>
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
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">Nuevo Usuario</h3>
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
              <select className="w-full px-3 py-2 border rounded-lg text-sm" value={form.storeId} onChange={e => setForm({ ...form, storeId: e.target.value })}>
                <option value="">Seleccionar sucursal</option>
                {authStores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-surface-hover">Cancelar</button>
              <button onClick={createUser} disabled={saving || !form.email || !form.password || !form.storeId} className="px-4 py-2 text-sm bg-glamor-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                {saving ? 'Creando...' : 'Crear'}
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
