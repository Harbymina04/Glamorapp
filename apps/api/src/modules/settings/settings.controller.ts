import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles('store_admin', 'tenant_admin')
@ApiBearerAuth()
export class SettingsController {
  constructor(private service: SettingsService) {}

  @Get()
  getSettings(@TenantId() t: string, @StoreId() s: string) { return this.service.getStore(t, s); }

  @Put('general')
  updateGeneral(@TenantId() t: string, @StoreId() s: string, @Body() d: any) { return this.service.updateGeneral(t, s, d); }

  @Put('appearance')
  updateAppearance(@TenantId() t: string, @StoreId() s: string, @Body() d: any) { return this.service.updateAppearance(t, s, d); }

  @Put('sales')
  updateSales(@TenantId() t: string, @StoreId() s: string, @Body() d: any) { return this.service.updateSales(t, s, d); }

  @Put('pos')
  updatePos(@TenantId() t: string, @StoreId() s: string, @Body() d: any) { return this.service.updatePos(t, s, d); }
}
