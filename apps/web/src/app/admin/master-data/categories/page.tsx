'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, Tag } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const TABS = ['Todos', 'Productos', 'Servicios', 'Diseños'];
const TYPE_MAP: Record<string, string> = { Productos: 'product', Servicios: 'service', Diseños: 'design' };
const TYPE_LABELS: Record<string, string> = { product: 'Producto', service: 'Servicio', design: 'Diseño', general: 'General' };

const emptyForm = { name: '', name_en: '', type: 'service', icon: '', color: '#EF2D8F', sortOrder: 0, isActive: true };

export default function CategoriesPage() {
  const { token } = useAuthStore();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState('Todos');
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState<any>(null);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const load = () => {
    setLoading(true);
    fetch(`${API}/master-data/admin/categories`, { headers })
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = tab === 'Todos'
    ? categories
    : categories.filter(c => c.type === TYPE_MAP[tab]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (cat: any) => {
    setEditing(cat);
    const t = cat.translations as any || {};
    setForm({
      name: t.es || cat.name,
      name_en: t.en || '',
      type: cat.type,
      icon: cat.icon || '',
      color: cat.color || '#EF2D8F',
      sortOrder: cat.sortOrder ?? 0,
      isActive: cat.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const body = {
      name: form.name,
      translations: { es: form.name, en: form.name_en || form.name },
      type: form.type,
      icon: form.icon || undefined,
      color: form.color || undefined,
      sortOrder: Number(form.sortOrder),
      isActive: form.isActive,
    };
    try {
      const url = editing
        ? `${API}/master-data/admin/categories/${editing.id}`
        : `${API}/master-data/admin/categories`;
      const method = editing ? 'PUT' : 'POST';
      await fetch(url, { method, headers, body: JSON.stringify(body) });
      setShowModal(false);
      load();
    } catch { }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    await fetch(`${API}/master-data/admin/categories/${id}`, { method: 'DELETE', headers });
    load();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/admin/overview" className="hover:text-gray-600">Admin</Link>
            <span>/</span>
            <span className="text-gray-700 font-medium">Datos Maestros</span>
            <span>/</span>
            <span className="text-gray-700 font-medium">Categorías</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Categorías Maestras</h1>
          <p className="text-sm text-gray-500 mt-0.5">Categorías globales para productos, servicios y diseños</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#EF2D8F] text-white rounded-xl text-sm font-semibold hover:bg-[#d4267e] transition">
          <Plus className="w-4 h-4" /> Nueva categoría
        </button>
      </div>

      {/* Sub-nav */}
      <div className="flex items-center gap-1 mb-5 border-b border-gray-200">
        {['Categorías', 'Marcas', 'Ubicaciones'].map(s => (
          <Link key={s}
            href={`/admin/master-data/${s === 'Categorías' ? 'categories' : s === 'Marcas' ? 'brands' : 'locations'}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              s === 'Categorías' ? 'border-[#EF2D8F] text-[#EF2D8F]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {s}
          </Link>
        ))}
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 mb-5">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              tab === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 font-medium text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Nombre ES / EN</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Icono</th>
              <th className="text-left px-4 py-3">Color</th>
              <th className="text-left px-4 py-3">Orden</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No hay categorías</p>
              </td></tr>
            ) : filtered.map(cat => {
              const t = cat.translations as any || {};
              return (
                <tr key={cat.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{t.es || cat.name}</p>
                    <p className="text-xs text-gray-400">{t.en || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{TYPE_LABELS[cat.type] || cat.type}</span>
                  </td>
                  <td className="px-4 py-3 text-lg">{cat.icon || '—'}</td>
                  <td className="px-4 py-3">
                    {cat.color ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs text-gray-400 font-mono">{cat.color}</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{cat.sortOrder}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {cat.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(cat)} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-700">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(cat.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-5">{editing ? 'Editar categoría' : 'Nueva categoría'}</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Nombre (es) *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
                    placeholder="Ej: Uñas" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Nombre (en)</label>
                  <input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
                    placeholder="Ej: Nails" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Tipo</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30">
                  <option value="service">Servicio</option>
                  <option value="product">Producto</option>
                  <option value="design">Diseño</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Icono (emoji)</label>
                  <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
                    placeholder="💅" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Color</label>
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-full h-[38px] px-1 py-1 border border-gray-200 rounded-lg cursor-pointer" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Orden</label>
                  <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">Categoría activa</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={!form.name || saving}
                className="flex-1 py-2.5 bg-[#EF2D8F] text-white rounded-xl text-sm font-bold hover:bg-[#d4267e] transition disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
