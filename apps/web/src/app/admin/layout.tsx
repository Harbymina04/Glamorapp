'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Crown, CreditCard, Users, AlertTriangle, ChevronLeft, MessageCircle, Brain } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

const ADMIN_LINKS = [
  { name: 'Planes', href: '/admin/plans', icon: Crown },
  { name: 'Suscripciones', href: '/admin/subscriptions', icon: CreditCard },
  { name: 'Clientes', href: '/admin/clients', icon: Users },
  { name: 'WhatsApp', href: '/admin/whatsapp', icon: MessageCircle },
  { name: 'IA - Consumo', href: '/admin/ai-usage', icon: Brain },
  { name: 'Excepciones', href: '/admin/exceptions', icon: AlertTriangle },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    checkAuth();
    setMounted(true);
  }, []);

  // Loading state
  if (!mounted || isLoading) {
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

  // Not superadmin → access denied
  if (user?.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Acceso restringido — solo superadmins</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface-primary">
      {/* Admin Sidebar */}
      <aside className="w-56 bg-white border-r border-border-primary flex flex-col">
        <div className="p-4 border-b border-border-primary">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ChevronLeft className="w-4 h-4" />
            Volver a Glamorapp
          </Link>
          <h2 className="text-lg font-bold text-foreground mt-3">Admin Panel</h2>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {ADMIN_LINKS.map(link => {
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
      </aside>

      {/* Content */}
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
