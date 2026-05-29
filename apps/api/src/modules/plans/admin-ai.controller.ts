import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Admin AI Usage')
@Controller('admin/ai-usage')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
@ApiBearerAuth()
export class AdminAiController {
  constructor(private prisma: PrismaService) {}

  /**
   * Global AI usage across all tenants — current month
   */
  @Get()
  async getGlobalUsage() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [aggregate, byTenant] = await Promise.all([
      this.prisma.aiUsage.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { tokensIn: true, tokensOut: true, costEstimated: true },
        _count: true,
      }),
      this.prisma.aiUsage.groupBy({
        by: ['tenantId'],
        where: { createdAt: { gte: monthStart } },
        _sum: { tokensIn: true, tokensOut: true, costEstimated: true },
        _count: true,
      }),
    ]);

    // Enrich with tenant names
    const tenantIds = byTenant.map(t => t.tenantId);
    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true, slug: true },
    });
    const tenantMap = new Map(tenants.map(t => [t.id, t]));

    const byTenantEnriched = byTenant.map(t => ({
      tenantId: t.tenantId,
      tenantName: tenantMap.get(t.tenantId)?.name || 'Unknown',
      tenantSlug: tenantMap.get(t.tenantId)?.slug || '',
      tokensIn: t._sum.tokensIn || 0,
      tokensOut: t._sum.tokensOut || 0,
      totalCalls: t._count,
      costEstimated: Number(t._sum.costEstimated || 0),
    }));

    // Daily breakdown for chart
    const dailyData = await this.getDailyBreakdown(monthStart);

    return {
      month: monthStart.toISOString().slice(0, 7),
      totals: {
        tokensIn: aggregate._sum.tokensIn || 0,
        tokensOut: aggregate._sum.tokensOut || 0,
        totalCalls: aggregate._count,
        costEstimated: Number(aggregate._sum.costEstimated || 0),
      },
      byTenant: byTenantEnriched,
      daily: dailyData,
    };
  }

  /**
   * AI usage for a specific tenant — current month
   */
  @Get('tenants/:tenantId')
  async getTenantUsage(@Param('tenantId') tenantId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [aggregate, byStore, recent] = await Promise.all([
      this.prisma.aiUsage.aggregate({
        where: { tenantId, createdAt: { gte: monthStart } },
        _sum: { tokensIn: true, tokensOut: true, costEstimated: true },
        _count: true,
      }),
      this.prisma.aiUsage.groupBy({
        by: ['storeId'],
        where: { tenantId, createdAt: { gte: monthStart } },
        _sum: { tokensIn: true, tokensOut: true },
        _count: true,
      }),
      this.prisma.aiUsage.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          store: { select: { name: true } },
          agent: { select: { name: true } },
        },
      }),
    ]);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true },
    });

    return {
      tenant: tenant || { name: 'Unknown', slug: '' },
      month: monthStart.toISOString().slice(0, 7),
      totals: {
        tokensIn: aggregate._sum.tokensIn || 0,
        tokensOut: aggregate._sum.tokensOut || 0,
        totalCalls: aggregate._count,
        costEstimated: Number(aggregate._sum.costEstimated || 0),
      },
      byStore: byStore.map(s => ({
        storeId: s.storeId,
        tokensIn: s._sum.tokensIn || 0,
        tokensOut: s._sum.tokensOut || 0,
        totalCalls: s._count,
      })),
      recent,
    };
  }

  private async getDailyBreakdown(since: Date) {
    const days: any[] = [];
    const now = new Date();
    for (let d = new Date(since); d <= now; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const agg = await this.prisma.aiUsage.aggregate({
        where: { createdAt: { gte: dayStart, lt: dayEnd } },
        _sum: { tokensIn: true, tokensOut: true },
      });

      days.push({
        date: dayStart.toISOString().slice(0, 10),
        tokensIn: agg._sum.tokensIn || 0,
        tokensOut: agg._sum.tokensOut || 0,
      });
    }
    return days;
  }
}
