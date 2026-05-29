import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * StoreGuard — ensures store-level isolation.
 * 
 * Rules:
 * - superadmin: bypass (platform-level, no store context needed)
 * - tenant_admin: bypass (can see all stores, storeId may be null)
 * - store_admin, cashier, professional, financial, readonly: MUST have storeId in JWT
 * 
 * Place alongside JwtAuthGuard for all dashboard/store endpoints.
 */
@Injectable()
export class StoreGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) return true; // no auth context → let JwtAuthGuard handle

    // Platform admins and tenant admins can operate without a specific store
    if (user.role === 'superadmin' || user.role === 'tenant_admin') {
      return true;
    }

    // All other roles MUST have a store context
    if (!user.storeId) {
      throw new ForbiddenException(
        'Store context required. Users with role ' + user.role + ' must belong to a store.',
      );
    }

    return true;
  }
}
