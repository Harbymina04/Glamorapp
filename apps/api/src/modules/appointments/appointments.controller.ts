import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScope } from '../../common/decorators/require-scope.decorator';
import { TenantId, StoreId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Audit } from '../audit/audit.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { PlanModuleGuard } from '../../common/guards/plan-module.guard';
import { RequirePlanModule } from '../../common/decorators/require-plan-module.decorator';
import { CreateAppointmentDto, UpdateAppointmentDto, CustomerBookDto, CancelAppointmentDto } from './dto/appointment.dto';

@ApiTags('Appointments')
@Controller('appointments')
@UseInterceptors(AuditInterceptor)
@RequirePlanModule('appointments')
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  // ─── Customer (storefront) — no TenantGuard ──────────────────────────────────

  @Post('public/book')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  customerBook(@CurrentUser() user: any, @Body() dto: CustomerBookDto) {
    return this.appointmentsService.customerBook(user, dto);
  }

  @Get('public/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  myAppointments(@CurrentUser() user: any) {
    return this.appointmentsService.myAppointments(user.id);
  }

  // ─── Staff / Admin — require TenantGuard ─────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard, ScopesGuard, SubscriptionGuard, PlanModuleGuard)
  @ApiBearerAuth()
  @RequireScope('appointments', 'view')
  findAll(
    @TenantId() t: string, @StoreId() s: string,
    @CurrentUser() user: any,
    @Query() q: PaginationDto & { status?: string; professionalId?: string; customerId?: string; date?: string; startDate?: string; endDate?: string },
  ) { return this.appointmentsService.findAll(t, s, q, user); }

  @Get('available-slots')
  @UseGuards(JwtAuthGuard, TenantGuard, ScopesGuard, SubscriptionGuard, PlanModuleGuard)
  @ApiBearerAuth()
  @RequireScope('appointments', 'view')
  availableSlots(
    @TenantId() t: string, @StoreId() s: string,
    @Query() q: { date: string; professionalId: string; duration: number },
  ) { return this.appointmentsService.getAvailableSlots(t, s, q.date, q.professionalId, q.duration); }

  @Get('summary/week')
  @UseGuards(JwtAuthGuard, TenantGuard, ScopesGuard, SubscriptionGuard, PlanModuleGuard)
  @ApiBearerAuth()
  @RequireScope('appointments', 'view')
  weekSummary(@TenantId() t: string, @StoreId() s: string) {
    return this.appointmentsService.getWeekSummary(t, s);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, TenantGuard, ScopesGuard, SubscriptionGuard, PlanModuleGuard)
  @ApiBearerAuth()
  @RequireScope('appointments', 'view')
  findOne(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) {
    return this.appointmentsService.findOne(t, s, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, TenantGuard, ScopesGuard, SubscriptionGuard, PlanModuleGuard)
  @ApiBearerAuth()
  @RequireScope('appointments', 'create')
  @Audit('appointments', 'create', 'Cita creada')
  create(@TenantId() t: string, @StoreId() s: string, @Body() d: CreateAppointmentDto) { return this.appointmentsService.create(t, s, d); }

  @Put(':id')
  @UseGuards(JwtAuthGuard, TenantGuard, ScopesGuard, SubscriptionGuard, PlanModuleGuard)
  @ApiBearerAuth()
  @RequireScope('appointments', 'edit')
  @Audit('appointments', 'update', 'Cita actualizada', { entityIdFrom: 'param' })
  update(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @Body() d: UpdateAppointmentDto) { return this.appointmentsService.update(t, s, id, d); }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard, TenantGuard, ScopesGuard, SubscriptionGuard, PlanModuleGuard)
  @ApiBearerAuth()
  @RequireScope('appointments', 'edit')
  @Audit('appointments', 'update', 'Cita confirmada', { entityIdFrom: 'param' })
  confirm(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.appointmentsService.updateStatus(t, s, id, 'confirmed'); }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard, TenantGuard, ScopesGuard, SubscriptionGuard, PlanModuleGuard)
  @ApiBearerAuth()
  @RequireScope('appointments', 'edit')
  @Audit('appointments', 'update', 'Cita completada', { entityIdFrom: 'param' })
  complete(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.appointmentsService.updateStatus(t, s, id, 'completed'); }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, TenantGuard, ScopesGuard, SubscriptionGuard, PlanModuleGuard)
  @ApiBearerAuth()
  @RequireScope('appointments', 'edit')
  @Audit('appointments', 'update', 'Cita cancelada', { entityIdFrom: 'param' })
  cancel(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @Body() d: CancelAppointmentDto) { return this.appointmentsService.updateStatus(t, s, id, 'cancelled', d.reason); }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard, TenantGuard, ScopesGuard, SubscriptionGuard, PlanModuleGuard)
  @ApiBearerAuth()
  @RequireScope('appointments', 'edit')
  start(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.appointmentsService.updateStatus(t, s, id, 'in_progress'); }

  @Post(':id/no-show')
  @UseGuards(JwtAuthGuard, TenantGuard, ScopesGuard, SubscriptionGuard, PlanModuleGuard)
  @ApiBearerAuth()
  @RequireScope('appointments', 'edit')
  @Audit('appointments', 'update', 'Cita no-show', { entityIdFrom: 'param' })
  noShow(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.appointmentsService.updateStatus(t, s, id, 'no_show'); }
}
