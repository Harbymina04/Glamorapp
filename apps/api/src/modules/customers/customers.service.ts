import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, storeId: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 10);
    const where: any = {
      tenantId, storeId, deletedAt: null,
      ...(query.search ? { OR: [{ firstName: { contains: query.search, mode: 'insensitive' } }, { lastName: { contains: query.search, mode: 'insensitive' } }, { phone: { contains: query.search } }] } : {}),
      ...(query.segment ? { segment: query.segment } : {}),
      ...(query.loyaltyTier ? { loyaltyTier: query.loyaltyTier } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.customer.count({ where }),
    ]);
    return new PaginatedResponse(data, total, query.page || 1, query.limit || 10);
  }

  async findOne(tenantId: string, storeId: string, id: string) {
    const c = await this.prisma.customer.findFirst({ where: { id, tenantId, storeId }, include: { notes_rel: true } });
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  async getHistory(tenantId: string, storeId: string, id: string) {
    const [sales, appointments] = await Promise.all([
      this.prisma.sale.findMany({ where: { customerId: id, tenantId, storeId }, orderBy: { createdAt: 'desc' }, take: 20, include: { items: true } }),
      this.prisma.appointment.findMany({ where: { customerId: id, tenantId, storeId }, orderBy: { date: 'desc' }, take: 20, include: { service: true } }),
    ]);
    return { sales, appointments };
  }

  async create(tenantId: string, storeId: string, dto: any) {
    const count = await this.prisma.customer.count({ where: { tenantId, storeId } });
    const customerNumber = `C${String(count + 1).padStart(3, '0')}`;
    return this.prisma.customer.create({ data: { tenantId, storeId, customerNumber, ...dto } });
  }

  async update(tenantId: string, storeId: string, id: string, dto: any) {
    await this.findOne(tenantId, storeId, id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, storeId: string, id: string) {
    await this.findOne(tenantId, storeId, id);
    return this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }

  async addNote(tenantId: string, storeId: string, customerId: string, userId: string, content: string) {
    // Validate customer belongs to this tenant/store
    await this.findOne(tenantId, storeId, customerId);
    return this.prisma.customerNote.create({ data: { customerId, userId, content } });
  }

  async getNotes(tenantId: string, storeId: string, customerId: string) {
    await this.findOne(tenantId, storeId, customerId);
    return this.prisma.customerNote.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' } });
  }

  async getBirthdays(tenantId: string, storeId: string) {
    const now = new Date();
    const month = now.getMonth() + 1;
    return this.prisma.customer.findMany({
      where: {
        tenantId, storeId, deletedAt: null,
        dateOfBirth: { not: null },
      },
      select: { id: true, firstName: true, lastName: true, phone: true, dateOfBirth: true, loyaltyTier: true },
    });
  }

  async getSegmentsSummary(tenantId: string, storeId: string) {
    const segments = await this.prisma.customer.groupBy({
      by: ['segment'], where: { tenantId, storeId, deletedAt: null }, _count: true,
    });
    return Object.fromEntries(segments.map(s => [s.segment, s._count]));
  }
}
