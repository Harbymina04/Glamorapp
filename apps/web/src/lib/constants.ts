export const MODULES = [
  { name: 'Inicio', href: '/dashboard', icon: 'Home', feature: 'pos' },
  { name: 'Inventario', href: '/dashboard/inventory', icon: 'Package', feature: 'inventory' },
  { name: 'Ventas POS', href: '/dashboard/pos', icon: 'ShoppingCart', feature: 'pos' },
  { name: 'Pedidos Online', href: '/dashboard/pedidos', icon: 'ShoppingBag', feature: 'pos' },
  { name: 'Agendamiento', href: '/dashboard/appointments', icon: 'Calendar', feature: 'appointments' },
  { name: 'Catálogo Productos', href: '/dashboard/catalog/products', icon: 'BookOpen', feature: 'catalog' },
  { name: 'Catálogo Uñas', href: '/dashboard/catalog/nail-designs', icon: 'Palette', feature: 'catalog' },
] as const;

export const ADMIN_MODULES = [
  { name: 'Clientes', href: '/dashboard/customers', icon: 'Users', feature: 'customers' },
  { name: 'Proveedores', href: '/dashboard/suppliers', icon: 'Truck', feature: 'suppliers' },
  { name: 'Compras', href: '/dashboard/inventory/purchases', icon: 'ShoppingCart', feature: 'purchases' },
  { name: 'Reportes', href: '/dashboard/reports', icon: 'BarChart3', feature: 'reports' },
  { name: 'Gastos', href: '/dashboard/expenses', icon: 'Wallet', feature: 'expenses' },
  { name: 'Usuarios', href: '/dashboard/users', icon: 'UserCog', feature: 'users' },
  { name: 'Comisiones', href: '/dashboard/commissions', icon: 'DollarSign', feature: 'users' },
  { name: 'Agentes IA', href: '/dashboard/ai-agents', icon: 'Bot', feature: 'ai_agents' },
  { name: 'Importar datos', href: '/dashboard/import', icon: 'Upload', feature: 'settings' },
  { name: 'Configuración', href: '/dashboard/settings', icon: 'Settings', feature: 'settings' },
  { name: 'Contabilidad', href: '/dashboard/accounting', icon: 'Wallet', feature: 'accounting' },
] as const;

export const SALE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange-50 text-orange-700 border-orange-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  refunded: 'bg-gray-50 text-gray-600 border-gray-200',
};

export const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange-50 text-orange-700',
  confirmed: 'bg-green-50 text-green-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
  no_show: 'bg-gray-50 text-gray-600',
};

export const LOYALTY_TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-50 text-amber-700',
  silver: 'bg-gray-100 text-gray-600',
  gold: 'bg-yellow-50 text-yellow-700',
  platinum: 'bg-indigo-50 text-indigo-700',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  mixed: 'Mixto',
  other: 'Otro',
};
