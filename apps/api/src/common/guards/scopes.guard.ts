import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPE_KEY, ScopeRequirement } from '../decorators/require-scope.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ScopeAction } from '../constants/role-scopes';

/**
 * ScopesGuard — checks module-level permissions for the current user.
 *
 * Priority:
 * 1. If @RequireScope('module', 'action') is set → check user has that scope
 * 2. If @Roles('role') is set → check user has that role (backward compat)
 * 3. If neither → allow (public endpoint or handled by other guards)
 *
 * superadmin bypasses all scope checks.
 */
@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      // No user → probably public endpoint, allow (auth handled by JwtAuthGuard)
      return true;
    }

    // superadmin bypasses everything
    if (user.role === 'superadmin') return true;

    // 1. Check @RequireScope first (granular)
    const scopeReq = this.reflector.getAllAndOverride<ScopeRequirement>(SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (scopeReq) {
      const scopes = user.scopes as Record<string, ScopeAction[]> | undefined;
      if (!scopes) {
        throw new ForbiddenException(`No scopes assigned to user`);
      }

      const moduleScopes = scopes[scopeReq.module];
      if (!moduleScopes || moduleScopes.length === 0) {
        throw new ForbiddenException(
          `Access denied: no permissions for module '${scopeReq.module}'`,
        );
      }

      // 'manage' gives all access
      if (moduleScopes.includes('manage')) return true;

      if (!moduleScopes.includes(scopeReq.action)) {
        throw new ForbiddenException(
          `Access denied: missing '${scopeReq.action}' permission for module '${scopeReq.module}'`,
        );
      }

      return true;
    }

    // 2. Fall back to @Roles check (backward compat)
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles) {
      if (!requiredRoles.includes(user.role)) {
        throw new ForbiddenException(
          `Access denied: role '${user.role}' not in [${requiredRoles.join(', ')}]`,
        );
      }
    }

    return true;
  }
}
