import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';

@Injectable()
export class PackagesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, storeId: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 10);
    const where: any = { tenantId, storeId, ...(query.isActive !== undefined ? { isActive: query.isActive } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.package.findMany({ where, skip, take, include: { items: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.package.count({ where }),
    ]);
    return new PaginatedResponse(data, total, query.page || 1, query.limit || 10);
  }

  async findOne(tenantId: string, storeId: string, id: string) {
    const p = await this.prisma.package.findFirst({ where: { id, tenantId, storeId }, include: { items: true } });
    if (!p) throw new NotFoundException('Package not found');
    return p;
  }

  async create(tenantId: string, storeId: string, dto: any) {
    const { items, ...data } = dto;
    return this.prisma.package.create({
      data: { tenantId, storeId, ...data, items: { create: items } },
      include: { items: true },
    });
  }

  async update(tenantId: string, storeId: string, id: string, dto: any) {
    await this.findOne(tenantId, storeId, id);
    const { items, ...data } = dto;
    if (items) {
      await this.prisma.packageItem.deleteMany({ where: { packageId: id } });
      await this.prisma.packageItem.createMany({ data: items.map((i: any) => ({ packageId: id, ...i })) });
    }
    return this.prisma.package.update({ where: { id }, data, include: { items: true } });
  }

  async remove(tenantId: string, storeId: string, id: string) {
    await this.findOne(tenantId, storeId, id);
    return this.prisma.package.update({ where: { id }, data: { isActive: false } });
  }
}
