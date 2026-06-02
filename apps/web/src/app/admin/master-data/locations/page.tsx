'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, X, Loader2, MapPin } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function LocationsPage() {
  const { token } = useAuthStore();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const [tab, setTab] = useState<'departments' | 'cities'>('departments');

  // ─── Departments ─────────────────────────────────────────────
  const [departments, setDepartments] = useState<any[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editDept, setEditDept] = useState<any>(null);
  const [deptForm, setDeptForm] = useState({ name: '', name_en: '', code: '', countryId: '' });
  const [savingDept, setSavingDept] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);

  // ─── Cities ──────────────────────────────────────────────────
  const [cities, setCities] = useState<any[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  const [showCityModal, setShowCityModal] = useState(false);
  const [editCity, setEditCity] = useState<any>(null);
  const [cityForm, setCityForm] = useState({ name: '', name_en: '', code: '', departmentId: '' });
  const [savingCity, setSavingCity] = useState(false);

  const loadDepts = () => {
    setLoadingDepts(true);
    fetch(`${API}/master-data/admin/departments`, { headers })
      .then(r => r.json())
      .then(data => setDepartments(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingDepts(false));
  };

  useEffect(() => {
    loadDepts();
    fetch(`${API}/master-data/admin/countries`, { headers })
      .then(r => r.json())
      .then(data => setCountries(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDept) return;
    setLoadingCities(true);
    fetch(`${API}/master-data/admin/cities?departmentId=${selectedDept}`, { headers })
      .then(r => r.json())
      .then(data => setCities(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingCities(false));
  }, [selectedDept]);

  const saveDept = async () => {
    setSavingDept(true);
    const body = {
      name: deptForm.name,
      translations: { es: deptForm.name, en: deptForm.name_en || deptForm.name },
      code: deptForm.code,
      countryId: deptForm.countryId,
    };
    try {
      const url = editDept ? `${API}/master-data/admin/departments/${editDept.id}` : `${API}/master-data/admin/departments`;
      await fetch(url, { method: editDept ? 'PUT' : 'POST', headers, body: JSON.stringify(body) });
      setShowDeptModal(false);
      loadDepts();
    } catch {}
    setSavingDept(false);
  };

  const saveCity = async () => {
    setSavingCity(true);
    const body = {
      name: cityForm.name,
      translations: { es: cityForm.name, en: cityForm.name_en || cityForm.name },
      code: cityForm.code,
      departmentId: cityForm.departmentId || selectedDept,
    };
    try {
      const url = editCity ? `${API}/master-data/admin/cities/${editCity.id}` : `${API}/master-data/admin/cities`;
      await fetch(url, { method: editCity ? 'PUT' : 'POST', headers, body: JSON.stringify(body) });
      setShowCityModal(false);
      if (selectedDept) {
        setLoadingCities(true);
        fetch(`${API}/master-data/admin/cities?departmentId=${selectedDept}`, { headers })
          .then(r => r.json()).then(d => setCities(Array.isArray(d) ? d : [])).finally(() => setLoadingCities(false));
      }
    } catch {}
    setSavingCity(false);
  };

  const SubNav = () => (
    <div className="flex items-center gap-1 mb-5 border-b border-gray-200">
      {['Categorías', 'Marcas', 'Ubicaciones'].map(s => (
        <Link key={s}
          href={`/admin/master-data/${s === 'Categorías' ? 'categories' : s === 'Marcas' ? 'brands' : 'locations'}`}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
            s === 'Ubicaciones' ? 'border-[#EF2D8F] text-[#EF2D8F]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          {s}
        </Link>
      ))}
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/admin/overview" className="hover:text-gray-600">Admin</Link>
            <span>/</span><span className="text-gray-700 font-medium">Datos Maestros</span>
            <span>/</span><span className="text-gray-700 font-medium">Ubicaciones</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Ubicaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Departamentos y ciudades de Colombia</p>
        </div>
      </div>

      <SubNav />

      {/* Inner tabs */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab('departments')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${tab === 'departments' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Departamentos ({departments.length})
        </button>
        <button onClick={() => setTab('cities')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${tab === 'cities' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Ciudades
        </button>
      </div>

      {/* Departments tab */}
      {tab === 'departments' && (
        <>
          <div className="flex justify-end mb-3">
            <button onClick={() => { setEditDept(null); setDeptForm({ name: '', name_en: '', code: '', countryId: countries[0]?.id || '' }); setShowDeptModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#EF2D8F] text-white rounded-xl text-sm font-semibold hover:bg-[#d4267e] transition">
              <Plus className="w-4 h-4" /> Nuevo departamento
            </button>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 font-medium text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Nombre ES / EN</th>
                  <th className="text-left px-4 py-3">Código DANE</th>
                  <th className="text-left px-4 py-3">País</th>
                  <th className="text-left px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingDepts ? (
                  <tr><td colSpan={4} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></td></tr>
                ) : departments.map(d => {
                  const t = d.translations as any || {};
                  return (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{t.es || d.name}</p>
                        <p className="text-xs text-gray-400">{t.en || '—'}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{d.code}</td>
                      <td className="px-4 py-3 text-gray-500">{d.country?.isoCode || '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => {
                          setEditDept(d);
                          const t2 = d.translations as any || {};
                          setDeptForm({ name: t2.es || d.name, name_en: t2.en || '', code: d.code, countryId: d.countryId });
                          setShowDeptModal(true);
                        }} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-700">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Cities tab */}
      {tab === 'cities' && (
        <>
          <div className="flex items-center gap-3 mb-3">
            <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30">
              <option value="">Seleccionar departamento</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {selectedDept && (
              <button onClick={() => { setEditCity(null); setCityForm({ name: '', name_en: '', code: '', departmentId: selectedDept }); setShowCityModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-[#EF2D8F] text-white rounded-xl text-sm font-semibold hover:bg-[#d4267e] transition">
                <Plus className="w-4 h-4" /> Nueva ciudad
              </button>
            )}
          </div>
          {!selectedDept ? (
            <div className="text-center py-16 text-gray-400">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Selecciona un departamento para ver sus ciudades</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 font-medium text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Nombre ES / EN</th>
                    <th className="text-left px-4 py-3">Código DANE</th>
                    <th className="text-left px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCities ? (
                    <tr><td colSpan={3} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></td></tr>
                  ) : cities.map(c => {
                    const t = c.translations as any || {};
                    return (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{t.es || c.name}</p>
                          <p className="text-xs text-gray-400">{t.en || '—'}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.code}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => {
                            setEditCity(c);
                            const t2 = c.translations as any || {};
                            setCityForm({ name: t2.es || c.name, name_en: t2.en || '', code: c.code, departmentId: c.departmentId });
                            setShowCityModal(true);
                          }} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-700">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Dept Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeptModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <button onClick={() => setShowDeptModal(false)} className="absolute top-4 right-4 text-gray-400"><X className="w-5 h-5" /></button>
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editDept ? 'Editar departamento' : 'Nuevo departamento'}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Nombre (es) *</label>
                  <input value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Nombre (en)</label>
                  <input value={deptForm.name_en} onChange={e => setDeptForm(f => ({ ...f, name_en: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Código DANE *</label>
                <input value={deptForm.code} onChange={e => setDeptForm(f => ({ ...f, code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
                  placeholder="Ej: 05" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">País *</label>
                <select value={deptForm.countryId} onChange={e => setDeptForm(f => ({ ...f, countryId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30">
                  {countries.map(c => <option key={c.id} value={c.id}>{c.flag} {c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowDeptModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">Cancelar</button>
              <button onClick={saveDept} disabled={!deptForm.name || !deptForm.code || savingDept}
                className="flex-1 py-2.5 bg-[#EF2D8F] text-white rounded-xl text-sm font-bold hover:bg-[#d4267e] transition disabled:opacity-60 flex items-center justify-center gap-2">
                {savingDept && <Loader2 className="w-4 h-4 animate-spin" />}
                {savingDept ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* City Modal */}
      {showCityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCityModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <button onClick={() => setShowCityModal(false)} className="absolute top-4 right-4 text-gray-400"><X className="w-5 h-5" /></button>
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editCity ? 'Editar ciudad' : 'Nueva ciudad'}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Nombre (es) *</label>
                  <input value={cityForm.name} onChange={e => setCityForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Nombre (en)</label>
                  <input value={cityForm.name_en} onChange={e => setCityForm(f => ({ ...f, name_en: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Código DANE *</label>
                <input value={cityForm.code} onChange={e => setCityForm(f => ({ ...f, code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30"
                  placeholder="Ej: 05001" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCityModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">Cancelar</button>
              <button onClick={saveCity} disabled={!cityForm.name || !cityForm.code || savingCity}
                className="flex-1 py-2.5 bg-[#EF2D8F] text-white rounded-xl text-sm font-bold hover:bg-[#d4267e] transition disabled:opacity-60 flex items-center justify-center gap-2">
                {savingCity && <Loader2 className="w-4 h-4 animate-spin" />}
                {savingCity ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
