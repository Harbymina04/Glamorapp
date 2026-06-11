import { Controller, Get, Post, Body, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScope } from '../../common/decorators/require-scope.decorator';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Audit } from '../audit/audit.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { CreateTransferDto } from './dto/transfer.dto';
import { CreateMovementDto } from './dto/create-movement.dto';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, TenantGuard, ScopesGuard, SubscriptionGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('movements')
  @RequireScope('inventory', 'view')
  getMovements(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Query() query: PaginationDto & { productId?: string; type?: string },
  ) {
    return this.inventoryService.getMovements(tenantId, storeId, query);
  }

  @Post('movements')
  @RequireScope('inventory', 'create')
  @Audit('inventory', 'inventory_change', 'Movimiento de inventario: {movementType} x{quantity}')
  createMovement(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMovementDto,
  ) {
    return this.inventoryService.createMovement(tenantId, storeId, dto, userId);
  }

  @Get('alerts')
  @RequireScope('inventory', 'view')
  getAlerts(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getAlerts(tenantId, storeId, limit ? parseInt(limit) : 100);
  }

  @Get('summary')
  @RequireScope('inventory', 'view')
  getSummary(@TenantId() tenantId: string, @StoreId() storeId: string) {
    return this.inventoryService.getSummary(tenantId, storeId);
  }

  // ── Transfers ────────────────────────────────────────────────────

  @Get('transfers/stores')
  @RequireScope('inventory', 'view')
  getTransferableStores(@TenantId() tenantId: string, @StoreId() storeId: string) {
    return this.inventoryService.getTenantStores(tenantId, storeId);
  }

  @Get('transfers')
  @RequireScope('inventory', 'view')
  getTransfers(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Query() query: PaginationDto,
  ) {
    return this.inventoryService.getTransfers(tenantId, storeId, query);
  }

  @Post('transfers')
  @RequireScope('inventory', 'edit')
  @Audit('inventory', 'inventory_transfer', 'Transferencia {transferNumber}: {quantity} unidades → {toStoreId}')
  createTransfer(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTransferDto,
  ) {
    return this.inventoryService.createTransfer(tenantId, storeId, dto, userId);
  }
}
