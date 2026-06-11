import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async overview(tenantId: string, storeId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

    const [salesMonth, salesToday, appointmentsToday, totalProducts, lowStock, totalCustomers] = await Promise.all([
      this.prisma.sale.aggregate({ where: { tenantId, storeId, status: 'completed', createdAt: { gte: monthStart } }, _sum: { total: true }, _count: true }),
      this.prisma.sale.aggregate({ where: { tenantId, storeId, status: 'completed', createdAt: { gte: todayStart } }, _sum: { total: true }, _count: true }),
      this.prisma.appointment.count({ where: { tenantId, storeId, date: { gte: todayStart, lt: new Date(todayStart.getTime() + 86400000) } } }),
      this.prisma.product.count({ where: { tenantId, storeId, deletedAt: null } }),
      this.prisma.product.count({ where: { tenantId, storeId, deletedAt: null, currentStock: { lte: 0 } } }),
      this.prisma.customer.count({ where: { tenantId, storeId, deletedAt: null } }),
    ]);

    return {
      monthRevenue: salesMonth._sum.total || 0,
      monthSalesCount: salesMonth._count,
      todayRevenue: salesToday._sum.total || 0,
      todaySalesCount: salesToday._count,
      todayAppointments: appointmentsToday,
      totalProducts,
      lowStockProducts: Number(lowStock) || 0,
      totalCustomers,
    };
  }

  // Parse a YYYY-MM-DD string as LOCAL midnight (not UTC midnight)
  private localDay(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00');
  }

  async sales(tenantId: string, storeId: string, query: any) {
    const now   = new Date();
    const start = query.dateFrom ? this.localDay(query.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = query.dateTo   ? this.localDay(query.dateTo)   : now;
    end.setHours(23, 59, 59, 999);
    const limit = Math.min(query.limit ? parseInt(query.limit) : 500, 1000);
    const page  = query.page ? parseInt(query.page) : 1;
    const skip  = (page - 1) * limit;

    const where = { tenantId, storeId, status: 'completed' as const, createdAt: { gte: start, lte: end } };

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: {
          items: { select: { id: true, name: true, quantity: true, unitPrice: true, discountAmount: true, ivaRate: true, ivaAmount: true, total: true, itemType: true } },
          customer: { select: { firstName: true, lastName: true } },
          payments: { select: { paymentMethod: true, amount: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.sale.count({ where }),
    ]);

    // Aggregate totals for the full period (not just this page)
    const agg = await this.prisma.sale.aggregate({
      where,
      _sum: { subtotal: true, discountAmount: true, taxAmount: true, total: true },
      _count: true,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalSales: agg._count,
        subtotal: agg._sum?.subtotal    || 0,
        totalDiscounts: agg._sum?.discountAmount || 0,
        totalIva: agg._sum?.taxAmount   || 0,
        totalRevenue: agg._sum?.total   || 0,
        avgTicket: agg._count > 0 ? Number(agg._sum?.total || 0) / agg._count : 0,
      },
    };
  }

  async ivaReport(tenantId: string, storeId: string, query: any) {
    const now   = new Date();
    const start = query.dateFrom ? this.localDay(query.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = query.dateTo   ? this.localDay(query.dateTo)   : now;
    end.setHours(23, 59, 59, 999);

    // Aggregate IVA collected grouped by rate
    const byRate = await this.prisma.$queryRaw<{ iva_rate: string; base_imponible: string; iva_total: string; num_items: bigint }[]>`
      SELECT
        si.iva_rate::text,
        SUM(si.unit_price * si.quantity - si.discount_amount)::text AS base_imponible,
        SUM(si.iva_amount)::text AS iva_total,
        COUNT(*)::bigint AS num_items
      FROM "sale_items" si
      JOIN "sales" s ON s.id = si.sale_id
      WHERE s.tenant_id  = ${tenantId}::uuid
        AND s.store_id   = ${storeId}::uuid
        AND s.status::text = 'completed'
        AND s.created_at >= ${start}
        AND s.created_at <= ${end}
      GROUP BY si.iva_rate
      ORDER BY si.iva_rate DESC
    `;

    const totals = await this.prisma.sale.aggregate({
      where: { tenantId, storeId, status: 'completed', createdAt: { gte: start, lte: end } },
      _sum: { subtotal: true, discountAmount: true, taxAmount: true, total: true },
      _count: true,
    });

    return {
      period: { from: start, to: end },
      summary: {
        totalSales: totals._count,
        subtotal: totals._sum.subtotal || 0,
        totalDiscounts: totals._sum.discountAmount || 0,
        totalIva: totals._sum.taxAmount || 0,
        totalWithIva: totals._sum.total || 0,
      },
      byRate: byRate.map(r => ({
        ivaRate: Number(r.iva_rate),
        label: Number(r.iva_rate) === 0 ? 'Exento (0%)' : `IVA ${r.iva_rate}%`,
        baseImponible: Number(r.base_imponible),
        ivaTotal: Number(r.iva_total),
        numItems: Number(r.num_items),
      })),
    };
  }

  async appointments(tenantId: string, storeId: string, query: any = {}) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const defaultEnd = new Date(today); defaultEnd.setDate(defaultEnd.getDate() + 30);

    const start = query.dateFrom ? this.localDay(query.dateFrom) : today;
    const end   = query.dateTo   ? this.localDay(query.dateTo)   : defaultEnd;
    end.setHours(23, 59, 59, 999);

    const [data, stats] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { tenantId, storeId, date: { gte: start, lte: end } },
        include: {
          customer:     { select: { firstName: true, lastName: true } },
          service:      { select: { name: true, price: true } },
          professional: { select: { firstName: true, lastName: true } },
        },
        orderBy: { date: 'asc' },
        take: 500,
      }),
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: { tenantId, storeId, date: { gte: start, lte: end } },
        _count: true,
      }),
    ]);

    return { data, stats, total: data.length };
  }

  async topProducts(tenantId: string, storeId: string, limit: number = 10) {
    return this.prisma.product.findMany({
      where: { tenantId, storeId, deletedAt: null },
      orderBy: { catalogViews: 'desc' },
      take: limit,
    });
  }

  async inventoryReport(tenantId: string, storeId: string) {
    return this.prisma.product.findMany({
      where: { tenantId, storeId, deletedAt: null },
      select: { id: true, name: true, sku: true, currentStock: true, minStock: true, costPrice: true, salePrice: true, ivaRate: true, isIvaExcluded: true },
      orderBy: { currentStock: 'asc' },
    });
  }

  async topSelling(tenantId: string, storeId: string, query: any = {}) {
    const now   = new Date();
    const start = query.dateFrom ? this.localDay(query.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = query.dateTo   ? this.localDay(query.dateTo)   : now;
    end.setHours(23, 59, 59, 999);

    const rows = await this.prisma.$queryRaw<{ product_id: string; name: string; sku: string | null; qty: bigint; revenue: string }[]>`
      SELECT si.product_id,
             MAX(p.name)          AS name,
             MAX(p.sku)           AS sku,
             SUM(si.quantity)     AS qty,
             SUM(si.total)::text  AS revenue
      FROM "sale_items" si
      JOIN "sales"    s ON s.id  = si.sale_id
      JOIN "products" p ON p.id  = si.product_id
      WHERE s.tenant_id  = ${tenantId}::uuid
        AND s.store_id   = ${storeId}::uuid
        AND s.status::text = 'completed'
        AND s.created_at >= ${start}
        AND s.created_at <= ${end}
        AND si.product_id IS NOT NULL
      GROUP BY si.product_id
      ORDER BY qty DESC
      LIMIT 10
    `;
    return rows.map(r => ({
      productId: r.product_id,
      name: r.name,
      sku: r.sku ?? null,
      qtySold: Number(r.qty),
      revenue: Number(r.revenue),
    }));
  }

  async expensesReport(tenantId: string, storeId: string, query: any = {}) {
    const now   = new Date();
    const start = query.dateFrom ? this.localDay(query.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = query.dateTo   ? this.localDay(query.dateTo)   : now;
    end.setHours(23, 59, 59, 999);

    const [data, agg] = await Promise.all([
      this.prisma.expense.findMany({
        where: { tenantId, storeId, isVoided: false, expenseDate: { gte: start, lte: end } },
        include: { category: true },
        orderBy: { expenseDate: 'desc' },
      }),
      this.prisma.expense.aggregate({
        where: { tenantId, storeId, isVoided: false, expenseDate: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      data,
      summary: {
        total: agg._sum.amount || 0,
        count: agg._count,
      },
    };
  }
}
