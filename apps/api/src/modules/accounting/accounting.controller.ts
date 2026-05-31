import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateFiscalConfigDto } from './dto/fiscal-config.dto';
import { CreateInvoiceDto } from './dto/invoice.dto';
import { CreateTransactionDto } from './dto/transaction.dto';

@ApiTags('Accounting')
@Controller('accounting')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin', 'tenant_admin', 'store_admin')
@ApiBearerAuth()
export class AccountingController {
  constructor(private service: AccountingService) {}

  // Helper to extract role from request
  private role(req: any): string {
    return req.user.role || 'store_admin';
  }

  // ─── Dashboard ────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Accounting dashboard — scoped by role' })
  getDashboard(@Request() req: any) {
    return this.service.getDashboard(req.user.tenantId, req.user.storeId, this.role(req));
  }

  // ─── Fiscal Config (tenant admin only) ───────────────────
  @Get('fiscal-config')
  @ApiOperation({ summary: 'Get tenant fiscal configuration (tenant admin only)' })
  getFiscalConfig(@Request() req: any) {
    return this.service.getFiscalConfig(req.user.tenantId, this.role(req));
  }

  @Put('fiscal-config')
  @ApiOperation({ summary: 'Create or update tenant fiscal configuration (tenant admin only)' })
  upsertFiscalConfig(@Request() req: any, @Body() dto: CreateFiscalConfigDto) {
    return this.service.upsertFiscalConfig(req.user.tenantId, this.role(req), dto);
  }

  // ─── Tax Rates ────────────────────────────────────────────
  @Get('tax-rates')
  @ApiOperation({ summary: 'Get active tax rates' })
  getTaxRates(@Request() req: any) {
    return this.service.getTaxRates(req.user.tenantId);
  }

  @Post('tax-rates')
  @ApiOperation({ summary: 'Create tax rate (tenant admin only)' })
  createTaxRate(@Request() req: any, @Body() dto: any) {
    return this.service.createTaxRate(req.user.tenantId, this.role(req), dto);
  }

  @Put('tax-rates/:id')
  @ApiOperation({ summary: 'Update tax rate (tenant admin only)' })
  updateTaxRate(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.updateTaxRate(req.user.tenantId, this.role(req), id, dto);
  }

  @Delete('tax-rates/:id')
  @ApiOperation({ summary: 'Deactivate tax rate (tenant admin only)' })
  deleteTaxRate(@Request() req: any, @Param('id') id: string) {
    return this.service.deleteTaxRate(req.user.tenantId, this.role(req), id);
  }

