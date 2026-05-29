import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';

/**
 * Accounting Module — SKELETON (Fase 9)
 * 
 * Reservado para implementación futura del módulo de contabilidad.
 * Referencia: /mnt/d/propios/Glamorapp/contabilidad.pdf
 * 
 * Funcionalidades planeadas:
 * - Catálogo de cuentas contables
 * - Pólizas / asientos contables (journal entries)
 * - Libro diario y mayor
 * - Estados financieros (balance, estado de resultados)
 * - Conciliación bancaria
 * - Cuentas por cobrar / pagar
 * - Cálculo de impuestos
 * - Reportes fiscales (SAT México)
 * - Integración con ventas, gastos, compras, nómina
 */
@Module({
  controllers: [AccountingController],
  providers: [AccountingService],
})
export class AccountingModule {}
