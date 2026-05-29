'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { Loader2, Plus, Key, UserX, UserCheck, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

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

// ─── Toast ────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; type: ToastType; message: string }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (type: ToastType, message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };
  return { toasts, success: (m: string) => push('success', m), error: (m: string) => push('error', m), info: (m: string) => push('info', m) };
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  const icons = { success: <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />, error: <XCircle className="w-4 h-4 text-red-500 shrink-0" />, info: <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" /> };
  const bg = { success: 'bg-green-50 border-green-200', error: 'bg-red-50 border-red-200', info: 'bg-blue-50 border-blue-200' };
  const txt = { success: 'text-green-800', error: 'text-red-800', info: 'text-blue-800' };
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[100] space-y-2 w-80">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium ${bg[t.type]} ${txt[t.type]}`}>
          {icons[t.type]}{t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function TenantUsersPage() {
  const { token, stores: authStores } = useAuthStore();
  const { toasts, success, error, info } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'store_admin', storeId: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [pwdError, setPwdError] = useState('');

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
    setFormError('');
    if (form.password.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/tenant/users', form, { token: token! });
      setShowModal(false);
      setForm({ email: '', password: '', firstName: '', lastName: '', role: 'store_admin', storeId: '' });
      success('Usuario creado exitosamente.');
      fetchUsers();
    } catch (e: any) {
      error(e?.message || 'No se pudo crear el usuario. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    setPwdError('');
    if (!resetUserId || !newPassword) return;
    if (newPassword.length < 8) {
      setPwdError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    try {
      await api.post(`/tenant/users/${resetUserId}/reset-password`, { password: newPassword }, { token: token! });
      setResetUserId(null);
      setNewPassword('');
      success('Contraseña actualizada correctamente.');
    } catch (e: any) {
      error(e?.message || 'No se pudo actualizar la contraseña. Intenta de nuevo.');
    }
  };

  const toggleUser = async (u: UserData) => {
    try {
      await api.put(`/tenant/users/${u.id}/toggle`, { isActive: !u.isActive }, { token: token! });
      info(`Usuario ${u.isActive ? 'desactivado' : 'activado'}.`);
      fetchUsers();
    } catch (e) {
      error('No se pudo cambiar el estado del usuario.');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-glamor-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-1">{users.length} usuarios en todas las sucursales</p>
        </div>
        <button onClick={() => { setShowModal(true); setFormError(''); }} className="flex items-center gap-2 px-4 py-2 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition">
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
              <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Último acceso</th>
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
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {u.lastLoginAt
                    ? new Date(u.lastLoginAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                    : <span className="italic">Nunca</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setResetUserId(u.id); setNewPassword(''); setPwdError(''); }} className="p-1.5 rounded hover:bg-surface-hover" title="Cambiar contraseña">
                      <Key className="w-4 h-4 text-amber-500" />
                    </button>
                    <button onClick={() => toggleUser(u)} className="p-1.5 rounded hover:bg-surface-hover" title={u.isActive ? 'Desactivar' : 'Activar'}>
                      {u.isActive ? <UserX className="w-4 h-4 text-red-500" /> : <UserCheck className="w-4 h-4 text-green-500" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">No hay usuarios registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">Nuevo Usuario</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre</label>
                <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Ej: María" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Apellido</label>
                <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Ej: García" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="usuario@email.com" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Contraseña <span className="font-normal">(mín. 8 caracteres)</span></label>
                <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="••••••••" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Rol</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="store_admin">Admin Sucursal</option>
                  <option value="cashier">Cajero</option>
                  <option value="professional">Profesional</option>
                  <option value="financial">Financiero</option>
                  <option value="readonly">Solo Lectura</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Sucursal</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm" value={form.storeId} onChange={e => setForm({ ...form, storeId: e.target.value })}>
                  <option value="">Seleccionar sucursal...</option>
                  {authStores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {formError && (
                <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{formError}</p>
              )}
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-surface-hover">Cancelar</button>
              <button onClick={createUser} disabled={saving || !form.email || !form.password || !form.storeId} className="px-4 py-2 text-sm bg-glamor-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                {saving ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUserId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-1">Cambiar Contraseña</h3>
            <p className="text-sm text-muted-foreground mb-4">Ingresa la nueva contraseña para este usuario.</p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Nueva contraseña <span className="font-normal">(mín. 8 caracteres)</span></label>
              <input
                className="w-full px-3 py-2 border rounded-lg text-sm mb-1"
                placeholder="••••••••"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              {pwdError && <p className="text-xs text-red-600 flex items-center gap-1 mb-2"><AlertCircle className="w-3.5 h-3.5" />{pwdError}</p>}
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setResetUserId(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-surface-hover">Cancelar</button>
              <button onClick={resetPassword} disabled={!newPassword} className="px-4 py-2 text-sm bg-glamor-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                Actualizar contraseña
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
