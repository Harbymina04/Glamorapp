import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@ApiTags('Services')
@Controller('services')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard)
@ApiBearerAuth()
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Get()
  findAll(
    @TenantId() tenantId: string, @StoreId() storeId: string,
    @Query() query: any,
  ) { return this.servicesService.findAll(tenantId, storeId, query); }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @StoreId() storeId: string, @Param('id') id: string) {
    return this.servicesService.findOne(tenantId, storeId, id);
  }

  @Post() create(@TenantId() t: string, @StoreId() s: string, @Body() d: any) { return this.servicesService.create(t, s, d); }
  @Put(':id') update(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @Body() d: any) { return this.servicesService.update(t, s, id, d); }
  @Delete(':id') remove(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.servicesService.remove(t, s, id); }
}
