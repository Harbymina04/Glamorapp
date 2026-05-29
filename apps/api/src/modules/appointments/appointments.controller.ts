import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, StoreId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Get()
  findAll(
    @TenantId() t: string, @StoreId() s: string,
    @CurrentUser() user: any,
    @Query() q: PaginationDto & { status?: string; professionalId?: string; customerId?: string; date?: string; startDate?: string; endDate?: string },
  ) { return this.appointmentsService.findAll(t, s, q, user); }

  @Get('available-slots')
  availableSlots(
    @TenantId() t: string, @StoreId() s: string,
    @Query() q: { date: string; professionalId: string; duration: number },
  ) { return this.appointmentsService.getAvailableSlots(t, s, q.date, q.professionalId, q.duration); }

  @Get('summary/week')
  weekSummary(@TenantId() t: string, @StoreId() s: string) {
    return this.appointmentsService.getWeekSummary(t, s);
  }

  @Get(':id')
  findOne(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) {
    return this.appointmentsService.findOne(t, s, id);
  }

  @Post() create(@TenantId() t: string, @StoreId() s: string, @Body() d: any) { return this.appointmentsService.create(t, s, d); }
  @Put(':id') update(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @Body() d: any) { return this.appointmentsService.update(t, s, id, d); }

  @Post(':id/confirm') confirm(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.appointmentsService.updateStatus(t, s, id, 'confirmed'); }
  @Post(':id/start') start(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.appointmentsService.updateStatus(t, s, id, 'in_progress'); }
  @Post(':id/complete') complete(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.appointmentsService.updateStatus(t, s, id, 'completed'); }
  @Post(':id/cancel') cancel(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @Body('reason') r: string) { return this.appointmentsService.updateStatus(t, s, id, 'cancelled', r); }
  @Post(':id/no-show') noShow(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.appointmentsService.updateStatus(t, s, id, 'no_show'); }
}
