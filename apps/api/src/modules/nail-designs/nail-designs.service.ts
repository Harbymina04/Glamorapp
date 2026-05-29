import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';

@Injectable()
export class NailDesignsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, storeId: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 20);
    const where: any = {
      tenantId, storeId,
      isActive: true,
      ...(query.category ? { category: query.category } : {}),
      ...(query.technique ? { technique: query.technique } : {}),
      ...(query.isFavorite !== undefined ? { isFavorite: query.isFavorite } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.nailDesign.findMany({
        where, skip, take,
        orderBy: query.sortBy === 'popularity' ? { popularityScore: 'desc' } : { createdAt: 'desc' },
      }),
      this.prisma.nailDesign.count({ where }),
    ]);
    return new PaginatedResponse(data, total, query.page || 1, query.limit || 20);
  }

  async findOne(tenantId: string, storeId: string, id: string) {
    const d = await this.prisma.nailDesign.findFirst({ where: { id, tenantId, storeId } });
    if (!d) throw new NotFoundException('Nail design not found');
    return d;
  }

  async create(tenantId: string, storeId: string, dto: any) {
    return this.prisma.nailDesign.create({ data: { tenantId, storeId, ...dto } });
  }

  async update(tenantId: string, storeId: string, id: string, dto: any) {
    await this.findOne(tenantId, storeId, id);
    return this.prisma.nailDesign.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, storeId: string, id: string) {
    await this.findOne(tenantId, storeId, id);
    return this.prisma.nailDesign.update({ where: { id }, data: { isActive: false } });
  }

  async toggleFavorite(tenantId: string, storeId: string, id: string) {
    const d = await this.findOne(tenantId, storeId, id);
    return this.prisma.nailDesign.update({ where: { id }, data: { isFavorite: !d.isFavorite } });
  }

  async getRanking(tenantId: string, storeId: string) {
    return this.prisma.nailDesign.findMany({
      where: { tenantId, storeId, isActive: true },
      orderBy: { popularityScore: 'desc' },
      take: 10,
    });
  }

  async setImage(id: string, url: string) {
    return this.prisma.nailDesign.update({
      where: { id },
      data: { imageUrl: url },
    });
  }
}
