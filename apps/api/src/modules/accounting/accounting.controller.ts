import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateFiscalConfigDto, UpdateFiscalConfigDto } from './dto/fiscal-config.dto';
import { CreateInvoiceDto } from './dto/invoice.dto';
import { CreateTransactionDto } from './dto/transaction.dto';

@ApiTags('Accounting')
@Controller('accounting')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin', 'tenant_admin', 'store_admin')
@ApiBearerAuth()
export class AccountingController {
  constructor(private service: AccountingService) {}

  // ─── Dashboard ────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Get accounting dashboard summary' })
  getDashboard(@Request() req: any) {
    return this.service.getDashboard(req.user.tenantId, req.user.storeId);
  }

  // ─── Fiscal Config ────────────────────────────────────────
  @Get('fiscal-config')
  @ApiOperation({ summary: 'Get fiscal configuration' })
  getFiscalConfig(@Request() req: any) {
    return this.service.getFiscalConfig(req.user.tenantId, req.user.storeId);
  }

  @Put('fiscal-config')
  @ApiOperation({ summary: 'Create or update fiscal configuration' })
  upsertFiscalConfig(@Request() req: any, @Body() dto: CreateFiscalConfigDto) {
    return this.service.upsertFiscalConfig(req.user.tenantId, req.user.storeId, dto);
  }

  // ─── Tax Rates ────────────────────────────────────────────
  @Get('tax-rates')
  @ApiOperation({ summary: 'Get active tax rates' })
  getTaxRates(@Request() req: any) {
    return this.service.getTaxRates(req.user.tenantId);
  }

  @Post('tax-rates')
  @ApiOperation({ summary: 'Create a tax rate' })
  createTaxRate(@Request() req: any, @Body() dto: any) {
    return this.service.createTaxRate(req.user.tenantId, dto);
  }

  @Put('tax-rates/:id')
  @ApiOperation({ summary: 'Update a tax rate' })
  updateTaxRate(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateTaxRate(req.user.tenantId, id, dto);
  }

  @Delete('tax-rates/:id')
  @ApiOperation({ summary: 'Deactivate a tax rate' })
  deleteTaxRate(@Request() req: any, @Param('id') id: string) {
    return this.service.deleteTaxRate(req.user.tenantId, id);
  }

  // ─── Invoices ─────────────────────────────────────────────
  @Get('invoices')
  @ApiOperation({ summary: 'List invoices' })
  getInvoices(@Request() req: any, @Query() query: any) {
    return this.service.getInvoices(req.user.tenantId, req.user.storeId, query);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice by id' })
  getInvoice(@Request() req: any, @Param('id') id: string) {
    return this.service.getInvoice(req.user.tenantId, req.user.storeId, id);
  }

  @Post('invoices')
  @ApiOperation({ summary: 'Create invoice' })
  createInvoice(@Request() req: any, @Body() dto: CreateInvoiceDto) {
    return this.service.createInvoice(req.user.tenantId, req.user.storeId, req.user.sub, dto);
  }

  @Patch('invoices/:id/cancel')
  @ApiOperation({ summary: 'Cancel an invoice' })
  cancelInvoice(@Request() req: any, @Param('id') id: string) {
    return this.service.cancelInvoice(req.user.tenantId, req.user.storeId, id);
  }

  @Patch('invoices/:id/status')
  @ApiOperation({ summary: 'Update invoice status (DIAN response)' })
  updateInvoiceStatus(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.updateInvoiceStatus(req.user.tenantId, req.user.storeId, id, body.status, body);
  }

  // ─── Accounting Transactions ──────────────────────────────
  @Get('transactions')
  @ApiOperation({ summary: 'List accounting transactions' })
  getTransactions(@Request() req: any, @Query() query: any) {
    return this.service.getTransactions(req.user.tenantId, req.user.storeId, query);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get transaction by id' })
  getTransaction(@Request() req: any, @Param('id') id: string) {
    return this.service.getTransaction(req.user.tenantId, req.user.storeId, id);
  }

  @Post('transactions')
  @ApiOperation({ summary: 'Create accounting transaction' })
  createTransaction(@Request() req: any, @Body() dto: CreateTransactionDto) {
    return this.service.createTransaction(req.user.tenantId, req.user.storeId, req.user.sub, dto);
  }

  @Patch('transactions/:id/void')
  @ApiOperation({ summary: 'Void a transaction' })
  voidTransaction(@Request() req: any, @Param('id') id: string) {
    return this.service.voidTransaction(req.user.tenantId, req.user.storeId, id);
  }

  @Patch('transactions/:id/reconcile')
  @ApiOperation({ summary: 'Mark transaction as reconciled' })
  reconcileTransaction(@Request() req: any, @Param('id') id: string) {
    return this.service.reconcileTransaction(req.user.tenantId, req.user.storeId, id, req.user.sub);
  }

  // ─── Tax Summary & Declarations ──────────────────────────
  @Get('tax-summary')
  @ApiOperation({ summary: 'Get tax summary for a period' })
  getTaxSummary(@Request() req: any, @Query('year') year: string, @Query('month') month?: string) {
    return this.service.getTaxSummary(req.user.tenantId, req.user.storeId, parseInt(year), month ? parseInt(month) : undefined);
  }

  @Get('tax-declarations')
  @ApiOperation({ summary: 'List tax declarations' })
  getTaxDeclarations(@Request() req: any, @Query() query: any) {
    return this.service.getTaxDeclarations(req.user.tenantId, query);
  }

  @Post('tax-declarations')
  @ApiOperation({ summary: 'Create or update a tax declaration' })
  createTaxDeclaration(@Request() req: any, @Body() dto: any) {
    return this.service.createTaxDeclaration(req.user.tenantId, dto);
  }

  // ─── Financial Reports ────────────────────────────────────
  @Get('reports/income-statement')
  @ApiOperation({ summary: 'Get income statement (P&L)' })
  getIncomeStatement(@Request() req: any, @Query('from') from: string, @Query('to') to: string) {
    return this.service.getIncomeStatement(req.user.tenantId, req.user.storeId, from, to);
  }

  @Get('reports/cash-flow')
  @ApiOperation({ summary: 'Get cash flow report' })
  getCashFlow(@Request() req: any, @Query('from') from: string, @Query('to') to: string) {
    return this.service.getCashFlow(req.user.tenantId, req.user.storeId, from, to);
  }

  // ─── Auto-register (internal triggers) ───────────────────
  @Post('register/sale/:saleId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Auto-register sale as accounting transaction' })
  registerSale(@Request() req: any, @Param('saleId') saleId: string) {
    return this.service.registerSaleTransaction(req.user.tenantId, req.user.storeId, saleId, req.user.sub);
  }

  @Post('register/expense/:expenseId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Auto-register expense as accounting transaction' })
  registerExpense(@Request() req: any, @Param('expenseId') expenseId: string) {
    return this.service.registerExpenseTransaction(req.user.tenantId, req.user.storeId, expenseId, req.user.sub);
  }
}
