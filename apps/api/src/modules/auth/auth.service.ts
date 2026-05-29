import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { v4 as uuidv4 } from 'uuid';
import { getEffectiveScopes } from '../../common/constants/role-scopes';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user);
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existingUser) throw new ConflictException('Email already registered');

    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });
    if (existingTenant) throw new ConflictException('Tenant slug already taken');

    // Get the Free plan
    const freePlan = await this.prisma.plan.findUnique({ where: { slug: 'free' } });

    // Create tenant + store + admin user + trial subscription in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug: dto.tenantSlug,
          plan: 'free',
        },
      });

      const store = await tx.store.create({
        data: {
          tenantId: tenant.id,
          name: dto.storeName,
          slug: dto.tenantSlug,
          email: dto.email,
          phone: dto.phone,
        },
      });

      const passwordHash = await bcrypt.hash(dto.password, 10);

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          storeId: store.id,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          role: 'tenant_admin',
        },
      });

      // Create trial subscription (14 days)
      if (freePlan) {
        await tx.subscription.create({
          data: {
            tenantId: tenant.id,
            planId: freePlan.id,
            status: 'trial',
            billingCycle: 'monthly',
            trialEndsAt: new Date(Date.now() + 14 * 86400000),
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 14 * 86400000),
          },
        });
      }

      return user;
    });

    return this.generateTokens(result);
  }

  async refreshToken(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
    });
    if (!user) throw new UnauthorizedException('User not found');

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.generateTokens(user);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { store: true, tenant: true, permissions: { select: { module: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true } } },
    });
    if (!user) throw new UnauthorizedException('User not found');
    const { passwordHash, permissions, ...safe } = user;

    // Get plan info
    const planInfo = await this.getTenantPlanInfo(user.tenantId);

    // Resolve effective scopes
    const scopes = getEffectiveScopes(user.role, permissions);

    // Get redirect path
    const redirectPath = this.getRedirectPath(user.role, user.storeId);

    // For tenant_admin, include all stores
    let stores: any[] | undefined;
    if (user.role === 'tenant_admin') {
      stores = await this.prisma.store.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        select: { id: true, name: true, slug: true },
      });
    }

    return { ...safe, scopes, plan: planInfo, redirectPath, stores: stores || null };
  }

  // ─── Plan helpers ───────────────────────────────────────────

  private async getTenantPlanInfo(tenantId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: ['active', 'trial'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) {
      return {
        planName: 'free',
        planSlug: 'free',
        status: 'none',
        features: { pos: true, inventory: true },
        trialDaysLeft: null,
      };
    }

    const trialDaysLeft = sub.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / 86400000))
      : null;

    return {
      planName: sub.plan.name,
      planSlug: sub.plan.slug,
      status: sub.status,
      billingCycle: sub.billingCycle,
      features: sub.plan.features || {},
      trialEndsAt: sub.trialEndsAt,
      trialDaysLeft,
      currentPeriodEnd: sub.currentPeriodEnd,
      monthlyPrice: Number(sub.plan.monthlyPrice),
      maxUsers: sub.plan.maxUsers,
      maxBranches: sub.plan.maxBranches,
    };
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      storeId: user.storeId,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshTokenValue = uuidv4();
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenValue,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Get plan info for tenant users (skip for superadmin)
    let plan: any = null;
    if (user.role !== 'superadmin' && user.tenantId) {
      plan = await this.getTenantPlanInfo(user.tenantId);
    }

    const redirectPath = this.getRedirectPath(user.role, user.storeId);

    // For tenant_admin, include list of stores
    let stores: any[] | undefined;
    if (user.role === 'tenant_admin' && user.tenantId) {
      stores = await this.prisma.store.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        select: { id: true, name: true, slug: true },
      });
    }

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        storeId: user.storeId,
      },
      scopes: getEffectiveScopes(user.role),
      plan,
      redirectPath,
      stores: stores || null,
    };
  }

  /**
   * Determine where to redirect after login based on role.
   */
  private getRedirectPath(role: string, storeId: string | null): string {
    switch (role) {
      case 'superadmin':
        return '/admin';
      case 'tenant_admin':
        return '/tenant';
      default:
        return '/dashboard';
    }
  }

  // ─── Password Reset ──────────────────────────────────────────

  /**
   * Forgot password — generates a reset token for superadmin/tenant_admin.
   * In production, this would email the token. For now, returns it directly.
   */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true, deletedAt: null },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { success: true, message: 'Si el email existe, recibirás instrucciones para resetear tu contraseña.' };
    }

    // Only superadmin and tenant_admin can reset via email
    if (user.role !== 'superadmin' && user.role !== 'tenant_admin') {
      return { success: true, message: 'Si el email existe, recibirás instrucciones para resetear tu contraseña.' };
    }

    // Generate token, expire in 15 minutes
    const token = uuidv4();
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    console.log(`[Auth] Password reset token for ${email}: ${token}`);

    // TODO: Send email with reset link
    // In production: await this.mailer.sendPasswordReset(email, token);

    return {
      success: true,
      message: 'Se ha enviado un enlace de recuperación a tu correo.',
      // token is returned here for development only — remove in production
      devToken: token,
    };
  }

  /**
   * Reset password using a valid reset token.
   */
  async resetPassword(token: string, newPassword: string) {
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!reset) {
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    if (reset.usedAt) {
      throw new UnauthorizedException('Este token ya fue utilizado.');
    }

    if (reset.expiresAt < new Date()) {
      throw new UnauthorizedException('El token ha expirado. Solicita uno nuevo.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true, message: 'Contraseña actualizada correctamente.' };
  }
}
