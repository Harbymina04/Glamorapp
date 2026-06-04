import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StorefrontService {
  constructor(private prisma: PrismaService) {}

  // ── My Storefront (admin) ──────────────────────────────────
  async getStorefront(tenantId: string) {
    let sf = await this.prisma.storefront.findFirst({ where: { tenantId } });
    if (!sf) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      });
      sf = await this.prisma.storefront.create({
        data: {
          tenantId,
          displayName: tenant?.name || 'Mi Salón',
          slug: (tenant?.name || 'salon')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 100),
        },
      });
    }
    return sf;
  }

  async upsertStorefront(tenantId: string, dto: any) {
    const existing = await this.prisma.storefront.findFirst({ where: { tenantId } });
    if (existing) {
      return this.prisma.storefront.update({ where: { id: existing.id }, data: dto });
    }
    return this.prisma.storefront.create({ data: { tenantId, ...dto } });
  }

  async activateStorefront(tenantId: string) {
    const sf = await this.getStorefront(tenantId);
    return this.prisma.storefront.update({ where: { id: sf.id }, data: { isActive: true } });
  }

  async deactivateStorefront(tenantId: string) {
    const sf = await this.getStorefront(tenantId);
    return this.prisma.storefront.update({ where: { id: sf.id }, data: { isActive: false } });
  }

  async getStorefrontStats(tenantId: string, storeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [visibleProducts, visibleServices, ordersToday, pendingOrders, monthOrders] =
      await Promise.all([
        this.prisma.product.count({ where: { tenantId, isStoreVisible: true } }),
        this.prisma.service.count({ where: { tenantId, isStoreVisible: true } }),
        this.prisma.storefrontOrder.count({
          where: { tenantId, createdAt: { gte: today } },
        }),
        this.prisma.storefrontOrder.count({ where: { tenantId, status: 'pending' } }),
        this.prisma.storefrontOrder.aggregate({
          where: { tenantId, createdAt: { gte: monthStart } },
          _sum: { total: true },
          _count: true,
        }),
      ]);

    return {
      visibleProducts,
      visibleServices,
      ordersToday,
      pendingOrders,
      monthOrders: monthOrders._count,
      monthRevenue: Number(monthOrders._sum.total || 0),
    };
  }

  // ── Product visibility ────────────────────────────────────
  async getStoreProducts(tenantId: string, storeId: string, query: any) {
    const where: any = { tenantId, deletedAt: null };
    if (storeId) where.storeId = storeId;
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.visibility === 'visible') where.isStoreVisible = true;
    if (query.visibility === 'hidden') where.isStoreVisible = false;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { name: true } },
          images: { take: 1 },
        },
        orderBy: { name: 'asc' },
        take: 100,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, total };
  }

  async toggleProductVisibility(
    tenantId: string,
    storeId: string,
    productId: string,
    visible: boolean,
  ) {
    const p = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!p) throw new NotFoundException('Product not found');
    return this.prisma.product.update({
      where: { id: productId },
      data: { isStoreVisible: visible },
    });
  }

  async bulkToggleProducts(tenantId: string, productIds: string[], visible: boolean) {
    return this.prisma.product.updateMany({
      where: { id: { in: productIds }, tenantId },
      data: { isStoreVisible: visible },
    });
  }

  // ── Service visibility ────────────────────────────────────
  async getStoreServices(tenantId: string, storeId: string) {
    const where: any = { tenantId };
    if (storeId) where.storeId = storeId;
    return this.prisma.service.findMany({ where, orderBy: { name: 'asc' } });
  }

  async toggleServiceVisibility(
    tenantId: string,
    storeId: string,
    serviceId: string,
    dto: { isStoreVisible?: boolean; allowsOnlineBooking?: boolean },
  ) {
    const s = await this.prisma.service.findFirst({
      where: { id: serviceId, tenantId },
    });
    if (!s) throw new NotFoundException('Service not found');
    return this.prisma.service.update({ where: { id: serviceId }, data: dto });
  }

  // ── Store (sucursal) visibility ────────────────────────────
  async getStoreLocations(tenantId: string) {
    return this.prisma.store.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async updateStoreVisibility(tenantId: string, storeId: string, dto: any) {
    const s = await this.prisma.store.findFirst({ where: { id: storeId, tenantId } });
    if (!s) throw new NotFoundException('Store not found');
    return this.prisma.store.update({ where: { id: storeId }, data: dto });
  }

  // ── Commerce config ───────────────────────────────────────
  async getCommerceConfig(tenantId: string) {
    return this.getStorefront(tenantId);
  }

  async updateCommerceConfig(tenantId: string, dto: any) {
    return this.upsertStorefront(tenantId, dto);
  }

  // ── Orders ────────────────────────────────────────────────
  async getOrders(tenantId: string, query: any) {
    const where: any = { tenantId };
    if (query.status && query.status !== 'all') where.status = query.status;
    if (query.storeId) where.storeId = query.storeId;
    if (query.from) where.createdAt = { ...(where.createdAt || {}), gte: new Date(query.from) };
    if (query.to)
      where.createdAt = {
        ...(where.createdAt || {}),
        lte: new Date(query.to + 'T23:59:59'),
      };

    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');

    const [data, total] = await Promise.all([
      this.prisma.storefrontOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.storefrontOrder.count({ where }),
    ]);
    return { data, total };
  }

  async getOrder(tenantId: string, orderId: string) {
    const o = await this.prisma.storefrontOrder.findFirst({
      where: { id: orderId, tenantId },
    });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  async updateOrderStatus(tenantId: string, orderId: string, status: string) {
    const order = await this.getOrder(tenantId, orderId);
    const previousStatus = order.status;

    // Calculate commission on first confirmation (if not already set by webhook)
    const feeUpdate: any = {};
    if (status === 'confirmed' && previousStatus !== 'confirmed' && Number(order.platformFee) === 0) {
      const cfg = await this.prisma.platformConfig
        .findUnique({ where: { id: '00000000-0000-0000-0000-000000000001' } })
        .catch(() => null);
      const rate       = Number(cfg?.commissionRate ?? 0.03);
      const total      = Number(order.total);
      feeUpdate.platformFee  = Math.round(total * rate * 100) / 100;
      feeUpdate.tenantPayout = Math.round((total - feeUpdate.platformFee) * 100) / 100;
    }

    const updated = await this.prisma.storefrontOrder.update({
      where: { id: orderId },
      data: { status, ...feeUpdate },
    });

    const items = Array.isArray(order.items) ? order.items as any[] : [];

    // ── Deduct stock when order is confirmed ──────────────────
    if (status === 'confirmed' && previousStatus !== 'confirmed') {
      await this.adjustStock(tenantId, order.storeId, orderId, items, 'deduct');
    }

    // ── Restore stock when order is cancelled after being confirmed ──
    if (status === 'cancelled' && previousStatus === 'confirmed') {
      await this.adjustStock(tenantId, order.storeId, orderId, items, 'restore');
    }

    return updated;
  }

  /**
   * Deduct or restore stock for storefront order items.
   * Items must contain { productId, qty } to affect inventory.
   * Non-product items (services, designs) are silently skipped.
   */
  private async adjustStock(
    tenantId: string,
    storeId: string | null,
    orderId: string,
    items: any[],
    direction: 'deduct' | 'restore',
  ) {
    for (const item of items) {
      if (!item.productId || !item.qty) continue;

      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId },
      });
      if (!product) continue;

      const qty = Math.abs(Number(item.qty));
      const delta = direction === 'deduct' ? -qty : qty;
      const newStock = product.currentStock + delta;

      await this.prisma.$transaction([
        this.prisma.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: delta } },
        }),
        this.prisma.inventoryMovement.create({
          data: {
            tenantId,
            storeId: storeId ?? product.storeId,
            productId: item.productId,
            movementType: direction === 'deduct' ? 'exit' : 'entry',
            quantity: qty,
            previousStock: product.currentStock,
            newStock,
            referenceType: 'storefront_order',
            referenceId: orderId,
            notes: direction === 'deduct'
              ? `Venta online — pedido ${orderId.slice(-6).toUpperCase()}`
              : `Cancelación pedido online — ${orderId.slice(-6).toUpperCase()}`,
          },
        }),
      ]);
    }
  }

  async createOrder(dto: any) {
    const orderNumber = `GA-${Date.now().toString().slice(-6)}`;
    return this.prisma.storefrontOrder.create({ data: { ...dto, orderNumber } });
  }

  // ── Reviews ───────────────────────────────────────────────
  async getReviews(tenantId: string, query: any) {
    const where: any = { tenantId };
    if (query.responded === 'true') where.reply = { not: null };
    if (query.responded === 'false') where.reply = null;
    if (query.rating) where.rating = parseInt(query.rating);

    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');

    const [data, total, agg] = await Promise.all([
      this.prisma.storefrontReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.storefrontReview.count({ where }),
      this.prisma.storefrontReview.groupBy({
        by: ['rating'],
        where: { tenantId },
        _count: true,
        orderBy: { rating: 'desc' },
      }),
    ]);

    const totalReviews = agg.reduce((s, a) => s + a._count, 0);
    const avgRating =
      totalReviews > 0
        ? agg.reduce((s, a) => s + a.rating * a._count, 0) / totalReviews
        : 0;

    return {
      data,
      total,
      avgRating: parseFloat(avgRating.toFixed(1)),
      totalReviews,
      byRating: agg,
    };
  }

  async replyToReview(tenantId: string, reviewId: string, reply: string) {
    const r = await this.prisma.storefrontReview.findFirst({
      where: { id: reviewId, tenantId },
    });
    if (!r) throw new NotFoundException('Review not found');
    return this.prisma.storefrontReview.update({
      where: { id: reviewId },
      data: { reply, repliedAt: new Date() },
    });
  }

  async createReview(dto: any) {
    return this.prisma.storefrontReview.create({ data: dto });
  }

  // ── Public endpoints (no auth) ───────────────────────────
  async getPublicStorefronts(query: any) {
    const where: any = { isActive: true };
    if (query.q) where.displayName = { contains: query.q, mode: 'insensitive' };
    return this.prisma.storefront.findMany({
      where,
      take: 20,
      orderBy: { averageRating: 'desc' },
    });
  }

  async getPublicStorefront(slug: string) {
    const sf = await this.prisma.storefront.findFirst({ where: { slug, isActive: true } });
    if (!sf) throw new NotFoundException('Storefront not found');
    return sf;
  }

  async getPublicLocations(tenantId: string) {
    return this.prisma.store.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true, name: true, slug: true, address: true,
        neighborhood: true, city: true, phone: true,
        latitude: true, longitude: true, isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getPublicProduct(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, isStoreVisible: true, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        images:   { take: 4, orderBy: { sortOrder: 'asc' } },
        brand:    { select: { name: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found or not available in store');
    return product;
  }

  async getPublicProducts(query: any) {
    const where: any = { isStoreVisible: true, deletedAt: null };
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.q) where.name = { contains: query.q, mode: 'insensitive' };
    if (query.cat)
      where.category = { name: { contains: query.cat, mode: 'insensitive' } };

    return this.prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        images: { take: 1 },
      },
      take: parseInt(query.limit || '50'),
      skip: (parseInt(query.page || '1') - 1) * parseInt(query.limit || '50'),
      orderBy: { storeSortOrder: 'asc' },
    });
  }

  async getPublicServices(query: any) {
    const where: any = { isStoreVisible: true };
    if (query.tenantId) where.tenantId = query.tenantId;
    return this.prisma.service.findMany({ where, take: 30, orderBy: { name: 'asc' } });
  }

  async getPublicNailDesigns(query: any) {
    const where: any = { isStoreVisible: true };
    if (query.tenantId) where.tenantId = query.tenantId;
    return this.prisma.nailDesign.findMany({
      where,
      take: 30,
      orderBy: { createdAt: 'desc' },
    });
  }
}
