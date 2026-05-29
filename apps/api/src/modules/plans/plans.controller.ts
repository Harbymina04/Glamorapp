import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin - Plans')
@Controller('admin/plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
@ApiBearerAuth()
export class PlansController {
  constructor(private service: PlansService) {}

  // ─── Specific routes FIRST (before :id) ─────────────────────

  // Subscriptions
  @Get('subscriptions/list')
  getSubscriptions(@Query() q: any) { return this.service.getSubscriptions(q); }

  @Put('subscriptions/:id')
  updateSubscription(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateSubscription(id, dto);
  }

  // Tenants (Platform Admin)
  @Get('tenants')
  getTenants(@Query() q: any) { return this.service.getTenants(q); }

  @Post('tenants/:tenantId/change-plan')
  changeTenantPlan(@Param('tenantId') tenantId: string, @Body() dto: any) {
    return this.service.changeTenantPlan(tenantId, dto);
  }

  // Payment exceptions
  @Get('payment-exceptions/list')
  getPaymentExceptions(@Query() q: any) { return this.service.getPaymentExceptions(q); }

  @Post('payment-exceptions')
  createPaymentException(@Body() dto: any) { return this.service.createPaymentException(dto); }

  @Post('payment-exceptions/:id/approve')
  approveException(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.service.approvePaymentException(id, body.userId);
  }

  @Post('payment-exceptions/:id/reject')
  rejectException(@Param('id') id: string) {
    return this.service.rejectPaymentException(id);
  }

  // ─── Generic CRUD routes ────────────────────────────────────

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: any) { return this.service.create(dto); }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
