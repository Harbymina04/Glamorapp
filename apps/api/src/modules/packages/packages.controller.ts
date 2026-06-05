import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PackagesService } from './packages.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@ApiTags('Packages')
@Controller('packages')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard)
@ApiBearerAuth()
export class PackagesController {
  constructor(private service: PackagesService) {}

  @Get()
  findAll(@TenantId() t: string, @StoreId() s: string, @Query() q: PaginationDto) { return this.service.findAll(t, s, q); }

  @Get(':id')
  findOne(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.findOne(t, s, id); }

  @Post() create(@TenantId() t: string, @StoreId() s: string, @Body() d: any) { return this.service.create(t, s, d); }
  @Put(':id') update(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @Body() d: any) { return this.service.update(t, s, id, d); }
  @Delete(':id') remove(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.remove(t, s, id); }
}
