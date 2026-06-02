import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getPaginationParams } from '../../common/utils/pagination';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { CreateFiscalConfigDto, UpdateFiscalConfigDto } from './dto/fiscal-config.dto';
import { CreateInvoiceDto } from './dto/invoice.dto';
import { CreateTransactionDto } from './dto/transaction.dto';
import * as XLSX from 'xlsx';

// ─── Permission helpers ──────────────────────────────────────────
// Roles that have full accounting access (tenant-level)
const TENANT_LEVEL_ROLES = ['superadmin', 'tenant_admin'];

// Roles that have store-level accounting access (read invoices + transactions of their store)
const STORE_LEVEL_ROLES = ['store_admin'];

export function isTenantAdmin(role: string) {
  return TENANT_LEVEL_ROLES.includes(role);
}

export function hasAccountingAccess(role: string) {
  return [...TENANT_LEVEL_ROLES, ...STORE_LEVEL_ROLES].includes(role);
}

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  // ────────────────────────────────────────────────────────────
  // DASHBOARD
  // ────────────────────────────────────────────────────────────

  async getDashboard(tenantId: string, storeId: string | null, role: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // store_admin: only sees their store's data
    // tenant_admin: sees all stores consolidated
    const txWhere: any = {
      tenantId,
      transactionDate: { gte: monthStart },
      status: { not: 'voided' },
      ...(isTenantAdmin(role) ? {} : { storeId: storeId ?? undefined }),
    };

    const [totalIncome, totalExpenses, pendingInvoices, approvedInvoices, recentTransactions] =
      await Promise.all([
        this.prisma.accountingTransaction.aggregate({
          where: { ...txWhere, transactionType: 'income' },
          _sum: { netAmount: true },
        }),
        this.prisma.accountingTransaction.aggregate({
          where: { ...txWhere, transactionType: 'expense' },
          _sum: { netAmount: true },
        }),
        this.prisma.invoice.count({
          where: {
            tenantId,
            status: 'pending_dian',
            ...(isTenantAdmin(role) ? {} : { storeId: storeId ?? undefined }),
          },
        }),
        this.prisma.invoice.count({
          where: {
            tenantId,
            status: 'approved',
            ...(isTenantAdmin(role) ? {} : { storeId: storeId ?? undefined }),
          },
        }),
        this.prisma.accountingTransaction.findMany({
          where: { tenantId, ...(isTenantAdmin(role) ? {} : { storeId: storeId ?? undefined }) },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

    const income = Number(totalIncome._sum.netAmount || 0);
    const expenses = Number(totalExpenses._sum.netAmount || 0);

    return {
      scope: isTenantAdmin(role) ? 'tenant' : 'store',
      monthIncome: income,
      monthExpenses: expenses,
      monthProfit: income - expenses,
      pendingInvoices,
      approvedInvoices,
      recentTransactions,
    };
  }

  // ────────────────────────────────────────────────────────────
  // FISCAL CONFIG — tenant level only
  // ────────────────────────────────────────────────────────────

  async getFiscalConfig(tenantId: string, role: string) {
    if (!isTenantAdmin(role)) {
      throw new ForbiddenException('Only tenant admins can access fiscal configuration');
    }
    return this.prisma.fiscalConfig.findFirst({
      where: { tenantId },
    });
  }

  async upsertFiscalConfig(tenantId: string, role: string, dto: CreateFiscalConfigDto | UpdateFiscalConfigDto) {
    if (!isTenantAdmin(role)) {
      throw new ForbiddenException('Only tenant admins can modify fiscal configuration');
    }

    const data: any = {
      businessName: dto.businessName,
      tradeName: dto.tradeName,
      idType: dto.idType,
      idNumber: dto.idNumber,
      dv: dto.dv,
      personType: dto.personType,
      taxRegime: dto.taxRegime,
      fiscalAddress: dto.fiscalAddress,
      cityCode: dto.cityCode,
      departmentCode: dto.departmentCode,
      countryCode: dto.countryCode ?? 'CO',
      postalCode: dto.postalCode,
      fiscalEmail: dto.fiscalEmail,
      fiscalPhone: dto.fiscalPhone,
      taxResponsibilities: dto.taxResponsibilities ?? [],
      economicActivityCode: dto.economicActivityCode,
      economicActivityDesc: dto.economicActivityDesc,
      feProvider: dto.feProvider ?? 'none',
      feProviderApiKey: dto.feProviderApiKey,
      feProviderApiSecret: dto.feProviderApiSecret,
      feEnvironment: dto.feEnvironment ?? 'sandbox',
      feProviderConfig: dto.feProviderConfig ?? {},
      resolutionNumber: dto.resolutionNumber,
      resolutionDate: dto.resolutionDate ? new Date(dto.resolutionDate) : null,
      resolutionPrefix: dto.resolutionPrefix,
      resolutionFrom: dto.resolutionFrom,
      resolutionTo: dto.resolutionTo,
      resolutionValidFrom: dto.resolutionValidFrom ? new Date(dto.resolutionValidFrom) : null,
      resolutionValidTo: dto.resolutionValidTo ? new Date(dto.resolutionValidTo) : null,
      cnPrefix: dto.cnPrefix,
      dnPrefix: dto.dnPrefix,
    };

    // Use findFirst + create/update until Prisma client regenerates with new unique key
    const existing = await this.prisma.fiscalConfig.findFirst({ where: { tenantId } });
    if (existing) {
      return this.prisma.fiscalConfig.update({ where: { id: existing.id }, data });
    }
    return this.prisma.fiscalConfig.create({
      data: { tenant: { connect: { id: tenantId } }, ...data },
    });
  }

  // ────────────────────────────────────────────────────────────
  // TAX RATES — tenant level
  // ────────────────────────────────────────────────────────────

  async getTaxRates(tenantId: string) {
    return this.prisma.taxRate.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ taxType: 'asc' }, { rate: 'asc' }],
    });
  }

  async createTaxRate(tenantId: string, role: string, dto: any) {
    if (!isTenantAdmin(role)) throw new ForbiddenException('Only tenant admins can manage tax rates');
    return this.prisma.taxRate.create({ data: { tenantId, ...dto } });
  }

  async updateTaxRate(tenantId: string, role: string, id: string, dto: any) {
    if (!isTenantAdmin(role)) throw new ForbiddenException('Only tenant admins can manage tax rates');
    const rate = await this.prisma.taxRate.findFirst({ where: { id, tenantId } });
    if (!rate) throw new NotFoundException('Tax rate not found');
    return this.prisma.taxRate.update({ where: { id }, data: dto });
  }

  async deleteTaxRate(tenantId: string, role: string, id: string) {
    if (!isTenantAdmin(role)) throw new ForbiddenException('Only tenant admins can manage tax rates');
    const rate = await this.prisma.taxRate.findFirst({ where: { id, tenantId } });
    if (!rate) throw new NotFoundException('Tax rate not found');
    return this.prisma.taxRate.update({ where: { id }, data: { isActive: false } });
  }

  // ────────────────────────────────────────────────────────────
  // INVOICES
  // store_admin: sees only their store's invoices
  // tenant_admin: sees all invoices, can filter by store
  // ────────────────────────────────────────────────────────────

  async getInvoices(tenantId: string, storeId: string | null, role: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 20);

    // store_admin is locked to their store; tenant_admin can optionally filter
    const storeFilter = isTenantAdmin(role)
      ? (query.storeId ? { storeId: query.storeId } : {})
      : { storeId };

    const where: any = {
      tenantId,
      ...storeFilter,
      ...(query.status ? { status: query.status } : {}),
      ...(query.invoiceType ? { invoiceType: query.invoiceType } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.from ? { createdAt: { gte: new Date(query.from) } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({ where, skip, take, include: { items: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.invoice.count({ where }),
    ]);
    return new PaginatedResponse(data, total, query.page || 1, query.limit || 20);
  }

  async getInvoice(tenantId: string, storeId: string | null, role: string, id: string) {
    const storeFilter = isTenantAdmin(role) ? {} : { storeId: storeId ?? undefined };
    const inv = await this.prisma.invoice.findFirst({
      where: { id, tenantId, ...storeFilter },
      include: { items: true },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async createInvoice(tenantId: string, storeId: string, userId: string, role: string, dto: CreateInvoiceDto) {
    // Get fiscal config — tenant level
    const config = await this.prisma.fiscalConfig.findFirst({ where: { tenantId } });
    if (!config) {
      throw new BadRequestException('Fiscal configuration not found. A tenant admin must configure fiscal data first.');
    }

    // Calculate totals from items
    let subtotal = 0;
    let discountAmount = 0;
    let ivaAmount = 0;
    let retefuenteAmount = 0;

    const computedItems = dto.items.map((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = itemSubtotal * ((item.discountRate ?? 0) / 100);
      const taxBase = itemSubtotal - itemDiscount;
      const itemIva = item.isIvaExcluded || item.isIvaExempt ? 0 : taxBase * (item.ivaRate / 100);
      const itemRetefuente = taxBase * ((item.retefuenteRate ?? 0) / 100);
      const itemTotal = taxBase + itemIva - itemRetefuente;

      subtotal += itemSubtotal;
      discountAmount += itemDiscount;
      ivaAmount += itemIva;
      retefuenteAmount += itemRetefuente;

      return {
        productId: item.productId,
        serviceId: item.serviceId,
        itemType: item.itemType,
        code: item.code,
        description: item.description,
        quantity: item.quantity,
        unitMeasure: item.unitMeasure,
        unitPrice: item.unitPrice,
        discountRate: item.discountRate ?? 0,
        discountAmount: itemSubtotal * ((item.discountRate ?? 0) / 100),
        subtotal: taxBase,
        ivaRate: item.ivaRate,
        ivaAmount: itemIva,
        isIvaExcluded: item.isIvaExcluded ?? false,
        isIvaExempt: item.isIvaExempt ?? false,
        retefuenteRate: item.retefuenteRate ?? 0,
        retefuenteAmount: itemRetefuente,
        total: itemTotal,
        standardCode: item.standardCode,
      };
    });

    const taxBase = subtotal - discountAmount;
    const total = taxBase + ivaAmount - retefuenteAmount;

    // Determine consecutive — ALWAYS from tenant-level config
    const isCredit = dto.invoiceType === 'credit_note';
    const isDebit = dto.invoiceType === 'debit_note';
    let consecutive: number;
    let prefix: string | undefined;

    if (isCredit) {
      consecutive = (config.cnCurrentNumber ?? 0) + 1;
      prefix = config.cnPrefix ?? undefined;
    } else if (isDebit) {
      consecutive = (config.dnCurrentNumber ?? 0) + 1;
      prefix = config.dnPrefix ?? undefined;
    } else {
      consecutive = (config.currentInvoiceNumber ?? 0) + 1;
      prefix = config.resolutionPrefix ?? undefined;
    }

    const invoiceNumber = `${prefix ?? ''}${consecutive}`;

    const invoice = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          tenantId,
          storeId,    // storeId = which store generated this invoice (for reporting)
          saleId: dto.saleId,
          purchaseId: dto.purchaseId,
          invoiceType: dto.invoiceType,
          invoiceNumber,
          prefix,
          consecutive,
          referencedInvoiceId: dto.referencedInvoiceId,
          correctionReason: dto.correctionReason,
          customerId: dto.customerId,
          supplierId: dto.supplierId,
          receiverName: dto.receiverName,
          receiverIdType: dto.receiverIdType as any,
          receiverIdNumber: dto.receiverIdNumber,
          receiverEmail: dto.receiverEmail,
          receiverPhone: dto.receiverPhone,
          receiverAddress: dto.receiverAddress,
          receiverCityCode: dto.receiverCityCode,
          receiverTaxRegime: dto.receiverTaxRegime as any,
          receiverTaxResp: dto.receiverTaxResp ?? [],
          subtotal,
          discountAmount,
          taxBase,
          ivaAmount,
          totalTax: ivaAmount,
          total,
          retefuenteAmount,
          paymentMethodCode: dto.paymentMethodCode,
          paymentMeansCode: dto.paymentMeansCode ?? '1',
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          notes: dto.notes,
          internalNotes: dto.internalNotes,
          createdBy: userId,
          status: 'draft',
          items: { create: computedItems },
        },
        include: { items: true },
      });

      // Update tenant-level consecutive counter
      if (isCredit) {
        await tx.fiscalConfig.update({ where: { id: config.id }, data: { cnCurrentNumber: consecutive } });
      } else if (isDebit) {
        await tx.fiscalConfig.update({ where: { id: config.id }, data: { dnCurrentNumber: consecutive } });
      } else {
        await tx.fiscalConfig.update({ where: { id: config.id }, data: { currentInvoiceNumber: consecutive } });
      }

      return inv;
    });

    // Auto-send to Factus if configured (fire-and-forget — never blocks response)
    if (config.feProvider === 'factus') {
      this.sendInvoiceToFactus(invoice.id, tenantId)
        .catch(err => console.warn(`Factus send failed for invoice ${invoice.id}: ${err.message}`));
    }

    return invoice;
  }

  async updateInvoiceStatus(tenantId: string, storeId: string | null, role: string, id: string, status: string, extra?: any) {
    await this.getInvoice(tenantId, storeId, role, id);
    return this.prisma.invoice.update({ where: { id }, data: { status: status as any, ...extra } });
  }

  async cancelInvoice(tenantId: string, storeId: string | null, role: string, id: string) {
    const inv = await this.getInvoice(tenantId, storeId, role, id);
    if (inv.status === 'cancelled') throw new BadRequestException('Invoice already cancelled');
    return this.prisma.invoice.update({ where: { id }, data: { status: 'cancelled' } });
  }

  // ────────────────────────────────────────────────────────────
  // ACCOUNTING TRANSACTIONS
  // store_admin: only their store | tenant_admin: all or filtered
  // ────────────────────────────────────────────────────────────

  async getTransactions(tenantId: string, storeId: string | null, role: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 20);
    const storeFilter = isTenantAdmin(role)
      ? (query.storeId ? { storeId: query.storeId } : {})
      : { storeId };

    const where: any = {
      tenantId,
      ...storeFilter,
      ...(query.type ? { transactionType: query.type } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from ? { transactionDate: { gte: new Date(query.from) } } : {}),
      ...(query.to ? { transactionDate: { lte: new Date(query.to) } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.accountingTransaction.findMany({ where, skip, take, orderBy: { transactionDate: 'desc' } }),
      this.prisma.accountingTransaction.count({ where }),
    ]);
    return new PaginatedResponse(data, total, query.page || 1, query.limit || 20);
  }

  async getTransaction(tenantId: string, storeId: string | null, role: string, id: string) {
    const storeFilter = isTenantAdmin(role) ? {} : { storeId: storeId ?? undefined };
    const tx = await this.prisma.accountingTransaction.findFirst({ where: { id, tenantId, ...storeFilter } });
    if (!tx) throw new NotFoundException('Transaction not found');
    return tx;
  }

  async createTransaction(tenantId: string, storeId: string, userId: string, dto: CreateTransactionDto) {
    return this.prisma.accountingTransaction.create({
      data: {
        tenantId,
        storeId,
        transactionType: dto.transactionType,
        category: dto.category,
        subcategory: dto.subcategory,
        saleId: dto.saleId,
        expenseId: dto.expenseId,
        purchaseId: dto.purchaseId,
        invoiceId: dto.invoiceId,
        description: dto.description,
        referenceNumber: dto.referenceNumber,
        grossAmount: dto.grossAmount,
        taxAmount: dto.taxAmount ?? 0,
        retentionAmount: dto.retentionAmount ?? 0,
        netAmount: dto.netAmount,
        ivaAmount: dto.ivaAmount ?? 0,
        retefuenteAmount: dto.retefuenteAmount ?? 0,
        reteIvaAmount: dto.reteIvaAmount ?? 0,
        reteIcaAmount: dto.reteIcaAmount ?? 0,
        icaAmount: dto.icaAmount ?? 0,
        paymentMethod: dto.paymentMethod,
        transactionDate: new Date(dto.transactionDate),
        createdBy: userId,
      },
    });
  }

  async voidTransaction(tenantId: string, storeId: string | null, role: string, id: string) {
    await this.getTransaction(tenantId, storeId, role, id);
    return this.prisma.accountingTransaction.update({ where: { id }, data: { status: 'voided' } });
  }

  async reconcileTransaction(tenantId: string, storeId: string | null, role: string, id: string, userId: string) {
    if (!isTenantAdmin(role)) throw new ForbiddenException('Only tenant admins can reconcile transactions');
    await this.getTransaction(tenantId, storeId, role, id);
    return this.prisma.accountingTransaction.update({
      where: { id },
      data: { isReconciled: true, reconciledAt: new Date(), reconciledBy: userId },
    });
  }

  // ────────────────────────────────────────────────────────────
  // TAX SUMMARY & DECLARATIONS — tenant admin only
  // ────────────────────────────────────────────────────────────

  async getTaxSummary(tenantId: string, storeId: string | null, role: string, year: number, month?: number) {
    if (!isTenantAdmin(role)) throw new ForbiddenException('Only tenant admins can view tax summaries');

    const now = new Date();
    const y = year || now.getFullYear();
    const dateFrom = month ? new Date(y, month - 1, 1) : new Date(y, 0, 1);
    const dateTo = month ? new Date(y, month, 0) : new Date(y, 11, 31);

    const agg = await this.prisma.accountingTransaction.aggregate({
      where: { tenantId, status: { not: 'voided' }, transactionDate: { gte: dateFrom, lte: dateTo } },
      _sum: {
        ivaAmount: true,
        retefuenteAmount: true,
        reteIvaAmount: true,
        reteIcaAmount: true,
        icaAmount: true,
        grossAmount: true,
        netAmount: true,
      },
    });

    // Per-store breakdown for tenant_admin
    const byStore = await this.prisma.accountingTransaction.groupBy({
      by: ['storeId'],
      where: { tenantId, status: { not: 'voided' }, transactionDate: { gte: dateFrom, lte: dateTo } },
      _sum: { grossAmount: true, netAmount: true, ivaAmount: true },
    });

    return {
      period: { year: y, month: month ?? null },
      grossAmount: Number(agg._sum.grossAmount || 0),
      netAmount: Number(agg._sum.netAmount || 0),
      taxes: {
        iva: Number(agg._sum.ivaAmount || 0),
        retefuente: Number(agg._sum.retefuenteAmount || 0),
        reteIva: Number(agg._sum.reteIvaAmount || 0),
        reteIca: Number(agg._sum.reteIcaAmount || 0),
        ica: Number(agg._sum.icaAmount || 0),
      },
      byStore,
    };
  }

  async getTaxDeclarations(tenantId: string, role: string, query: any) {
    if (!isTenantAdmin(role)) throw new ForbiddenException('Only tenant admins can view tax declarations');
    const where: any = {
      tenantId,
      ...(query.taxType ? { taxType: query.taxType } : {}),
      ...(query.year ? { periodYear: parseInt(query.year) } : {}),
    };
    return this.prisma.taxDeclaration.findMany({ where, orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }] });
  }

  async createTaxDeclaration(tenantId: string, role: string, dto: any) {
    if (!isTenantAdmin(role)) throw new ForbiddenException('Only tenant admins can manage tax declarations');
    return this.prisma.taxDeclaration.upsert({
      where: {
        tenantId_taxType_periodYear_periodMonth: {
          tenantId,
          taxType: dto.taxType,
          periodYear: dto.periodYear,
          periodMonth: dto.periodMonth ?? null,
        },
      },
      create: { tenantId, ...dto },
      update: dto,
    });
  }

  // ────────────────────────────────────────────────────────────
  // FINANCIAL REPORTS
  // tenant_admin: all stores or filtered | store_admin: own store
  // ────────────────────────────────────────────────────────────

  async getIncomeStatement(tenantId: string, storeId: string | null, role: string, from: string, to: string, filterStoreId?: string) {
    const dateFrom = new Date(from);
    const dateTo = new Date(to);

    const storeFilter = isTenantAdmin(role)
      ? (filterStoreId ? { storeId: filterStoreId } : {})
      : { storeId: storeId ?? undefined };

    const where = { tenantId, status: { not: 'voided' } as any, transactionDate: { gte: dateFrom, lte: dateTo }, ...storeFilter };

    const [income, expenses, taxes] = await Promise.all([
      this.prisma.accountingTransaction.aggregate({ where: { ...where, transactionType: 'income' }, _sum: { grossAmount: true, netAmount: true } }),
      this.prisma.accountingTransaction.aggregate({ where: { ...where, transactionType: 'expense' }, _sum: { grossAmount: true, netAmount: true } }),
      this.prisma.accountingTransaction.aggregate({ where, _sum: { ivaAmount: true, retefuenteAmount: true, reteIcaAmount: true, icaAmount: true } }),
    ]);

    const totalIncome = Number(income._sum.netAmount || 0);
    const totalExpenses = Number(expenses._sum.netAmount || 0);

    return {
      period: { from, to },
      scope: isTenantAdmin(role) ? (filterStoreId ? 'store' : 'tenant') : 'store',
      income: { gross: Number(income._sum.grossAmount || 0), net: totalIncome },
      expenses: { gross: Number(expenses._sum.grossAmount || 0), net: totalExpenses },
      grossProfit: totalIncome - totalExpenses,
      taxes: {
        iva: Number(taxes._sum.ivaAmount || 0),
        retefuente: Number(taxes._sum.retefuenteAmount || 0),
        reteIca: Number(taxes._sum.reteIcaAmount || 0),
        ica: Number(taxes._sum.icaAmount || 0),
      },
      netIncome: totalIncome - totalExpenses,
    };
  }

  async getCashFlow(tenantId: string, storeId: string | null, role: string, from: string, to: string, filterStoreId?: string) {
    const storeFilter = isTenantAdmin(role)
      ? (filterStoreId ? { storeId: filterStoreId } : {})
      : { storeId: storeId ?? undefined };

    const txs = await this.prisma.accountingTransaction.findMany({
      where: {
        tenantId,
        status: { not: 'voided' },
        transactionDate: { gte: new Date(from), lte: new Date(to) },
        ...storeFilter,
      },
      orderBy: { transactionDate: 'asc' },
      select: { transactionDate: true, transactionType: true, netAmount: true, category: true, description: true, storeId: true },
    });

    let balance = 0;
    const flow = txs.map((t) => {
      const amount = t.transactionType === 'income' ? Number(t.netAmount) : -Number(t.netAmount);
      balance += amount;
      return { ...t, amount, runningBalance: balance };
    });

    return { period: { from, to }, transactions: flow, finalBalance: balance };
  }

  // ────────────────────────────────────────────────────────────
  // AUTO-REGISTER from Sales/Expenses (internal)
  // ────────────────────────────────────────────────────────────

  async registerSaleTransaction(tenantId: string, storeId: string, saleId: string, userId: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId, storeId } });
    if (!sale) return;
    const existing = await this.prisma.accountingTransaction.findFirst({ where: { saleId } });
    if (existing) return existing;

    return this.prisma.accountingTransaction.create({
      data: {
        tenantId,
        storeId,
        transactionType: 'income',
        category: 'sales',
        description: `Venta #${sale.saleNumber}`,
        saleId,
        grossAmount: Number(sale.total),
        taxAmount: Number(sale.taxAmount),
        retentionAmount: 0,
        netAmount: Number(sale.total),
        ivaAmount: Number(sale.taxAmount),
        transactionDate: sale.createdAt,
        createdBy: userId,
      },
    });
  }

  async registerExpenseTransaction(tenantId: string, storeId: string, expenseId: string, userId: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id: expenseId, tenantId, storeId } });
    if (!expense) return;
    const existing = await this.prisma.accountingTransaction.findFirst({ where: { expenseId } });
    if (existing) return existing;

    return this.prisma.accountingTransaction.create({
      data: {
        tenantId,
        storeId,
        transactionType: 'expense',
        category: 'operational_expense',
        description: expense.concept,
        expenseId,
        grossAmount: Number(expense.amount),
        taxAmount: 0,
        retentionAmount: 0,
        netAmount: Number(expense.amount),
        transactionDate: expense.expenseDate,
        createdBy: userId,
      },
    });
  }

  // ────────────────────────────────────────────────────────────
  // REPORTS — IVA Liquidation (Formulario 300), ReteFuente (350)
  //           and accountant export
  // ────────────────────────────────────────────────────────────

  async getIvaLiquidation(tenantId: string, role: string, year: number, bimester: number) {
    if (!isTenantAdmin(role)) throw new ForbiddenException('Only tenant admins can view IVA liquidation');

    // Colombia: IVA is declared bi-monthly (bimestres 1-6)
    // Bimester 1 = Jan-Feb, 2 = Mar-Apr, 3 = May-Jun, 4 = Jul-Aug, 5 = Sep-Oct, 6 = Nov-Dec
    const bimesterMonths: Record<number, [number, number]> = {
      1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8], 5: [9, 10], 6: [11, 12],
    };
    const [startMonth, endMonth] = bimesterMonths[bimester] || [1, 2];
    const dateFrom = new Date(year, startMonth - 1, 1);
    const dateTo = new Date(year, endMonth, 0, 23, 59, 59);

    const fiscalConfig = await this.prisma.fiscalConfig.findFirst({ where: { tenantId } });

    // ── IVA Generado: from sales invoices ──────────────────────
    const [inv0, inv5, inv19] = await Promise.all([
      this.prisma.invoiceItem.aggregate({
        where: { invoice: { tenantId, status: { not: 'cancelled' }, createdAt: { gte: dateFrom, lte: dateTo } }, ivaRate: 0 },
        _sum: { subtotal: true, ivaAmount: true },
        _count: true,
      }),
      this.prisma.invoiceItem.aggregate({
        where: { invoice: { tenantId, status: { not: 'cancelled' }, createdAt: { gte: dateFrom, lte: dateTo } }, ivaRate: 5 },
        _sum: { subtotal: true, ivaAmount: true },
        _count: true,
      }),
      this.prisma.invoiceItem.aggregate({
        where: { invoice: { tenantId, status: { not: 'cancelled' }, createdAt: { gte: dateFrom, lte: dateTo } }, ivaRate: 19 },
        _sum: { subtotal: true, ivaAmount: true },
        _count: true,
      }),
    ]);

    // Also sum from accounting transactions (sales not yet invoiced)
    const txIncome = await this.prisma.accountingTransaction.aggregate({
      where: { tenantId, transactionType: 'income', status: { not: 'voided' }, transactionDate: { gte: dateFrom, lte: dateTo } },
      _sum: { grossAmount: true, ivaAmount: true, reteIvaAmount: true },
    });

    // ── IVA Descontable: from purchases/expenses with IVA ──────
    const txExpense = await this.prisma.accountingTransaction.aggregate({
      where: { tenantId, transactionType: 'expense', status: { not: 'voided' }, transactionDate: { gte: dateFrom, lte: dateTo } },
      _sum: { grossAmount: true, ivaAmount: true },
    });

    // ── Retenciones de IVA sufridas (ReteIVA) ──────────────────
    const reteIvaTotal = Number(txIncome._sum.reteIvaAmount || 0);

    // ── Compute Form 300 fields ────────────────────────────────
    const baseGravada0  = Number(inv0._sum.subtotal || 0);
    const baseGravada5  = Number(inv5._sum.subtotal || 0);
    const baseGravada19 = Number(inv19._sum.subtotal || 0);
    const baseTotalGravada = baseGravada5 + baseGravada19;

    const ivaGenerado5  = Number(inv5._sum.ivaAmount || 0);
    const ivaGenerado19 = Number(inv19._sum.ivaAmount || 0);
    const ivaGeneradoTotal = ivaGenerado5 + ivaGenerado19;

    const ivaDescontable = Number(txExpense._sum.ivaAmount || 0);
    const saldoFavorAnterior = 0; // TODO: pull from previous declaration

    const ivaNetoPagar = Math.max(0, ivaGeneradoTotal - ivaDescontable - reteIvaTotal - saldoFavorAnterior);
    const saldoFavorPeriodo = Math.max(0, ivaDescontable + reteIvaTotal - ivaGeneradoTotal);

    // ── Invoice count summary ───────────────────────────────────
    const invoiceSummary = await this.prisma.invoice.groupBy({
      by: ['invoiceType'],
      where: { tenantId, status: { not: 'cancelled' }, createdAt: { gte: dateFrom, lte: dateTo } },
      _count: true,
      _sum: { total: true, ivaAmount: true },
    });

    return {
      period: { year, bimester, startMonth, endMonth, dateFrom, dateTo },
      fiscalConfig: fiscalConfig ? {
        businessName: fiscalConfig.businessName,
        idType: fiscalConfig.idType,
        idNumber: fiscalConfig.idNumber,
        dv: fiscalConfig.dv,
        taxRegime: fiscalConfig.taxRegime,
      } : null,
      // Formulario 300 fields
      form300: {
        // Ingresos por operaciones gravadas
        casilla1_baseGravada19: baseGravada19,
        casilla2_iva19: ivaGenerado19,
        casilla3_baseGravada5: baseGravada5,
        casilla4_iva5: ivaGenerado5,
        casilla5_baseExcluida: baseGravada0,
        casilla6_ivaGeneradoTotal: ivaGeneradoTotal,
        // IVA descontable
        casilla7_ivaDescontable: ivaDescontable,
        casilla8_reteIva: reteIvaTotal,
        casilla9_saldoFavorAnterior: saldoFavorAnterior,
        casilla10_totalDescuentos: ivaDescontable + reteIvaTotal + saldoFavorAnterior,
        // Saldo
        casilla11_ivaNetoPagar: ivaNetoPagar,
        casilla12_saldoFavorPeriodo: saldoFavorPeriodo,
      },
      // Summary breakdown
      breakdown: {
        ventas: {
          baseGravada19, ivaGenerado19,
          baseGravada5, ivaGenerado5,
          baseExcluida: baseGravada0,
          baseTotal: baseTotalGravada + baseGravada0,
          ivaTotal: ivaGeneradoTotal,
        },
        compras: {
          totalGastos: Number(txExpense._sum.grossAmount || 0),
          ivaDescontable,
        },
        retenciones: { reteIva: reteIvaTotal },
        resultado: {
          ivaNetoPagar,
          saldoFavorPeriodo,
        },
      },
      invoices: invoiceSummary,
    };
  }

  async getRetefuenteLiquidation(tenantId: string, role: string, year: number, month: number) {
    if (!isTenantAdmin(role)) throw new ForbiddenException('Only tenant admins can view ReteFuente liquidation');

    const dateFrom = new Date(year, month - 1, 1);
    const dateTo = new Date(year, month, 0, 23, 59, 59);

    const fiscalConfig = await this.prisma.fiscalConfig.findFirst({ where: { tenantId } });

    // Retenciones practicadas por la empresa (como agente retenedor)
    const retefuentePracticada = await this.prisma.accountingTransaction.aggregate({
      where: { tenantId, status: { not: 'voided' }, transactionDate: { gte: dateFrom, lte: dateTo } },
      _sum: { retefuenteAmount: true, reteIvaAmount: true, reteIcaAmount: true },
    });

    // From invoice items (retenciones en facturas)
    const invoiceRetenciones = await this.prisma.invoiceItem.aggregate({
      where: { invoice: { tenantId, status: { not: 'cancelled' }, createdAt: { gte: dateFrom, lte: dateTo } } },
      _sum: { retefuenteAmount: true },
    });

    // Breakdown by category (from transactions)
    const byCategory = await this.prisma.accountingTransaction.groupBy({
      by: ['category'],
      where: { tenantId, status: { not: 'voided' }, retefuenteAmount: { gt: 0 }, transactionDate: { gte: dateFrom, lte: dateTo } },
      _sum: { grossAmount: true, retefuenteAmount: true },
      _count: true,
    });

    const totalRetefuente = Number(retefuentePracticada._sum.retefuenteAmount || 0)
      + Number(invoiceRetenciones._sum.retefuenteAmount || 0);
    const totalReteIva    = Number(retefuentePracticada._sum.reteIvaAmount || 0);
    const totalReteIca    = Number(retefuentePracticada._sum.reteIcaAmount || 0);

    // Concept codes per DIAN Formulario 350
    const conceptLabels: Record<string, string> = {
      sales:               'Ingresos propios (servicios)',
      operational_expense: 'Compras y servicios',
      payroll:             'Pagos laborales',
      rent:                'Arrendamientos',
      honorarios:          'Honorarios',
      services:            'Servicios generales',
    };

    return {
      period: { year, month, dateFrom, dateTo },
      fiscalConfig: fiscalConfig ? {
        businessName: fiscalConfig.businessName,
        idNumber: fiscalConfig.idNumber,
        dv: fiscalConfig.dv,
      } : null,
      // Formulario 350 fields
      form350: {
        totalRetefuentePracticada: totalRetefuente,
        totalReteIvaPracticada: totalReteIva,
        totalReteIcaPracticada: totalReteIca,
        totalAPagar: totalRetefuente + totalReteIva + totalReteIca,
      },
      byCategory: byCategory.map(c => ({
        category: c.category,
        label: conceptLabels[c.category] || c.category,
        count: c._count,
        baseGravable: Number(c._sum.grossAmount || 0),
        retefuente: Number(c._sum.retefuenteAmount || 0),
      })),
    };
  }

  async exportAccountantReport(tenantId: string, role: string, from: string, to: string): Promise<Buffer> {
    if (!isTenantAdmin(role)) throw new ForbiddenException('Only tenant admins can export accounting reports');

    const dateFrom = new Date(from);
    const dateTo   = new Date(to + 'T23:59:59');

    const fiscalConfig = await this.prisma.fiscalConfig.findFirst({ where: { tenantId } });

    // ── Sheet 1: Ingresos (invoices) ────────────────────────────
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, status: { not: 'cancelled' }, createdAt: { gte: dateFrom, lte: dateTo } },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });

    const ingresosRows = invoices.map(inv => ({
      'Fecha':              new Date(inv.createdAt).toLocaleDateString('es-CO'),
      'N° Factura':         inv.invoiceNumber,
      'Tipo':               inv.invoiceType.replace(/_/g, ' '),
      'Estado':             inv.status,
      'NIT Emisor':         fiscalConfig?.idNumber ?? '',
      'Emisor':             fiscalConfig?.businessName ?? 'Glamorapp',
      'NIT Receptor':       inv.receiverIdNumber ?? '',
      'Receptor':           inv.receiverName,
      'Subtotal':           Number(inv.subtotal),
      'Descuentos':         Number(inv.discountAmount),
      'Base Gravable':      Number(inv.taxBase),
      'IVA':                Number(inv.ivaAmount),
      'ReteFuente':         Number(inv.retefuenteAmount),
      'ReteIVA':            Number(inv.reteIvaAmount),
      'ReteICA':            Number(inv.reteIcaAmount),
      'Total':              Number(inv.total),
      'Forma de pago':      inv.paymentMeansCode === '1' ? 'Contado' : 'Crédito',
      'Método de pago':     ({ '10':'Efectivo','42':'Transferencia','48':'Tarjeta débito','49':'Tarjeta crédito','71':'Nequi/Daviplata' } as Record<string,string>)[inv.paymentMethodCode ?? ''] ?? inv.paymentMethodCode ?? '',
    }));

    // ── Sheet 2: Gastos (expenses) ──────────────────────────────
    const expenses = await this.prisma.expense.findMany({
      where: { tenantId, isVoided: false, expenseDate: { gte: dateFrom, lte: dateTo } },
      include: { category: true },
      orderBy: { expenseDate: 'asc' },
    });

    const gastosRows = expenses.map(exp => ({
      'Fecha':              new Date(exp.expenseDate).toLocaleDateString('es-CO'),
      'Concepto':           exp.concept,
      'Categoría':          (exp as any).category?.name ?? '',
      'Proveedor / Pagado a': (exp as any).paidTo ?? '',
      'NIT Proveedor':      (exp as any).supplierNit ?? '',
      'Monto':              Number(exp.amount),
      'IVA en compra':      Number((exp as any).ivaAmount ?? 0),
      'ReteFuente aplicada': Number((exp as any).retefuenteAmount ?? 0),
      'Estado':             exp.status,
      'Notas':              exp.notes ?? '',
    }));

    // ── Sheet 3: Transacciones contables ────────────────────────
    const transactions = await this.prisma.accountingTransaction.findMany({
      where: { tenantId, status: { not: 'voided' }, transactionDate: { gte: dateFrom, lte: dateTo } },
      orderBy: { transactionDate: 'asc' },
    });

    const txLabels: Record<string, string> = {
      income: 'Ingreso', expense: 'Gasto', transfer: 'Transferencia',
      tax_payment: 'Pago impuesto', adjustment: 'Ajuste',
    };

    const txRows = transactions.map(tx => ({
      'Fecha':           new Date(tx.transactionDate).toLocaleDateString('es-CO'),
      'Tipo':            txLabels[tx.transactionType] ?? tx.transactionType,
      'Categoría':       tx.category,
      'Descripción':     tx.description,
      'Monto Bruto':     Number(tx.grossAmount),
      'IVA':             Number(tx.ivaAmount),
      'ReteFuente':      Number(tx.retefuenteAmount),
      'ReteIVA':         Number(tx.reteIvaAmount),
      'ReteICA':         Number(tx.reteIcaAmount),
      'Monto Neto':      Number(tx.netAmount),
      'Estado':          tx.status,
    }));

    // ── Sheet 4: Retenciones practicadas ───────────────────────
    const retencionesRows = transactions
      .filter(tx => Number(tx.retefuenteAmount) > 0 || Number(tx.reteIvaAmount) > 0 || Number(tx.reteIcaAmount) > 0)
      .map(tx => ({
        'Fecha':        new Date(tx.transactionDate).toLocaleDateString('es-CO'),
        'Descripción':  tx.description,
        'Categoría':    tx.category,
        'Base':         Number(tx.grossAmount),
        'ReteFuente':   Number(tx.retefuenteAmount),
        'ReteIVA':      Number(tx.reteIvaAmount),
        'ReteICA':      Number(tx.reteIcaAmount),
        'Total Ret.':   Number(tx.retefuenteAmount) + Number(tx.reteIvaAmount) + Number(tx.reteIcaAmount),
      }));

    // ── Build workbook ──────────────────────────────────────────
    const wb = XLSX.utils.book_new();

    const addSheet = (name: string, rows: any[]) => {
      if (rows.length === 0) rows = [{ '(Sin registros en el período)': '' }];
      const ws = XLSX.utils.json_to_sheet(rows);

      // Column widths
      const cols = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, 14) }));
      ws['!cols'] = cols;

      XLSX.utils.book_append_sheet(wb, ws, name);
    };

    addSheet('1. Ingresos (Facturas)', ingresosRows);
    addSheet('2. Gastos', gastosRows);
    addSheet('3. Transacciones', txRows);
    addSheet('4. Retenciones', retencionesRows);

    // Cover sheet
    const coverData = [
      { Campo: 'Empresa',         Valor: fiscalConfig?.businessName ?? 'Glamorapp' },
      { Campo: 'NIT',             Valor: `${fiscalConfig?.idNumber ?? ''}-${fiscalConfig?.dv ?? ''}` },
      { Campo: 'Período desde',   Valor: new Date(dateFrom).toLocaleDateString('es-CO') },
      { Campo: 'Período hasta',   Valor: new Date(dateTo).toLocaleDateString('es-CO') },
      { Campo: 'Total facturas',  Valor: invoices.length },
      { Campo: 'Total ingresos',  Valor: invoices.reduce((s, i) => s + Number(i.total), 0) },
      { Campo: 'Total gastos',    Valor: expenses.reduce((s, e) => s + Number(e.amount), 0) },
      { Campo: 'Total IVA facturado', Valor: invoices.reduce((s, i) => s + Number(i.ivaAmount), 0) },
      { Campo: 'Generado el',     Valor: new Date().toLocaleString('es-CO') },
    ];
    const coverWs = XLSX.utils.json_to_sheet(coverData);
    coverWs['!cols'] = [{ wch: 22 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, coverWs, '0. Resumen');
    // Move cover sheet to first position
    wb.SheetNames = [
      '0. Resumen',
      '1. Ingresos (Facturas)',
      '2. Gastos',
      '3. Transacciones',
      '4. Retenciones',
    ];

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  // ────────────────────────────────────────────────────────────
  // FE PROVIDER — update credentials & test connection
  // ────────────────────────────────────────────────────────────

  async updateFeProvider(tenantId: string, role: string, dto: {
    feProvider: string;
    feEnvironment: string;
    feProviderApiKey?: string;
    feProviderApiSecret?: string;
    feProviderConfig?: Record<string, any>;
  }) {
    if (!isTenantAdmin(role)) throw new ForbiddenException('Only tenant admins can configure FE provider');
    const existing = await this.prisma.fiscalConfig.findFirst({ where: { tenantId } });
    if (!existing) throw new BadRequestException('Fiscal configuration not found. Create it first.');

    return this.prisma.fiscalConfig.update({
      where: { id: existing.id },
      data: {
        feProvider: dto.feProvider,
        feEnvironment: dto.feEnvironment,
        feProviderApiKey: dto.feProviderApiKey,
        feProviderApiSecret: dto.feProviderApiSecret,
        feProviderConfig: dto.feProviderConfig ?? {},
      },
    });
  }

  async testFeProviderConnection(tenantId: string, role: string) {
    if (!isTenantAdmin(role)) throw new ForbiddenException('Only tenant admins can test FE connection');
    const config = await this.prisma.fiscalConfig.findFirst({ where: { tenantId } });
    if (!config) throw new BadRequestException('Fiscal configuration not found');
    if (config.feProvider === 'none') {
      return { success: false, message: 'No FE provider configured', provider: 'none' };
    }
    if (!config.feProviderApiKey) {
      return { success: false, message: 'API Key not configured', provider: config.feProvider };
    }

    // Simulate connection test per provider
    // In production, each provider would have its own adapter
    try {
      const result = await this.pingFeProvider(config.feProvider, config.feProviderApiKey, config.feProviderApiSecret, config.feEnvironment);
      return { success: result.ok, message: result.message, provider: config.feProvider, environment: config.feEnvironment };
    } catch (e: any) {
      return { success: false, message: e.message || 'Connection failed', provider: config.feProvider };
    }
  }

  private async pingFeProvider(provider: string, apiKey: string, apiSecret: string | null, environment: string): Promise<{ ok: boolean; message: string }> {
    if (provider === 'factus') {
      return this.testFactusConnection(apiKey, apiSecret ?? '', environment);
    }
    if (provider === 'custom') {
      return { ok: true, message: 'Custom provider — connection not testable automatically' };
    }

    const testUrls: Record<string, string> = {
      siigo:     'https://api.siigo.com/auth',
      alegra:    'https://api.alegra.com/api/v1/ping',
      facturama: environment === 'production'
        ? 'https://api.facturama.mx/api-lite/companies/info'
        : 'https://apisandbox.facturama.mx/api-lite/companies/info',
    };

    const url = testUrls[provider];
    if (!url) return { ok: false, message: `Unknown provider: ${provider}` };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (provider === 'alegra' || provider === 'siigo' || provider === 'facturama') {
      headers['Authorization'] = `Basic ${Buffer.from(`${apiKey}:${apiSecret ?? ''}`).toString('base64')}`;
    }

    const res = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(8000) });
    if (res.ok || res.status === 401) {
      return res.ok
        ? { ok: true, message: 'Conexión exitosa con el proveedor' }
        : { ok: false, message: 'Credenciales inválidas — servidor alcanzable' };
    }
    return { ok: false, message: `Error del servidor: ${res.status}` };
  }

  // ────────────────────────────────────────────────────────────
  // FACTUS — Full integration with DIAN FE provider
  // Docs: https://developers.factus.com.co
  // ────────────────────────────────────────────────────────────

  /** Base URL depending on environment */
  private factusBaseUrl(environment: string) {
    return environment === 'production'
      ? 'https://api.factus.com.co'
      : 'https://api-sandbox.factus.com.co';
  }

  /**
   * OAuth2 password-grant token.
   * feProviderApiKey    = client_id
   * feProviderApiSecret = client_secret
   * feProviderConfig.username = Factus account email
   * feProviderConfig.password = Factus account password
   */
  private async getFactusToken(config: any): Promise<string> {
    const baseUrl  = this.factusBaseUrl(config.feEnvironment ?? 'sandbox');
    const cfg      = (config.feProviderConfig as any) ?? {};
    const body     = new URLSearchParams({
      grant_type:    'password',
      client_id:     config.feProviderApiKey     ?? '',
      client_secret: config.feProviderApiSecret  ?? '',
      username:      cfg.username                ?? '',
      password:      cfg.password                ?? '',
    });

    const res = await fetch(`${baseUrl}/oauth/token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
      signal:  AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new BadRequestException(`Factus auth error ${res.status}: ${err}`);
    }

    const data = await res.json() as any;
    if (!data.access_token) throw new BadRequestException('Factus did not return an access_token');
    return data.access_token as string;
  }

  /** Test Factus connection by obtaining a token and calling /v1/companies */
  private async testFactusConnection(clientId: string, clientSecret: string, environment: string): Promise<{ ok: boolean; message: string }> {
    try {
      const baseUrl = this.factusBaseUrl(environment);
      const body    = new URLSearchParams({
        grant_type:    'password',
        client_id:     clientId,
        client_secret: clientSecret,
        username:      '',
        password:      '',
      });
      const res = await fetch(`${baseUrl}/oauth/token`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    body.toString(),
        signal:  AbortSignal.timeout(8000),
      });
      if (res.ok) return { ok: true, message: 'Conexión con Factus exitosa' };
      if (res.status === 401) return { ok: false, message: 'Credenciales Factus inválidas (client_id / client_secret)' };
      return { ok: false, message: `Factus respondió con error ${res.status}` };
    } catch (e: any) {
      return { ok: false, message: `No se pudo conectar con Factus: ${e.message}` };
    }
  }

  /**
   * Map a Glamorapp Invoice + FiscalConfig to Factus /v2/bills/validate payload.
   * Reference: https://developers.factus.com.co/facturas/descripcion-de-campos
   */
  private buildFactusPayload(invoice: any, fiscalConfig: any): Record<string, any> {
    const cfg = (fiscalConfig.feProviderConfig as any) ?? {};

    // Determine numbering range ID from config (set in FE provider config)
    const numberingRangeId = cfg.numberingRangeId ?? null;

    // Map payment form: '1' = Contado, '2' = Crédito
    const paymentForm = invoice.paymentMeansCode === '2' ? '2' : '1';

    // Map payment method to Factus codes
    const methodMap: Record<string, string> = {
      '10': '10',  // Efectivo
      '42': '42',  // Transferencia
      '48': '48',  // Tarjeta débito
      '49': '49',  // Tarjeta crédito
      '71': '71',  // Nequi / Daviplata
      '20': '20',  // Cheque
    };
    const paymentMethodCode = methodMap[invoice.paymentMethodCode ?? '10'] ?? '10';

    return {
      numbering_range_id: numberingRangeId,
      reference_code:     invoice.invoiceNumber,
      observation:        invoice.notes ?? undefined,
      payment_details: [{
        payment_form:        paymentForm,
        payment_method_code: paymentMethodCode,
        amount:              String(Number(invoice.total).toFixed(2)),
        due_date:            invoice.dueDate
          ? new Date(invoice.dueDate).toISOString().split('T')[0]
          : undefined,
      }],
      // Establishment from fiscal config
      establishment: {
        address:           fiscalConfig.fiscalAddress  ?? '',
        phone_number:      fiscalConfig.fiscalPhone    ?? '',
        email:             fiscalConfig.fiscalEmail    ?? '',
        municipality_code: fiscalConfig.cityCode       ?? '001',
      },
      // Customer / Receiver
      customer: {
        identification_document_code: this.mapIdTypeToFactus(invoice.receiverIdType ?? 'cc'),
        identification:               invoice.receiverIdNumber ?? '222222222222',
        dv:                           invoice.receiverDv       ?? undefined,
        legal_organization_code:      invoice.receiverIdType === 'nit' ? '1' : '2',
        tribute_code:                 this.mapTaxRegimeToFactus(invoice.receiverTaxRegime ?? 'simplificado'),
        company:                      invoice.receiverIdType === 'nit' ? invoice.receiverName : undefined,
        names:                        invoice.receiverIdType !== 'nit' ? invoice.receiverName : undefined,
        address:                      invoice.receiverAddress   ?? undefined,
        email:                        invoice.receiverEmail     ?? undefined,
        phone:                        invoice.receiverPhone     ?? undefined,
        municipality_code:            invoice.receiverCityCode  ?? '001',
      },
      // Line items
      items: (invoice.items ?? []).map((item: any, idx: number) => ({
        code_reference:  item.code || `ITEM-${idx + 1}`,
        name:            item.description,
        quantity:        Number(item.quantity),
        discount_rate:   Number(item.discountRate ?? 0).toFixed(2),
        price:           Number(item.unitPrice).toFixed(2),
        unit_measure_id: this.mapUnitMeasureToFactus(item.unitMeasure ?? '94'),
        standard_code_id: 1, // 01 = Código estándar del artículo (UNSPC)
        is_excluded:     item.isIvaExcluded ? 1 : 0,
        tribute_id:      this.mapIvaRateToFactusTribute(Number(item.ivaRate ?? 19)),
        withheld_amount: Number(item.retefuenteAmount ?? 0).toFixed(2),
      })),
    };
  }

  /** Map Colombian ID type to Factus identification_document_code */
  private mapIdTypeToFactus(idType: string): string {
    const map: Record<string, string> = {
      cc:         '13',  // Cédula de ciudadanía
      nit:        '31',  // NIT
      ce:         '22',  // Cédula de extranjería
      pasaporte:  '41',  // Pasaporte
      ti:         '12',  // Tarjeta de identidad
    };
    return map[idType?.toLowerCase()] ?? '13';
  }

  /** Map tax regime to Factus tribute_code */
  private mapTaxRegimeToFactus(taxRegime: string): string {
    if (taxRegime === 'responsable_iva')   return '01'; // Responsable de IVA
    if (taxRegime === 'gran_contribuyente') return '01';
    return 'ZZ'; // No responsable (simplificado)
  }

  /** Map unit measure code to Factus unit_measure_id */
  private mapUnitMeasureToFactus(unitMeasure: string): number {
    const map: Record<string, number> = {
      '94': 70,   // Unidad — id 70 in Factus
      '58': 886,  // Servicio — id 886 in Factus
      'HUR': 356, // Hora
      'KGM': 35,  // Kilogramo
      'GRM': 32,  // Gramo
      'LTR': 45,  // Litro
      'MLT': 47,  // Mililitro
    };
    return map[unitMeasure] ?? 70;
  }

  /** Map IVA rate to Factus tribute_id */
  private mapIvaRateToFactusTribute(ivaRate: number): number {
    if (ivaRate === 19) return 1;   // IVA 19%
    if (ivaRate === 5)  return 4;   // IVA 5%
    if (ivaRate === 0)  return 15;  // No aplica / Excluido
    return 1;
  }

  /**
   * Send a draft invoice to Factus for DIAN validation.
   * Called automatically after invoice creation when feProvider === 'factus'.
   */
  async sendInvoiceToFactus(invoiceId: string, tenantId: string): Promise<void> {
    const [invoice, fiscalConfig] = await Promise.all([
      this.prisma.invoice.findFirst({
        where: { id: invoiceId, tenantId },
        include: { items: true },
      }),
      this.prisma.fiscalConfig.findFirst({ where: { tenantId } }),
    ]);

    if (!invoice || !fiscalConfig) return;
    if (fiscalConfig.feProvider !== 'factus') return;

    const baseUrl = this.factusBaseUrl(fiscalConfig.feEnvironment ?? 'sandbox');

    try {
      // 1. Get OAuth token
      const token   = await this.getFactusToken(fiscalConfig);
      const payload = this.buildFactusPayload(invoice, fiscalConfig);

      // 2. Send to Factus /v2/bills/validate
      const res = await fetch(`${baseUrl}/v2/bills/validate`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept':        'application/json',
        },
        body:   JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });

      const data = await res.json() as any;

      if (res.ok && data.data) {
        // 3a. Success — update invoice with CUFE and status
        const bill = data.data;
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status:           'approved',
            cufe:             bill.cufe           ?? bill.cude ?? null,
            dianValidatedAt:  new Date(),
            xmlUrl:           bill.xml_file_base64 ? null : null, // store separately if needed
            pdfUrl:           bill.pdf_file_base64 ? null : null,
            dianResponse:     data,
          },
        });
      } else {
        // 3b. Rejected by Factus / DIAN
        const errorMsg = data.message
          ?? data.errors
          ?? `Error ${res.status}`;
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status:               'rejected',
            dianRejectionReason:  typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg),
            dianResponse:         data,
          },
        });
      }
    } catch (err: any) {
      // Network / timeout error — mark as pending for retry
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status:              'pending_dian',
          dianRejectionReason: `Error de conexión con Factus: ${err.message}`,
        },
      });
    }
  }

  /**
   * Resend a previously created invoice to Factus (manual retry from UI).
   */
  async resendInvoiceToFactus(invoiceId: string, tenantId: string, role: string): Promise<any> {
    if (!isTenantAdmin(role)) throw new ForbiddenException('Only tenant admins can resend invoices to DIAN');
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    await this.sendInvoiceToFactus(invoiceId, tenantId);
    return this.prisma.invoice.findFirst({ where: { id: invoiceId } });
  }

  /**
   * Download invoice PDF from Factus and return base64.
   */
  async downloadFactusPdf(invoiceId: string, tenantId: string): Promise<{ pdf: string; filename: string }> {
    const [invoice, fiscalConfig] = await Promise.all([
      this.prisma.invoice.findFirst({ where: { id: invoiceId, tenantId } }),
      this.prisma.fiscalConfig.findFirst({ where: { tenantId } }),
    ]);
    if (!invoice || !fiscalConfig) throw new NotFoundException('Invoice or fiscal config not found');
    if (fiscalConfig.feProvider !== 'factus') throw new BadRequestException('FE provider is not Factus');
    if (!invoice.cufe) throw new BadRequestException('Invoice has no CUFE — send to DIAN first');

    const baseUrl = this.factusBaseUrl(fiscalConfig.feEnvironment ?? 'sandbox');
    const token   = await this.getFactusToken(fiscalConfig);

    const res = await fetch(`${baseUrl}/v2/bills/download-pdf/${invoice.invoiceNumber}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal:  AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new BadRequestException(`Factus PDF error: ${res.status}`);
    const data = await res.json() as any;

    return {
      pdf:      data.data?.pdf_base64 ?? data.pdf_base64 ?? '',
      filename: `factura-${invoice.invoiceNumber}.pdf`,
    };
  }
}
