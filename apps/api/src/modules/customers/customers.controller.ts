import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private service: CustomersService) {}

  @Get()
  findAll(@TenantId() t: string, @StoreId() s: string, @Query() q: PaginationDto & { search?: string; segment?: string; loyaltyTier?: string }) {
    return this.service.findAll(t, s, q);
  }

  @Get('birthdays/month')
  birthdays(@TenantId() t: string, @StoreId() s: string) { return this.service.getBirthdays(t, s); }

  @Get('segments/summary')
  segmentsSummary(@TenantId() t: string, @StoreId() s: string) { return this.service.getSegmentsSummary(t, s); }

  @Get(':id')
  findOne(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.findOne(t, s, id); }

  @Get(':id/history')
  history(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.getHistory(t, s, id); }

  @Get(':id/notes')
  notes(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.getNotes(t, s, id); }

  @Post(':id/notes')
  addNote(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @CurrentUser('id') userId: string, @Body('content') content: string) { return this.service.addNote(t, s, id, userId, content); }

  @Post() create(@TenantId() t: string, @StoreId() s: string, @Body() d: any) { return this.service.create(t, s, d); }
  @Put(':id') update(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @Body() d: any) { return this.service.update(t, s, id, d); }
  @Delete(':id') remove(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.remove(t, s, id); }
}
