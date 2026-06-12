import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DiscountsService } from '../discounts/discounts.service';
import { CreatePublicOrderDto } from './dto/public-order.dto';
import { CreatePublicReviewDto } from './dto/public-review.dto';

// Campos seguros para exponer en endpoints públicos (anónimos). Se OMITEN a
// propósito: costPrice, minStock, maxStock, supplierId y comisiones (datos
// confidenciales de costo/margen). currentStock sí es público (disponibilidad).
const PUBLIC_PRODUCT_FIELDS = {
  id: true, tenantId: true, storeId: true,
  name: true, description: true, storeDescription: true,
  sku: true, barcode: true, imageUrl: true,
  salePrice: true, ivaRate: true, isIvaExcluded: true,
  currentStock: true, unitOfMeasure: true, size: true,
  status: true, isFeatured: true, isStoreVisible: true,
  storeSortOrder: true, catalogViews: true, categoryId: true, brandId: true,
  createdAt: true,
} as const;

const PUBLIC_SERVICE_FIELDS = {
  id: true, tenantId: true, storeId: true,
  name: true, description: true, storeDescription: true,
  category: true, price: true, durationMinutes: true,
  color: true, ivaRate: true, isStoreVisible: true,
} as const;

const PUBLIC_NAIL_DESIGN_FIELDS = {
  id: true, tenantId: true, storeId: true,
  name: true, imageUrl: true, category: true, technique: true,
  suggestedPrice: true, isFavorite: true, isStoreVisible: true,
} as const;

/** Devuelve solo las claves permitidas de un objeto (anti mass-assignment). */
function pick<T extends Record<string, any>>(obj: T, keys: readonly string[]): Partial<T> {
  const out: any = {};
  for (const k of keys) if (obj?.[k] !== undefined) out[k] = obj[k];
  return out;
}

// Campos editables por el admin del comercio. Se EXCLUYEN identidad y métricas
// (id, tenantId, slug de store, averageRating, totalReviews, etc.).
const STOREFRONT_EDITABLE = [
  'displayName', 'slug', 'tagline', 'description', 'logoUrl', 'bannerUrl',
  'galleryUrls', 'businessType', 'tags', 'publicEmail', 'publicPhone', 'whatsapp',
  'instagram', 'facebook', 'tiktok', 'website', 'acceptsOrders', 'acceptsAppointments',
  'acceptsDelivery', 'deliveryFee', 'deliveryRadiusKm', 'freeDeliveryThreshold',
  'minOrderAmount', 'advancePaymentPercent', 'isActive',
] as const;

// Solo campos de presentación/ubicación del storefront (NO config POS/facturación
// como currency, timezone, folios, taxInclusive, etc.).
const STORE_LOCATION_EDITABLE = [
  'isStoreVisible', 'latitude', 'longitude', 'neighborhood', 'acceptsPickup',
  'acceptsOnlineAppointments', 'address', 'city', 'state', 'country', 'zipCode',
  'phone', 'email', 'slogan', 'logoUrl', 'businessHours',
] as const;

const SERVICE_VISIBILITY_EDITABLE = ['isStoreVisible', 'storeDescription'] as const;

