'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
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
      const ALLOWED = ['/dashboard', '/tenant', '/admin'];
      const safePath = ALLOWED.includes(redirectPath) ? redirectPath : '/dashboard';
      router.push(safePath);
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Brand */}
      <div className="hidden lg:flex w-1/2 sidebar-gradient items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="w-48 h-48 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <img src="/assets/logo.png" alt="Glamorapp" className="h-[180px] w-auto" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Glamorapp</h1>
          <p className="text-glamor-sidebar-text text-lg leading-relaxed">
            El sistema inteligente que transforma la gestión de tu salón de belleza.
            Potenciado con agentes de IA.
          </p>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-primary">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <img src="/assets/logo.png" alt="Glamorapp" className="h-16 w-auto mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Glamorapp</h1>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Iniciar sesión</h2>
          <p className="text-muted-foreground mb-8">Ingresa a tu cuenta para continuar</p>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-10 px-3 pr-10 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-glamor-primary hover:bg-glamor-primary-hover text-white rounded-lg font-medium text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'Ingresando...' : (
                <>Ingresar <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            ¿No tienes cuenta?{' '}
            <Link href="/auth/register" className="text-glamor-primary font-medium hover:underline">
              Registrarse
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
