'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api-client';

function passwordChecks(pwd: string) {
  return {
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /\d/.test(pwd),
  };
}

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const checks = passwordChecks(password);
  const valid = Object.values(checks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) { setError('Enlace inválido. Solicita uno nuevo.'); return; }
    if (!valid) { setError('La contraseña no cumple los requisitos mínimos.'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => router.push('/tienda/auth/login'), 2500);
    } catch (err: any) {
      setError(err?.message || 'No se pudo restablecer. El enlace pudo haber expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-fuchsia-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/tienda" className="inline-flex items-center gap-2 text-2xl font-black text-gray-900">
            <div className="w-9 h-9 bg-[#EF2D8F] rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            Glamorapp
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {done ? (
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-lg font-bold text-gray-900 mb-1">¡Contraseña actualizada!</h1>
              <p className="text-sm text-gray-500">Te llevamos a iniciar sesión…</p>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-bold text-gray-900 mb-1">Nueva contraseña</h1>
              <p className="text-sm text-gray-500 mb-5">Crea una contraseña segura para tu cuenta.</p>

              {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                  <div className="relative">
                    <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      required autoComplete="new-password" placeholder="••••••••"
                      className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F]" />
                    <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2 space-y-1">
                      {[
                        { key: 'length', label: 'Al menos 8 caracteres' },
                        { key: 'upper', label: 'Una mayúscula' },
                        { key: 'lower', label: 'Una minúscula' },
                        { key: 'number', label: 'Un número' },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-1.5 text-xs">
                          {checks[key as keyof typeof checks]
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            : <XCircle className="w-3.5 h-3.5 text-gray-300" />}
                          <span className={checks[key as keyof typeof checks] ? 'text-green-600' : 'text-gray-400'}>{label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                    required autoComplete="new-password" placeholder="••••••••"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F]" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-[#EF2D8F] text-white rounded-xl font-bold text-sm hover:bg-[#d4267e] transition disabled:opacity-60">
                  {loading ? 'Guardando...' : 'Restablecer contraseña'}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-gray-500">
                <Link href="/tienda/auth/login" className="text-[#EF2D8F] font-semibold hover:underline">Volver a iniciar sesión</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CustomerResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
