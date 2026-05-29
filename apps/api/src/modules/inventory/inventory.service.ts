import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getMovements(tenantId: string, storeId: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 10);
    const where: any = {
      tenantId,
      storeId,
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.type ? { movementType: query.type } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        skip,
        take,
        include: { product: { select: { name: true, sku: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return new PaginatedResponse(data, total, query.page || 1, query.limit || 10);
  }

  async createMovement(tenantId: string, storeId: string, dto: any, userId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId, storeId },
    });
    if (!product) throw new Error('Product not found');

    const quantity = dto.movementType === 'entry' ? Math.abs(dto.quantity) : -Math.abs(dto.quantity);
    const newStock = product.currentStock + quantity;

    return this.prisma.inventoryMovement.create({
      data: {
        tenantId,
        storeId,
        productId: dto.productId,
        movementType: dto.movementType,
        quantity: dto.quantity,
        previousStock: product.currentStock,
        newStock,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        notes: dto.notes,
        createdBy: userId,
      },
    });
  }

  async getAlerts(tenantId: string, storeId: string) {
    return this.prisma.product.findMany({
      where: {
        tenantId,
        storeId,
        deletedAt: null,
        currentStock: { lte: 0 },
      },
      select: { id: true, name: true, sku: true, currentStock: true, minStock: true },
    });
  }

  async getSummary(tenantId: string, storeId: string) {
    const [totalProducts, totalStock, lowStock, outOfStock, totalValue] = await Promise.all([
      this.prisma.product.count({ where: { tenantId, storeId, deletedAt: null } }),
      this.prisma.product.aggregate({ where: { tenantId, storeId, deletedAt: null }, _sum: { currentStock: true } }),
      this.prisma.product.count({ where: { tenantId, storeId, deletedAt: null, currentStock: { gt: 0, lte: this.prisma.product.fields.minStock as any } } }),
      this.prisma.product.count({ where: { tenantId, storeId, deletedAt: null, currentStock: 0 } }),
      this.prisma.product.aggregate({
        where: { tenantId, storeId, deletedAt: null },
        _sum: { currentStock: true, costPrice: true },
      }),
    ]);

    return {
      totalProducts,
      totalStock: totalStock._sum.currentStock || 0,
      lowStock,
      outOfStock,
      estimatedValue: (Number(totalValue._sum.currentStock) || 0) * (Number(totalValue._sum.costPrice) || 0),
    };
  }
}
