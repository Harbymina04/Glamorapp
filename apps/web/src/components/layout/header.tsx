'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Search, Bell, Calendar, Settings, LogOut, Menu } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Inicio',
  '/dashboard/inventory': 'Inventario',
  '/dashboard/pos': 'Ventas POS',
  '/dashboard/appointments': 'Agendamiento',
  '/dashboard/catalog/products': 'Catálogo de Productos',
  '/dashboard/catalog/nail-designs': 'Catálogo de Uñas',
  '/dashboard/customers': 'Clientes',
  '/dashboard/suppliers': 'Proveedores',
  '/dashboard/inventory/purchases': 'Compras',
  '/dashboard/reports': 'Reportes',
  '/dashboard/expenses': 'Gastos',
  '/dashboard/users': 'Usuarios',
  '/dashboard/ai-agents': 'Agentes IA',
  '/dashboard/settings': 'Configuración',
  '/dashboard/accounting': 'Contabilidad',
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const title = pageTitles[pathname] || 'Glamorapp';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Búsqueda global: redirige a clientes con el término
      router.push(`/dashboard/customers?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-border-primary flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground">
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative w-72 hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar clientes..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border-primary text-sm bg-surface-primary focus:outline-none focus:ring-2 focus:ring-glamor-primary/20 focus:border-glamor-primary transition"
          />
        </form>

        {/* Notifications */}
        <button
          onClick={() => router.push('/dashboard')}
          className="relative p-2 rounded-lg hover:bg-surface-hover text-muted-foreground"
          title="Notificaciones"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">3</span>
        </button>

        {/* Calendar — go to appointments */}
        <button
          onClick={() => router.push('/dashboard/appointments')}
          className="p-2 rounded-lg hover:bg-surface-hover text-muted-foreground"
          title="Agendamiento"
        >
          <Calendar className="w-5 h-5" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-hover transition"
          >
            <div className="w-8 h-8 rounded-full bg-glamor-primary text-white flex items-center justify-center text-sm font-semibold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-foreground">{user?.firstName}</p>
              <p className="text-xs text-muted-foreground">{user?.role}</p>
            </div>
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-border-primary z-20 py-1">
                <button
                  onClick={() => { setShowUserMenu(false); router.push('/dashboard/settings'); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-hover flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" /> Configuración
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); logout(); router.push('/auth/login'); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-hover flex items-center gap-2 text-red-600"
                >
                  <LogOut className="w-4 h-4" /> Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
