import { Controller, Get, Put, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../audit/audit.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles('store_admin', 'tenant_admin')
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class SettingsController {
  constructor(private service: SettingsService) {}

  @Get()
  getSettings(@TenantId() t: string, @StoreId() s: string) { return this.service.getStore(t, s); }

  // Flags mínimos que el POS necesita para calcular totales. Accesible al
  // cajero (el GET completo de settings es solo para admins).
  @Get('pos-config')
  @Roles('superadmin', 'tenant_admin', 'store_admin', 'cashier')
  getPosConfig(@TenantId() t: string, @StoreId() s: string) { return this.service.getPosConfig(t, s); }

  @Put('general')
  @Audit('settings', 'config_change', 'Configuración general actualizada')
  updateGeneral(@TenantId() t: string, @StoreId() s: string, @Body() d: any) { return this.service.updateGeneral(t, s, d); }

  @Put('appearance')
  @Audit('settings', 'config_change', 'Apariencia del negocio actualizada')
  updateAppearance(@TenantId() t: string, @StoreId() s: string, @Body() d: any) { return this.service.updateAppearance(t, s, d); }

  @Put('sales')
  @Audit('settings', 'config_change', 'Configuración de ventas actualizada')
  updateSales(@TenantId() t: string, @StoreId() s: string, @Body() d: any) { return this.service.updateSales(t, s, d); }

  @Put('pos')
  @Audit('settings', 'config_change', 'Configuración de caja actualizada')
  updatePos(@TenantId() t: string, @StoreId() s: string, @Body() d: any) { return this.service.updatePos(t, s, d); }
}
