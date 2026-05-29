'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Maps module key names from constants.ts to plan feature keys and scope module names.
 */
const FEATURE_MAP: Record<string, string> = {
  pos: 'pos',
  inventory: 'inventory',
  catalog: 'catalog',
  appointments: 'appointments',
  reports: 'reports',
  ai: 'ai_agents',
  ai_agents: 'ai_agents',
  suppliers: 'suppliers',
  expenses: 'expenses',
  purchases: 'purchases',
  customers: 'customers',
  users: 'users',
  settings: 'settings',
  whatsapp: 'whatsapp',
  accounting: 'accounting',
};

/**
 * Checks both plan feature availability AND user scopes.
 * 
 * @param feature - The feature key (e.g., 'pos', 'inventory', 'reports')
 * @param action - Optional scope action to check (e.g., 'create', 'edit'). Defaults to 'view'.
 */
export function usePlanGate(feature: string, action: string = 'view'): { allowed: boolean; reason?: string } {
  const { plan, user, hasScope } = useAuthStore();

  // Superadmin always has access
  if (user?.role === 'superadmin') return { allowed: true };

  // tenant_admin bypasses plan gates (they see everything for management)
  if (user?.role === 'tenant_admin') return { allowed: true };

  // No plan data yet (loading)
  if (!plan) return { allowed: true };

  const mappedFeature = FEATURE_MAP[feature] || feature;

  // Check plan features (new format: plan.features.modules)
  const modules = (plan.features as any)?.modules || plan.features || {};
  const planAllows = modules[mappedFeature] === true;

  // pos and inventory are always available at plan level
  const alwaysAllowed = mappedFeature === 'pos' || mappedFeature === 'inventory';

  if (!alwaysAllowed && !planAllows) {
    return {
      allowed: false,
      reason: `La funcionalidad "${feature}" requiere un plan superior.`,
    };
  }

  // Check user scopes (module-level permissions)
  const scopeAllowed = hasScope(mappedFeature, action);
  if (!scopeAllowed) {
    return {
      allowed: false,
      reason: `No tienes permisos para acceder a "${feature}".`,
    };
  }

  return { allowed: true };
}

/**
 * Guard component: wraps pages and redirects if feature not allowed.
 */
export function PlanGate({ feature, children }: { feature: string; children: React.ReactNode }) {
  const { allowed } = usePlanGate(feature);
  const router = useRouter();

  useEffect(() => {
    if (!allowed) {
      router.replace('/dashboard');
    }
  }, [allowed, router]);

  if (!allowed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Acceso restringido</h2>
          <p className="text-sm text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * ScopeGate — conditionally renders children based on user scope.
 * Use this for button-level permissions (e.g., hide "Create" button if user can't create).
 * 
 * @example
 *   <ScopeGate module="pos" action="create">
 *     <Button>Nueva Venta</Button>
 *   </ScopeGate>
 */
export function ScopeGate({ module, action = 'view', children }: { module: string; action?: string; children: React.ReactNode }) {
  const { hasScope, user } = useAuthStore();

  if (user?.role === 'superadmin') return <>{children}</>;
  if (user?.role === 'tenant_admin') return <>{children}</>;

  if (!hasScope(module, action)) return null;

  return <>{children}</>;
}
