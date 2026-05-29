import { Controller, Get, Post, Query, Param, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * Accounting Controller — SKELETON (Fase 9)
 *
 * Módulo de contabilidad bajo NIIF para Colombia.
 * Referencia: contabilidad.pdf en raíz del proyecto.
 *
 * Estándares implementados:
 * - NIIF para PYMES (adoptado en Colombia desde 2016)
 * - Plan Único de Cuentas (PUC) para comercio
 * - Impuestos: IVA 19%, retefuente, ICA, industria y comercio
 * - Facturación electrónica DIAN
 * - Estados financieros: ESFA, balance, estado de resultados, flujo de efectivo
 * - Cierre contable anual
 * - Medios magnéticos / información exógena DIAN
 */
@ApiTags('Accounting')
@Controller('accounting')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('tenant_admin', 'store_admin')
@ApiBearerAuth()
export class AccountingController {
  constructor(private service: AccountingService) {}

  // ─── Catálogo de cuentas (PUC Colombia) ──────────────────
  @Get('accounts')
  getAccounts(@Request() req: any) {
    return this.service.getAccounts(req.user.tenantId);
  }

  // ─── Comprobantes / Asientos contables ────────────────────
  @Get('entries')
  getEntries(@Request() req: any, @Query('storeId') storeId?: string) {
    return this.service.getJournalEntries(req.user.tenantId, storeId);
  }

  // ─── Libro diario y mayor ─────────────────────────────────
  @Get('ledger')
  getLedger(@Request() req: any, @Query('storeId') storeId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getLedger(req.user.tenantId, storeId, from, to);
  }

  // ─── Estados financieros ──────────────────────────────────
  @Get('balance-sheet')
  getBalanceSheet(@Request() req: any, @Query('storeId') storeId?: string, @Query('asOf') asOf?: string) {
    return this.service.getBalanceSheet(req.user.tenantId, storeId);
  }

  @Get('income-statement')
  getIncomeStatement(@Request() req: any, @Query('storeId') storeId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getIncomeStatement(req.user.tenantId, storeId);
  }

  // ─── Impuestos ────────────────────────────────────────────
  @Get('taxes')
  getTaxSummary(@Request() req: any, @Query('storeId') storeId?: string, @Query('year') year?: number, @Query('month') month?: number) {
    return this.service.getTaxSummary(req.user.tenantId, storeId, year, month);
  }

  // ─── Cierres contables ────────────────────────────────────
  @Get('closings')
  getClosings(@Request() req: any, @Query('storeId') storeId?: string) {
    return this.service.getClosings(req.user.tenantId, storeId);
  }

  @Post('closings')
  closePeriod(@Request() req: any, @Query('storeId') storeId?: string, @Query('year') year?: number, @Query('month') month?: number) {
    return this.service.closePeriod(req.user.tenantId, storeId, year, month);
  }
}
