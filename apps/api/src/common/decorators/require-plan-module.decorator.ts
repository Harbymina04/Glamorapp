import { SetMetadata } from '@nestjs/common';

export const PLAN_MODULE_KEY = 'planModule';

/**
 * Apply on a controller or route handler to require a specific plan module.
 * If the tenant's plan doesn't include the module → HTTP 403.
 *
 * @example @RequirePlanModule('appointments')
 */
export const RequirePlanModule = (module: string) =>
  SetMetadata(PLAN_MODULE_KEY, module);
