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
    const saleNumber = await this.generateSaleNumber(tenantId, storeId);

    const subtotal = dto.items.reduce((sum: number, item: any) => sum + item.unitPrice * item.quantity, 0);
    const discountAmount = dto.discountPercent ? subtotal * (dto.discountPercent / 100) : (dto.discountAmount || 0);
    const afterDiscount = subtotal - discountAmount;
    const taxPercent = dto.taxPercent || 16;
    const taxAmount = afterDiscount * (taxPercent / 100);
    const total = afterDiscount + taxAmount;

    return this.prisma.sale.create({
      data: {
        tenantId,
        storeId,
        userId,
        customerId: dto.customerId,
        saleNumber,
        subtotal,
        discountPercent: dto.discountPercent || 0,
        discountAmount,
        taxPercent,
        taxAmount,
        total,
        notes: dto.notes,
        items: {
          create: dto.items.map((item: any) => ({
            productId:    item.productId,
            serviceId:    item.serviceId,
            itemType:     item.itemType || 'product',
            name:         item.name,
            quantity:     item.quantity,
            unitPrice:    item.unitPrice,
            discountAmount: item.discountAmount || 0,
            total:        item.unitPrice * item.quantity - (item.discountAmount || 0),
            // Commission fields — only for services
            performedBy:      item.itemType === 'service' ? (item.performedBy || null) : null,
            commissionRate:   item.commissionRate ?? 0,
            commissionAmount: 0, // calculated when sale completes
          })),
        },
      },
      include: { items: true, customer: true },
    });
  }

  async complete(tenantId: string, storeId: string, id: string, payments: any[]) {
    const sale = await this.findOne(tenantId, storeId, id);
    if (sale.status !== 'pending') throw new BadRequestException('Sale is not pending');

    // Require open cash register session to complete a sale
    const activeSession = await this.prisma.cashRegisterSession.findFirst({
      where: { tenantId, storeId, status: 'open' },
      orderBy: { openedAt: 'desc' },
    });
    if (!activeSession) {
      throw new BadRequestException('Debe abrir la caja antes de realizar ventas');
    }

    // Deduct stock for each product item
    for (const item of sale.items) {
      if (item.productId) {
        await this.prisma.product.update({
          where: { id: item.productId, tenantId, storeId },
          data: { currentStock: { decrement: item.quantity } },
        });
        await this.prisma.inventoryMovement.create({
          data: {
            tenantId,
            storeId,
            productId: item.productId,
            movementType: 'exit',
            quantity: -item.quantity,
            previousStock: 0, // simplified
            newStock: 0,
            referenceType: 'sale',
            referenceId: id,
          },
        });
      }
    }

    // Create payments
    if (payments?.length) {
      await this.prisma.payment.createMany({
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
    const cashPayments = payments?.filter((p: any) => p.paymentMethod === 'cash') || [];
    if (cashPayments.length > 0) {
      const totalCash = cashPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);
      await this.prisma.cashMovement.create({
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

    const completed = await this.prisma.sale.update({
      where: { id, tenantId, storeId },
      data: { status: 'completed', completedAt: new Date() },
      include: { items: true, payments: true },
    });

    // Update customer stats after completing sale
    if (sale.customerId) {
      await this.updateCustomerStats(tenantId, storeId, sale.customerId);
    }

    // Auto-register income transaction in accounting (fire-and-forget)
    this.accounting.registerSaleTransaction(tenantId, storeId, id, sale.userId || '')
      .catch(err => this.logger.warn(`Accounting auto-register failed for sale ${id}: ${err.message}`));

    // Auto-register commissions for service items with a performer (fire-and-forget)
    this.commissions.registerSaleCommissions(tenantId, storeId, id)
      .catch(err => this.logger.warn(`Commissions auto-register failed for sale ${id}: ${err.message}`));

    return completed;
  }

  async cancel(tenantId: string, storeId: string, id: string, reason: string) {
    const sale = await this.findOne(tenantId, storeId, id);
    if (sale.status === 'completed') {
      // Return stock
      for (const item of sale.items) {
        if (item.productId) {
          await this.prisma.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          });
        }
      }
    }

    const cancelled = await this.prisma.sale.update({
      where: { id, tenantId, storeId },
      data: { status: 'cancelled', cancelledAt: new Date(), cancelledReason: reason },
    });

    // Update customer stats if the cancelled sale was completed (revert stats)
    if (sale.customerId && sale.status === 'completed') {
      await this.updateCustomerStats(tenantId, storeId, sale.customerId);
    }

    return cancelled;
  }

  async refund(tenantId: string, storeId: string, id: string, dto: { items: { saleItemId: string; quantity: number }[]; reason: string; refundMethod: string }) {
    const sale = await this.findOne(tenantId, storeId, id);
    if (sale.status !== 'completed' && sale.status !== 'refunded') {
      throw new BadRequestException('Solo se pueden devolver ventas completadas');
    }

    // Calculate refund amount
    let refundSubtotal = 0;
    const refundedItems: { saleItemId: string; quantity: number; unitPrice: number; name: string }[] = [];
    const remainingItems: typeof sale.items = [];

    for (const item of sale.items) {
      const refundQty = dto.items.find(i => i.saleItemId === item.id)?.quantity || 0;
      if (refundQty > 0 && refundQty <= item.quantity) {
        refundedItems.push({ saleItemId: item.id, quantity: refundQty, unitPrice: Number(item.unitPrice), name: item.name });
        refundSubtotal += Number(item.unitPrice) * refundQty;

        // Return stock
        if (item.productId) {
          await this.prisma.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: refundQty } },
          });
          await this.prisma.inventoryMovement.create({
            data: {
              tenantId, storeId,
              productId: item.productId,
              movementType: 'entry',
              quantity: refundQty,
              previousStock: 0,
              newStock: 0,
              referenceType: 'refund',
              referenceId: id,
            },
          });
        }
      }
      if (refundQty < item.quantity) {
        remainingItems.push(item);
      }
    }

    if (refundedItems.length === 0) {
      throw new BadRequestException('Debe seleccionar al menos un ítem para devolver');
    }

    // Calculate proportional discount and tax for the refunded portion
    const saleSubtotal = Number(sale.subtotal);
    const ratio = saleSubtotal > 0 ? refundSubtotal / saleSubtotal : 0;
    const refundDiscount = Number(sale.discountAmount) * ratio;
    const refundTax = Number(sale.taxAmount) * ratio;
    const refundTotal = refundSubtotal - refundDiscount + refundTax;

    // Create refund payment (negative amount)
    await this.prisma.payment.create({
      data: {
        tenantId,
        saleId: id,
        paymentMethod: dto.refundMethod as any,
        amount: -refundTotal,
        notes: `Devolución: ${dto.reason}`,
      },
    });

    // Determine new status
    const isFullRefund = remainingItems.length === 0;
    const newStatus = isFullRefund ? 'refunded' : 'completed';

    const refundNote = [
      `DEVOLUCIÓN ${isFullRefund ? 'TOTAL' : 'PARCIAL'} — ${dto.reason}`,
      `Ítems devueltos: ${refundedItems.map(i => `${i.name} x${i.quantity}`).join(', ')}`,
      `Monto reembolsado: $${refundTotal.toFixed(2)}`,
      `Método: ${dto.refundMethod}`,
    ].join(' | ');

    const existingNotes = sale.notes || '';

    const refunded = await this.prisma.sale.update({
      where: { id, tenantId, storeId },
      data: {
        status: newStatus as any,
        refundedAt: isFullRefund ? new Date() : undefined,
        refundReason: dto.reason,
        notes: existingNotes ? `${existingNotes}\n${refundNote}` : refundNote,
      },
      include: { items: true, payments: true },
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
    const last = await this.prisma.sale.findFirst({
      where: { tenantId, storeId },
      orderBy: { createdAt: 'desc' },
      select: { saleNumber: true },
    });

    const num = last ? parseInt(last.saleNumber.replace('V-', '')) + 1 : 1;
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
