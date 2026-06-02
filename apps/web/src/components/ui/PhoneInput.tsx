'use client';

import { useEffect, useState } from 'react';

interface Country {
  id: string;
  isoCode: string;
  name: string;
  dialCode: string;
  flag?: string;
}

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Combinar código de país + número en un solo string
function split(value: string): { dialCode: string; number: string } {
  const match = value.match(/^(\+\d{1,4})\s?(.*)$/);
  if (match) return { dialCode: match[1], number: match[2] };
  return { dialCode: '+57', number: value };
}

export function PhoneInput({ value, onChange, className = '', placeholder = '3001234567', disabled }: PhoneInputProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [dialCode, setDialCode] = useState('+57');
  const [number, setNumber] = useState('');

  useEffect(() => {
    fetch(`${API}/master-data/countries?lang=es`)
      .then(r => r.json())
      .then(data => setCountries(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const { dialCode: dc, number: num } = split(value);
    setDialCode(dc);
    setNumber(num);
  }, []);

  const handleDialCode = (code: string) => {
    setDialCode(code);
    onChange(number ? `${code} ${number}` : '');
  };

  const handleNumber = (num: string) => {
    setNumber(num);
    onChange(num ? `${dialCode} ${num}` : '');
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <select
        value={dialCode}
        onChange={e => handleDialCode(e.target.value)}
        disabled={disabled}
        className="w-32 px-2 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F]/50 shrink-0"
      >
        {countries.length === 0 && (
          <option value="+57">🇨🇴 +57</option>
        )}
        {countries.map(c => (
          <option key={c.id} value={c.dialCode}>
            {c.flag} {c.dialCode}
          </option>
        ))}
      </select>
      <input
        type="tel"
        value={number}
        onChange={e => handleNumber(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F]/50"
      />
    </div>
  );
}
