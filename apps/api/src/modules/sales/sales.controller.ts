import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
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
import { CreateSaleDto, CompleteSaleDto, CancelSaleDto, RefundSaleDto } from './dto/sale.dto';

@ApiTags('Sales')
@Controller('sales')
@UseGuards(JwtAuthGuard, TenantGuard, ScopesGuard, SubscriptionGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Get()
  @RequireScope('pos', 'view')
  findAll(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Query() query: PaginationDto & { status?: string; customerId?: string },
  ) {
    return this.salesService.findAll(tenantId, storeId, query);
  }

  @Get('summary/today')
  @RequireScope('pos', 'view')
  getTodaySummary(@TenantId() tenantId: string, @StoreId() storeId: string) {
    return this.salesService.getTodaySummary(tenantId, storeId);
  }

  @Get(':id')
  @RequireScope('pos', 'view')
  findOne(@TenantId() tenantId: string, @StoreId() storeId: string, @Param('id') id: string) {
    return this.salesService.findOne(tenantId, storeId, id);
  }

  @Post()
  @RequireScope('pos', 'create')
  @Audit('sales', 'create', 'Venta #{folio} creada', { entityIdFrom: 'result' })
  create(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSaleDto,
  ) {
    return this.salesService.create(tenantId, storeId, userId, dto);
  }

  @Post(':id/complete')
  @RequireScope('pos', 'create')
  @Audit('sales', 'sale', 'Venta #{folio} completada por ${total}', { entityIdFrom: 'param' })
  complete(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Param('id') id: string,
    @Body() dto: CompleteSaleDto,
  ) {
    return this.salesService.complete(tenantId, storeId, id, dto.payments ?? []);
  }

  @Post(':id/cancel')
  @RequireScope('pos', 'edit')
  @Audit('sales', 'void_sale', 'Venta #{folio} cancelada', { entityIdFrom: 'param' })
  cancel(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Param('id') id: string,
    @Body() dto: CancelSaleDto,
  ) {
    return this.salesService.cancel(tenantId, storeId, id, dto.reason);
  }

  @Post(':id/refund')
  @RequireScope('pos', 'edit')
  @Audit('sales', 'void_sale', 'Devolución parcial en venta #{folio}', { entityIdFrom: 'param' })
  refund(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @Param('id') id: string,
    @Body() dto: RefundSaleDto,
  ) {
    return this.salesService.refund(tenantId, storeId, id, dto);
  }
}
