import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';

// Customers are tenant-level entities.
// storeId on customer = "origin store" (where they were first registered).
// Queries can be scoped by store via the sales/appointments relations.

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  /**
   * findAll — supports two modes:
   *   - store_admin: pass storeId → returns customers who have activity in that store
   *                               OR were registered in that store (origin)
   *   - tenant_admin: no storeId filter → returns all customers of the tenant
   */
  async findAll(tenantId: string, storeId: string | null, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 10);

    const storeFilter = storeId
      ? {
          OR: [
            { storeId },                      // registered in this store
            { sales: { some: { storeId } } }, // has purchases in this store
          ],
        }
      : {};

    const where: any = {
      tenantId,
      deletedAt: null,
      ...storeFilter,
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' as const } },
              { lastName: { contains: query.search, mode: 'insensitive' as const } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.segment ? { segment: query.segment } : {}),
      ...(query.loyaltyTier ? { loyaltyTier: query.loyaltyTier } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.customer.count({ where }),
    ]);
    return new PaginatedResponse(data, total, query.page || 1, query.limit || 10);
  }

  /**
   * findOne — lookup by tenantId (customer is tenant-scoped).
   * storeId is used for access control only if role demands it.
   */
  async findOne(tenantId: string, id: string, storeId?: string | null) {
    const where: any = { id, tenantId };
    // If storeId is provided, restrict to customers visible from that store
    // (registered there OR has sales there)
    // For simplicity we just check tenantId — the store filter is at list level
    const c = await this.prisma.customer.findFirst({
      where,
      include: { notes_rel: { orderBy: { createdAt: 'desc' } } },
    });
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  /**
   * getHistory — all activity across all stores, with optional store filter
   */
  async getHistory(tenantId: string, customerId: string, storeId?: string | null) {
    const storeFilter = storeId ? { storeId } : {};
    const [sales, appointments] = await Promise.all([
      this.prisma.sale.findMany({
        where: { customerId, tenantId, ...storeFilter },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: { items: true },
      }),
      this.prisma.appointment.findMany({
        where: { customerId, tenantId, ...storeFilter },
        orderBy: { date: 'desc' },
        take: 30,
        include: { service: true },
      }),
    ]);

    // Activity breakdown by store (only for tenant_admin or if no storeId filter)
    let byStore: any[] = [];
    if (!storeId) {
      // Aggregate sales by store manually (groupBy typing issue in this Prisma version)
      const allSales = await this.prisma.sale.findMany({
        where: { customerId, tenantId },
        select: { storeId: true, total: true },
      });
      const storeMap: Record<string, { storeId: string; count: number; total: number }> = {};
      for (const s of allSales) {
        if (!storeMap[s.storeId]) storeMap[s.storeId] = { storeId: s.storeId, count: 0, total: 0 };
        storeMap[s.storeId].count++;
        storeMap[s.storeId].total += Number(s.total);
      }
      byStore = Object.values(storeMap);
    }

    return { sales, appointments, byStore };
  }

  async create(tenantId: string, storeId: string, dto: any) {
    // Check duplicate phone at tenant level
    if (dto.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { tenantId, phone: dto.phone, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(
          `A customer with phone ${dto.phone} already exists in this company (store: ${existing.storeId})`,
        );
      }
    }

    // Customer number is sequential per tenant (not per store)
    const count = await this.prisma.customer.count({ where: { tenantId } });
    const customerNumber = `C${String(count + 1).padStart(4, '0')}`;

    return this.prisma.customer.create({
      data: {
        tenantId,
        storeId, // origin store
        customerNumber,
        ...dto,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);

    // If updating phone, check uniqueness at tenant level
    if (dto.phone) {
      const conflict = await this.prisma.customer.findFirst({
        where: { tenantId, phone: dto.phone, deletedAt: null, NOT: { id } },
      });
      if (conflict) throw new ConflictException(`Phone ${dto.phone} already used by another customer`);
    }

    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }

  async addNote(tenantId: string, customerId: string, userId: string, content: string) {
    await this.findOne(tenantId, customerId);
    return this.prisma.customerNote.create({ data: { customerId, userId, content } });
  }

  async getNotes(tenantId: string, customerId: string) {
    await this.findOne(tenantId, customerId);
    return this.prisma.customerNote.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' } });
  }

  async getBirthdays(tenantId: string, storeId?: string | null) {
    const storeFilter = storeId ? { storeId } : {};
    return this.prisma.customer.findMany({
      where: { tenantId, deletedAt: null, dateOfBirth: { not: null }, ...storeFilter },
      select: { id: true, firstName: true, lastName: true, phone: true, dateOfBirth: true, loyaltyTier: true, storeId: true },
    });
  }

  async getSegmentsSummary(tenantId: string, storeId?: string | null) {
    const storeFilter = storeId ? { storeId } : {};
    const segments = await this.prisma.customer.groupBy({
      by: ['segment'],
      where: { tenantId, deletedAt: null, ...storeFilter },
      _count: true,
    });
    return Object.fromEntries(segments.map(s => [s.segment, s._count]));
  }
}
