'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { ArrowRight, Check, X, Loader2, Eye, EyeOff } from 'lucide-react';

// ─── Password strength ──────────────────────────────────────
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { score, label: 'Débil', color: 'bg-red-400' };
  if (score <= 4) return { score, label: 'Regular', color: 'bg-yellow-400' };
  return { score, label: 'Fuerte', color: 'bg-green-500' };
}

// ─── Sanitize slug ──────────────────────────────────────────
function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '');
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();

  const [form, setForm] = useState({
    tenantName: '',
    tenantSlug: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Slug real-time check ───────────────────────────────
  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) { setSlugStatus('idle'); return; }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { setSlugStatus('invalid'); return; }
    setSlugStatus('checking');
    try {
      const res = await api.get(`/auth/check-slug?slug=${encodeURIComponent(slug)}`);
      setSlugStatus(res.available ? 'available' : 'taken');
    } catch {
      setSlugStatus('idle');
    }
  }, []);

  useEffect(() => {
    const slug = form.tenantSlug;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!slug) { setSlugStatus('idle'); return; }
    debounceRef.current = setTimeout(() => checkSlug(slug), 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.tenantSlug, checkSlug]);

  // ─── Auto-generate slug from tenant name ──────────────────
  const handleTenantNameChange = (value: string) => {
    setForm(prev => {
      const autoSlug = prev.tenantSlug === sanitizeSlug(prev.tenantName)
        ? sanitizeSlug(value)
        : prev.tenantSlug;
      return { ...prev, tenantName: value, tenantSlug: autoSlug };
    });
  };

  const handleSlugChange = (value: string) => {
    setForm(prev => ({ ...prev, tenantSlug: sanitizeSlug(value) }));
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: '' }));
  };

  // ─── Client-side validation ────────────────────────────────
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.firstName.trim()) errors.firstName = 'Requerido';
    if (!form.lastName.trim()) errors.lastName = 'Requerido';
    if (!form.tenantName.trim()) errors.tenantName = 'Requerido';
    if (!form.tenantSlug || form.tenantSlug.length < 3)
      errors.tenantSlug = 'Mínimo 3 caracteres';
    if (slugStatus === 'taken') errors.tenantSlug = 'Este slug ya está en uso';
    if (slugStatus === 'invalid') errors.tenantSlug = 'Solo letras minúsculas, números y guiones';
    if (!form.email) errors.email = 'Requerido';
    if (!form.password || form.password.length < 8)
      errors.password = 'Mínimo 8 caracteres';
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(form.password))
      errors.password = 'Debe tener mayúscula, minúscula y número';
    if (form.password !== form.confirmPassword)
      errors.confirmPassword = 'Las contraseñas no coinciden';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    try {
      const { confirmPassword, ...payload } = form;
      // phone is optional — omit if empty
      if (!payload.phone) delete (payload as any).phone;
      const redirectPath = await register(payload);
      router.push(redirectPath || '/tenant');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('email')) {
        setFieldErrors(prev => ({ ...prev, email: 'Este email ya está registrado' }));
      } else if (msg.toLowerCase().includes('slug')) {
        setFieldErrors(prev => ({ ...prev, tenantSlug: 'Este slug ya está en uso' }));
      } else {
        setError('Error al crear la cuenta. Por favor intenta de nuevo.');
      }
    }
  };

  const inputClass = (field: string) =>
    `w-full h-10 px-3 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 transition ${
      fieldErrors[field]
        ? 'border-red-400 focus:ring-red-200'
        : 'border-border-primary focus:ring-glamor-primary/20 focus:border-glamor-primary'
    }`;

  const pwStrength = getPasswordStrength(form.password);

  const SlugIndicator = () => {
    if (slugStatus === 'checking') return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
    if (slugStatus === 'available') return <Check className="w-4 h-4 text-green-500" />;
    if (slugStatus === 'taken') return <X className="w-4 h-4 text-red-500" />;
    if (slugStatus === 'invalid') return <X className="w-4 h-4 text-red-500" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-surface-primary flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 p-2">
            <img src="/logo.png" alt="Glamorapp" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold">Crear cuenta</h1>
          <p className="text-muted-foreground text-sm mt-1">Comienza a gestionar tu salón de belleza</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl shadow-sm border border-border-primary p-6">

          {/* ── Negocio ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tu negocio</p>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre del negocio *</label>
              <input
                type="text"
                value={form.tenantName}
                onChange={e => handleTenantNameChange(e.target.value)}
                className={inputClass('tenantName')}
                placeholder="Salón Glamour"
              />
              {fieldErrors.tenantName && <p className="text-xs text-red-500 mt-1">{fieldErrors.tenantName}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">URL del negocio (slug) *</label>
              <div className="relative">
                <input
                  type="text"
                  value={form.tenantSlug}
                  onChange={e => handleSlugChange(e.target.value)}
                  className={inputClass('tenantSlug') + ' pr-8'}
                  placeholder="salon-glamour"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2">
                  <SlugIndicator />
                </span>
              </div>
              {slugStatus === 'available' && (
                <p className="text-xs text-green-600 mt-1">¡Disponible!</p>
              )}
              {(slugStatus === 'taken' || fieldErrors.tenantSlug) && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.tenantSlug || 'Este slug ya está en uso'}</p>
              )}
              {slugStatus === 'idle' && !fieldErrors.tenantSlug && (
                <p className="text-xs text-muted-foreground mt-1">Solo letras minúsculas, números y guiones. Ej: mi-salon</p>
              )}
            </div>
          </div>

          <hr className="border-border-primary" />

          {/* ── Datos personales ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tus datos</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre *</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={e => handleChange('firstName', e.target.value)}
                  className={inputClass('firstName')}
                />
                {fieldErrors.firstName && <p className="text-xs text-red-500 mt-1">{fieldErrors.firstName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Apellido *</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={e => handleChange('lastName', e.target.value)}
                  className={inputClass('lastName')}
                />
                {fieldErrors.lastName && <p className="text-xs text-red-500 mt-1">{fieldErrors.lastName}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                className={inputClass('email')}
                autoComplete="email"
              />
              {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Teléfono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
                className={inputClass('phone')}
                placeholder="+1 555 000 0000"
              />
            </div>
          </div>

          <hr className="border-border-primary" />

          {/* ── Contraseña ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contraseña</p>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Contraseña *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => handleChange('password', e.target.value)}
                  className={inputClass('password') + ' pr-10'}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= pwStrength.score ? pwStrength.color : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  {pwStrength.label && (
                    <p className="text-xs text-muted-foreground">{pwStrength.label}</p>
                  )}
                </div>
              )}
              {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Confirmar contraseña *</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={e => handleChange('confirmPassword', e.target.value)}
                  className={inputClass('confirmPassword') + ' pr-10'}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || slugStatus === 'checking' || slugStatus === 'taken'}
            className="w-full h-11 bg-glamor-primary hover:bg-glamor-primary-hover text-white rounded-lg font-medium text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando cuenta...</>
              : <>Crear cuenta <ArrowRight className="w-4 h-4" /></>
            }
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/auth/login" className="text-glamor-primary font-medium hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
