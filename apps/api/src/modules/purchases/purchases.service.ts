import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';
import {
  CreatePurchaseDto,
  UpdatePurchaseDto,
  ReceivePurchaseDto,
  MarkPaidDto,
} from './dto/purchase.dto';
import { EmailService } from '../email/email.service';
import { generatePurchasePdf } from './purchase-pdf.util';

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  // ===================================================================
  // CRUD
  // ===================================================================

  async findAll(tenantId: string, storeId: string, query: any) {
    const { skip, take } = getPaginationParams(
      query.page || 1,
      query.limit || 20,
    );
    const where: any = {
      tenantId,
      storeId,
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentStatus
        ? { paymentStatus: query.paymentStatus }
        : {}),
      ...(query.search
        ? { purchaseNumber: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        skip,
        take,
        include: {
          supplier: {
            select: { id: true, businessName: true, supplierNumber: true },
          },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return new PaginatedResponse(
      data,
      total,
      query.page || 1,
      query.limit || 20,
    );
  }

  async findOne(tenantId: string, storeId: string, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, tenantId, storeId },
      include: {
        supplier: {
          select: { id: true, businessName: true, supplierNumber: true },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                currentStock: true,
                costPrice: true,
              },
            },
          },
        },
      },
    });
    if (!purchase) throw new NotFoundException('Compra no encontrada');
    return purchase;
  }

  /** Siguiente folio "OC-" por tienda, robusto ante prefijos ajenos. */
  private async nextPurchaseNumber(tenantId: string, storeId: string): Promise<string> {
    const last = await this.prisma.purchase.findFirst({
      where: { tenantId, storeId, purchaseNumber: { startsWith: 'OC-' } },
      orderBy: { purchaseNumber: 'desc' },
      select: { purchaseNumber: true },
    });
    const lastNum = last ? parseInt(last.purchaseNumber.slice(3), 10) : 0;
    const num = (Number.isFinite(lastNum) ? lastNum : 0) + 1;
    return `OC-${String(num).padStart(4, '0')}`;
  }

  async create(
    tenantId: string,
    storeId: string,
    dto: CreatePurchaseDto,
    userId?: string,
  ) {
    // Validate supplier
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, tenantId, storeId },
    });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Debe incluir al menos un producto');
    }

    // Validate all products exist and load their ivaRate
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId, storeId },
      select: { id: true, ivaRate: true, isIvaExcluded: true },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('Uno o más productos no encontrados');
    }
    const productIvaMap = new Map(products.map(p => [p.id, p]));

    // Build enriched items with per-item IVA
    const enrichedItems = dto.items.map((i) => {
      const prod = productIvaMap.get(i.productId);
      const ivaRate = i.ivaRate ?? Number(prod?.ivaRate ?? 19);
      const isIvaExcluded = i.isIvaExcluded ?? prod?.isIvaExcluded ?? false;
      const lineSubtotal = i.quantity * i.unitPrice;
      const ivaAmount = isIvaExcluded ? 0 : lineSubtotal * (ivaRate / 100);
      return { ...i, ivaRate, ivaAmount, lineSubtotal };
    });

    const subtotal  = enrichedItems.reduce((s, i) => s + i.lineSubtotal, 0);
    const ivaAmount = enrichedItems.reduce((s, i) => s + i.ivaAmount, 0);
    // Weighted average IVA % for header-level reporting
    const ivaPercent = subtotal > 0 ? (ivaAmount / subtotal) * 100 : 0;
    const total = subtotal + ivaAmount;

    // Reintenta ante colisión rara del folio bajo concurrencia (@@unique → P2002)
    let purchase: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      const purchaseNumber = await this.nextPurchaseNumber(tenantId, storeId);
      try {
        purchase = await this.prisma.purchase.create({
      data: {
        tenantId,
        storeId,
        supplierId: dto.supplierId,
        purchaseNumber,
        subtotal,
        ivaPercent,
        ivaAmount,
        total,
        status: 'pending',
        paymentStatus: 'pending',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
        createdBy: userId || null,
        items: {
          create: enrichedItems.map((i) => ({
            productId:  i.productId,
            quantity:   i.quantity,
            unitPrice:  i.unitPrice,
            ivaRate:    i.ivaRate,
            ivaAmount:  i.ivaAmount,
            total:      i.lineSubtotal + i.ivaAmount,
          })),
        },
      },
      include: {
        supplier: {
          select: {
            id: true, businessName: true, supplierNumber: true,
            email: true, phone: true, address: true, contactName: true,
            contacts: {
              where: { isPrimary: true },
              select: { email: true, name: true },
              take: 1,
            },
          },
        },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        store: { select: { name: true, email: true, phone: true, address: true, primaryColor: true, slogan: true } },
      },
        });
        break;
      } catch (e: any) {
        if (e?.code === 'P2002' && attempt < 2) continue;
        throw e;
      }
    }

    // Fire-and-forget: send email to supplier + admin CC
    this.sendPurchaseOrderEmail(purchase, tenantId, storeId, userId).catch(err =>
      this.logger.error(`Purchase email failed for ${purchase.purchaseNumber}: ${err.message}`),
    );

    return purchase;
  }

  private async sendPurchaseOrderEmail(
    purchase: any,
    tenantId: string,
    storeId: string,
    userId?: string,
  ): Promise<void> {
    // Resolve supplier email (primary contact first, then main email)
    const supplierEmail: string | null =
      purchase.supplier?.contacts?.[0]?.email ?? purchase.supplier?.email ?? null;

    // Resolve admin email (store_admin or tenant_admin)
    const admin = await this.prisma.user.findFirst({
      where: {
        tenantId,
        storeId,
        role: { in: ['store_admin', 'tenant_admin'] },
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
      select: { email: true },
    });

    if (!supplierEmail && !admin?.email) return; // nothing to send to

    // Fetch fiscal config for NIT
    const fiscal = await this.prisma.fiscalConfig.findFirst({
      where: { tenantId },
      select: { idNumber: true, dv: true, idType: true, businessName: true },
    });

    const pdfBuffer = await generatePurchasePdf({
      purchaseNumber: purchase.purchaseNumber,
      createdAt: purchase.createdAt,
      dueDate: purchase.dueDate,
      notes: purchase.notes,
      ivaPercent: Number(purchase.ivaPercent),
      ivaAmount: Number(purchase.ivaAmount),
      subtotal: Number(purchase.subtotal),
      total: Number(purchase.total),
      supplier: {
        businessName: purchase.supplier.businessName,
        supplierNumber: purchase.supplier.supplierNumber,
        email: purchase.supplier.email,
        phone: purchase.supplier.phone,
        address: purchase.supplier.address,
        contactName: purchase.supplier.contactName ?? null,
      },
      store: {
        name: purchase.store?.name ?? 'Mi Tienda',
        primaryColor: purchase.store?.primaryColor ?? null,
        slogan: purchase.store?.slogan ?? null,
        email: purchase.store?.email ?? null,
        phone: purchase.store?.phone ?? null,
        address: purchase.store?.address ?? null,
        nit: fiscal ? `${fiscal.idNumber}${fiscal.dv ? `-${fiscal.dv}` : ''}` : null,
      },
      items: purchase.items.map((i: any) => ({
        product: { name: i.product.name, sku: i.product.sku },
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        total: Number(i.total),
      })),
    });

    const cc: string[] = [];
    if (admin?.email) cc.push(admin.email);

    // Primary recipient: supplier. If no supplier email, send only to admin.
    const to = supplierEmail ?? admin!.email;
    const finalCc = supplierEmail && admin?.email ? [admin.email] : [];

    await this.email.sendPurchaseOrder({
      to,
      cc: finalCc.length ? finalCc : undefined,
      purchaseNumber: purchase.purchaseNumber,
      supplierName: purchase.supplier.businessName,
      storeName: purchase.store?.name ?? 'Mi Tienda',
      storeColor: purchase.store?.primaryColor ?? undefined,
      total: Number(purchase.total),
      itemCount: purchase.items.length,
      pdfBuffer,
    });
  }

  async update(
    tenantId: string,
    storeId: string,
    id: string,
    dto: UpdatePurchaseDto,
  ) {
    const purchase = await this.findOne(tenantId, storeId, id);

    if (purchase.status !== 'pending') {
      throw new BadRequestException(
        'Solo se pueden editar compras pendientes',
      );
    }

    return this.prisma.purchase.update({
      where: { id, tenantId, storeId },
      data: {
        notes: dto.notes ?? purchase.notes,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : purchase.dueDate,
      },
      include: {
        supplier: {
          select: { id: true, businessName: true, supplierNumber: true },
        },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });
  }

  // ===================================================================
  // Receiving — THE KEY INTEGRATION POINT
  // ===================================================================

  async receive(
    tenantId: string,
    storeId: string,
    id: string,
    dto: ReceivePurchaseDto,
    userId?: string,
  ) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, tenantId, storeId },
      include: {
        items: {
          include: {
            product: { select: { id: true, currentStock: true, costPrice: true } },
          },
        },
        supplier: { select: { id: true } },
      },
    });

    if (!purchase) throw new NotFoundException('Compra no encontrada');
    if (purchase.status === 'cancelled') {
      throw new BadRequestException('No se puede recibir una compra cancelada');
    }

    // Build a map of itemId → received quantity
    const receivedMap = new Map<string, number>();
    for (const r of dto.items) {
      receivedMap.set(r.itemId, r.quantityReceived);
    }

    // Process everything atomically: si algo falla, no queda estado parcial
    // (recibido sin movimiento, o stock sin actualizar la cantidad recibida).
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        const qtyToReceive = receivedMap.get(item.id) ?? 0;
        if (qtyToReceive <= 0) continue;

        const maxReceivable = item.quantity - item.receivedQuantity;
        if (qtyToReceive > maxReceivable) {
          throw new BadRequestException(
            `Cantidad a recibir (${qtyToReceive}) excede lo pendiente (${maxReceivable}) para ${item.productId}`,
          );
        }

        // 1. Update received quantity on purchase item
        await tx.purchaseItem.update({
          where: { id: item.id },
          data: { receivedQuantity: { increment: qtyToReceive } },
        });

        // 2. Create inventory movement (ENTRY)
        const newStock = item.product.currentStock + qtyToReceive;
        await tx.inventoryMovement.create({
          data: {
            tenantId,
            storeId,
            productId: item.productId,
            movementType: 'entry',
            quantity: qtyToReceive,
            previousStock: item.product.currentStock,
            newStock,
            referenceType: 'purchase',
            referenceId: purchase.id,
            notes: `Recepción OC ${purchase.purchaseNumber}`,
            createdBy: userId || null,
          },
        });

        // 3. Update product stock + cost price (weighted average)
        const prevQty = item.product.currentStock;
        const prevCost = Number(item.product.costPrice);
        const newAvgCost =
          prevQty + qtyToReceive > 0
            ? (prevQty * prevCost + qtyToReceive * Number(item.unitPrice)) /
              (prevQty + qtyToReceive)
            : Number(item.unitPrice);

        await tx.product.update({
          where: { id: item.productId, tenantId, storeId },
          data: {
            currentStock: { increment: qtyToReceive },
            costPrice: newAvgCost,
          },
        });
      }

      // Determine new status
      const updatedItems = await tx.purchaseItem.findMany({
        where: { purchaseId: id },
      });
      const allFullyReceived = updatedItems.every(
        (i) => i.receivedQuantity >= i.quantity,
      );
      const anyReceived = updatedItems.some((i) => i.receivedQuantity > 0);

      const newStatus = allFullyReceived
        ? 'received'
        : anyReceived
          ? 'partial'
          : purchase.status;

      // Update purchase
      const updated = await tx.purchase.update({
        where: { id, tenantId, storeId },
        data: {
          status: newStatus,
          ...(allFullyReceived ? { receivedAt: now } : {}),
          ...(anyReceived && purchase.paymentStatus === 'pending'
            ? { paymentStatus: 'pending' }
            : {}),
        },
        include: {
          supplier: {
            select: { id: true, businessName: true, supplierNumber: true },
          },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      });

      // 4. Update supplier stats
      if (anyReceived) {
        await tx.supplier.update({
          where: { id: purchase.supplierId, tenantId, storeId },
          data: {
            totalPurchases: { increment: updated.total },
            purchaseCount: { increment: 1 },
            lastPurchaseAt: now,
          },
        });
      }

      return updated;
    });
  }

  // ===================================================================
  // Mark as Paid
  // ===================================================================

  async markAsPaid(
    tenantId: string,
    storeId: string,
    id: string,
    dto: MarkPaidDto,
    userId?: string,
  ) {
    const purchase = await this.findOne(tenantId, storeId, id);

    if (purchase.paymentStatus === 'paid') {
      throw new BadRequestException('La compra ya está marcada como pagada');
    }
    if (purchase.paymentStatus === 'cancelled') {
      throw new BadRequestException('No se puede marcar como pagada una compra cancelada');
    }

    // Todo atómico + idempotente: la transición usa updateMany filtrando
    // paymentStatus='pending', así dos llamadas concurrentes no crean doble asiento.
    return this.prisma.$transaction(async (tx) => {
      const transition = await tx.purchase.updateMany({
        where: { id, tenantId, storeId, paymentStatus: 'pending' },
        data: {
          paymentStatus: 'paid',
          ...(dto.notes ? { notes: dto.notes } : {}),
        },
      });
      if (transition.count === 0) {
        throw new BadRequestException('La compra ya fue procesada o no puede marcarse como pagada');
      }

      // Asiento contable (la transición ganada garantiza una sola creación)
      const existing = await tx.accountingTransaction.findFirst({ where: { purchaseId: id } });
      if (!existing) {
        await tx.accountingTransaction.create({
          data: {
            tenantId,
            storeId,
            transactionType: 'expense',
            category: 'inventory_purchase',
            description: `Compra ${purchase.purchaseNumber} - ${(purchase as any).supplier?.businessName ?? ''}`,
            purchaseId: id,
            grossAmount: Number((purchase as any).subtotal || purchase.total),
            taxAmount: Number((purchase as any).ivaAmount || 0),
            retentionAmount: 0,
            netAmount: Number(purchase.total),
            ivaAmount: Number((purchase as any).ivaAmount || 0),
            retefuenteAmount: 0,
            reteIvaAmount: 0,
            reteIcaAmount: 0,
            icaAmount: 0,
            paymentMethod: dto.paymentMethod ?? null,
            transactionDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
            createdBy: userId ?? null,
          },
        });
      }

      return tx.purchase.findFirst({
        where: { id, tenantId, storeId },
        include: {
          supplier: { select: { id: true, businessName: true, supplierNumber: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
      });
    });
  }

  // ===================================================================
  // Cancel
  // ===================================================================

  async cancel(tenantId: string, storeId: string, id: string) {
    const purchase = await this.findOne(tenantId, storeId, id);

    if (purchase.status === 'cancelled') {
      throw new BadRequestException('La compra ya está cancelada');
    }
    if (purchase.status === 'received') {
      throw new BadRequestException(
        'No se puede cancelar una compra ya recibida',
      );
    }

    // Todo atómico: revertir el stock parcialmente recibido + anular asiento + cancelar
    return this.prisma.$transaction(async (tx) => {
      // Guard de transición (evita doble cancelación concurrente)
      const transition = await tx.purchase.updateMany({
        where: { id, tenantId, storeId, status: { in: ['pending', 'partial'] } },
        data: { status: 'cancelled', paymentStatus: 'cancelled' },
      });
      if (transition.count === 0) {
        throw new BadRequestException('La compra ya fue procesada o no puede cancelarse');
      }

      // Revertir el stock de los ítems parcialmente recibidos (devolución al proveedor)
      for (const item of purchase.items as any[]) {
        const received = item.receivedQuantity ?? 0;
        if (received <= 0) continue;
        const updatedProd = await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: received } },
          select: { currentStock: true },
        });
        const newStock = updatedProd.currentStock;
        if (newStock < 0) {
          this.logger.warn(`Cancelación OC ${purchase.purchaseNumber}: stock de ${item.productId} quedó en ${newStock}`);
        }
        await tx.inventoryMovement.create({
          data: {
            tenantId, storeId,
            productId: item.productId,
            movementType: 'exit',
            quantity: -received,
            previousStock: newStock + received,
            newStock,
            referenceType: 'purchase_cancel',
            referenceId: id,
            notes: `Cancelación OC ${purchase.purchaseNumber} (stock recibido revertido)`,
          },
        });
      }

      // Anular el asiento contable si la compra había sido pagada
      await tx.accountingTransaction.updateMany({
        where: { purchaseId: id, tenantId, storeId, status: { not: 'voided' } },
        data: { status: 'voided' },
      });

      return tx.purchase.findFirst({
        where: { id, tenantId, storeId },
        include: {
          supplier: { select: { id: true, businessName: true, supplierNumber: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
      });
    });
  }
}
