'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Users, LayoutDashboard, BarChart3, ChevronLeft, Store, Brain, LogOut, Plug, Calculator, FileText, Receipt } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

const TENANT_LINKS = [
  { name: 'Dashboard', href: '/tenant', icon: LayoutDashboard },
  { name: 'Sucursales', href: '/tenant/stores', icon: Store },
  { name: 'Usuarios', href: '/tenant/users', icon: Users },
  { name: 'IA - Consumo', href: '/tenant/ai-usage', icon: Brain },
  { name: 'Integraciones', href: '/tenant/marketing', icon: Plug },
];

const ACCOUNTING_LINKS = [
  { name: 'Resumen', href: '/tenant/accounting', icon: Calculator },
  { name: 'Facturas', href: '/tenant/accounting/invoices', icon: FileText },
  { name: 'Impuestos', href: '/tenant/accounting/taxes', icon: Receipt },
  { name: 'Config. fiscal', href: '/tenant/accounting/config', icon: Building2 },
];

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, checkAuth, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    checkAuth();
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-glamor-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    router.replace('/auth/login');
    return null;
  }

  if (user?.role !== 'tenant_admin') {
    router.replace('/dashboard');
    return null;
  }

  return (
    <div className="flex min-h-screen bg-surface-primary">
      <aside className="w-56 bg-white border-r border-border-primary flex flex-col">
        <div className="p-4 border-b border-border-primary">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <h2 className="text-lg font-bold text-foreground mt-3">{user?.firstName || 'Admin'}</h2>
          <p className="text-xs text-muted-foreground">Panel de Administración</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-auto">
          {/* General */}
          {TENANT_LINKS.map(link => {
            const isActive = pathname === link.href || (link.href !== '/tenant' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-glamor-primary/10 text-glamor-primary'
                    : 'text-muted-foreground hover:bg-surface-hover'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}

          {/* Contabilidad */}
          <div className="pt-3 pb-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Contabilidad
            </p>
          </div>
          {ACCOUNTING_LINKS.map(link => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-glamor-primary/10 text-glamor-primary'
                    : 'text-muted-foreground hover:bg-surface-hover'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer — user info + logout */}
        <div className="p-3 border-t border-border-primary">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-surface-hover/50">
            <div className="w-8 h-8 rounded-full bg-glamor-primary flex items-center justify-center text-white text-xs font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground">Admin Tenant</p>
            </div>
            <button
              onClick={() => { logout(); router.push('/auth/login'); }}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-red-500 transition"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
