'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MODULES, ADMIN_MODULES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { usePlanGate } from '@/hooks/use-plan-gate';
import {
  Home, Package, ShoppingCart, Calendar, BookOpen, Palette,
  Users, Truck, BarChart3, Wallet, UserCog, Bot, Settings,
  ChevronLeft, Sparkles, Lock, Building2, DollarSign, Store, ShoppingBag, Star, Upload, Megaphone, Shield,
} from 'lucide-react';

const iconMap: Record<string, any> = {
  Home, Package, ShoppingCart, Calendar, BookOpen, Palette,
  Users, Truck, BarChart3, Wallet, UserCog, Bot, Settings, DollarSign, Store, ShoppingBag, Star, Upload, Megaphone, Shield,
};

function FilteredModuleLink({ mod }: { mod: { name: string; href: string; icon: string; feature: string } }) {
  const pathname = usePathname();
  const { allowed } = usePlanGate(mod.feature);
  const Icon = iconMap[mod.icon];
  const isActive = mod.href === '/dashboard'
    ? pathname === '/dashboard'
    : pathname === mod.href || pathname.startsWith(mod.href + '/');

  if (!allowed) return null;

  return (
    <Link
      key={mod.href}
      href={mod.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-glamor-primary text-white'
          : 'text-glamor-sidebar-text hover:bg-glamor-sidebar-hover hover:text-glamor-sidebar-text-active'
      )}
    >
      {Icon && <Icon className="w-5 h-5" />}
      <span>{mod.name}</span>
    </Link>
  );
}

export function Sidebar() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'superadmin';
  const isTenantAdmin = user?.role === 'tenant_admin';

  return (
    <aside className="w-60 h-full sidebar-gradient flex flex-col shadow-sidebar z-20">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <Link href={isSuperAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
            <img src="/logo.png" alt="Glamorapp" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Glamorapp</h1>
            <p className="text-glamor-sidebar-text text-xs">Beauty Studio</p>
          </div>
        </Link>
      </div>

      {/* Tenant Admin quick link */}
      {isTenantAdmin && (
        <div className="px-3 py-2 border-b border-white/10">
          <Link
            href="/tenant"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-glamor-sidebar-text hover:bg-white/10 hover:text-white transition"
          >
            <Building2 className="w-4 h-4" />
            Panel de Administración
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-auto px-3 py-4">
        <div className="mb-3 px-2">
          <p className="text-glamor-sidebar-text/60 text-xs font-semibold uppercase tracking-wider mb-2">Principal</p>
          {MODULES.map((mod) => (
            <FilteredModuleLink key={mod.href} mod={mod as any} />
          ))}
        </div>

        <div className="px-2">
          <p className="text-glamor-sidebar-text/60 text-xs font-semibold uppercase tracking-wider mb-2">Administración</p>
          {ADMIN_MODULES.map((mod) => (
            <FilteredModuleLink key={mod.href} mod={mod as any} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/5">
          <div className="w-8 h-8 rounded-full bg-glamor-primary flex items-center justify-center text-white text-xs font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-glamor-sidebar-text text-xs">
              {isSuperAdmin ? 'Superadmin' :
               user?.role === 'tenant_admin' ? 'Admin Tenant' :
               user?.role === 'store_admin' ? 'Admin Sucursal' :
               user?.role === 'cashier' ? 'Cajero' :
               user?.role === 'professional' ? 'Profesional' :
               user?.role || 'Usuario'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
