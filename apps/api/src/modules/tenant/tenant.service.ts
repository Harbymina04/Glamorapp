import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '../../common/constants/security';
import { TenantCreateUserDto } from './dto/tenant-user.dto';

/** Roles que un tenant_admin puede asignar (nunca superadmin). */
const TENANT_ASSIGNABLE_ROLES = ['store_admin', 'cashier', 'professional', 'financial', 'readonly'];

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════

  async getDashboard(tenantId: string) {
    const [stores, users, customers, sales, appointments] = await Promise.all([
      this.prisma.store.count({ where: { tenantId, isActive: true } }),
      this.prisma.user.count({ where: { tenantId, isActive: true, deletedAt: null } }),
      this.prisma.customer.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.sale.count({ where: { tenantId, status: 'completed' } }),
      this.prisma.appointment.count({ where: { tenantId, status: { in: ['confirmed', 'pending'] } } }),
    ]);

    // Revenue across all stores
    const revenue = await this.prisma.sale.aggregate({
      where: { tenantId, status: 'completed' },
      _sum: { total: true },
    });

    return {
      totalStores: stores,
      totalUsers: users,
      totalCustomers: customers,
      totalSales: sales,
      pendingAppointments: appointments,
      totalRevenue: revenue._sum.total || 0,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // STORES CRUD
  // ═══════════════════════════════════════════════════════════

  async listStores(tenantId: string) {
    return this.prisma.store.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, sales: true, customers: true } },
      },
    });
  }

  async getStore(tenantId: string, storeId: string) {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, tenantId },
      include: {
        _count: { select: { users: true, sales: true, customers: true, products: true } },
      },
    });
    if (!store) throw new NotFoundException('Sucursal no encontrada');
    return store;
  }

  async createStore(tenantId: string, dto: { name: string; slug: string; email?: string; phone?: string; address?: string; city?: string }) {
    // Check if plan allows more branches
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: ['active', 'trial'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    if (sub) {
      const maxBranches = (sub.plan.features as any)?.limits?.maxBranches || sub.plan.maxBranches;
      const currentCount = await this.prisma.store.count({ where: { tenantId, isActive: true } });
      if (currentCount >= maxBranches) {
        throw new BadRequestException(`Límite de sucursales alcanzado (${maxBranches}). Actualiza tu plan.`);
      }
    }

    // Check slug uniqueness within tenant
    const existing = await this.prisma.store.findFirst({ where: { tenantId, slug: dto.slug } });
    if (existing) throw new BadRequestException('Ya existe una sucursal con ese slug');

    return this.prisma.store.create({
      data: {
        tenantId,
        name: dto.name,
        slug: dto.slug,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
      },
    });
  }

  async updateStore(tenantId: string, storeId: string, dto: any) {
    await this.getStore(tenantId, storeId);
    return this.prisma.store.update({
      where: { id: storeId },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        isActive: dto.isActive,
      },
    });
  }

  async toggleStore(tenantId: string, storeId: string, isActive: boolean) {
    await this.getStore(tenantId, storeId);
    return this.prisma.store.update({
      where: { id: storeId },
      data: { isActive },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // USERS MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  async listUsers(tenantId: string, storeId?: string) {
    const where: any = { tenantId, deletedAt: null };
    if (storeId) where.storeId = storeId;

    return this.prisma.user.findMany({
      where,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, isActive: true, lastLoginAt: true,
        store: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUser(tenantId: string, dto: TenantCreateUserDto) {
    // Prevent privilege escalation — a tenant_admin can't mint superadmin/tenant_admin
    const role = dto.role ?? ('cashier' as any);
    if (!TENANT_ASSIGNABLE_ROLES.includes(role)) {
      throw new ForbiddenException(`No tienes permiso para asignar el rol "${role}".`);
    }

    // Verify store belongs to tenant
    const store = await this.prisma.store.findFirst({ where: { id: dto.storeId, tenantId } });
    if (!store) throw new BadRequestException('Sucursal no encontrada');

    // Check plan user limit
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: ['active', 'trial'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    if (sub) {
      const maxUsers = (sub.plan.features as any)?.limits?.maxUsers || sub.plan.maxUsers;
      const currentCount = await this.prisma.user.count({ where: { tenantId, deletedAt: null } });
      if (currentCount >= maxUsers) {
        throw new BadRequestException(`Límite de usuarios alcanzado (${maxUsers}). Actualiza tu plan.`);
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    return this.prisma.user.create({
      data: {
        tenantId,
        storeId: dto.storeId,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: role as any,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
  }

  async resetUserPassword(tenantId: string, userId: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
      select: { id: true, email: true },
    });
  }

  async toggleUser(tenantId: string, userId: string, isActive: boolean) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive, deletedAt: isActive ? null : new Date() },
      select: { id: true, email: true, isActive: true },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // AI USAGE
  // ═══════════════════════════════════════════════════════════

  async getAiUsage(tenantId: string) {
    // Total tokens this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalTokens, byStore, recentActions] = await Promise.all([
      this.prisma.aiUsage.aggregate({
        where: { tenantId, createdAt: { gte: monthStart } },
        _sum: { tokensIn: true, tokensOut: true },
      }),
      this.prisma.aiUsage.groupBy({
        by: ['storeId'],
        where: { tenantId, createdAt: { gte: monthStart } },
        _sum: { tokensIn: true, tokensOut: true },
      }),
      this.prisma.aiUsage.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          store: { select: { name: true } },
          agent: { select: { name: true } },
        },
      }),
    ]);

    // Enrich byStore with store names
    const storesWithNames = await Promise.all(
      byStore.map(async (s) => {
        const store = s.storeId
          ? await this.prisma.store.findUnique({ where: { id: s.storeId }, select: { name: true } })
          : null;
        return {
          storeId: s.storeId,
          storeName: store?.name || 'N/A',
          tokensIn: s._sum.tokensIn || 0,
          tokensOut: s._sum.tokensOut || 0,
        };
      }),
    );

    return {
      tokensInThisMonth: totalTokens._sum.tokensIn || 0,
      tokensOutThisMonth: totalTokens._sum.tokensOut || 0,
      byStore: storesWithNames,
      recentActions,
    };
  }

  // ═══ Marketing Config ═══

  async getMarketingConfig(tenantId: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT marketing_config FROM tenants WHERE id = $1::uuid`, tenantId,
    );
    return rows[0]?.marketing_config || {};
  }

  async updateMarketingConfig(tenantId: string, config: any) {
    await this.prisma.$executeRawUnsafe(
      `UPDATE tenants SET marketing_config = $1::jsonb WHERE id = $2::uuid`,
      JSON.stringify(config), tenantId,
    );
    return config;
  }
}
