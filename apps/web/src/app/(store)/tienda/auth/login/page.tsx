'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/tienda';
  const tenantId = searchParams.get('tenantId') || '';

  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const redirectPath = await login(email, password);

      // Block non-customer accounts from using the storefront login
      const { user } = useAuthStore.getState();
      if (user?.role !== 'customer') {
        useAuthStore.getState().logout();
        setError('Esta cuenta es de negocio. Usa el acceso en /auth/login.');
        return;
      }

      // Redirect back to where they came from (or /tienda)
      router.push(redirectTo !== '/tienda' ? redirectTo : '/tienda');
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas');
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
          <p className="mt-2 text-sm text-gray-500">Accede a tu cuenta para agendar citas</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h1 className="text-lg font-bold text-gray-900 mb-5">Iniciar sesión</h1>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F]"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#EF2D8F] text-white rounded-xl font-bold text-sm hover:bg-[#d4267e] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            ¿No tienes cuenta?{' '}
            <Link
              href={`/tienda/auth/register?${tenantId ? `tenantId=${tenantId}&` : ''}${redirectTo !== '/tienda' ? `redirect=${encodeURIComponent(redirectTo)}` : ''}`}
              className="text-[#EF2D8F] font-semibold hover:underline"
            >
              Regístrate gratis
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

export default function CustomerLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
