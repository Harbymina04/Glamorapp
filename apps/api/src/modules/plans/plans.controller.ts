import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { BillingTasksService } from './billing-tasks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SkipSubscriptionCheck } from '../../common/decorators/skip-subscription.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

// ─── Public plans endpoint (no auth) ────────────────────────────────────────
@ApiTags('Plans')
@SkipSubscriptionCheck()
@Controller('plans')
export class PublicPlansController {
  constructor(private service: PlansService) {}

  @Get('public')
  getPublicPlans() { return this.service.findAll(); }

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  subscribe(@Request() req: any, @Body() dto: any) {
    return this.service.initiateSubscriptionPayment(req.user.tenantId, dto);
  }
}

// ─── Admin plans controller ──────────────────────────────────────────────────
@ApiTags('Admin - Plans')
@SkipSubscriptionCheck()
@Controller('admin/plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
@ApiBearerAuth()
export class PlansController {
  constructor(
    private service: PlansService,
    private billingTasks: BillingTasksService,
  ) {}

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

  // ─── Billing / Subscription Payments ────────────────────────

  @Get('billing/stats')
  getBillingStats() { return this.service.getBillingStats(); }

  /** Suscripciones que vencen en los próximos N días (default 14) */
  @Get('billing/expiring-soon')
  getExpiringSoon(@Query('days') days?: string) {
    return this.billingTasks.getExpiringSoon(days ? Number(days) : 14);
  }

  /** Disparo manual del cron de vencimientos (útil para pruebas desde el panel) */
  @Post('billing/run-renewal-check')
  runRenewalCheck() {
    return this.billingTasks.triggerManually();
  }

  @Get('billing/payments')
  listAllPayments(@Query() q: any) { return this.service.listAllPayments(q); }

  @Get('billing/payments/:tenantId/tenant')
  listTenantPayments(@Param('tenantId') tenantId: string) { return this.service.listTenantPayments(tenantId); }

  @Post('billing/payments/manual')
  createManualPayment(@Request() req: any, @Body() dto: any) {
    return this.service.createManualPayment(dto, req.user.id);
  }

  @Put('billing/payments/:id/invoice')
  updateInvoice(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateInvoiceData(id, dto);
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
