import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
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
import { PlanModuleGuard } from '../../common/guards/plan-module.guard';
import { RequirePlanModule } from '../../common/decorators/require-plan-module.decorator';
import { CreateCustomerDto, UpdateCustomerDto, AddNoteDto } from './dto/customer.dto';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, TenantGuard, ScopesGuard, SubscriptionGuard, PlanModuleGuard)
@RequirePlanModule('customers')
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class CustomersController {
  constructor(private service: CustomersService) {}

  @Get()
  @RequireScope('customers', 'view')
  findAll(
    @TenantId() t: string,
    @StoreId() s: string,
    @Query() q: PaginationDto & { search?: string; segment?: string; loyaltyTier?: string; allStores?: string },
  ) {
    const storeFilter = q.allStores === 'true' ? null : s;
    return this.service.findAll(t, storeFilter, q);
  }

  @Get('birthdays/month')
  @RequireScope('customers', 'view')
  birthdays(@TenantId() t: string, @StoreId() s: string, @Query('allStores') all?: string) {
    return this.service.getBirthdays(t, all === 'true' ? null : s);
  }

  @Get('segments/summary')
  @RequireScope('customers', 'view')
  segmentsSummary(@TenantId() t: string, @StoreId() s: string, @Query('allStores') all?: string) {
    return this.service.getSegmentsSummary(t, all === 'true' ? null : s);
  }

  @Get(':id')
  @RequireScope('customers', 'view')
  findOne(@TenantId() t: string, @Param('id') id: string) {
    return this.service.findOne(t, id);
  }

  @Get(':id/history')
  @RequireScope('customers', 'view')
  history(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @Query('allStores') all?: string) {
    return this.service.getHistory(t, id, all === 'true' ? null : s);
  }

  @Get(':id/notes')
  @RequireScope('customers', 'view')
  notes(@TenantId() t: string, @Param('id') id: string) {
    return this.service.getNotes(t, id);
  }

  @Post(':id/notes')
  @RequireScope('customers', 'create')
  addNote(
    @TenantId() t: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddNoteDto,
  ) {
    return this.service.addNote(t, id, userId, dto.content);
  }

  @Post()
  @RequireScope('customers', 'create')
  @Audit('customers', 'create', 'Cliente {firstName} {lastName} creado')
  create(@TenantId() t: string, @StoreId() s: string, @Body() d: CreateCustomerDto) {
    return this.service.create(t, s, d);
  }

  @Put(':id')
  @RequireScope('customers', 'edit')
  @Audit('customers', 'update', 'Cliente actualizado', { entityIdFrom: 'param' })
  update(@TenantId() t: string, @Param('id') id: string, @Body() d: UpdateCustomerDto) {
    return this.service.update(t, id, d);
  }

  @Delete(':id')
  @RequireScope('customers', 'delete')
  @Audit('customers', 'delete', 'Cliente eliminado', { entityIdFrom: 'param' })
  remove(@TenantId() t: string, @Param('id') id: string) {
    return this.service.remove(t, id);
  }
}
