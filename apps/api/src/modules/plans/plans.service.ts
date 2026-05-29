import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }

  async create(data: any) {
    return this.prisma.plan.create({ data });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.plan.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.plan.update({ where: { id }, data: { isActive: false } });
  }

  // Subscriptions
  async getSubscriptions(query: any) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.tenantId) where.tenantId = query.tenantId;
    
    const subs = await this.prisma.subscription.findMany({
      where,
      include: { plan: true, tenant: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: Number(query.limit) || 50,
    });

    return subs.map(s => ({
      id: s.id,
      tenantId: s.tenantId,
      tenantName: s.tenant.name,
      tenantSlug: s.tenant.slug,
      planId: s.planId,
      planName: s.plan.name,
      planSlug: s.plan.slug,
      monthlyPrice: Number(s.plan.monthlyPrice),
      yearlyPrice: Number(s.plan.yearlyPrice),
      status: s.status,
      billingCycle: s.billingCycle,
      trialEndsAt: s.trialEndsAt,
      trialDaysLeft: s.trialEndsAt
        ? Math.max(0, Math.ceil((new Date(s.trialEndsAt).getTime() - Date.now()) / 86400000))
        : null,
      currentPeriodStart: s.currentPeriodStart,
      currentPeriodEnd: s.currentPeriodEnd,
      cancelledAt: s.cancelledAt,
      createdAt: s.createdAt,
    }));
  }

  async updateSubscription(id: string, data: any) {
    const updated = await this.prisma.subscription.update({ where: { id }, data });
    // Sync tenant.plan with subscription plan
    if (data.planId) {
      const plan = await this.prisma.plan.findUnique({ where: { id: data.planId } });
      if (plan) {
        await this.prisma.tenant.update({
          where: { id: updated.tenantId },
          data: { plan: plan.slug },
        });
      }
    }
    return updated;
  }

  // Change plan for a tenant (full flow)
  async changeTenantPlan(tenantId: string, data: { planId: string; billingCycle?: string }) {
    const plan = await this.prisma.plan.findUnique({ where: { id: data.planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    // Cancel current active subscriptions
    await this.prisma.subscription.updateMany({
      where: { tenantId, status: { in: ['active', 'trial'] } },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });

    // Create new subscription
    const sub = await this.prisma.subscription.create({
      data: {
        tenantId,
        planId: data.planId,
        status: 'active',
        billingCycle: data.billingCycle || 'monthly',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
      include: { plan: true },
    });

    // Update tenant.plan
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: plan.slug },
    });

    return sub;
  }

  // Payment exceptions
  async getPaymentExceptions(query: any) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.tenantId) where.tenantId = query.tenantId;

    return this.prisma.paymentException.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(query.limit) || 50,
    });
  }

  async createPaymentException(data: any) {
    return this.prisma.paymentException.create({ data });
  }

  async approvePaymentException(id: string, userId: string) {
    return this.prisma.paymentException.update({
      where: { id },
      data: { status: 'approved', approvedBy: userId },
    });
  }

  async rejectPaymentException(id: string) {
    return this.prisma.paymentException.update({
      where: { id },
      data: { status: 'rejected' },
    });
  }

  // ─── Tenants (Platform Admin) ───────────────────────────────
  async getTenants(query: any) {
    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const tenants = await this.prisma.tenant.findMany({
      where,
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
        users: {
          where: { isActive: true, deletedAt: null },
          select: { id: true },
        },
        stores: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(query.limit) || 50,
    });

    return tenants.map(t => {
      const activeSub = t.subscriptions.find(s => s.status === 'active' || s.status === 'trial');
      const trialDaysLeft = activeSub?.trialEndsAt
        ? Math.max(0, Math.ceil((new Date(activeSub.trialEndsAt).getTime() - Date.now()) / 86400000))
        : null;

      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        plan: t.plan,
        isActive: t.isActive,
        createdAt: t.createdAt,
        subscription: activeSub ? {
          id: activeSub.id,
          planName: activeSub.plan.name,
          planSlug: activeSub.plan.slug,
          status: activeSub.status,
          billingCycle: activeSub.billingCycle,
          monthlyPrice: Number(activeSub.plan.monthlyPrice),
          trialEndsAt: activeSub.trialEndsAt,
          trialDaysLeft,
          currentPeriodEnd: activeSub.currentPeriodEnd,
        } : null,
        stats: {
          users: t.users.length,
          stores: t.stores.length,
        },
      };
    });
  }
}
