import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class ExpensesController {
  constructor(private service: ExpensesService) {}

  @Get()
  findAll(@TenantId() t: string, @StoreId() s: string, @Query() q: PaginationDto & { categoryId?: string; status?: string }) {
    return this.service.findAll(t, s, q);
  }

  @Get('summary')
  summary(@TenantId() t: string, @StoreId() s: string) { return this.service.getSummary(t, s); }

  @Get('categories')
  categories(@TenantId() t: string) { return this.service.getCategories(t); }

  @Post('categories')
  createCategory(@TenantId() t: string, @Body() d: any) { return this.service.createCategory(t, d); }

  @Get(':id')
  findOne(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.findOne(t, s, id); }

  @Post() create(@TenantId() t: string, @StoreId() s: string, @CurrentUser('id') u: string, @Body() d: any) { return this.service.create(t, s, u, d); }
  @Put(':id') update(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @Body() d: any) { return this.service.update(t, s, id, d); }
  @Delete(':id') void(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @Query('reason') r: string) { return this.service.void(t, s, id, r); }
}
