import { UserRole } from '@prisma/client';

/**
 * Default scopes per role.
 * Each module has a set of actions: view, create, edit, delete, export, manage.
 * 'manage' implies all CRUD + special admin actions.
 */

export type ScopeAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'manage';

export const DEFAULT_ROLE_SCOPES: Record<UserRole, Record<string, ScopeAction[]>> = {
  superadmin: {
    // superadmin has all scopes implicitly — guard bypasses
    '*': ['manage'],
  },

  tenant_admin: {
    // Tenant-level admin: accesses all stores, manages tenant-level config
    'stores':     ['view', 'create', 'edit', 'delete'],
    'users':      ['view', 'create', 'edit', 'delete'],
    'roles':      ['view', 'edit'],
    'dashboard':  ['view'],
    'reports':    ['view', 'export'],
    'ai_agents':  ['view', 'create', 'edit', 'delete'],
    'billing':    ['view', 'edit'],
    'settings':   ['view', 'edit'],
    // Consolidated access to all business modules
    'pos':         ['view', 'create', 'edit', 'delete', 'export'],
    'inventory':   ['view', 'create', 'edit', 'delete', 'export'],
    'catalog':     ['view', 'create', 'edit', 'delete'],
    'appointments':['view', 'create', 'edit', 'delete'],
    'customers':   ['view', 'create', 'edit', 'delete', 'export'],
    'suppliers':   ['view', 'create', 'edit', 'delete'],
    'purchases':   ['view', 'create', 'edit', 'delete'],
    'expenses':    ['view', 'create', 'edit', 'delete', 'export'],
    'whatsapp':    ['view', 'edit'],
    'accounting':  ['view', 'create', 'edit', 'delete', 'export'],
    'audit':       ['view', 'export'],
  },

  store_admin: {
    'dashboard':   ['view'],
    'pos':         ['view', 'create', 'edit', 'delete'],
    'inventory':   ['view', 'create', 'edit', 'delete'],
    'catalog':     ['view', 'create', 'edit', 'delete'],
    'appointments':['view', 'create', 'edit', 'delete'],
    'customers':   ['view', 'create', 'edit', 'delete'],
    'suppliers':   ['view', 'create', 'edit'],
    'purchases':   ['view', 'create', 'edit'],
    'expenses':    ['view', 'create', 'edit'],
    'reports':     ['view', 'export'],
    'users':       ['view', 'create', 'edit', 'delete'], // solo en su store
    'settings':    ['view', 'edit'],
    'whatsapp':    ['view', 'edit'],
    'ai_agents':   ['view'],
    'accounting':  ['view', 'create', 'edit'],
  },

  cashier: {
    'dashboard':   ['view'],
    'pos':         ['view', 'create'],
    'customers':   ['view', 'create'],
    'appointments':['view'],
    'catalog':     ['view'],
    'inventory':   ['view'],
  },

  professional: {
    'dashboard':   ['view'],
    'appointments':['view', 'create', 'edit'],
    'customers':   ['view'],
    'catalog':     ['view'],
  },

  financial: {
    'dashboard':   ['view'],
    'reports':     ['view', 'export'],
    'expenses':    ['view', 'create', 'edit'],
    'inventory':   ['view'],
    'pos':         ['view'],
    'customers':   ['view'],
  },

  readonly: {
    'dashboard':   ['view'],
    'pos':         ['view'],
    'inventory':   ['view'],
    'catalog':     ['view'],
    'appointments':['view'],
    'customers':   ['view'],
    'suppliers':   ['view'],
    'purchases':   ['view'],
    'expenses':    ['view'],
    'reports':     ['view'],
    'ai_agents':   ['view'],
  },

  customer: {
    // Platform customers can only view their own appointments and profile
    'appointments': ['view', 'create'],
    'profile':      ['view', 'edit'],
  },
};

/**
 * All recognized modules (used for validation)
 */
export const ALL_MODULES = [
  'stores', 'users', 'roles', 'dashboard', 'reports', 'ai_agents',
  'billing', 'settings', 'pos', 'inventory', 'catalog', 'appointments',
  'customers', 'suppliers', 'purchases', 'expenses', 'whatsapp',
  'accounting', 'audit',
];

/**
 * Get effective scopes for a user.
 * Checks custom Permission records first, falls back to role defaults.
 */
export function getEffectiveScopes(
  role: UserRole,
  permissions?: Array<{ module: string; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean; canExport: boolean }>,
): Record<string, ScopeAction[]> {
  const defaults = DEFAULT_ROLE_SCOPES[role] || {};

  // superadmin always gets full access
  if (role === 'superadmin') return { '*': ['manage'] };

  if (!permissions || permissions.length === 0) {
    return { ...defaults };
  }

  // Merge: defaults + custom permissions (custom overrides defaults)
  const merged: Record<string, ScopeAction[]> = { ...defaults };
  for (const p of permissions) {
    const actions: ScopeAction[] = [];
    if (p.canView) actions.push('view');
    if (p.canCreate) actions.push('create');
    if (p.canEdit) actions.push('edit');
    if (p.canDelete) actions.push('delete');
    if (p.canExport) actions.push('export');
    if (actions.length > 0) {
      merged[p.module] = actions;
    } else {
      delete merged[p.module]; // if all false, remove module entirely
    }
  }

  return merged;
}
