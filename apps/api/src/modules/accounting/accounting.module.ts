import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';

/**
 * Accounting Module — Módulo de Contabilidad
 *
 * Facturación electrónica DIAN (Colombia), impuestos IVA/ICA/ReteFuente/ReteIVA/ReteICA,
 * transacciones contables, declaraciones de impuestos y reportes financieros.
 */
@Module({
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
