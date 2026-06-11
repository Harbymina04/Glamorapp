import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';
import { CreateTransferDto } from './dto/transfer.dto';

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

  async createMovement(
    tenantId: string,
    storeId: string,
    dto: {
      productId: string;
      movementType: 'entry' | 'exit' | 'adjustment';
      quantity: number;
      referenceType?: string;
      referenceId?: string;
      notes?: string;
    },
    userId: string,
  ) {
    if (!dto.productId) throw new BadRequestException('productId es requerido');
    // 'transfer' no se permite aquí: las transferencias deben pasar por createTransfer
    // para mantener el registro StoreTransfer y mover ambas sucursales atómicamente.
    if (!['entry', 'exit', 'adjustment'].includes(dto.movementType))
      throw new BadRequestException('movementType inválido (use entry, exit o adjustment)');
    if (!dto.quantity || dto.quantity === 0) throw new BadRequestException('quantity debe ser distinto de 0');

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId, storeId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    // Cantidad con signo:
    //  - entry: siempre suma
    //  - exit: siempre resta
    //  - adjustment: delta con signo (positivo suma, negativo resta)
    const quantity =
      dto.movementType === 'entry'
        ? Math.abs(dto.quantity)
        : dto.movementType === 'exit'
          ? -Math.abs(dto.quantity)
          : dto.quantity;

    return this.prisma.$transaction(async (tx) => {
      // Actualización atómica condicional: previene stock negativo y lost-update
      // bajo concurrencia (no se hace read-then-write absoluto).
      if (quantity < 0) {
        const res = await tx.product.updateMany({
          where: { id: dto.productId, tenantId, storeId, currentStock: { gte: -quantity } },
          data: { currentStock: { increment: quantity } },
        });
        if (res.count === 0) {
          throw new BadRequestException('Stock insuficiente para realizar el movimiento');
        }
      } else {
        await tx.product.update({
          where: { id: dto.productId },
          data: { currentStock: { increment: quantity } },
        });
      }

      const updated = await tx.product.findUnique({
        where: { id: dto.productId },
        select: { currentStock: true },
      });
      const newStock = updated!.currentStock;

      return tx.inventoryMovement.create({
        data: {
          tenantId,
          storeId,
          productId: dto.productId,
          movementType: dto.movementType,
          quantity,
          previousStock: newStock - quantity,
          newStock,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          notes: dto.notes,
          createdBy: userId,
        },
      });
    });
  }

  async getAlerts(tenantId: string, storeId: string, limit = 100) {
    const take = Math.min(limit, 500);
    // Incluye agotados, stock bajo (<= minStock) y sobre-stock (> maxStock,
    // solo si maxStock > 0). La comparación campo-a-campo requiere SQL crudo.
    const rows = await this.prisma.$queryRaw<
      { id: string; name: string; sku: string | null; current_stock: number; min_stock: number; max_stock: number }[]
    >`
      SELECT id, name, sku, current_stock, min_stock, max_stock FROM "products"
      WHERE tenant_id = ${tenantId}::uuid AND store_id = ${storeId}::uuid
      AND deleted_at IS NULL
      AND (current_stock <= min_stock OR (max_stock > 0 AND current_stock > max_stock))
      ORDER BY current_stock ASC
      LIMIT ${take}
    `;
    return rows.map((r) => {
      const current = Number(r.current_stock);
      const max = Number(r.max_stock);
      const status =
        current <= 0 ? 'out_of_stock'
        : current <= Number(r.min_stock) ? 'low_stock'
        : 'over_stock';
      return {
        id: r.id,
        name: r.name,
        sku: r.sku,
        currentStock: current,
        minStock: Number(r.min_stock),
        maxStock: max,
        status,
      };
    });
  }

  async getSummary(tenantId: string, storeId: string) {
    const [totalProducts, totalStock, outOfStock, lowStockResult, overStockResult, valueResult] = await Promise.all([
      this.prisma.product.count({ where: { tenantId, storeId, deletedAt: null } }),
      this.prisma.product.aggregate({ where: { tenantId, storeId, deletedAt: null }, _sum: { currentStock: true } }),
      this.prisma.product.count({ where: { tenantId, storeId, deletedAt: null, currentStock: 0 } }),
      // Field-to-field comparison requires raw SQL (Prisma doesn't support it natively)
      this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count FROM "products"
        WHERE tenant_id = ${tenantId}::uuid AND store_id = ${storeId}::uuid
        AND deleted_at IS NULL AND current_stock > 0 AND current_stock <= min_stock
      `,
      // Over-stock: solo cuenta cuando hay un máximo definido (max_stock > 0)
      this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count FROM "products"
        WHERE tenant_id = ${tenantId}::uuid AND store_id = ${storeId}::uuid
        AND deleted_at IS NULL AND max_stock > 0 AND current_stock > max_stock
      `,
      // SUM(stock * cost) per product, not SUM(stock) * SUM(cost)
      this.prisma.$queryRaw<[{ value: string }]>`
        SELECT COALESCE(SUM(current_stock::numeric * cost_price), 0)::text AS value FROM "products"
        WHERE tenant_id = ${tenantId}::uuid AND store_id = ${storeId}::uuid AND deleted_at IS NULL
      `,
    ]);

    return {
      totalProducts,
      totalStock: totalStock._sum.currentStock || 0,
      lowStock: Number(lowStockResult[0]?.count ?? 0),
      outOfStock,
      overStock: Number(overStockResult[0]?.count ?? 0),
      estimatedValue: Number(valueResult[0]?.value ?? 0),
    };
  }

  // ── Transfers ────────────────────────────────────────────────────

  async getTenantStores(tenantId: string, currentStoreId: string) {
    return this.prisma.store.findMany({
      where: { tenantId, isActive: true, id: { not: currentStoreId } },
      select: { id: true, name: true, city: true },
      orderBy: { name: 'asc' },
    });
  }

  async getTransfers(tenantId: string, storeId: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 20);
    const where = {
      tenantId,
      OR: [{ fromStoreId: storeId }, { toStoreId: storeId }],
    };

    const [data, total] = await Promise.all([
      this.prisma.storeTransfer.findMany({
        where,
        skip,
        take,
        include: {
          fromStore:   { select: { id: true, name: true } },
          toStore:     { select: { id: true, name: true } },
          fromProduct: { select: { id: true, name: true, sku: true } },
          toProduct:   { select: { id: true, name: true, sku: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.storeTransfer.count({ where }),
    ]);

    return new PaginatedResponse(data, total, query.page || 1, query.limit || 20);
  }

  async createTransfer(tenantId: string, fromStoreId: string, dto: CreateTransferDto, userId: string) {
    // 1. Validate source product
    const sourceProduct = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId, storeId: fromStoreId, deletedAt: null },
    });
    if (!sourceProduct) throw new NotFoundException('Producto no encontrado en esta sucursal');
    if (sourceProduct.currentStock < dto.quantity) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${sourceProduct.currentStock}, solicitado: ${dto.quantity}`,
      );
    }

    // 2. Validate target store belongs to same tenant
    if (dto.targetStoreId === fromStoreId) {
      throw new BadRequestException('La sucursal destino debe ser diferente a la sucursal origen');
    }
    const targetStore = await this.prisma.store.findFirst({
      where: { id: dto.targetStoreId, tenantId },
      select: { id: true, name: true },
    });
    if (!targetStore) throw new NotFoundException('Sucursal destino no encontrada');

    // 3. Ejecutar todo atómicamente. La verificación de stock y el find-or-create
    //    del producto destino van DENTRO de la transacción para evitar TOCTOU
    //    (sobreventa por concurrencia) y duplicación de productos.
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.storeTransfer.count({ where: { tenantId } });
      const transferNumber = `TR-${String(count + 1).padStart(5, '0')}`;

      // Decremento atómico condicional: solo procede si aún hay stock suficiente
      const dec = await tx.product.updateMany({
        where: { id: sourceProduct.id, tenantId, storeId: fromStoreId, currentStock: { gte: dto.quantity } },
        data: { currentStock: { decrement: dto.quantity } },
      });
      if (dec.count === 0) {
        throw new BadRequestException('Stock insuficiente en origen (pudo cambiar durante la operación)');
      }
      const srcAfter = await tx.product.findUnique({
        where: { id: sourceProduct.id },
        select: { currentStock: true },
      });
      const srcNewStock = srcAfter!.currentStock;

      // Buscar producto destino: por SKU si existe, si no por nombre (evita
      // crear duplicados al transferir repetidamente un producto sin SKU).
      let targetProduct = await tx.product.findFirst({
        where: {
          tenantId,
          storeId: dto.targetStoreId,
          deletedAt: null,
          ...(sourceProduct.sku
            ? { sku: sourceProduct.sku }
            : { name: sourceProduct.name }),
        },
        orderBy: { createdAt: 'asc' },
      });

      if (!targetProduct) {
        targetProduct = await tx.product.create({
          data: {
            tenantId,
            storeId:       dto.targetStoreId,
            name:          sourceProduct.name,
            description:   sourceProduct.description,
            sku:           sourceProduct.sku,
            barcode:       sourceProduct.barcode,
            imageUrl:      sourceProduct.imageUrl,
            costPrice:     sourceProduct.costPrice,
            salePrice:     sourceProduct.salePrice,
            minStock:      sourceProduct.minStock,
            maxStock:      sourceProduct.maxStock,
            unitOfMeasure: sourceProduct.unitOfMeasure,
            currentStock:  0,
            status:        'active',
          },
        });
      }

      // Incrementar destino con costo promedio ponderado
      const prevQty  = targetProduct.currentStock;
      const prevCost = Number(targetProduct.costPrice);
      const srcCost  = Number(sourceProduct.costPrice);
      const newCost  = prevQty + dto.quantity > 0
        ? (prevQty * prevCost + dto.quantity * srcCost) / (prevQty + dto.quantity)
        : srcCost;

      await tx.product.update({
        where: { id: targetProduct.id },
        data: { currentStock: { increment: dto.quantity }, costPrice: newCost },
      });

      // StoreTransfer header record
      const transfer = await tx.storeTransfer.create({
        data: {
          tenantId,
          transferNumber,
          fromStoreId,
          toStoreId:     dto.targetStoreId,
          fromProductId: sourceProduct.id,
          toProductId:   targetProduct.id,
          quantity:      dto.quantity,
          notes:         dto.notes,
          createdBy:     userId,
        },
      });

      // InventoryMovement EXIT — source store
      await tx.inventoryMovement.create({
        data: {
          tenantId,
          storeId:       fromStoreId,
          productId:     sourceProduct.id,
          movementType:  'transfer',
          quantity:      -dto.quantity,
          previousStock: srcNewStock + dto.quantity,
          newStock:      srcNewStock,
          referenceType: 'transfer',
          referenceId:   transfer.id,
          notes:         `${transferNumber} → ${targetStore.name}`,
          createdBy:     userId,
        },
      });

      // InventoryMovement ENTRY — target store
      await tx.inventoryMovement.create({
        data: {
          tenantId,
          storeId:       dto.targetStoreId,
          productId:     targetProduct.id,
          movementType:  'transfer',
          quantity:      dto.quantity,
          previousStock: prevQty,
          newStock:      prevQty + dto.quantity,
          referenceType: 'transfer',
          referenceId:   transfer.id,
          notes:         `${transferNumber} ← recibido`,
          createdBy:     userId,
        },
      });

      return {
        ...transfer,
        fromStore:   { id: fromStoreId },
        toStore:     targetStore,
        fromProduct: { id: sourceProduct.id, name: sourceProduct.name, sku: sourceProduct.sku },
        toProduct:   { id: targetProduct.id, name: targetProduct.name, sku: targetProduct.sku },
      };
    });
  }
}
