import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommissionsService {
  constructor(private prisma: PrismaService) {}

  // ─── Auto-create commissions when a sale completes ─────────────
  // Called by SalesService after complete(). Only processes service items.
  async registerSaleCommissions(tenantId: string, storeId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId, storeId },
      include: {
        items: { include: { service: true, performer: true } },
      },
    });
    if (!sale) return;

    // Only service items with a performer assigned
    const serviceItems = sale.items.filter(
      item => item.itemType === 'service' && item.performedBy,
    );
    if (serviceItems.length === 0) return;

    // Avoid duplicate commissions for the same sale
    const existing = await this.prisma.commission.findFirst({ where: { saleId } });
    if (existing) return;

    const commissions = serviceItems.map(item => {
      // Commission rate priority: item-level > service-level > performer default
      const rate = Number(item.commissionRate) > 0
        ? Number(item.commissionRate)
        : Number(item.service?.commissionRate ?? 0) > 0
          ? Number(item.service!.commissionRate)
          : Number(item.performer?.commissionRate ?? 0);

      const base   = Number(item.total);
      const amount = parseFloat((base * rate / 100).toFixed(2));

      return {
        tenantId,
        storeId,
        userId:         item.performedBy!,
        saleId,
        saleItemId:     item.id,
        serviceName:    item.name,
        baseAmount:     base,
        commissionRate: rate,
        amount,
        status: 'pending',
      };
    });

    if (commissions.length > 0) {
      await this.prisma.commission.createMany({ data: commissions });
    }
  }

  // ─── List commissions ──────────────────────────────────────────
  async findAll(tenantId: string, storeId: string | null, role: string, query: any) {
    const where: any = {
      tenantId,
      ...(storeId && role !== 'tenant_admin' && role !== 'superadmin' ? { storeId } : {}),
      ...(query.userId   ? { userId: query.userId }     : {}),
      ...(query.status   ? { status: query.status }     : {}),
      ...(query.storeId  ? { storeId: query.storeId }   : {}),
    };

    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to   ? { lte: new Date(query.to + 'T23:59:59') } : {}),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.commission.findMany({
        where,
        include: {
          user:  { select: { id: true, firstName: true, lastName: true, role: true } },
          sale:  { select: { id: true, saleNumber: true, createdAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        take:  parseInt(query.limit  || '50'),
        skip:  (parseInt(query.page  || '1') - 1) * parseInt(query.limit || '50'),
      }),
      this.prisma.commission.count({ where }),
    ]);

    return { data, total };
  }

  // ─── Summary per collaborator ──────────────────────────────────
  async getSummary(tenantId: string, storeId: string | null, role: string, from?: string, to?: string) {
    const where: any = {
      tenantId,
      ...(storeId && role !== 'tenant_admin' && role !== 'superadmin' ? { storeId } : {}),
    };
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) }                : {}),
        ...(to   ? { lte: new Date(to + 'T23:59:59') } : {}),
      };
    }

    // Group by user
    const grouped = await this.prisma.commission.groupBy({
      by: ['userId', 'status'],
      where,
      _sum:   { amount: true, baseAmount: true },
      _count: true,
    });

    // Get user details
    const userIds = [...new Set(grouped.map(g => g.userId))];
    const users   = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, role: true, commissionRate: true },
    });

    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    // Aggregate per user
    const byUser: Record<string, any> = {};
    for (const g of grouped) {
      if (!byUser[g.userId]) {
        byUser[g.userId] = {
          user:          userMap[g.userId],
          totalServices: 0,
          totalBase:     0,
          totalPending:  0,
          totalPaid:     0,
        };
      }
      byUser[g.userId].totalServices += g._count;
      byUser[g.userId].totalBase     += Number(g._sum.baseAmount || 0);
      if (g.status === 'pending') byUser[g.userId].totalPending += Number(g._sum.amount || 0);
      if (g.status === 'paid')    byUser[g.userId].totalPaid    += Number(g._sum.amount || 0);
    }

    return Object.values(byUser).sort((a: any, b: any) => b.totalPending - a.totalPending);
  }

  // ─── Pay commissions (bulk) ────────────────────────────────────
  async payCommissions(
    tenantId: string, paidById: string,
    dto: { userIds?: string[]; commissionIds?: string[]; periodStart?: string; periodEnd?: string; notes?: string }
  ) {
    const where: any = { tenantId, status: 'pending' };
    if (dto.commissionIds?.length) where.id    = { in: dto.commissionIds };
    if (dto.userIds?.length)       where.userId = { in: dto.userIds };
    if (dto.periodStart || dto.periodEnd) {
      where.createdAt = {
        ...(dto.periodStart ? { gte: new Date(dto.periodStart) } : {}),
        ...(dto.periodEnd   ? { lte: new Date(dto.periodEnd + 'T23:59:59') } : {}),
      };
    }

    const pending = await this.prisma.commission.findMany({ where, select: { id: true, amount: true, userId: true } });
    if (pending.length === 0) throw new BadRequestException('No hay comisiones pendientes para pagar');

    const total = pending.reduce((s, c) => s + Number(c.amount), 0);

    await this.prisma.commission.updateMany({
      where: { id: { in: pending.map(c => c.id) } },
      data:  {
        status:       'paid',
        paidAt:       new Date(),
        paidById,
        paymentNotes: dto.notes ?? null,
      },
    });

    return {
      paid:  pending.length,
      total,
      users: [...new Set(pending.map(c => c.userId))].length,
    };
  }

  // ─── User commission detail (for self-service view) ───────────
  async getUserCommissions(tenantId: string, userId: string, query: any) {
    const where: any = { tenantId, userId };
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to   ? { lte: new Date(query.to + 'T23:59:59') } : {}),
      };
    }

    const [data, total, agg] = await Promise.all([
      this.prisma.commission.findMany({
        where,
        include: { sale: { select: { saleNumber: true, createdAt: true } } },
        orderBy: { createdAt: 'desc' },
        take: parseInt(query.limit || '50'),
        skip: (parseInt(query.page || '1') - 1) * parseInt(query.limit || '50'),
      }),
      this.prisma.commission.count({ where }),
      this.prisma.commission.groupBy({
        by:   ['status'],
        where: { tenantId, userId },
        _sum: { amount: true },
      }),
    ]);

    const pendingTotal = Number(agg.find(a => a.status === 'pending')?._sum.amount || 0);
    const paidTotal    = Number(agg.find(a => a.status === 'paid')?._sum.amount    || 0);

    return { data, total, pendingTotal, paidTotal };
  }
}
