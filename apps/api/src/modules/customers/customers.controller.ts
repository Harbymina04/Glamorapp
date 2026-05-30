import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

// Customers are tenant-level. storeId is used as a filter (origin store or activity store),
// not as a strict ownership boundary.

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private service: CustomersService) {}

  @Get()
  findAll(
    @TenantId() t: string,
    @StoreId() s: string,
    @Query() q: PaginationDto & { search?: string; segment?: string; loyaltyTier?: string; allStores?: string },
  ) {
    // allStores=true allows tenant_admin to see customers across all stores
    const storeFilter = q.allStores === 'true' ? null : s;
    return this.service.findAll(t, storeFilter, q);
  }

  @Get('birthdays/month')
  birthdays(@TenantId() t: string, @StoreId() s: string, @Query('allStores') all?: string) {
    return this.service.getBirthdays(t, all === 'true' ? null : s);
  }

  @Get('segments/summary')
  segmentsSummary(@TenantId() t: string, @StoreId() s: string, @Query('allStores') all?: string) {
    return this.service.getSegmentsSummary(t, all === 'true' ? null : s);
  }

  @Get(':id')
  findOne(@TenantId() t: string, @Param('id') id: string) {
    return this.service.findOne(t, id);
  }

  @Get(':id/history')
  history(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @Query('allStores') all?: string) {
    return this.service.getHistory(t, id, all === 'true' ? null : s);
  }

  @Get(':id/notes')
  notes(@TenantId() t: string, @Param('id') id: string) {
    return this.service.getNotes(t, id);
  }

  @Post(':id/notes')
  addNote(
    @TenantId() t: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('content') content: string,
  ) {
    return this.service.addNote(t, id, userId, content);
  }

  @Post()
  create(@TenantId() t: string, @StoreId() s: string, @Body() d: any) {
    return this.service.create(t, s, d); // storeId = origin store
  }

  @Put(':id')
  update(@TenantId() t: string, @Param('id') id: string, @Body() d: any) {
    return this.service.update(t, id, d);
  }

  @Delete(':id')
  remove(@TenantId() t: string, @Param('id') id: string) {
    return this.service.remove(t, id);
  }
}
