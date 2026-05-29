import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async getProducts(tenantId: string, storeId: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 12);
    const where: any = {
      tenantId, storeId, deletedAt: null, isCatalogVisible: true,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...(query.isFeatured ? { isFeatured: true } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          category: true,
          brand: true,
          images: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { catalogViews: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);
    return new PaginatedResponse(data, total, query.page || 1, query.limit || 12);
  }

  async toggleVisibility(tenantId: string, storeId: string, id: string) {
    const p = await this.prisma.product.findFirst({ where: { id, tenantId, storeId } });
    return this.prisma.product.update({ where: { id }, data: { isCatalogVisible: !(p?.isCatalogVisible ?? true) } });
  }

  async toggleFeatured(tenantId: string, storeId: string, id: string) {
    const p = await this.prisma.product.findFirst({ where: { id, tenantId, storeId } });
    return this.prisma.product.update({ where: { id }, data: { isFeatured: !(p?.isFeatured ?? false) } });
  }
}
