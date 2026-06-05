import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Audit } from '../audit/audit.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@ApiTags('Sales')
@Controller('sales')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Query() query: PaginationDto & { status?: string; customerId?: string },
  ) {
    return this.salesService.findAll(tenantId, storeId, query);
  }

  @Get('summary/today')
  getTodaySummary(@TenantId() tenantId: string, @StoreId() storeId: string) {
    return this.salesService.getTodaySummary(tenantId, storeId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @StoreId() storeId: string, @Param('id') id: string) {
    return this.salesService.findOne(tenantId, storeId, id);
  }

  @Post()
  @Audit('sales', 'create', 'Venta #{folio} creada', { entityIdFrom: 'result' })
  create(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.salesService.create(tenantId, storeId, userId, dto);
  }

  @Post(':id/complete')
  @Audit('sales', 'sale', 'Venta #{folio} completada por ${total}', { entityIdFrom: 'param' })
  complete(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Param('id') id: string,
    @Body('payments') payments: any[],
  ) {
    return this.salesService.complete(tenantId, storeId, id, payments);
  }

  @Post(':id/cancel')
  @Audit('sales', 'void_sale', 'Venta #{folio} cancelada', { entityIdFrom: 'param' })
  cancel(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.salesService.cancel(tenantId, storeId, id, reason);
  }

  @Post(':id/refund')
  @Audit('sales', 'void_sale', 'Devolución parcial en venta #{folio}', { entityIdFrom: 'param' })
  refund(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Param('id') id: string,
    @Body() dto: { items: { saleItemId: string; quantity: number }[]; reason: string; refundMethod: string },
  ) {
    return this.salesService.refund(tenantId, storeId, id, dto);
  }
}
