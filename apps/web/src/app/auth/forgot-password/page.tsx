'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setError('Ocurrió un error. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 p-2">
            <img src="/assets/logo.png" alt="Glamorapp" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        {sent ? (
          <div className="bg-white rounded-2xl shadow-sm border border-border-primary p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Revisa tu correo</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Si el email <strong>{email}</strong> está registrado, recibirás instrucciones para restablecer tu contraseña en los próximos minutos.
            </p>
            <Link
              href="/auth/login"
              className="text-sm text-glamor-primary font-medium hover:underline"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-border-primary p-6 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition"
                  placeholder="tu@correo.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-glamor-primary hover:bg-glamor-primary-hover text-white rounded-lg font-medium text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                : 'Enviar enlace de recuperación'
              }
            </button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link href="/auth/login" className="text-glamor-primary font-medium hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
