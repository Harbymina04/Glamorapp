import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/response.dto';

@Injectable()
export class CashRegisterService {
  constructor(private prisma: PrismaService) {}

  // ===================================================================
  // Cash Registers (CRUD)
  // ===================================================================

  async getRegisters(tenantId: string, storeId: string) {
    return this.prisma.cashRegister.findMany({
      where: { tenantId, storeId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createRegister(tenantId: string, storeId: string, dto: { name: string; description?: string }) {
    return this.prisma.cashRegister.create({
      data: { tenantId, storeId, name: dto.name, description: dto.description },
    });
  }

  async updateRegister(tenantId: string, storeId: string, id: string, dto: { name?: string; description?: string; isActive?: boolean }) {
    const register = await this.prisma.cashRegister.findFirst({ where: { id, tenantId, storeId } });
    if (!register) throw new NotFoundException('Caja no encontrada');
    return this.prisma.cashRegister.update({ where: { id }, data: dto });
  }

  async removeRegister(tenantId: string, storeId: string, id: string) {
    const register = await this.prisma.cashRegister.findFirst({ where: { id, tenantId, storeId } });
    if (!register) throw new NotFoundException('Caja no encontrada');
    return this.prisma.cashRegister.update({ where: { id }, data: { isActive: false } });
  }

  // =================================================================
  // Sessions
  // ===================================================================

  async getActiveSession(tenantId: string, storeId: string) {
    const session = await this.prisma.cashRegisterSession.findFirst({
      where: { tenantId, storeId, status: 'open' },
      include: {
        openedByUser: { select: { id: true, firstName: true, lastName: true } },
        register: { select: { id: true, name: true } },
        movements: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
      orderBy: { openedAt: 'desc' },
    });
    return session;
  }

  async getAllSessions(tenantId: string, storeId: string, query: any) {
    const limit = Math.min(query.limit || 20, 100);
    const sessions = await this.prisma.cashRegisterSession.findMany({
      where: { tenantId, storeId },
      orderBy: { openedAt: 'desc' },
      take: limit,
      include: {
        openedByUser: { select: { id: true, firstName: true, lastName: true } },
        closedByUser: { select: { id: true, firstName: true, lastName: true } },
        movements: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
    return sessions;
  }

  async openSession(
    tenantId: string,
    storeId: string,
    userId: string,
    dto: { openingBalance: number; notes?: string; registerId?: string },
  ) {
    // Check no active session
    const active = await this.getActiveSession(tenantId, storeId);
    if (active) {
      throw new BadRequestException(
        `Ya hay una caja abierta desde ${active.openedAt.toLocaleString('es-MX')}`,
      );
    }

    const session = await this.prisma.cashRegisterSession.create({
      data: {
        tenantId,
        storeId,
        openedBy: userId,
        registerId: dto.registerId || undefined,
        openingBalance: dto.openingBalance,
        notes: dto.notes,
        status: 'open',
      },
    });

    // Register opening balance as initial cash-in movement
    if (dto.openingBalance > 0) {
      await this.prisma.cashMovement.create({
        data: {
          tenantId,
          storeId,
          sessionId: session.id,
          type: 'in',
          amount: dto.openingBalance,
          reason: 'Apertura de caja',
          description: 'Saldo inicial',
          createdBy: userId,
        },
      });
    }

    return this.prisma.cashRegisterSession.findUnique({
      where: { id: session.id },
      include: {
        openedByUser: { select: { id: true, firstName: true, lastName: true } },
        register: { select: { id: true, name: true } },
        movements: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
  }

  async closeSession(
    tenantId: string,
    storeId: string,
    userId: string,
    dto: { closingBalance: number; notes?: string },
  ) {
    const session = await this.getActiveSession(tenantId, storeId);
    if (!session) {
      throw new NotFoundException('No hay caja abierta para cerrar');
    }

    // Calculate expected balance including cash sales
    const movements = await this.prisma.cashMovement.findMany({
      where: { sessionId: session.id },
    });
    // Exclude sale-related movements (they're counted separately via cashSalesAmount)
    const nonSaleMovements = movements.filter(
      (m) => !m.reason?.startsWith('Venta '),
    );
    const ins = nonSaleMovements
      .filter((m) => m.type === 'in')
      .reduce((s, m) => s + Number(m.amount), 0);
    const outs = nonSaleMovements
      .filter((m) => m.type === 'out')
      .reduce((s, m) => s + Number(m.amount), 0);

    // Include cash sales completed during this session
    const cashSales = await this.prisma.payment.aggregate({
      where: {
        sale: {
          tenantId,
          storeId,
          status: 'completed',
          createdAt: { gte: session.openedAt },
        },
        paymentMethod: 'cash',
      },
      _sum: { amount: true },
    });
    const cashSalesAmount = Number(cashSales._sum?.amount || 0);

    const expectedBalance = ins - outs + cashSalesAmount;
    const difference = dto.closingBalance - expectedBalance;

    return this.prisma.cashRegisterSession.update({
      where: { id: session.id },
      data: {
        status: 'closed',
        closedBy: userId,
        closingBalance: dto.closingBalance,
        expectedBalance,
        difference,
        notes: dto.notes || session.notes,
        closedAt: new Date(),
      },
      include: { movements: { orderBy: { createdAt: 'desc' } } },
    });
  }

  // ===================================================================
  // Cash Movements
  // ===================================================================

  async addMovement(
    tenantId: string,
    storeId: string,
    userId: string,
    dto: { type: 'in' | 'out'; amount: number; reason: string; description?: string },
  ) {
    const session = await this.getActiveSession(tenantId, storeId);
    if (!session) {
      throw new BadRequestException('No hay caja abierta. Abre la caja primero.');
    }

    return this.prisma.cashMovement.create({
      data: {
        tenantId,
        storeId,
        sessionId: session.id,
        type: dto.type,
        amount: dto.amount,
        reason: dto.reason,
        description: dto.description,
        createdBy: userId,
      },
    });
  }

  async getSessionMovements(
    tenantId: string,
    storeId: string,
    sessionId: string,
  ) {
    return this.prisma.cashMovement.findMany({
      where: { tenantId, storeId, sessionId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ===================================================================
  // Reconciliation (Cuadre)
  // ===================================================================

  async getReconciliation(tenantId: string, storeId: string) {
    const session = await this.getActiveSession(tenantId, storeId);
    if (!session) return null;

    const movements = await this.prisma.cashMovement.findMany({
      where: { sessionId: session.id },
    });

    // Filter out sale-related movements (they're counted in cashSales below)
    const nonSaleMovements = movements.filter(
      (m) => !m.reason?.startsWith('Venta '),
    );
    const ins = nonSaleMovements
      .filter((m) => m.type === 'in')
      .reduce((s, m) => s + Number(m.amount), 0);
    const outs = nonSaleMovements
      .filter((m) => m.type === 'out')
      .reduce((s, m) => s + Number(m.amount), 0);

    // Get sales from this session timeframe
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        storeId,
        status: 'completed',
        createdAt: { gte: session.openedAt },
      },
      include: { payments: true },
    });

    const cashSales = sales
      .flatMap((s) => s.payments)
      .filter((p) => p.paymentMethod === 'cash')
      .reduce((s, p) => s + Number(p.amount), 0);

    const cardSales = sales
      .flatMap((s) => s.payments)
      .filter((p) => p.paymentMethod === 'card')
      .reduce((s, p) => s + Number(p.amount), 0);

    const transferSales = sales
      .flatMap((s) => s.payments)
      .filter((p) => p.paymentMethod === 'transfer')
      .reduce((s, p) => s + Number(p.amount), 0);

    // expectedCash = cashSales + manualIns - manualOuts
    // (openingBalance is already counted in manualIns as "Apertura de caja" movement)
    const expectedCash = cashSales + ins - outs;
    const cashIns = ins;
    const cashOuts = outs;

    return {
      session,
      movements,
      summary: {
        openingBalance: Number(session.openingBalance || 0),
        cashSales,
        cardSales,
        transferSales,
        totalSales: cashSales + cardSales + transferSales,
        cashIns: ins,
        cashOuts: outs,
        expectedCash,
        salesCount: sales.length,
      },
    };
  }
}
