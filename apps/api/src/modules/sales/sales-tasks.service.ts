import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SalesService } from './sales.service';

/**
 * Tareas programadas de ventas.
 *
 * Libera el stock retenido por ventas pendientes abandonadas. La ventana de
 * expiración es configurable con SALE_HOLD_EXPIRY_HOURS (por defecto 24h), lo
 * bastante amplia para no afectar ventas POS/online en curso.
 */
@Injectable()
export class SalesTasksService {
  private readonly logger = new Logger(SalesTasksService.name);

  constructor(
    private readonly sales: SalesService,
    private readonly config: ConfigService,
  ) {}

  private get expiryHours(): number {
    const raw = Number(this.config.get('SALE_HOLD_EXPIRY_HOURS'));
    return Number.isFinite(raw) && raw > 0 ? raw : 24;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async releaseStaleHolds() {
    const count = await this.sales.expireStalePendingSales(this.expiryHours);
    if (count > 0) {
      this.logger.log(`[SalesTasks] Ventas pendientes expiradas: ${count} (stock liberado)`);
    }
  }
}
