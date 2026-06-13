'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api-client';

export default function CustomerForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/customer/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      // No revelamos si el correo existe — mostramos el mismo mensaje de éxito
      setSent(true);
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
          {sent ? (
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-lg font-bold text-gray-900 mb-1">Revisa tu correo</h1>
              <p className="text-sm text-gray-500 mb-6">
                Si <strong>{email}</strong> tiene una cuenta, te enviamos un enlace para restablecer tu contraseña. El enlace vence en 15 minutos.
              </p>
              <Link href="/tienda/auth/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#EF2D8F] hover:underline">
                <ArrowLeft className="w-4 h-4" /> Volver a iniciar sesión
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-bold text-gray-900 mb-1">¿Olvidaste tu contraseña?</h1>
              <p className="text-sm text-gray-500 mb-5">Ingresa tu correo y te enviaremos un enlace para crear una nueva.</p>

              {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      autoComplete="email" placeholder="tu@email.com"
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F]" />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-[#EF2D8F] text-white rounded-xl font-bold text-sm hover:bg-[#d4267e] transition disabled:opacity-60">
                  {loading ? 'Enviando...' : 'Enviar enlace'}
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
