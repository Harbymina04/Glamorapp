/**
 * Default AI agents created automatically for every new tenant on registration.
 * Each slug must match an agent implementation in agents/ folder.
 */
export const DEFAULT_AGENTS = [
  {
    slug: 'inventory',
    name: 'Agente de Inventario',
    description: 'Monitorea niveles de stock, predice necesidades de reabastecimiento y detecta productos de bajo movimiento.',
    objective: 'Mantener niveles óptimos de inventario, evitando quiebres de stock y excesos.',
    icon: 'Package',
    autonomyLevel: 'recommend_only',
    aiProvider: 'deepseek',
    analysisFrequency: 'daily',
    status: 'pending_config',
  },
  {
    slug: 'customers',
    name: 'Agente de Clientes',
    description: 'Identifica clientes en riesgo de abandono, oportunidades de fidelización y segmentos de alto valor.',
    objective: 'Aumentar retención y valor de por vida del cliente.',
    icon: 'Users',
    autonomyLevel: 'recommend_only',
    aiProvider: 'deepseek',
    analysisFrequency: 'weekly',
    status: 'pending_config',
  },
  {
    slug: 'financial',
    name: 'Agente Financiero',
    description: 'Analiza rentabilidad, controla gastos, detecta anomalías y proyecta flujo de caja.',
    objective: 'Mejorar márgenes y detectar fugas de dinero.',
    icon: 'DollarSign',
    autonomyLevel: 'recommend_only',
    aiProvider: 'deepseek',
    analysisFrequency: 'weekly',
    status: 'pending_config',
  },
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Alquiler',
  'Sueldos y honorarios',
  'Productos e insumos',
  'Servicios (agua, luz, internet)',
  'Marketing y publicidad',
  'Mantenimiento y reparaciones',
  'Equipos y mobiliario',
  'Otros',
];
