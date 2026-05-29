import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('movements')
  getMovements(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Query() query: PaginationDto & { productId?: string; type?: string },
  ) {
    return this.inventoryService.getMovements(tenantId, storeId, query);
  }

  @Post('movements')
  createMovement(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.inventoryService.createMovement(tenantId, storeId, dto, userId);
  }

  @Get('alerts')
  getAlerts(@TenantId() tenantId: string, @StoreId() storeId: string) {
    return this.inventoryService.getAlerts(tenantId, storeId);
  }

  @Get('summary')
  getSummary(@TenantId() tenantId: string, @StoreId() storeId: string) {
    return this.inventoryService.getSummary(tenantId, storeId);
  }
}
