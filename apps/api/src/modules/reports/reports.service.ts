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

  async sales(tenantId: string, storeId: string, query: any) {
    const start = query.dateFrom ? new Date(query.dateFrom) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = query.dateTo ? new Date(query.dateTo) : new Date();

    return this.prisma.sale.findMany({
      where: { tenantId, storeId, status: 'completed', createdAt: { gte: start, lte: end } },
      include: { items: true, customer: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async appointments(tenantId: string, storeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return this.prisma.appointment.findMany({
      where: { tenantId, storeId, date: { gte: today, lt: weekEnd } },
      include: { customer: { select: { firstName: true, lastName: true } }, service: { select: { name: true } }, professional: { select: { firstName: true } } },
      orderBy: { date: 'asc' },
    });
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
      select: { id: true, name: true, sku: true, currentStock: true, minStock: true, costPrice: true, salePrice: true },
      orderBy: { currentStock: 'asc' },
    });
  }

  async expensesReport(tenantId: string, storeId: string) {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return this.prisma.expense.findMany({
      where: { tenantId, storeId, isVoided: false, expenseDate: { gte: monthStart } },
      include: { category: true },
      orderBy: { expenseDate: 'desc' },
    });
  }
}
