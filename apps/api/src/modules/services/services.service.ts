import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, storeId: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 50);
    const where: any = {
      tenantId, storeId,
      ...(query.category ? { category: query.category } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.service.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
      this.prisma.service.count({ where }),
    ]);
    return new PaginatedResponse(data, total, query.page || 1, query.limit || 50);
  }

  async findOne(tenantId: string, storeId: string, id: string) {
    const s = await this.prisma.service.findFirst({ where: { id, tenantId, storeId } });
    if (!s) throw new NotFoundException('Service not found');
    return s;
  }

  async create(tenantId: string, storeId: string, dto: any) {
    return this.prisma.service.create({ data: { tenantId, storeId, ...dto } });
  }

  async update(tenantId: string, storeId: string, id: string, dto: any) {
    await this.findOne(tenantId, storeId, id);
    return this.prisma.service.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, storeId: string, id: string) {
    await this.findOne(tenantId, storeId, id);
    return this.prisma.service.update({ where: { id }, data: { isActive: false } });
  }
}
