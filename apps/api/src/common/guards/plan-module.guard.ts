import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PLAN_MODULE_KEY } from '../decorators/require-plan-module.decorator';

// Modules always available regardless of plan
const ALWAYS_ALLOWED = new Set(['pos', 'inventory', 'dashboard', 'settings', 'users']);

@Injectable()
export class PlanModuleGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.getAllAndOverride<string>(PLAN_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No module restriction set on this route
    if (!requiredModule) return true;

    // Always-allowed modules skip the check
    if (ALWAYS_ALLOWED.has(requiredModule)) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // No auth / superadmin / customer (storefront) bypass
    if (!user?.tenantId || user.role === 'superadmin' || user.role === 'customer') return true;

    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId: user.tenantId },
      include: { plan: { select: { name: true, features: true } } },
    });

    // No subscription → let SubscriptionGuard handle it
    if (!sub) return true;

    const modules: Record<string, boolean> =
      (sub.plan.features as any)?.modules ?? {};

    if (modules[requiredModule] !== true) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'PlanModuleRestricted',
        message: `El módulo "${requiredModule}" no está incluido en tu plan "${sub.plan.name}". Actualiza tu plan para acceder.`,
        module: requiredModule,
        planName: sub.plan.name,
      });
    }

    return true;
  }
}
