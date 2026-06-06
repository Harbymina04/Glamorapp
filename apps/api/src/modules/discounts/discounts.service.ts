import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';
import { CreateDiscountDto, UpdateDiscountDto } from './dto/discount.dto';

@Injectable()
export class DiscountsService {
  constructor(private prisma: PrismaService) {}

  // ── List ────────────────────────────────────────────────────────

  async findAll(tenantId: string, storeId: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 20);
    const where: any = {
      tenantId,
      storeId,
      ...(query.isActive !== undefined
        ? { isActive: query.isActive === 'true' || query.isActive === true }
        : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.discount.findMany({
        where, skip, take,
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.discount.count({ where }),
    ]);

    return new PaginatedResponse(data, total, query.page || 1, query.limit || 20);
  }

  // ── Active (for POS) ────────────────────────────────────────────

  async findActive(tenantId: string, storeId: string) {
    const now = new Date();
    return this.prisma.discount.findMany({
      where: {
        tenantId,
        storeId,
        isActive: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null },   { endDate:   { gte: now } }] },
        ],
      },
      orderBy: { discountPercent: 'desc' }, // highest first
    });
  }

  // ── Active (for Storefront — public, by tenantId) ───────────────

  async findActiveStorefront(tenantId: string) {
    const now = new Date();
    return this.prisma.discount.findMany({
      where: {
        tenantId,
        isActive: true,
        applyToStorefront: true,
        // exclude services-only discounts (storefront only sells products)
        scope: { not: 'services' },
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null },   { endDate:   { gte: now } }] },
        ],
      },
      orderBy: { discountPercent: 'desc' },
    });
  }

  // ── Single ──────────────────────────────────────────────────────

  async findOne(tenantId: string, storeId: string, id: string) {
    const discount = await this.prisma.discount.findFirst({
      where: { id, tenantId, storeId },
    });
    if (!discount) throw new NotFoundException('Descuento no encontrado');
    return discount;
  }

  // ── Create ──────────────────────────────────────────────────────

  async create(tenantId: string, storeId: string, dto: CreateDiscountDto, userId?: string) {
    return this.prisma.discount.create({
      data: {
        tenantId,
        storeId,
        name: dto.name,
        description: dto.description,
        discountPercent: dto.discountPercent,
        scope: dto.scope as any,
        targetIds: dto.targetIds ?? [],
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate:   dto.endDate   ? new Date(dto.endDate)   : null,
        isActive:          dto.isActive ?? true,
        applyToStorefront: dto.applyToStorefront ?? false,
        createdBy:         userId ?? null,
      },
    });
  }

  // ── Update ──────────────────────────────────────────────────────

  async update(tenantId: string, storeId: string, id: string, dto: UpdateDiscountDto) {
    await this.findOne(tenantId, storeId, id);
    return this.prisma.discount.update({
      where: { id },
      data: {
        name:            dto.name,
        description:     dto.description,
        discountPercent: dto.discountPercent,
        scope:           dto.scope as any,
        targetIds:       dto.targetIds ?? [],
        startDate:       dto.startDate ? new Date(dto.startDate) : null,
        endDate:         dto.endDate   ? new Date(dto.endDate)   : null,
        isActive:          dto.isActive ?? true,
        applyToStorefront: dto.applyToStorefront ?? false,
      },
    });
  }

  // ── Toggle active ───────────────────────────────────────────────

  async toggle(tenantId: string, storeId: string, id: string) {
    const discount = await this.findOne(tenantId, storeId, id);
    return this.prisma.discount.update({
      where: { id },
      data: { isActive: !discount.isActive },
    });
  }
}
