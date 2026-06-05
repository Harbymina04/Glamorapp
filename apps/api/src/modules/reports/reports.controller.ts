import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('overview')
  overview(@TenantId() t: string, @StoreId() s: string) { return this.service.overview(t, s); }

  @Get('sales')
  sales(@TenantId() t: string, @StoreId() s: string, @Query() q: any) { return this.service.sales(t, s, q); }

  @Get('appointments')
  appointments(@TenantId() t: string, @StoreId() s: string) { return this.service.appointments(t, s); }

  @Get('products')
  topProducts(@TenantId() t: string, @StoreId() s: string, @Query('limit') limit: number) { return this.service.topProducts(t, s, limit); }

  @Get('inventory')
  inventory(@TenantId() t: string, @StoreId() s: string) { return this.service.inventoryReport(t, s); }

  @Get('expenses')
  expenses(@TenantId() t: string, @StoreId() s: string) { return this.service.expensesReport(t, s); }
}
