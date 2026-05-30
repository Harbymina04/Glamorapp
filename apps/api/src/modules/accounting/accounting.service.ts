import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getPaginationParams } from '../../common/utils/pagination';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { CreateFiscalConfigDto, UpdateFiscalConfigDto } from './dto/fiscal-config.dto';
import { CreateInvoiceDto } from './dto/invoice.dto';
import { CreateTransactionDto } from './dto/transaction.dto';

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
    return this.prisma.fiscalConfig.create({ data: { tenantId, ...data } });
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
}