  // ─── Invoices ─────────────────────────────────────────────
  @Get('invoices')
  @ApiOperation({ summary: 'List invoices — store_admin sees own store, tenant_admin sees all' })
  getInvoices(@Request() req: any, @Query() query: any) {
    return this.service.getInvoices(req.user.tenantId, req.user.storeId, this.role(req), query);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice by id' })
  getInvoice(@Request() req: any, @Param('id') id: string) {
    return this.service.getInvoice(req.user.tenantId, req.user.storeId, this.role(req), id);
  }

  @Post('invoices')
  @ApiOperation({ summary: 'Create invoice (uses tenant-level fiscal config for consecutive)' })
  createInvoice(@Request() req: any, @Body() dto: CreateInvoiceDto) {
    return this.service.createInvoice(req.user.tenantId, req.user.storeId, req.user.sub, this.role(req), dto);
  }

  @Patch('invoices/:id/cancel')
  @ApiOperation({ summary: 'Cancel an invoice' })
  cancelInvoice(@Request() req: any, @Param('id') id: string) {
    return this.service.cancelInvoice(req.user.tenantId, req.user.storeId, this.role(req), id);
  }

  @Patch('invoices/:id/status')
  @ApiOperation({ summary: 'Update invoice status (DIAN webhook)' })
  updateInvoiceStatus(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.updateInvoiceStatus(req.user.tenantId, req.user.storeId, this.role(req), id, body.status, body);
  }

  // ─── Accounting Transactions ──────────────────────────────
  @Get('transactions')
  @ApiOperation({ summary: 'List transactions — store_admin sees own store, tenant_admin sees all' })
  getTransactions(@Request() req: any, @Query() query: any) {
    return this.service.getTransactions(req.user.tenantId, req.user.storeId, this.role(req), query);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get transaction by id' })
  getTransaction(@Request() req: any, @Param('id') id: string) {
    return this.service.getTransaction(req.user.tenantId, req.user.storeId, this.role(req), id);
  }

  @Post('transactions')
  @ApiOperation({ summary: 'Create accounting transaction' })
  createTransaction(@Request() req: any, @Body() dto: CreateTransactionDto) {
    return this.service.createTransaction(req.user.tenantId, req.user.storeId, req.user.sub, dto);
  }

  @Patch('transactions/:id/void')
  @ApiOperation({ summary: 'Void a transaction' })
  voidTransaction(@Request() req: any, @Param('id') id: string) {
    return this.service.voidTransaction(req.user.tenantId, req.user.storeId, this.role(req), id);
  }

  @Patch('transactions/:id/reconcile')
  @ApiOperation({ summary: 'Reconcile transaction (tenant admin only)' })
  reconcileTransaction(@Request() req: any, @Param('id') id: string) {
    return this.service.reconcileTransaction(req.user.tenantId, req.user.storeId, this.role(req), id, req.user.sub);
  }

  // ─── Tax Summary & Declarations (tenant admin only) ───────
  @Get('tax-summary')
  @ApiOperation({ summary: 'Tax summary by period (tenant admin only)' })
  getTaxSummary(@Request() req: any, @Query('year') year: string, @Query('month') month?: string) {
    return this.service.getTaxSummary(
      req.user.tenantId, req.user.storeId, this.role(req),
      parseInt(year), month ? parseInt(month) : undefined,
    );
  }

  @Get('tax-declarations')
  @ApiOperation({ summary: 'List tax declarations (tenant admin only)' })
  getTaxDeclarations(@Request() req: any, @Query() query: any) {
    return this.service.getTaxDeclarations(req.user.tenantId, this.role(req), query);
  }

  @Post('tax-declarations')
  @ApiOperation({ summary: 'Create/update tax declaration (tenant admin only)' })
  createTaxDeclaration(@Request() req: any, @Body() dto: any) {
    return this.service.createTaxDeclaration(req.user.tenantId, this.role(req), dto);
  }

  // ─── Financial Reports ────────────────────────────────────
  @Get('reports/income-statement')
  @ApiOperation({ summary: 'P&L report — store_admin sees own store, tenant_admin can filter by storeId' })
  getIncomeStatement(
    @Request() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') filterStoreId?: string,
  ) {
    return this.service.getIncomeStatement(req.user.tenantId, req.user.storeId, this.role(req), from, to, filterStoreId);
  }

  @Get('reports/cash-flow')
  @ApiOperation({ summary: 'Cash flow report — store_admin sees own store, tenant_admin can filter' })
  getCashFlow(
    @Request() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('storeId') filterStoreId?: string,
  ) {
    return this.service.getCashFlow(req.user.tenantId, req.user.storeId, this.role(req), from, to, filterStoreId);
  }

  // ─── IVA & ReteFuente Liquidation ────────────────────────
  @Get('reports/iva-liquidation')
  @ApiOperation({ summary: 'IVA pre-liquidation Form. 300 — tenant admin only' })
  getIvaLiquidation(
    @Request() req: any,
    @Query('year') year: string,
    @Query('bimester') bimester: string,
  ) {
    return this.service.getIvaLiquidation(req.user.tenantId, this.role(req), parseInt(year), parseInt(bimester));
  }

  @Get('reports/retefuente-liquidation')
  @ApiOperation({ summary: 'ReteFuente pre-liquidation Form. 350 — tenant admin only' })
  getRetefuenteLiquidation(
    @Request() req: any,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.service.getRetefuenteLiquidation(req.user.tenantId, this.role(req), parseInt(year), parseInt(month));
  }

  @Get('reports/export')
  @ApiOperation({ summary: 'Export accountant Excel report (tenant admin only)' })
  async exportAccountantReport(
    @Request() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.exportAccountantReport(req.user.tenantId, this.role(req), from, to);
    const filename = `glamorapp-contabilidad-${from}-${to}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  // ─── FE Provider ─────────────────────────────────────────
  @Put('fe-provider')
  @ApiOperation({ summary: 'Update FE provider credentials (tenant admin only)' })
  updateFeProvider(@Request() req: any, @Body() dto: any) {
    return this.service.updateFeProvider(req.user.tenantId, this.role(req), dto);
  }

  @Post('fe-provider/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test FE provider connection (tenant admin only)' })
  testFeProvider(@Request() req: any) {
    return this.service.testFeProviderConnection(req.user.tenantId, this.role(req));
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
