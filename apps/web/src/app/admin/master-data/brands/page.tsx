'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, Package } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const emptyForm = { name: '', name_en: '', logoUrl: '', isActive: true };

export default function BrandsPage() {
  const { token } = useAuthStore();
  const [brands, setBrands]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState<any>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const load = () => {
    setLoading(true);
    fetch(`${API}/master-data/admin/brands`, { headers })
      .then(r => r.json())
      .then(data => setBrands(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = search
    ? brands.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
    : brands;

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };

  const openEdit = (b: any) => {
    setEditing(b);
    const t = b.translations as any || {};
    setForm({ name: t.es || b.name, name_en: t.en || '', logoUrl: b.logoUrl || '', isActive: b.isActive });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const body = {
      name: form.name,
      translations: { es: form.name, en: form.name_en || form.name },
      logoUrl: form.logoUrl || undefined,
      isActive: form.isActive,
    };
    try {
      const url = editing ? `${API}/master-data/admin/brands/${editing.id}` : `${API}/master-data/admin/brands`;
      await fetch(url, { method: editing ? 'PUT' : 'POST', headers, body: JSON.stringify(body) });
      setShowModal(false);
      load();
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta marca?')) return;
    await fetch(`${API}/master-data/admin/brands/${id}`, { method: 'DELETE', headers });
    load();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/admin/overview" className="hover:text-gray-600">Admin</Link>
            <span>/</span>
            <span className="text-gray-700 font-medium">Datos Maestros</span>
            <span>/</span>
            <span className="text-gray-700 font-medium">Marcas</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Marcas Maestras</h1>
          <p className="text-sm text-gray-500 mt-0.5">Marcas globales de referencia para productos</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#EF2D8F] text-white rounded-xl text-sm font-semibold hover:bg-[#d4267e] transition">
          <Plus className="w-4 h-4" /> Nueva marca
        </button>
      </div>

      {/* Sub-nav */}
      <div className="flex items-center gap-1 mb-5 border-b border-gray-200">
        {['Categorías', 'Marcas', 'Ubicaciones'].map(s => (
          <Link key={s}
            href={`/admin/master-data/${s === 'Categorías' ? 'categories' : s === 'Marcas' ? 'brands' : 'locations'}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              s === 'Marcas' ? 'border-[#EF2D8F] text-[#EF2D8F]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {s}
          </Link>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar marca..."
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
        <span className="ml-3 text-sm text-gray-400">{filtered.length} marcas</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 font-medium text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Nombre ES / EN</th>
              <th className="text-left px-4 py-3">Logo URL</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-12 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-gray-400">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No hay marcas</p>
              </td></tr>
            ) : filtered.map(b => {
              const t = b.translations as any || {};
              return (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{t.es || b.name}</p>
                    <p className="text-xs text-gray-400">{t.en || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 truncate max-w-[200px]">{b.logoUrl || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {b.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(b)} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-700">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(b.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition text-gray-400 hover:text-red-500">
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-5">{editing ? 'Editar marca' : 'Nueva marca'}</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Nombre (es) *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
                    placeholder="Ej: L'Oréal" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Nombre (en)</label>
                  <input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
                    placeholder="Ej: L'Oreal" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">URL del logo (opcional)</label>
                <input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
                  placeholder="https://..." />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">Marca activa</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={!form.name || saving}
                className="flex-1 py-2.5 bg-[#EF2D8F] text-white rounded-xl text-sm font-bold hover:bg-[#d4267e] transition disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
