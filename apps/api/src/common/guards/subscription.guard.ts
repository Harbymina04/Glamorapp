import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { SKIP_SUBSCRIPTION_KEY } from '../decorators/skip-subscription.decorator';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow if the route/controller opted out
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_SUBSCRIPTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Only applies to tenant users — superadmin and staff bypass
    if (!user?.tenantId || user.role === 'superadmin') return true;

    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId: user.tenantId },
      select: { status: true, trialEndsAt: true },
    });

    // No subscription found — allow (let other logic handle missing setup)
    if (!sub) return true;

    const now = new Date();

    // Trial expired
    if (sub.status === 'trial' && sub.trialEndsAt && sub.trialEndsAt < now) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: 'SubscriptionExpired',
          message: 'Tu período de prueba ha expirado. Activa tu plan para continuar.',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // Explicitly expired/cancelled
    if (sub.status === 'expired' || sub.status === 'cancelled') {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: 'SubscriptionExpired',
          message: 'Tu suscripción no está activa. Activa tu plan para continuar.',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
