'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Search, Bell, Calendar, Settings, LogOut, Menu, LayoutDashboard, CheckCheck } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { api } from '@/lib/api-client';

interface Notification {
  id: string;
  title: string;
  message: string;
  type?: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days}d`;
}

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
  const { user, logout, token } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Notificaciones ──────────────────────────────────────────────
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/notifications/unread-count', { token });
      setUnreadCount(res?.count ?? 0);
    } catch { /* silencioso */ }
  }, [token]);

  // Cargar el contador al montar y refrescarlo cada 60s
  useEffect(() => {
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, 60_000);
    return () => clearInterval(id);
  }, [fetchUnreadCount]);

  const openNotifications = async () => {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next && token) {
      setLoadingNotifs(true);
      try {
        const res = await api.get('/notifications?limit=10', { token });
        setNotifications(res?.data ?? []);
      } catch { /* silencioso */ }
      finally { setLoadingNotifs(false); }
    }
  };

  const markAllRead = async () => {
    if (!token) return;
    try {
      await api.put('/notifications/read-all', undefined, { token });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* silencioso */ }
  };

  const markRead = async (id: string) => {
    if (!token) return;
    try {
      await api.put(`/notifications/${id}/read`, undefined, { token });
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch { /* silencioso */ }
  };

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

        {/* Volver al panel tenant — solo para tenant_admin */}
        {user?.role === 'tenant_admin' && (
          <button
            onClick={() => router.push('/tenant')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-glamor-primary bg-glamor-primary/10 hover:bg-glamor-primary/20 rounded-lg transition"
            title="Volver al panel administrador"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Panel admin
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={openNotifications}
            className="relative p-2 rounded-lg hover:bg-surface-hover text-muted-foreground"
            title="Notificaciones"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 bg-red-500 text-white rounded-full text-[10px] font-semibold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-lg border border-border-primary z-20 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
                  <p className="text-sm font-semibold text-foreground">Notificaciones</p>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-xs text-glamor-primary hover:underline"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Marcar todas
                    </button>
                  )}
                </div>

                <div className="max-h-96 overflow-auto">
                  {loadingNotifs ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">Cargando…</div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No tienes notificaciones</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <button
                        key={n.id}
                        onClick={() => {
                          if (!n.isRead) markRead(n.id);
                          if (n.link) { setShowNotifications(false); router.push(n.link); }
                        }}
                        className={`w-full text-left px-4 py-3 border-b border-border-light last:border-0 hover:bg-surface-hover transition flex gap-3 ${
                          n.isRead ? '' : 'bg-glamor-primary/5'
                        }`}
                      >
                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.isRead ? 'bg-transparent' : 'bg-glamor-primary'}`} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-foreground truncate">{n.title}</span>
                          <span className="block text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</span>
                          <span className="block text-[11px] text-muted-foreground/70 mt-1">{relativeTime(n.createdAt)}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

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
