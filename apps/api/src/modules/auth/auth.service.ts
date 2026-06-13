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
import { EmailService } from '../email/email.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { v4 as uuidv4 } from 'uuid';
import { getEffectiveScopes } from '../../common/constants/role-scopes';
import { DEFAULT_AGENTS, DEFAULT_EXPENSE_CATEGORIES } from '../../common/constants/default-agents';
import { BCRYPT_ROUNDS } from '../../common/constants/security';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private email: EmailService,
  ) {}

  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCKOUT_MINUTES = 15;

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true, deletedAt: null },
    });

    // Use consistent error to prevent email enumeration
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Check lockout
    const lockedUntil = (user as any).lockedUntil as Date | null;
    if (lockedUntil && lockedUntil > new Date()) {
      const wait = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account locked. Try again in ${wait} minute(s).`);
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!valid) {
      const failedCount = ((user as any).failedLoginCount as number ?? 0) + 1;
      const shouldLock = failedCount >= AuthService.MAX_ATTEMPTS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: failedCount,
          lockedUntil: shouldLock
            ? new Date(Date.now() + AuthService.LOCKOUT_MINUTES * 60_000)
            : null,
        } as any,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Successful login — reset counter
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null } as any,
    });

    return this.generateTokens(user);
  }

  async checkSlugAvailable(slug: string): Promise<{ available: boolean }> {
    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    return { available: !existing };
  }

  async register(dto: RegisterDto) {
    // Parallel pre-flight checks
    const [existingUser, existingTenant, freePlan] = await Promise.all([
      this.prisma.user.findFirst({ where: { email: dto.email } }),
      this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug } }),
      this.prisma.plan.findUnique({ where: { slug: 'free' } }),
    ]);

    if (existingUser) throw new ConflictException('Email already registered');
    if (existingTenant) throw new ConflictException('Tenant slug already taken');
    if (!freePlan) throw new BadRequestException('El plan gratuito no está configurado. Contacta al administrador.');

    // Store slug is the tenant slug + "-principal" to be independent
    const storeSlug = `${dto.tenantSlug}-principal`;
    const storeName = dto.storeName?.trim() || dto.tenantName;

    // Create tenant + store + admin user + trial subscription atomically
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
          name: storeName,
          slug: storeSlug,
          email: dto.email,
          phone: dto.phone,
        },
      });

      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

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

      // Trial subscription — 14 days
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: freePlan.id,
          status: 'trial',
          billingCycle: 'monthly',
          trialEndsAt: new Date(Date.now() + 14 * 86_400_000),
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 14 * 86_400_000),
        },
      });

      // ── Auto-seed from global master data ─────────────────────

      // 1. Product categories from global MasterCategories
      const masterCats = await tx.masterCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
      if (masterCats.length > 0) {
        await tx.productCategory.createMany({
          data: masterCats.map((mc: any) => ({
            tenantId: tenant.id,
            storeId: store.id,
            name: mc.name,
            color: mc.color ?? '#EF2D8F',
            icon: mc.icon ?? 'Package',
          })),
          skipDuplicates: true,
        });
      }

      // 2. Brands from global MasterBrands
      const masterBrands = await tx.masterBrand.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
      if (masterBrands.length > 0) {
        await tx.brand.createMany({
          data: masterBrands.map((mb: any) => ({
            tenantId: tenant.id,
            storeId: store.id,
            name: mb.name,
            logoUrl: mb.logoUrl ?? null,
          })),
          skipDuplicates: true,
        });
      }

      // 3. Default expense categories (tenant-level, no storeId)
      await tx.expenseCategory.createMany({
        data: DEFAULT_EXPENSE_CATEGORIES.map(name => ({
          tenantId: tenant.id,
          name,
        })),
        skipDuplicates: true,
      });

      // 4. Default AI agents
      await tx.aiAgent.createMany({
        data: DEFAULT_AGENTS.map(agent => ({
          tenantId: tenant.id,
          storeId: store.id,
          slug: agent.slug,
          name: agent.name,
          description: agent.description,
          objective: agent.objective,
          icon: agent.icon,
          autonomyLevel: agent.autonomyLevel as any,
          aiProvider: agent.aiProvider,
          analysisFrequency: agent.analysisFrequency,
          status: agent.status as any,
        })),
        skipDuplicates: true,
      });

      return user;
    });

    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    this.email.sendWelcome(result.email, result.firstName, appUrl)
      .catch(err => console.error('Welcome email failed:', err.message));

    return this.generateTokens(result);
  }

  async registerCustomer(dto: CustomerRegisterDto) {
    // Platform customers are not tied to any tenant/store
    const existing = await this.prisma.user.findFirst({
      where: { tenantId: null, email: dto.email },
    });
    if (existing) throw new ConflictException('Este email ya tiene una cuenta en la plataforma');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        tenantId: null,
        storeId: null,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone ?? null,
        role: 'customer' as any,
      },
    });

    // Correo de bienvenida (fire-and-forget — no bloquea el registro)
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    this.email.sendCustomerWelcome(user.email, user.firstName, appUrl)
      .catch(err => console.error('Customer welcome email failed:', err.message));

    return this.generateTokens(user);
  }

  async updateProfile(userId: string, dto: { firstName?: string; lastName?: string; phone?: string; address?: string; city?: string }) {
    const data: any = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.phone !== undefined) data.phone = dto.phone || null;
    if (dto.address !== undefined) data.address = dto.address || null;
    if (dto.city !== undefined) data.city = dto.city || null;

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, address: true, city: true, role: true },
    });
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

    // Get plan info (only for tenant users)
    const planInfo = user.tenantId ? await this.getTenantPlanInfo(user.tenantId) : null;

    // Resolve effective scopes
    const scopes = getEffectiveScopes(user.role, permissions);

    // Get redirect path
    const redirectPath = this.getRedirectPath(user.role, user.storeId);

    // For tenant_admin, include all stores
    let stores: any[] | undefined;
    if (user.role === 'tenant_admin' && user.tenantId) {
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
      case 'customer':
        return '/tienda';
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

    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    this.email.sendPasswordReset(user.email, token, appUrl)
      .catch(err => console.error('Password reset email failed:', err.message));

    return {
      success: true,
      message: 'Si el email existe, recibirás instrucciones para resetear tu contraseña.',
    };
  }

  /**
   * Solicitud de reseteo de contraseña para CLIENTES del storefront.
   * Apunta solo a cuentas de plataforma (tenantId null, role customer) y envía
   * un enlace que lleva a /tienda/auth/reset-password. Igual que el flujo de
   * negocio, siempre responde éxito para no filtrar qué correos existen.
   */
  async forgotPasswordCustomer(email: string) {
    const generic = { success: true, message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.' };

    const user = await this.prisma.user.findFirst({
      where: { email, tenantId: null, role: 'customer' as any, isActive: true, deletedAt: null },
    });
    if (!user) return generic;

    const token = uuidv4();
    await this.prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
    });

    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    this.email.sendCustomerPasswordReset(user.email, token, appUrl)
      .catch(err => console.error('Customer password reset email failed:', err.message));

    return generic;
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

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

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