@Injectable()
export class StorefrontService {
  private readonly logger = new Logger(StorefrontService.name);
  constructor(
    private prisma: PrismaService,
    private discounts: DiscountsService,
  ) {}

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
          // NFD + strip diacríticos para que "Salón" → "salon" (no "sal-n")
          slug: (tenant?.name || 'salon')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 100),
        },
      });
    }
    return sf;
  }

  async upsertStorefront(tenantId: string, dto: any) {
    const data = pick(dto, STOREFRONT_EDITABLE);
    const existing = await this.prisma.storefront.findFirst({ where: { tenantId } });
    if (existing) {
      return this.prisma.storefront.update({ where: { id: existing.id }, data });
    }
    return this.prisma.storefront.create({ data: { tenantId, ...data } });
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

    // Order filter: always include null-storeId orders + current store's orders
    const orderWhere = {
      tenantId,
      OR: [{ storeId }, { storeId: null }],
    };

    const [visibleProducts, visibleServices, ordersToday, pendingOrders, monthOrders] =
      await Promise.all([
        this.prisma.product.count({ where: { tenantId, storeId, isStoreVisible: true } }),
        this.prisma.service.count({ where: { tenantId, storeId, isStoreVisible: true } }),
        this.prisma.storefrontOrder.count({
          where: { ...orderWhere, createdAt: { gte: today } },
        }),
        this.prisma.storefrontOrder.count({ where: { ...orderWhere, status: 'pending' } }),
        this.prisma.storefrontOrder.aggregate({
          where: { ...orderWhere, createdAt: { gte: monthStart } },
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
    return this.prisma.service.update({ where: { id: serviceId }, data: pick(dto, SERVICE_VISIBILITY_EDITABLE) });
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
    return this.prisma.store.update({ where: { id: storeId }, data: pick(dto, STORE_LOCATION_EDITABLE) });
  }

  // ── Commerce config ───────────────────────────────────────
  async getCommerceConfig(tenantId: string) {
    return this.getStorefront(tenantId);
  }

  async updateCommerceConfig(tenantId: string, dto: any) {
    return this.upsertStorefront(tenantId, dto);
  }

  // ── Orders ────────────────────────────────────────────────
  async getOrders(tenantId: string, userStoreId: string, userRole: string, query: any) {
    const isTenantAdmin = ['tenant_admin', 'superadmin'].includes(userRole);
    const where: any = { tenantId };

    if (query.status && query.status !== 'all') where.status = query.status;

    if (isTenantAdmin) {
      // Tenant admin can filter by a specific store or see all
      if (query.storeId) where.storeId = query.storeId;
      // else: no store filter — sees all stores del tenant
    } else {
      // store_admin / cashier: solo los pedidos de SU sucursal (todo pedido nuevo
      // tiene storeId; ya no se exponen pedidos sin sucursal a otras tiendas).
      where.storeId = userStoreId;
    }

    if (query.from) where.createdAt = { ...(where.createdAt || {}), gte: new Date(query.from) };
    if (query.to)
      where.createdAt = {
        ...(where.createdAt || {}),
        lte: new Date(query.to + 'T23:59:59'),
      };

    const page  = parseInt(query.page  || '1');
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

  /**
   * Links a completed POS sale to a storefront order and marks it as delivered.
   * Called after the cashier processes "Cobrar en POS".
   */
  async linkSaleToOrder(tenantId: string, orderId: string, saleId: string) {
    await this.getOrder(tenantId, orderId);

    // Validar que la venta pertenezca al mismo tenant (evita escritura cross-tenant)
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      select: { id: true },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');

    await this.prisma.storefrontOrder.update({
      where: { id: orderId },
      data: { saleId, status: 'delivered' } as any,
    });

    // Vínculo bidireccional — acotado por tenantId
    await this.prisma.sale.updateMany({
      where: { id: saleId, tenantId },
      data: { storefrontOrderId: orderId } as any,
    });

    return { success: true, orderId, saleId };
  }

  /**
   * Returns order items formatted for POS cart pre-loading.
   */
  async getOrderForPos(tenantId: string, orderId: string) {
    const order = await this.getOrder(tenantId, orderId);
    const items = Array.isArray(order.items) ? order.items as any[] : [];

    // Load product details for each item
    const cartItems = await Promise.all(
      items.filter((i: any) => i.productId).map(async (i: any) => {
        const product = await this.prisma.product.findFirst({
          where: { id: i.productId, tenantId },
          select: { id: true, name: true, salePrice: true, images: { take: 1 } },
        });
        return {
          productId: i.productId,
          name: i.name || product?.name,
          unitPrice: i.price,
          quantity: i.qty,
          imageUrl: product?.images?.[0]?.url ?? null,
        };
      }),
    );

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      cartItems: cartItems.filter(Boolean),
    };
  }

  async getOrder(tenantId: string, orderId: string, userStoreId?: string, userRole?: string) {
    const isTenantAdmin = !userRole || ['tenant_admin', 'superadmin'].includes(userRole);
    const where: any = { id: orderId, tenantId };
    if (!isTenantAdmin && userStoreId) {
      where.storeId = userStoreId;
    }
    const o = await this.prisma.storefrontOrder.findFirst({ where });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  // Máquina de estados de pedidos. Los estados terminales (delivered/cancelled)
  // no permiten más transiciones por este endpoint (revertir requiere un flujo
  // de devolución / cancelación de la venta asociada).
  private static readonly ORDER_TRANSITIONS: Record<string, string[]> = {
    pending:   ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready:     ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  };

  // Estados en los que el stock ya fue descontado (al confirmar) y, por tanto,
  // debe restaurarse si el pedido se cancela (solo pagos online).
  private static readonly STOCK_DEDUCTED_STATUSES = ['confirmed', 'preparing', 'ready'];

  async updateOrderStatus(tenantId: string, orderId: string, status: string) {
    const order = await this.getOrder(tenantId, orderId);
    const previousStatus = order.status;

    if (previousStatus === status) return order; // no-op idempotente

    const allowed = StorefrontService.ORDER_TRANSITIONS[previousStatus] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Transición de estado inválida: ${previousStatus} → ${status}`);
    }

    const isStorePayment = order.paymentMethod === 'store';
    const items = Array.isArray(order.items) ? order.items as any[] : [];

    // ── Confirmación: atómica e idempotente ───────────────────
    if (status === 'confirmed') {
      const feeUpdate: any = {};
      if (Number(order.platformFee) === 0) {
        const cfg = await this.prisma.platformConfig
          .findUnique({ where: { id: '00000000-0000-0000-0000-000000000001' } })
          .catch(() => null);
        const rate  = Number(cfg?.commissionRate ?? 0.03);
        const total = Number(order.total);
        feeUpdate.platformFee  = Math.round(total * rate * 100) / 100;
        feeUpdate.tenantPayout = Math.round((total - feeUpdate.platformFee) * 100) / 100;
      }

      // Guard atómico: solo una llamada gana la transición pending→confirmed.
      // Webhooks de Wompi reintentados/concurrentes no duplican stock ni venta.
      const transition = await this.prisma.storefrontOrder.updateMany({
        where: { id: orderId, tenantId, status: previousStatus },
        data: { status, ...feeUpdate },
      });
      if (transition.count === 0) {
        return this.prisma.storefrontOrder.findUnique({ where: { id: orderId } });
      }

      // Efectos secundarios solo para pagos online (PSE/tarjeta/nequi). En pagos
      // "en tienda" el stock lo descuenta la venta POS al cobrar → no aquí (#1).
      if (!isStorePayment) {
        await this.adjustStock(tenantId, order.storeId, orderId, items, 'deduct');
        await this.createOnlineSale(order, items).catch(err =>
          this.logger.warn(`No se pudo crear la venta online del pedido ${orderId}: ${err.message}`),
        );
      }

      return this.prisma.storefrontOrder.findUnique({ where: { id: orderId } });
    }

    // ── Otras transiciones (delivered / cancelled) ────────────
    const transition = await this.prisma.storefrontOrder.updateMany({
      where: { id: orderId, tenantId, status: previousStatus },
      data: { status },
    });
    if (transition.count === 0) {
      return this.prisma.storefrontOrder.findUnique({ where: { id: orderId } });
    }

    // Restaurar stock al cancelar un pedido cuyo stock ya se descontó al
    // confirmar (confirmed/preparing/ready). Solo pagos online; los "store" no
    // descontaron en la confirmación (lo hace la venta POS).
    if (
      status === 'cancelled' &&
      StorefrontService.STOCK_DEDUCTED_STATUSES.includes(previousStatus) &&
      !isStorePayment
    ) {
      await this.adjustStock(tenantId, order.storeId, orderId, items, 'restore');
    }

    return this.prisma.storefrontOrder.findUnique({ where: { id: orderId } });
  }

  /**
   * Creates a completed Sale record from an online storefront order.
   * Used when payment is confirmed (PSE, card, etc.) — bypasses cash register.
   */
  private async createOnlineSale(order: any, items: any[]) {
    if (!order.storeId) return;

    // Find a store_admin or tenant_admin to assign as the sale's user
    const systemUser = await this.prisma.user.findFirst({
      where: {
        storeId: order.storeId,
        role: { in: ['store_admin', 'tenant_admin'] as any },
        deletedAt: null,
        isActive: true,
      },
      select: { id: true },
    });
    if (!systemUser) return;

    // Build sale items from storefront order items.
    // El precio del storefront es IVA-incluido → se desagrega el IVA por
    // producto para no subreportar impuestos (consistente con el reporte de IVA,
    // que lee unit_price como base imponible e iva_amount como el IVA).
    const productItems = items.filter(i => i.productId && i.qty > 0);
    if (productItems.length === 0) return;

    const ivaConfigs = await this.prisma.product.findMany({
      where: { id: { in: productItems.map(i => i.productId) } },
      select: { id: true, ivaRate: true, isIvaExcluded: true },
    });
    const ivaById = new Map(ivaConfigs.map(p => [p.id, p]));
    const round2 = (n: number) => Math.round(n * 100) / 100;

    let subtotal = 0;
    let taxAmount = 0;
    const saleItems = productItems.map((i: any) => {
      const cfg = ivaById.get(i.productId);
      const rate = cfg?.isIvaExcluded ? 0 : Number(cfg?.ivaRate ?? 19);
      const basePerUnit = rate > 0 ? round2(Number(i.price) / (1 + rate / 100)) : Number(i.price);
      const lineBase = round2(basePerUnit * i.qty);
      const lineTotal = round2(Number(i.price) * i.qty);
      const lineIva = round2(lineTotal - lineBase);
      subtotal += lineBase;
      taxAmount += lineIva;
      return {
        productId: i.productId,
        itemType: 'product',
        name: i.name,
        quantity: i.qty,
        unitPrice: basePerUnit,
        discountAmount: 0,
        ivaRate: rate,
        ivaAmount: lineIva,
        total: lineTotal,
        commissionRate: 0,
        commissionAmount: 0,
      };
    });

    subtotal = round2(subtotal);
    taxAmount = round2(taxAmount);
    const total = round2(subtotal + taxAmount);
    const taxPercent = subtotal > 0 ? round2((taxAmount / subtotal) * 100) : 0;

    // Generate sale number — retry ante colisión del folio (unique por tenant+store)
    const count = await this.prisma.sale.count({ where: { tenantId: order.tenantId, storeId: order.storeId } });
    let sale: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const saleNumber = `ON-${String(count + 1 + attempt).padStart(5, '0')}`;
      try {
        sale = await this.prisma.sale.create({
          data: {
            tenantId: order.tenantId,
            storeId: order.storeId,
            userId: systemUser.id,
            saleNumber,
            source: 'online',
            storefrontOrderId: order.id,
            status: 'completed',
            subtotal,
            discountPercent: 0,
            discountAmount: 0,
            taxPercent,
            taxAmount,
            total,
            notes: `Pedido online ${order.orderNumber} — ${order.paymentMethod?.toUpperCase()}`,
            completedAt: new Date(),
            items: { create: saleItems },
            payments: {
              create: [{
                paymentMethod: order.paymentMethod === 'pse' ? 'transfer' : 'other',
                amount: total,
                reference: order.paymentTransactionId || order.orderNumber,
              }],
            },
          } as any,
        });
        break;
      } catch (e: any) {
        if (e?.code === 'P2002' && attempt < 2) continue;
        throw e;
      }
    }
    if (!sale) return;

    // Link the sale back to the storefront order
    await this.prisma.storefrontOrder.update({
      where: { id: order.id },
      data: { saleId: sale.id } as any,
    });
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
        select: { id: true, storeId: true },
      });
      if (!product) continue;

      const qty = Math.abs(Number(item.qty));
      const delta = direction === 'deduct' ? -qty : qty;

      // Incremento atómico + lectura del resultado para registrar prev/new exactos.
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: delta } },
          select: { currentStock: true },
        });
        const newStock = updated.currentStock;

        // El pedido ya está pagado (PSE): no se bloquea, pero se avisa el backorder.
        if (direction === 'deduct' && newStock < 0) {
          this.logger.warn(
            `Backorder: producto ${item.productId} quedó en ${newStock} al confirmar pedido ${orderId}`,
          );
        }

        await tx.inventoryMovement.create({
          data: {
            tenantId,
            storeId: storeId ?? product.storeId,
            productId: item.productId,
            movementType: direction === 'deduct' ? 'exit' : 'entry',
            // Convención de signo consistente con POS/transferencias:
            // salidas negativas, entradas positivas.
            quantity: delta,
            previousStock: newStock - delta,
            newStock,
            referenceType: 'storefront_order',
            referenceId: orderId,
            notes: direction === 'deduct'
              ? `Venta online — pedido ${orderId.slice(-6).toUpperCase()}`
              : `Cancelación pedido online — ${orderId.slice(-6).toUpperCase()}`,
          },
        });
      });
    }
  }

  async createOrder(dto: CreatePublicOrderDto) {
    // Folio colisión-resistente: timestamp base36 + sufijo aleatorio (los últimos
    // 6 dígitos del timestamp se repetían cada ~16 min y entre tenants).
    const orderNumber = `GA-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    // Resolver la sucursal del pedido. Si el cliente envía storeId, debe ser una
    // sucursal ACTIVA del MISMO tenant (evita asignar un store ajeno); si no,
    // se usa la primera sucursal activa. Todo pedido queda con storeId (nunca null).
    let storeId: string | null;
    if (dto.storeId) {
      const s = await this.prisma.store.findFirst({
        where: { id: dto.storeId, tenantId: dto.tenantId, isActive: true },
        select: { id: true },
      });
      storeId = s?.id ?? null;
    } else {
      const s = await this.prisma.store.findFirst({
        where: { tenantId: dto.tenantId, isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      storeId = s?.id ?? null;
    }
    if (!storeId) {
      throw new BadRequestException('La tienda no está disponible para recibir pedidos en este momento.');
    }

    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('El pedido no contiene items.');
    }

    // Recompute prices server-side from authoritative product data.
    // Never trust client-sent price/subtotal/total (mass-assignment / price tampering).
    const productIds = [...new Set(dto.items.map((i: any) => i.productId).filter(Boolean))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId: dto.tenantId, deletedAt: null },
      select: { id: true, name: true, salePrice: true, categoryId: true, currentStock: true },
    });
    const priceById = new Map(products.map(p => [p.id, p]));

    // Aplicar los descuentos de campaña del storefront con la MISMA lógica y
    // redondeo del frontend (getStorefrontDiscount + Math.round a pesos). Si el
    // total guardado no coincide con lo que cobra Wompi, el webhook marca
    // AMOUNT_MISMATCH y el pedido pagado nunca se confirma.
    const activeDiscounts = await this.discounts.findActiveStorefront(dto.tenantId);
    const bestDiscountPercent = (product: { id: string; categoryId: string | null }): number => {
      const matches = activeDiscounts.filter((d: any) => {
        const ids: string[] = Array.isArray(d.targetIds) ? (d.targetIds as string[]) : [];
        if (d.scope === 'all') return true;
        if (d.scope === 'products') return ids.length === 0 || ids.includes(product.id);
        if (d.scope === 'category') return product.categoryId != null && ids.includes(product.categoryId);
        return false;
      });
      if (!matches.length) return 0;
      return Math.max(...matches.map((d: any) => Number(d.discountPercent)));
    };

    let subtotal = 0;
    const items = dto.items.map((i: any) => {
      const product = priceById.get(i.productId);
      if (!product) {
        throw new BadRequestException(`Producto inválido en el pedido: ${i.productId}`);
      }
      const qty = Math.max(1, Math.floor(Number(i.qty) || 0));
      // Política: bloquear pedidos sin stock suficiente (el cliente pagaría
      // por producto inexistente; el descuento real ocurre al confirmar).
      if (qty > Number(product.currentStock ?? 0)) {
        throw new BadRequestException(
          `Stock insuficiente para "${product.name}". Disponible: ${Math.max(0, Number(product.currentStock ?? 0))}`,
        );
      }
      const originalPrice = Number(product.salePrice);
      const discountPercent = bestDiscountPercent(product);
      const price = discountPercent > 0
        ? Math.round(originalPrice * (1 - discountPercent / 100))
        : originalPrice;
      subtotal += price * qty;
      return {
        productId: product.id,
        name: product.name,
        qty,
        price,
        ...(discountPercent > 0 ? { originalPrice, discountPercent } : {}),
      };
    });

    // Config de comercio del tenant: pedido mínimo y costo de envío
    const commerce = await this.prisma.storefront.findFirst({
      where: { tenantId: dto.tenantId },
      select: { minOrderAmount: true, deliveryFee: true, acceptsDelivery: true, freeDeliveryThreshold: true },
    });

    const minOrder = Number(commerce?.minOrderAmount ?? 0);
    if (minOrder > 0 && subtotal < minOrder) {
      throw new BadRequestException(
        `El pedido mínimo de esta tienda es $${minOrder.toLocaleString('es-CO')}. Tu pedido suma $${subtotal.toLocaleString('es-CO')}.`,
      );
    }

    const isDelivery = dto.deliveryMethod === 'delivery';
    if (isDelivery && !commerce?.acceptsDelivery) {
      throw new BadRequestException('Esta tienda no ofrece entrega a domicilio.');
    }
    if (isDelivery && !dto.deliveryAddress?.trim()) {
      throw new BadRequestException('La dirección de entrega es obligatoria para domicilio.');
    }
    // Envío gratis al superar el umbral configurado (0 = nunca)
    const freeThreshold = Number(commerce?.freeDeliveryThreshold ?? 0);
    const freeDelivery = freeThreshold > 0 && subtotal >= freeThreshold;
    const deliveryFee = isDelivery && !freeDelivery ? Number(commerce?.deliveryFee ?? 0) : 0;

    // La dirección viaja en buyerNotes (el modelo no tiene columna de dirección)
    const notes = isDelivery
      ? `📍 Domicilio: ${dto.deliveryAddress!.trim()}${dto.buyerNotes ? `\n${dto.buyerNotes}` : ''}`
      : dto.buyerNotes ?? null;

    return this.prisma.storefrontOrder.create({
      data: {
        tenantId: dto.tenantId,
        storeId,
        orderNumber,
        buyerName: dto.buyerName,
        buyerEmail: dto.buyerEmail ?? null,
        buyerPhone: dto.buyerPhone ?? null,
        buyerNotes: notes,
        items,
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
        paymentMethod: dto.paymentMethod ?? 'store',
        status: 'pending', // server-controlled — payment confirmed via webhook
      },
    });
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

  async createReview(dto: CreatePublicReviewDto) {
    return this.prisma.storefrontReview.create({
      data: {
        tenantId: dto.tenantId,
        storeId: dto.storeId ?? null,
        reviewerName: dto.reviewerName,
        reviewerEmail: dto.reviewerEmail ?? null,
        rating: dto.rating,
        comment: dto.comment ?? null,
        productId: dto.productId ?? null,
        serviceId: dto.serviceId ?? null,
        isVerified: false, // server-controlled — never set by the public client
      },
    });
  }

  // ── Public endpoints (no auth) ───────────────────────────
  async getPublicConfig() {
    const CONFIG_ID = '00000000-0000-0000-0000-000000000001';
    const cfg = await this.prisma.platformConfig.findUnique({ where: { id: CONFIG_ID } });
    return {
      platformLogoUrl: (cfg as any)?.platformLogoUrl ?? null,
      storeBannerUrl:  cfg?.storeBannerUrl  ?? null,
    };
  }

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

  /** Config pública de comercio (envío/mínimo) para el checkout. */
  async getPublicCommerceConfig(tenantId: string) {
    const sf = await this.prisma.storefront.findFirst({
      where: { tenantId, isActive: true },
      select: {
        acceptsDelivery: true, deliveryFee: true, freeDeliveryThreshold: true,
        minOrderAmount: true, acceptsOrders: true,
      },
    });
    return sf ?? {
      acceptsDelivery: false, deliveryFee: 0, freeDeliveryThreshold: 0,
      minOrderAmount: 0, acceptsOrders: true,
    };
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
      select: {
        ...PUBLIC_PRODUCT_FIELDS,
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
      select: {
        ...PUBLIC_PRODUCT_FIELDS,
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
    return this.prisma.service.findMany({
      where, take: 30, orderBy: { name: 'asc' }, select: PUBLIC_SERVICE_FIELDS,
    });
  }

  async getPublicNailDesigns(query: any) {
    const where: any = { isStoreVisible: true };
    if (query.tenantId) where.tenantId = query.tenantId;
    return this.prisma.nailDesign.findMany({
      where,
      take: 30,
      orderBy: { createdAt: 'desc' },
      select: PUBLIC_NAIL_DESIGN_FIELDS,
    });
  }
}
