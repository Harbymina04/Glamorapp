'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Crown, CreditCard, Users, ChevronLeft, MessageCircle, Brain, LayoutDashboard, LogOut, Database, Banknote, Shield, Settings2, Receipt } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

const ADMIN_LINKS = [
  { name: 'Overview', href: '/admin/overview', icon: LayoutDashboard },
  { name: 'Planes', href: '/admin/plans', icon: Crown },
  { name: 'Suscripciones', href: '/admin/subscriptions', icon: CreditCard },
  { name: 'Facturación', href: '/admin/billing', icon: Receipt },
  { name: 'Liquidaciones', href: '/admin/payouts', icon: Banknote },
  { name: 'Clientes', href: '/admin/clients', icon: Users },
  { name: 'WhatsApp', href: '/admin/whatsapp', icon: MessageCircle },
  { name: 'IA - Consumo', href: '/admin/ai-usage', icon: Brain },
  { name: 'Audit Logs',     href: '/admin/audit-logs',             icon: Shield },
  { name: 'Datos Maestros', href: '/admin/master-data/categories', icon: Database },
  { name: 'Plataforma',    href: '/admin/platform',               icon: Settings2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Await checkAuth so we know the real auth state before rendering
    checkAuth().finally(() => setReady(true));
  }, []); // eslint-disable-line

  // Show spinner while checking auth
  if (!ready || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-glamor-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated → redirect to login
  if (!isAuthenticated) {
    router.replace('/auth/login');
    return null;
  }

  // Not superadmin → redirect silently
  if (user?.role !== 'superadmin') {
    router.replace('/dashboard');
    return null;
  }

  const handleLogout = () => {
    useAuthStore.getState().logout();
    router.replace('/auth/login');
  };

  return (
    <div className="flex min-h-screen bg-surface-primary">
      {/* Admin Sidebar */}
      <aside className="w-56 bg-white border-r border-border-primary flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-border-primary">
          <Link href="/dashboard" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition mb-3">
            <ChevronLeft className="w-3.5 h-3.5" />
            Volver a Glamorapp
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-glamor-primary flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none">Admin Panel</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Superadministrador</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {ADMIN_LINKS.map(link => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-glamor-primary/10 text-glamor-primary'
                    : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                }`}
              >
                <link.icon className="w-4 h-4 shrink-0" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer: user + logout */}
        <div className="p-3 border-t border-border-primary">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-foreground truncate">{user?.email}</p>
            <p className="text-[10px] text-muted-foreground">Superadmin</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-red-50 hover:text-red-600 transition"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-6 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
