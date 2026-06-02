'use client';

import { useEffect, useState } from 'react';

interface Country  { id: string; isoCode: string; name: string; flag?: string; }
interface Department { id: string; name: string; code: string; }
interface City     { id: string; name: string; code: string; }

interface LocationSelectProps {
  value?: { country?: string; department?: string; city?: string };
  onChange?: (value: { country: string; department: string; city: string }) => void;
  className?: string;
  disabled?: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function LocationSelect({ value, onChange, className = '', disabled }: LocationSelectProps) {
  const [countries, setCountries]     = useState<Country[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities]           = useState<City[]>([]);

  const [countryIso,    setCountryIso]    = useState(value?.country || '');
  const [departmentId,  setDepartmentId]  = useState('');
  const [cityId,        setCityId]        = useState('');

  // Load countries once
  useEffect(() => {
    fetch(`${API}/master-data/countries?lang=es`)
      .then(r => r.json())
      .then(data => setCountries(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Load departments when country changes
  useEffect(() => {
    if (!countryIso) { setDepartments([]); setCities([]); return; }
    setDepartmentId('');
    setCityId('');
    setCities([]);
    fetch(`${API}/master-data/countries/${countryIso}/departments?lang=es`)
      .then(r => r.json())
      .then(data => setDepartments(Array.isArray(data) ? data : []))
      .catch(() => setDepartments([]));
  }, [countryIso]);

  // Load cities when department changes
  useEffect(() => {
    if (!departmentId) { setCities([]); return; }
    setCityId('');
    fetch(`${API}/master-data/departments/${departmentId}/cities?lang=es`)
      .then(r => r.json())
      .then(data => setCities(Array.isArray(data) ? data : []))
      .catch(() => setCities([]));
  }, [departmentId]);

  const selectClass = `w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F]/50 disabled:bg-gray-50 disabled:text-gray-400`;

  const emit = (country: string, dept: string, city: string) => {
    onChange?.({ country, department: dept, city });
  };

  const handleCountry = (iso: string) => {
    setCountryIso(iso);
    emit(iso, '', '');
  };

  const handleDept = (id: string) => {
    setDepartmentId(id);
    const deptName = departments.find(d => d.id === id)?.name || '';
    emit(countryIso, deptName, '');
  };

  const handleCity = (id: string) => {
    setCityId(id);
    const cityName = cities.find(c => c.id === id)?.name || '';
    const deptName = departments.find(d => d.id === departmentId)?.name || '';
    emit(countryIso, deptName, cityName);
  };

  return (
    <div className={`grid grid-cols-3 gap-3 ${className}`}>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">País</label>
        <select
          value={countryIso}
          onChange={e => handleCountry(e.target.value)}
          disabled={disabled}
          className={selectClass}
        >
          <option value="">Seleccionar país</option>
          {countries.map(c => (
            <option key={c.id} value={c.isoCode}>{c.flag} {c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Departamento</label>
        <select
          value={departmentId}
          onChange={e => handleDept(e.target.value)}
          disabled={disabled || !countryIso}
          className={selectClass}
        >
          <option value="">Seleccionar dpto.</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Ciudad</label>
        <select
          value={cityId}
          onChange={e => handleCity(e.target.value)}
          disabled={disabled || !departmentId}
          className={selectClass}
        >
          <option value="">Seleccionar ciudad</option>
          {cities.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
