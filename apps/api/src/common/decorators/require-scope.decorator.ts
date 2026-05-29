import { SetMetadata } from '@nestjs/common';
import { ScopeAction } from '../constants/role-scopes';

export const SCOPE_KEY = 'scope';

export interface ScopeRequirement {
  module: string;
  action: ScopeAction;
}

/**
 * Decorator to require a specific scope (module + action) on an endpoint.
 * 
 * @example
 *   @RequireScope('pos', 'create')
 *   @Post()
 *   createSale() {}
 * 
 * @example
 *   @RequireScope('inventory', 'view')
 *   @Get()
 *   listProducts() {}
 */
export const RequireScope = (module: string, action: ScopeAction) =>
  SetMetadata(SCOPE_KEY, { module, action } as ScopeRequirement);
