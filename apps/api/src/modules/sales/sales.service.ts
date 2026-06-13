import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';
import { AccountingService } from '../accounting/accounting.service';
import { CommissionsService } from '../commissions/commissions.service';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);
  constructor(
    private prisma: PrismaService,
    private accounting: AccountingService,
    private commissions: CommissionsService,
  ) {}

  async findAll(tenantId: string, storeId: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 10);
    const where: any = {
      tenantId,
      storeId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        skip,
        take,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true } },
          user: { select: { id: true, firstName: true } },
          items: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return new PaginatedResponse(data, total, query.page || 1, query.limit || 10);
  }

  async findOne(tenantId: string, storeId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId, storeId },
      include: {
        customer: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { product: true, service: true } },
        payments: true,
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async create(tenantId: string, storeId: string, userId: string, dto: any) {
    if (dto.discountPercent && dto.discountAmount)
      throw new BadRequestException('Proporcionar discountPercent o discountAmount, no ambos');
    if (dto.discountPercent && (dto.discountPercent < 0 || dto.discountPercent > 100))
      throw new BadRequestException('discountPercent debe estar entre 0 y 100');

    // Pre-load product IVA config for all product items
    const productIds = dto.items.filter((i: any) => i.productId && !i.serviceId).map((i: any) => i.productId);
    const serviceIds = dto.items.filter((i: any) => i.serviceId).map((i: any) => i.serviceId);
    const productIvaMap = new Map<string, { ivaRate: number; isIvaExcluded: boolean }>();
    const serviceIvaMap = new Map<string, { ivaRate: number; isIvaExcluded: boolean }>();

    const [prods, svcs] = await Promise.all([
      productIds.length
        ? this.prisma.product.findMany({
            where: { id: { in: productIds }, tenantId, storeId },
            select: { id: true, ivaRate: true, isIvaExcluded: true },
          })
        : ([] as { id: string; ivaRate: any; isIvaExcluded: boolean }[]),
      serviceIds.length
        ? this.prisma.service.findMany({
            where: { id: { in: serviceIds }, tenantId, storeId },
            select: { id: true, ivaRate: true, isIvaExcluded: true } as any,
          })
        : ([] as { id: string; ivaRate: any; isIvaExcluded: boolean }[]),
    ]);

    prods.forEach(p => productIvaMap.set(p.id, {
      ivaRate: Number(p.ivaRate ?? 19),
      isIvaExcluded: p.isIvaExcluded ?? false,
    }));
    svcs.forEach(s => serviceIvaMap.set(s.id, {
      ivaRate: Number((s as any).ivaRate ?? 19),
      isIvaExcluded: (s as any).isIvaExcluded ?? false,
    }));

    // Tenant default IVA rate as final fallback (reads from TaxRate table)
    const tenantDefaultIva = await this.getDefaultIvaRate(tenantId);

    // Modo de impuestos de la tienda: taxInclusive=true (default) → los precios
    // YA incluyen IVA y se desagrega; false → el IVA se suma encima del precio.
    const storeCfg = await this.prisma.store.findFirst({
      where: { id: storeId, tenantId },
      select: { taxInclusive: true },
    });
    const taxInclusive = storeCfg?.taxInclusive ?? true;

    // Build enriched items with per-item IVA
    const enrichedItems = dto.items.map((item: any) => {
      const ivaConfig = item.productId
        ? productIvaMap.get(item.productId)
        : item.serviceId
          ? serviceIvaMap.get(item.serviceId)
          : null;
      const ivaRate = item.ivaRate ?? ivaConfig?.ivaRate ?? tenantDefaultIva;
      const isIvaExcluded = item.isIvaExcluded ?? ivaConfig?.isIvaExcluded ?? false;
      const lineNet = (Number(item.unitPrice) - Number(item.discountAmount || 0)) * item.quantity;
      const ivaAmount = isIvaExcluded
        ? 0
        : taxInclusive
          ? lineNet * (ivaRate / (100 + ivaRate)) // IVA contenido en el precio
          : lineNet * (ivaRate / 100);            // IVA sobre el precio
      return { ...item, ivaRate, ivaAmount };
    });

    // Suma de líneas neta de descuentos de campaña por ítem (discountAmount es
    // por unidad), igual que el frontend — si no, sale.total queda inflado y
    // complete() rechaza el cobro.
    const itemsNet = enrichedItems.reduce(
      (s: number, i: any) => s + (Number(i.unitPrice) - Number(i.discountAmount || 0)) * i.quantity,
      0,
    );
    const discountAmount = dto.discountPercent
      ? itemsNet * (dto.discountPercent / 100)
      : (Number(dto.discountAmount) || 0);
    const afterDiscount = itemsNet - discountAmount;
    // El IVA se calcula sobre la base DESPUÉS del descuento de cajero (ratio
    // proporcional por línea), igual que cart-store.getTax en el frontend.
    const discountRatio = itemsNet > 0 ? discountAmount / itemsNet : 0;
    const taxAmount = enrichedItems.reduce(
      (s: number, i: any) => s + i.ivaAmount * (1 - discountRatio),
      0,
    );
    // taxInclusive: subtotal = base imponible y el total NO suma el IVA (ya viene
    // dentro del precio). Modo legacy: subtotal = líneas netas e IVA encima.
    const subtotal = taxInclusive ? afterDiscount - taxAmount : itemsNet;
    const total = taxInclusive ? afterDiscount : afterDiscount + taxAmount;
    // taxPercent stored as weighted average for legacy compatibility
    const taxBase = total - taxAmount;
    const taxPercent = taxBase > 0 ? (taxAmount / taxBase) * 100 : 19;

    // Reintenta ante una colisión rara del número de venta bajo concurrencia
    // (el unique constraint lanza P2002 → regeneramos folio y reintentamos).
    for (let attempt = 0; attempt < 3; attempt++) {
      const saleNumber = await this.generateSaleNumber(tenantId, storeId);
      try {
        return await this.prisma.$transaction(async (tx) => {
      // Hold stock immediately to prevent overselling.
      // Decremento atómico condicional: evita oversell por TOCTOU bajo concurrencia.
      for (const item of enrichedItems) {
        if (item.productId && item.itemType !== 'service') {
          const dec = await tx.product.updateMany({
            where: { id: item.productId, tenantId, storeId, currentStock: { gte: item.quantity } },
            data: { currentStock: { decrement: item.quantity } },
          });
          if (dec.count === 0) {
            // O el producto no existe en esta tienda, o no hay stock suficiente
            const exists = await tx.product.findFirst({
              where: { id: item.productId, tenantId, storeId },
              select: { currentStock: true },
            });
            if (!exists) throw new NotFoundException(`Producto ${item.productId} no encontrado`);
            throw new BadRequestException(`Stock insuficiente para "${item.name}". Disponible: ${exists.currentStock}`);
          }
          const after = await tx.product.findUnique({
            where: { id: item.productId },
            select: { currentStock: true },
          });
          const newStock = after!.currentStock;
          await tx.inventoryMovement.create({
            data: {
              tenantId, storeId,
              productId: item.productId,
              movementType: 'exit',
              quantity: -item.quantity,
              previousStock: newStock + item.quantity,
              newStock,
              referenceType: 'sale',
              notes: `Venta ${saleNumber}`,
              createdBy: userId,
            },
          });
        }
      }

      return tx.sale.create({
        data: {
          tenantId, storeId, userId,
          customerId: dto.customerId,
          saleNumber, subtotal,
          discountPercent: dto.discountPercent || 0,
          discountAmount, taxPercent, taxAmount, total,
          notes: dto.notes,
          items: {
            create: enrichedItems.map((item: any) => ({
              productId:      item.productId,
              serviceId:      item.serviceId,
              itemType:       item.itemType || 'product',
              name:           item.name,
              quantity:       item.quantity,
              unitPrice:      item.unitPrice,
              discountAmount: item.discountAmount || 0,
              ivaRate:        item.ivaRate,
              ivaAmount:      item.ivaAmount,
              total:          (Number(item.unitPrice) - Number(item.discountAmount || 0)) * item.quantity + (taxInclusive ? 0 : item.ivaAmount),
              performedBy:    item.itemType === 'service' ? (item.performedBy || null) : null,
              commissionRate: item.commissionRate ?? 0,
              commissionAmount: 0,
            })),
          },
        },
        include: { items: true, customer: true },
      });
        });
      } catch (e: any) {
        if (e?.code === 'P2002' && attempt < 2) continue;
        throw e;
      }
    }
    throw new BadRequestException('No se pudo generar el número de venta, intenta de nuevo');
  }

  private async getDefaultIvaRate(tenantId: string): Promise<number> {
    const rate = await this.prisma.taxRate.findFirst({
      where: { tenantId, taxType: 'iva', isDefault: true, isActive: true },
      select: { rate: true },
    });
    return rate ? Number(rate.rate) : 19;
  }

  async complete(tenantId: string, storeId: string, id: string, payments: any[]) {
    const sale = await this.findOne(tenantId, storeId, id);
    if (sale.status !== 'pending') throw new BadRequestException('Sale is not pending');

    // Online sales (already paid) bypass the cash register requirement
    const isOnline = (sale as any).source === 'online';

    const activeSession = await this.prisma.cashRegisterSession.findFirst({
      where: { tenantId, storeId, status: 'open' },
      orderBy: { openedAt: 'desc' },
    });
    if (!activeSession && !isOnline) {
      throw new BadRequestException('Debe abrir la caja antes de realizar ventas');
    }

    // Validar que los pagos cubran el total (excepto ventas online ya pagadas).
    // Se permite sobrepago (vuelto en efectivo); se rechaza pago insuficiente.
    if (!isOnline) {
      const totalPaid = (payments ?? []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      if (Math.round(totalPaid * 100) < Math.round(Number(sale.total) * 100)) {
        throw new BadRequestException(
          `Los pagos ($${totalPaid.toFixed(2)}) no cubren el total de la venta ($${Number(sale.total).toFixed(2)})`,
        );
      }
    }

    const cashPayments = (payments ?? []).filter((p: any) => p.paymentMethod === 'cash');
    const totalCash = cashPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);

    // Todo atómico + idempotente: el cambio de estado se hace con updateMany
    // filtrando status='pending', así dos `complete` concurrentes no duplican
    // pagos/ingresos (el segundo encuentra count=0 y aborta).
    const completed = await this.prisma.$transaction(async (tx) => {
      const transition = await tx.sale.updateMany({
        where: { id, tenantId, storeId, status: 'pending' },
        data: { status: 'completed', completedAt: new Date() },
      });
      if (transition.count === 0) {
        throw new BadRequestException('La venta ya fue procesada o no está pendiente');
      }

      // Link stock-hold movements to this completed sale
      await tx.inventoryMovement.updateMany({
        where: { tenantId, storeId, referenceType: 'sale', referenceId: null, notes: { contains: sale.saleNumber } },
        data: { referenceId: id },
      });

      if (payments?.length) {
        await tx.payment.createMany({
          data: payments.map((p: any) => ({
            tenantId,
            saleId: id,
            paymentMethod: p.paymentMethod,
            amount: p.amount,
            reference: p.reference,
          })),
        });
      }

      // Auto-register cash payments in the active cash register session
      if (totalCash > 0 && activeSession) {
        await tx.cashMovement.create({
          data: {
            tenantId,
            storeId,
            sessionId: activeSession.id,
            type: 'in',
            amount: totalCash,
            reason: `Venta ${sale.saleNumber}`,
            description: `Pago en efectivo de venta ${sale.saleNumber}`,
            createdBy: sale.userId,
          },
        });
      }

      return tx.sale.findUnique({
        where: { id },
        include: { items: true, payments: true },
      });
    });

    // Update customer stats after completing sale
    if (sale.customerId) {
      await this.updateCustomerStats(tenantId, storeId, sale.customerId);
    }

    // Register accounting transaction — await but don't fail the sale if it errors
    try {
      await this.accounting.registerSaleTransaction(tenantId, storeId, id, sale.userId || '');
    } catch (err: any) {
      this.logger.warn(`Accounting auto-register failed for sale ${id}: ${err.message}`);
    }

    // Register commissions for service items with a performer
    try {
      await this.commissions.registerSaleCommissions(tenantId, storeId, id);
    } catch (err: any) {
      this.logger.warn(`Commissions auto-register failed for sale ${id}: ${err.message}`);
    }

    // If this sale came from a storefront order → mark the order as delivered
    const storefrontOrderId = (sale as any).storefrontOrderId;
    if (storefrontOrderId) {
      this.prisma.storefrontOrder.update({
        where: { id: storefrontOrderId },
        data: { status: 'delivered', saleId: id } as any,
      }).catch(err => this.logger.warn(`Could not mark storefront order as delivered: ${err.message}`));
    }

    return completed;
  }

  async cancel(tenantId: string, storeId: string, id: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('El motivo de cancelación es requerido');

    const sale = await this.findOne(tenantId, storeId, id);
    if (sale.status !== 'pending' && sale.status !== 'completed') {
      throw new BadRequestException('Solo se pueden cancelar ventas pendientes o completadas');
    }

    // Todo atómico + idempotente: la transición usa updateMany filtrando estado,
    // así dos `cancel` concurrentes no restauran el stock dos veces.
    const cancelled = await this.prisma.$transaction(async (tx) => {
      const transition = await tx.sale.updateMany({
        where: { id, tenantId, storeId, status: { in: ['pending', 'completed'] } },
        data: { status: 'cancelled', cancelledAt: new Date(), cancelledReason: reason },
      });
      if (transition.count === 0) {
        throw new BadRequestException('La venta ya fue procesada o no puede cancelarse');
      }

      // Restaurar solo la cantidad no devuelta (lo devuelto ya retornó su stock)
      for (const item of sale.items) {
        if (!item.productId) continue;
        const qty = item.quantity - (item.refundedQuantity ?? 0);
        if (qty <= 0) continue;
        const prod = await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: qty } },
          select: { currentStock: true },
        });
        await tx.inventoryMovement.create({
          data: {
            tenantId, storeId,
            productId: item.productId,
            movementType: 'entry',
            quantity: qty,
            previousStock: prod.currentStock - qty,
            newStock: prod.currentStock,
            referenceType: 'sale_cancel',
            referenceId: id,
            notes: `Cancelación ${sale.saleNumber}: ${reason}`,
          },
        });
      }

      // Si la venta estaba completada, revertir su huella financiera: anular el
      // asiento contable y las comisiones pendientes (las pagadas se conservan).
      // Las ventas pendientes nunca registraron contabilidad/comisiones.
      if (sale.status === 'completed') {
        await this.accounting.voidSaleTransaction(tx, tenantId, storeId, id);
        await this.commissions.voidSaleCommissions(tx, tenantId, storeId, id);
      }

      return tx.sale.findUnique({ where: { id } });
    });

    // Update customer stats if the cancelled sale was completed (revert stats)
    if (sale.customerId && sale.status === 'completed') {
      await this.updateCustomerStats(tenantId, storeId, sale.customerId);
    }

    return cancelled;
  }

  /**
   * Libera el stock retenido por ventas pendientes abandonadas.
   *
   * El stock se descuenta al CREAR la venta (hold para evitar sobreventa). Si
   * una venta pendiente nunca se completa ni cancela (carrito POS abandonado,
   * orden online sin pago, webhook perdido), ese stock queda bloqueado. Este
   * método cancela las ventas pendientes más viejas que `maxAgeHours` y devuelve
   * su stock al inventario. Se ejecuta periódicamente (ver SalesTasksService).
   */
  async expireStalePendingSales(maxAgeHours = 24): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeHours * 3_600_000);
    const stale = await this.prisma.sale.findMany({
      where: { status: 'pending', createdAt: { lt: cutoff } },
      include: { items: true },
    });

    for (const sale of stale) {
      await this.prisma.$transaction(async (tx) => {
        for (const item of sale.items) {
          if (!item.productId) continue;
          const current = await tx.product.findUnique({
            where: { id: item.productId },
            select: { currentStock: true },
          });
          if (!current) continue;
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          });
          await tx.inventoryMovement.create({
            data: {
              tenantId: sale.tenantId,
              storeId: sale.storeId,
              productId: item.productId,
              movementType: 'entry',
              quantity: item.quantity,
              previousStock: current.currentStock,
              newStock: current.currentStock + item.quantity,
              referenceType: 'sale_expired',
              referenceId: sale.id,
              notes: `Expiración automática venta ${sale.saleNumber} (stock liberado tras ${maxAgeHours}h pendiente)`,
            },
          });
        }
        await tx.sale.update({
          where: { id: sale.id },
          data: {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledReason: `Expiración automática: venta pendiente sin completar tras ${maxAgeHours}h`,
          },
        });
      });
      this.logger.log(`Venta pendiente expirada: ${sale.saleNumber} (stock liberado)`);
    }

    return stale.length;
  }

  async refund(tenantId: string, storeId: string, id: string, dto: { items: { saleItemId: string; quantity: number }[]; reason: string; refundMethod: string }, userId?: string) {
    if (!dto.reason?.trim()) throw new BadRequestException('El motivo de devolución es requerido');

    const sale = await this.findOne(tenantId, storeId, id);
    if (sale.status === 'refunded') {
      throw new BadRequestException('La venta ya fue devuelta en su totalidad');
    }
    if (sale.status !== 'completed') {
      throw new BadRequestException('Solo se pueden devolver ventas completadas');
    }

    // Validar cantidades contra lo aún devolvible (quantity - refundedQuantity)
    const refundedItems: { quantity: number; name: string }[] = [];
    const itemRefunds: { item: (typeof sale.items)[number]; qty: number }[] = [];

    for (const reqItem of dto.items) {
      const qty = Number(reqItem.quantity) || 0;
      if (qty <= 0) continue;
      const item = sale.items.find(i => i.id === reqItem.saleItemId);
      if (!item) throw new BadRequestException(`El ítem ${reqItem.saleItemId} no pertenece a esta venta`);
      const available = item.quantity - (item.refundedQuantity ?? 0);
      if (qty > available) {
        throw new BadRequestException(
          `No se puede devolver ${qty} de "${item.name}": disponible para devolución ${available}`,
        );
      }
      refundedItems.push({ quantity: qty, name: item.name });
      itemRefunds.push({ item, qty });
    }

    if (itemRefunds.length === 0) {
      throw new BadRequestException('Debe seleccionar al menos un ítem para devolver');
    }

    // Reembolso proporcional, AGNÓSTICO al modo de IVA. El neto por línea
    // (unitPrice - discountAmount campaña, por unidad) es la base común con la
    // que el create derivó subtotal/taxAmount/total; por eso el mismo ratio
    // aplica a total y taxAmount sin importar si el IVA va incluido o por encima.
    // (Antes se usaba unitPrice con-IVA sobre sale.subtotal sin-IVA → sobre-reembolso ~19%.)
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const lineNet = (it: (typeof sale.items)[number], q: number) =>
      (Number(it.unitPrice) - Number(it.discountAmount ?? 0)) * q;
    const itemsNetAll = sale.items.reduce((s, it) => s + lineNet(it, it.quantity), 0);
    const refundNet = itemRefunds.reduce((s, r) => s + lineNet(r.item, r.qty), 0);
    const ratio = itemsNetAll > 0 ? refundNet / itemsNetAll : 0;
    const refundTax = round2(Number(sale.taxAmount) * ratio);
    const refundTotal = round2(Number(sale.total) * ratio);

    // ¿Devolución total? (todos los ítems quedan completamente devueltos)
    const isFullRefund = sale.items.every((it) => {
      const add = itemRefunds.find(r => r.item.id === it.id)?.qty ?? 0;
      return (it.refundedQuantity ?? 0) + add >= it.quantity;
    });
    const newStatus = isFullRefund ? 'refunded' : 'completed';

    const refundNote = [
      `DEVOLUCIÓN ${isFullRefund ? 'TOTAL' : 'PARCIAL'} — ${dto.reason}`,
      `Ítems devueltos: ${refundedItems.map(i => `${i.name} x${i.quantity}`).join(', ')}`,
      `Monto reembolsado: $${refundTotal.toFixed(2)}`,
      `Método: ${dto.refundMethod}`,
    ].join(' | ');

    const existingNotes = sale.notes || '';

    // Todo atómico: tracking de devolución + stock + pago negativo + reversa
    // contable + ajuste de comisiones + estado.
    const refunded = await this.prisma.$transaction(async (tx) => {
      for (const { item, qty } of itemRefunds) {
        await tx.saleItem.update({
          where: { id: item.id },
          data: { refundedQuantity: { increment: qty } },
        });

        if (item.productId) {
          const prod = await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: qty } },
            select: { currentStock: true },
          });
          await tx.inventoryMovement.create({
            data: {
              tenantId, storeId,
              productId: item.productId,
              movementType: 'entry',
              quantity: qty,
              previousStock: prod.currentStock - qty,
              newStock: prod.currentStock,
              referenceType: 'refund',
              referenceId: id,
            },
          });
        }

        // #3 Revertir la comisión del servicio devuelto (proporcional a lo que queda).
        if (item.itemType === 'service' && item.performedBy) {
          const remainingQty = item.quantity - ((item.refundedQuantity ?? 0) + qty);
          await this.commissions.adjustCommissionForRefund(
            tx, tenantId, storeId, item.id, remainingQty, item.quantity,
          );
        }
      }

      await tx.payment.create({
        data: {
          tenantId,
          saleId: id,
          paymentMethod: dto.refundMethod as any,
          amount: -refundTotal,
          notes: `Devolución: ${dto.reason}`,
        },
      });

      // #2 Reversa contable: asiento de ingreso negativo por la porción devuelta.
      await this.accounting.registerRefundReversal(
        tx, tenantId, storeId, id, sale.saleNumber, refundTotal, refundTax, userId || '',
      );

      return tx.sale.update({
        where: { id, tenantId, storeId },
        data: {
          status: newStatus as any,
          refundedAt: isFullRefund ? new Date() : undefined,
          refundReason: dto.reason,
          notes: existingNotes ? `${existingNotes}\n${refundNote}` : refundNote,
        },
        include: { items: true, payments: true },
      });
    });

    // Update customer stats after refund
    if (sale.customerId) {
      await this.updateCustomerStats(tenantId, storeId, sale.customerId);
    }

    return refunded;
  }

  async getTodaySummary(tenantId: string, storeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [sales, totalSales, totalRevenue] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId, storeId, createdAt: { gte: today, lt: tomorrow }, status: 'completed' },
        select: { id: true, total: true, saleNumber: true },
      }),
      this.prisma.sale.count({
        where: { tenantId, storeId, createdAt: { gte: today, lt: tomorrow }, status: 'completed' },
      }),
      this.prisma.sale.aggregate({
        where: { tenantId, storeId, createdAt: { gte: today, lt: tomorrow }, status: 'completed' },
        _sum: { total: true },
      }),
    ]);

    return {
      totalSales,
      totalRevenue: totalRevenue._sum.total || 0,
      averageTicket: totalSales > 0 ? Number(totalRevenue._sum.total || 0) / totalSales : 0,
      recentSales: sales.slice(0, 5),
    };
  }

  private async generateSaleNumber(tenantId: string, storeId: string): Promise<string> {
    // Solo considera folios POS "V-" (las ventas online usan prefijo "ON-" y no
    // deben envenenar el correlativo). El orden lexicográfico funciona porque el
    // número va con padding a 6 dígitos.
    const last = await this.prisma.sale.findFirst({
      where: { tenantId, storeId, saleNumber: { startsWith: 'V-' } },
      orderBy: { saleNumber: 'desc' },
      select: { saleNumber: true },
    });

    const lastNum = last ? parseInt(last.saleNumber.slice(2), 10) : 0;
    const num = (Number.isFinite(lastNum) ? lastNum : 0) + 1;
    return `V-${String(num).padStart(6, '0')}`;
  }

  /**
   * Recalcula las estadísticas del cliente basándose en todas sus ventas completadas.
   * Se llama después de completar, cancelar o reembolsar una venta.
   */
  private async updateCustomerStats(tenantId: string, storeId: string, customerId: string) {
    // Agregate all completed sales for this customer (exclude cancelled/refunded)
    const stats = await this.prisma.sale.aggregate({
      where: {
        tenantId,
        storeId,
        customerId,
        status: 'completed',
      },
      _sum: { total: true },
      _count: true,
    });

    // Get the most recent completed sale date
    const lastSale = await this.prisma.sale.findFirst({
      where: {
        tenantId,
        storeId,
        customerId,
        status: 'completed',
      },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    });

    const totalSpent = stats._sum.total || 0;
    const totalPurchases = stats._count;
    const averageTicket = totalPurchases > 0
      ? Number(totalSpent) / totalPurchases
      : 0;

    await this.prisma.customer.update({
      where: { id: customerId, tenantId },
      data: {
        totalSpent,
        totalPurchases,
        averageTicket,
        lastPurchaseAt: lastSale?.completedAt || null,
      },
    });
  }
}
