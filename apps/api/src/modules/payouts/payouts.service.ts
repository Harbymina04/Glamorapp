import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const CONFIG_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class PayoutsService {
  constructor(private prisma: PrismaService) {}

  // ── Platform config ───────────────────────────────────────────

  async getConfig() {
    let cfg = await this.prisma.platformConfig.findUnique({ where: { id: CONFIG_ID } });
    if (!cfg) {
      cfg = await this.prisma.platformConfig.create({
        data: { id: CONFIG_ID, commissionRate: 0.03, minPayoutAmount: 50000 },
      });
    }
    return cfg;
  }

  async updateConfig(
    dto: { commissionRate?: number; minPayoutAmount?: number; storeBannerUrl?: string | null },
    updatedBy: string,
  ) {
    return this.prisma.platformConfig.upsert({
      where: { id: CONFIG_ID },
      create: {
        id: CONFIG_ID,
        commissionRate: dto.commissionRate ?? 0.03,
        minPayoutAmount: dto.minPayoutAmount ?? 50000,
        storeBannerUrl: dto.storeBannerUrl ?? null,
        updatedBy,
      },
      update: {
        ...(dto.commissionRate !== undefined ? { commissionRate: dto.commissionRate } : {}),
        ...(dto.minPayoutAmount !== undefined ? { minPayoutAmount: dto.minPayoutAmount } : {}),
        ...(dto.storeBannerUrl !== undefined ? { storeBannerUrl: dto.storeBannerUrl } : {}),
        updatedBy,
      },
    });
  }

  async getPublicConfig() {
    const cfg = await this.getConfig();
    return { storeBannerUrl: cfg.storeBannerUrl ?? null };
  }

  // ── Summary: pending payout per tenant ───────────────────────

  async getSummary() {
    // Orders confirmed (or completed) that haven't been included in a payout yet
    const orders = await this.prisma.storefrontOrder.findMany({
      where: {
        status: { in: ['confirmed', 'completed'] },
        payoutId: null,
        paymentStatus: { in: ['APPROVED'] as any }, // include "store" payment orders too
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });

    // Group by tenant
    const byTenant: Record<string, {
      tenantId: string; tenantName: string; tenantSlug: string;
      orderCount: number; grossAmount: number; platformFee: number; netAmount: number;
    }> = {};

    for (const o of orders) {
      if (!byTenant[o.tenantId]) {
        byTenant[o.tenantId] = {
          tenantId: o.tenantId,
          tenantName: (o as any).tenant?.name || '',
          tenantSlug: (o as any).tenant?.slug || '',
          orderCount: 0, grossAmount: 0, platformFee: 0, netAmount: 0,
        };
      }
      const t = byTenant[o.tenantId];
      t.orderCount++;
      t.grossAmount  += Number(o.total);
      t.platformFee  += Number(o.platformFee);
      t.netAmount    += Number(o.tenantPayout);
    }

    const items = Object.values(byTenant).sort((a, b) => b.netAmount - a.netAmount);
    const totalPlatformFee = items.reduce((s, t) => s + t.platformFee, 0);
    const totalPending     = items.reduce((s, t) => s + t.netAmount, 0);

    return { items, totalPlatformFee, totalPending };
  }

  // ── Tenant detail: orders pending payout ─────────────────────

  async getTenantPendingOrders(tenantId: string) {
    const orders = await this.prisma.storefrontOrder.findMany({
      where: {
        tenantId,
        status: { in: ['confirmed', 'completed'] },
        payoutId: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    const grossAmount = orders.reduce((s, o) => s + Number(o.total), 0);
    const platformFee = orders.reduce((s, o) => s + Number(o.platformFee), 0);
    const netAmount   = orders.reduce((s, o) => s + Number(o.tenantPayout), 0);

    return { orders, grossAmount, platformFee, netAmount };
  }

  // ── Create payout: mark orders as paid ───────────────────────

  async createPayout(
    tenantId: string,
    dto: { reference?: string; notes?: string },
    paidBy: string,
  ) {
    const { orders, grossAmount, platformFee, netAmount } = await this.getTenantPendingOrders(tenantId);

    if (orders.length === 0) {
      throw new BadRequestException('No hay órdenes pendientes de liquidación para este tenant.');
    }

    const cfg = await this.getConfig();
    if (netAmount < Number(cfg.minPayoutAmount)) {
      throw new BadRequestException(
        `El monto pendiente ($${netAmount.toLocaleString('es-CO')} COP) es menor al mínimo de liquidación ($${Number(cfg.minPayoutAmount).toLocaleString('es-CO')} COP).`,
      );
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const now = new Date();
    const periodFrom = orders[orders.length - 1].createdAt; // oldest order
    const periodTo   = orders[0].createdAt;                  // newest order

    // Create payout + link orders — atomically
    const payout = await this.prisma.$transaction(async (tx) => {
      const p = await tx.platformPayout.create({
        data: {
          tenantId,
          grossAmount,
          platformFee,
          netAmount,
          currency: 'COP',
          orderCount: orders.length,
          periodFrom,
          periodTo,
          status: 'paid',
          paidAt: now,
          paidBy,
          reference: dto.reference,
          notes: dto.notes,
        },
      });

      // Link all orders to this payout
      await tx.storefrontOrder.updateMany({
        where: { id: { in: orders.map(o => o.id) } },
        data: { payoutId: p.id },
      });

      return p;
    });

    return payout;
  }

  // ── Payout history ────────────────────────────────────────────

  async listPayouts(query: any) {
    const where: any = {};
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.status)   where.status   = query.status;

    const page  = parseInt(query.page  || '1');
    const limit = parseInt(query.limit || '20');

    const [data, total] = await Promise.all([
      this.prisma.platformPayout.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.platformPayout.count({ where }),
    ]);

    return { data, total };
  }

  // ── Platform earnings overview ────────────────────────────────

  async getEarningsOverview() {
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allTime, thisMonth, pendingPayouts] = await Promise.all([
      this.prisma.platformPayout.aggregate({
        _sum: { platformFee: true, grossAmount: true, netAmount: true },
      }),
      this.prisma.platformPayout.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { platformFee: true, grossAmount: true },
        _count: true,
      }),
      this.prisma.storefrontOrder.aggregate({
        where: { status: { in: ['confirmed', 'completed'] }, payoutId: null },
        _sum: { platformFee: true, tenantPayout: true, total: true },
        _count: true,
      }),
    ]);

    return {
      allTime: {
        grossAmount: Number(allTime._sum.grossAmount || 0),
        platformFee: Number(allTime._sum.platformFee || 0),
        netPaidOut:  Number(allTime._sum.netAmount   || 0),
      },
      thisMonth: {
        grossAmount: Number(thisMonth._sum.grossAmount || 0),
        platformFee: Number(thisMonth._sum.platformFee || 0),
        payoutCount: thisMonth._count,
      },
      pendingPayouts: {
        orderCount:  pendingPayouts._count,
        grossAmount: Number(pendingPayouts._sum.total       || 0),
        platformFee: Number(pendingPayouts._sum.platformFee || 0),
        netAmount:   Number(pendingPayouts._sum.tenantPayout|| 0),
      },
    };
  }
}
