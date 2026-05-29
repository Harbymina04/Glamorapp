'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({
    tenantName: '', tenantSlug: '', storeName: '',
    email: '', password: '', firstName: '', lastName: '', phone: '',
  });
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    }
  };

  const inputClass = 'w-full h-10 px-3 rounded-lg border border-border-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition';

  return (
    <div className="min-h-screen bg-surface-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 p-2">
            <img src="/logo.png" alt="Glamorapp" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold">Crear cuenta</h1>
          <p className="text-muted-foreground text-sm mt-1">Comienza a gestionar tu salón de belleza</p>
        </div>

        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre del negocio</label>
            <input type="text" value={form.tenantName} onChange={e => handleChange('tenantName', e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Slug (URL)</label>
            <input type="text" value={form.tenantSlug} onChange={e => handleChange('tenantSlug', e.target.value)} className={inputClass} placeholder="mi-salon" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre de la tienda</label>
            <input type="text" value={form.storeName} onChange={e => handleChange('storeName', e.target.value)} className={inputClass} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre</label>
              <input type="text" value={form.firstName} onChange={e => handleChange('firstName', e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Apellido</label>
              <input type="text" value={form.lastName} onChange={e => handleChange('lastName', e.target.value)} className={inputClass} required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Contraseña</label>
            <input type="password" value={form.password} onChange={e => handleChange('password', e.target.value)} className={inputClass} required minLength={6} />
          </div>

          <button type="submit" disabled={isLoading} className="w-full h-10 bg-glamor-primary hover:bg-glamor-primary-hover text-white rounded-lg font-medium text-sm transition flex items-center justify-center gap-2 disabled:opacity-50">
            {isLoading ? 'Creando...' : <>Crear cuenta <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/auth/login" className="text-glamor-primary font-medium hover:underline">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
