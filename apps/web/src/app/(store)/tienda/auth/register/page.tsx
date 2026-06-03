'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api-client';
import { setToken, setRefreshToken, setUser } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';

function passwordStrength(pwd: string) {
  if (!pwd) return null;
  const checks = {
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /\d/.test(pwd),
  };
  return { checks, passed: Object.values(checks).filter(Boolean).length };
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/tienda';

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(form.password);

  const setField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (!strength || strength.passed < 4) {
      setError('La contraseña no cumple los requisitos mínimos');
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, string> = {
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
      };
      if (form.phone) payload.phone = form.phone;

      const res = await api.post('/auth/customer/register', payload);
      // Sync with Zustand store so auth state persists across pages
      setToken(res.accessToken);
      setRefreshToken(res.refreshToken);
      setUser({ ...res.user, scopes: res.scopes });
      useAuthStore.setState({
        user: res.user,
        token: res.accessToken,
        scopes: res.scopes || {},
        stores: [],
        plan: null,
        isAuthenticated: true,
      });
      router.push(redirectTo);
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-fuchsia-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/tienda" className="inline-flex items-center gap-2 text-2xl font-black text-gray-900">
            <div className="w-9 h-9 bg-[#EF2D8F] rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            Glamorapp
          </Link>
          <p className="mt-2 text-sm text-gray-500">Crea tu cuenta para agendar citas</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h1 className="text-lg font-bold text-gray-900 mb-5">Crear cuenta</h1>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={setField('firstName')}
                  required
                  autoComplete="given-name"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F]"
                  placeholder="Ana"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={setField('lastName')}
                  required
                  autoComplete="family-name"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F]"
                  placeholder="García"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
              <input
                type="email"
                value={form.email}
                onChange={setField('email')}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F]"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <PhoneInput
                value={form.phone}
                onChange={v => setForm(prev => ({ ...prev, phone: v }))}
                placeholder="3001234567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={setField('password')}
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {strength && (
                <div className="mt-2 space-y-1">
                  {[
                    { key: 'length', label: 'Al menos 8 caracteres' },
                    { key: 'upper', label: 'Una mayúscula' },
                    { key: 'lower', label: 'Una minúscula' },
                    { key: 'number', label: 'Un número' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-1.5 text-xs">
                      {strength.checks[key as keyof typeof strength.checks]
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        : <XCircle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                      <span className={strength.checks[key as keyof typeof strength.checks] ? 'text-green-600' : 'text-gray-400'}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={setField('confirmPassword')}
                required
                autoComplete="new-password"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F]"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#EF2D8F] text-white rounded-xl font-bold text-sm hover:bg-[#d4267e] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link
              href={`/tienda/auth/login${redirectTo !== '/tienda' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
              className="text-[#EF2D8F] font-semibold hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          <Link href="/tienda" className="hover:text-gray-600">← Volver a la tienda</Link>
        </p>
      </div>
    </div>
  );
}

export default function CustomerRegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
