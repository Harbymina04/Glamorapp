'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatCard } from '@/components/shared/stat-card';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import {
  UserCog, Plus, Search, X, Save, Loader2, AlertCircle,
  Pencil, Trash2, Mail, Phone, Shield, UserPlus,
  UserCheck, UserX, Key, Percent, DollarSign,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────
const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'cashier', label: 'Cajero' },
  { value: 'professional', label: 'Profesional' },
  { value: 'financial', label: 'Financiero' },
  { value: 'readonly', label: 'Solo lectura' },
] as const;

interface UserForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  commissionRate: string; // stored as string for input, parsed on save
}

const emptyForm: UserForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  role: 'cashier',
  commissionRate: '0',
};

// ─── Page ───────────────────────────────────────────────────────────
export default function UsersPage() {
  const { token, user } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirm
  const [showDelete, setShowDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch users ──────────────────────────────────────────────
  const fetchUsers = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (q) params.set('search', q);
      const res = await api.get(`/users?${params}`, { token: token! });
      setUsers(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchUsers();
  }, [token]); // eslint-disable-line

  // ─── Search ────────────────────────────────────────────────────
  const handleSearch = (value: string) => {
    setSearch(value);
    // Client-side filter since API doesn't have search on users
  };

  const filteredUsers = search
    ? users.filter((u: any) =>
        `${u.firstName} ${u.lastName} ${u.email}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : users;

  // ─── Form handlers ─────────────────────────────────────────────
  const openNewModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (u: any) => {
    setEditingId(u.id);
    setForm({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email || '',
      phone: u.phone || '',
      password: '',
      role: u.role || 'cashier',
      commissionRate: String(Number(u.commissionRate ?? 0)),
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.firstName.trim()) return setFormError('El nombre es requerido');
    if (!form.lastName.trim()) return setFormError('El apellido es requerido');
    if (!form.email.trim()) return setFormError('El email es requerido');
    if (!editingId && !form.password.trim()) return setFormError('La contraseña es requerida');
    if (!editingId && form.password.length < 6) return setFormError('La contraseña debe tener al menos 6 caracteres');

    setSaving(true);
    setFormError('');
    try {
      const body: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        role: form.role,
        commissionRate: parseFloat(form.commissionRate) || 0,
      };

      if (!editingId) {
        body.password = form.password;
        body.storeId = user!.storeId;
        await api.post('/users', body, { token: token! });
      } else {
        if (form.password.trim()) {
          body.password = form.password.trim();
        }
        await api.put(`/users/${editingId}`, body, { token: token! });
      }
      setShowModal(false);
      fetchUsers();
    } catch (e: any) {
      setFormError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ────────────────────────────────────────────────────
  const openDeleteConfirm = (u: any) => {
    setDeleteId(u.id);
    setDeleteName(`${u.firstName} ${u.lastName}`);
    setShowDelete(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.del(`/users/${deleteId}`, { token: token! });
      setShowDelete(false);
      setDeleteId(null);
      fetchUsers();
    } catch (e: any) {
      alert('No se pudo eliminar el usuario. Intenta de nuevo.');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Stats ─────────────────────────────────────────────────────
  const activeCount = users.filter((u: any) => u.isActive).length;
  const adminCount = users.filter((u: any) => u.role === 'admin').length;
  const inactiveCount = users.filter((u: any) => !u.isActive).length;

  // ─── Shared classes ────────────────────────────────────────────
  const inputClass = 'w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition';
  const labelClass = 'block text-sm font-medium text-foreground mb-1.5';

  // ─── Role badge colors ─────────────────────────────────────────
  const ROLE_COLORS: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-800',
    cashier: 'bg-blue-100 text-blue-800',
    professional: 'bg-green-100 text-green-800',
    financial: 'bg-orange-100 text-orange-800',
    readonly: 'bg-gray-100 text-gray-600',
  };

  if (loading) return <LoadingSkeleton rows={8} cols={5} />;

  const columns = [
    {
      key: 'name', header: 'Usuario', render: (u: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-glamor-primary to-purple-500 text-white flex items-center justify-center text-xs font-bold">
            {u.firstName?.[0]}{u.lastName?.[0]}
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">{u.firstName} {u.lastName}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role', header: 'Rol', render: (u: any) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
          {ROLES.find(r => r.value === u.role)?.label || u.role}
        </span>
      ),
    },
    {
      key: 'isActive', header: 'Estado', render: (u: any) => (
        <StatusBadge status={u.isActive ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'commissionRate', header: 'Comisión', render: (u: any) => {
        const rate = Number(u.commissionRate ?? 0);
        return rate > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
            <DollarSign className="w-3 h-3" />{rate}%
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      key: 'lastLoginAt', header: 'Último acceso', render: (u: any) =>
        u.lastLoginAt ? formatDate(u.lastLoginAt) : '—',
    },
    {
      key: 'actions', header: '', render: (u: any) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={(e) => { e.stopPropagation(); openEditModal(u); }}
            title="Editar"
            className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-glamor-primary transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); openDeleteConfirm(u); }}
            title="Eliminar"
            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      className: 'w-20',
    },
  ];

  return (
    <div>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona los usuarios del sistema</p>
        </div>
        <button onClick={openNewModal}
          className="flex items-center gap-2 h-10 px-4 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition">
          <UserPlus className="w-4 h-4" /> Nuevo usuario
        </button>
      </div>

      {/* ─── KPI Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total usuarios" value={String(users.length)} icon={<UserCog className="w-5 h-5 text-glamor-primary" />} />
        <StatCard title="Administradores" value={String(adminCount)} icon={<Shield className="w-5 h-5 text-purple-500" />} />
        <StatCard title="Activos" value={String(activeCount)} icon={<UserCheck className="w-5 h-5 text-green-500" />} />
        <StatCard title="Inactivos" value={String(inactiveCount)} icon={<UserX className="w-5 h-5 text-red-500" />} />
      </div>

      {/* ─── Search ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Buscar usuarios..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20"
          />
        </div>
      </div>

      {/* ─── Table ──────────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        onRowClick={(u: any) => openEditModal(u)}
      />

      {/* ═══════════════════════════════════════════════════════════
         CREATE / EDIT MODAL
         ═══════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
              <h3 className="text-lg font-bold text-foreground">
                {editingId ? 'Editar usuario' : 'Nuevo usuario'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}

              {/* First + Last name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nombre *</label>
                  <input className={inputClass} value={form.firstName}
                    onChange={e => setForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Nombre(s)" />
                </div>
                <div>
                  <label className={labelClass}>Apellido *</label>
                  <input className={inputClass} value={form.lastName}
                    onChange={e => setForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Apellido(s)" />
                </div>
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    <Mail className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
                    Email *
                  </label>
                  <input type="email" className={inputClass} value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="usuario@glamorapp.com" />
                </div>
                <div>
                  <label className={labelClass}>
                    <Phone className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
                    Teléfono
                  </label>
                  <input type="tel" className={inputClass} value={form.phone}
                    onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+52 555 111 0001" />
                </div>
              </div>

              {/* Password + Role */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    <Key className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
                    Contraseña {!editingId && '*'}
                  </label>
                  <input type="password" className={inputClass} value={form.password}
                    onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={editingId ? '•••••• (dejar vacío para no cambiar)' : 'Mínimo 6 caracteres'} />
                </div>
                <div>
                  <label className={labelClass}>
                    <Shield className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
                    Rol
                  </label>
                  <select className={inputClass} value={form.role}
                    onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}>
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Commission Rate */}
              <div className="border border-green-200 bg-green-50 rounded-xl p-4">
                <label className="block text-sm font-semibold text-green-800 mb-1 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" /> Comisión por servicios
                </label>
                <p className="text-xs text-green-700 mb-3">
                  Porcentaje que recibe este colaborador sobre el valor de cada servicio que realice.
                  Solo aplica a ítems de tipo servicio en el POS.
                </p>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-[160px]">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={form.commissionRate}
                      onChange={e => setForm(prev => ({ ...prev, commissionRate: e.target.value }))}
                      className="w-full h-10 pl-3 pr-8 rounded-lg border border-green-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400/40 font-semibold"
                      placeholder="0"
                    />
                    <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  </div>
                  <div className="text-sm text-green-700">
                    {Number(form.commissionRate) > 0 ? (
                      <span>
                        Ej: servicio de{' '}
                        <strong>$100.000</strong> → comisión{' '}
                        <strong>${(100000 * Number(form.commissionRate) / 100).toLocaleString('es-CO')}</strong>
                      </span>
                    ) : (
                      <span className="text-green-500">Sin comisión configurada</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-primary bg-surface-primary/30">
              <button onClick={() => setShowModal(false)}
                className="h-10 px-4 rounded-lg border border-border-primary text-sm font-medium text-muted-foreground hover:bg-surface-hover transition">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 h-10 px-6 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:bg-glamor-primary-hover transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         DELETE CONFIRMATION MODAL
         ═══════════════════════════════════════════════════════════ */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDelete(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-foreground mb-2">Eliminar usuario</h3>
            <p className="text-sm text-muted-foreground mb-4">
              ¿Estás seguro de eliminar a <strong>{deleteName}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDelete(false)}
                className="h-10 px-4 rounded-lg border border-border-primary text-sm font-medium text-muted-foreground hover:bg-surface-hover">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-2 h-10 px-4 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
