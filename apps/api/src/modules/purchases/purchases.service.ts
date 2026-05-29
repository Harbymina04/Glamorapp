import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';
import {
  CreatePurchaseDto,
  UpdatePurchaseDto,
  ReceivePurchaseDto,
} from './dto/purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

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

    // Validate all products exist
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId, storeId },
      select: { id: true },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('Uno o más productos no encontrados');
    }

    // Generate purchase number
    const count = await this.prisma.purchase.count({
      where: { tenantId, storeId },
    });
    const purchaseNumber = `OC-${String(count + 1).padStart(4, '0')}`;

    // Calculate total
    const total = dto.items.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0,
    );

    const purchase = await this.prisma.purchase.create({
      data: {
        tenantId,
        storeId,
        supplierId: dto.supplierId,
        purchaseNumber,
        total,
        status: 'pending',
        paymentStatus: 'pending',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
        createdBy: userId || null,
        items: {
          create: dto.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.quantity * i.unitPrice,
          })),
        },
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

    return purchase;
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

    // Process each item
    const now = new Date();
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
      await this.prisma.purchaseItem.update({
        where: { id: item.id },
        data: { receivedQuantity: { increment: qtyToReceive } },
      });

      // 2. Create inventory movement (ENTRY)
      const newStock = item.product.currentStock + qtyToReceive;
      await this.prisma.inventoryMovement.create({
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

      // 3. Update product stock + cost price (use latest purchase price)
 await this.prisma.product.update({
          where: { id: item.productId, tenantId, storeId },
          data: {
            currentStock:{ increment: qtyToReceive },
          costPrice: item.unitPrice, // Update cost to latest purchase price
        },
      });
    }

    // Determine new status
    const updatedItems = await this.prisma.purchaseItem.findMany({
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
    const updated = await this.prisma.purchase.update({
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
await this.prisma.supplier.update({
      where: { id: purchase.supplierId, tenantId, storeId },
        data: {
          totalPurchases: { increment: updated.total },
          purchaseCount: { increment: 1 },
          lastPurchaseAt: now,
        },
      });
    }

    return updated;
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

    return this.prisma.purchase.update({
      where: { id, tenantId, storeId },
      data: { status: 'cancelled', paymentStatus: 'cancelled' },
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
}
