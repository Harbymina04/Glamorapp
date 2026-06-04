import {
  Controller, Get, Post, Put, Param, Body, Query,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Payouts')
@Controller('admin/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
@ApiBearerAuth()
export class PayoutsController {
  constructor(private service: PayoutsService) {}

  /** GET /admin/payouts/config — commission rate & min payout */
  @Get('config')
  getConfig() {
    return this.service.getConfig();
  }

  /** PUT /admin/payouts/config — update commission rate */
  @Put('config')
  updateConfig(@Body() dto: { commissionRate?: number; minPayoutAmount?: number }, @Request() req: any) {
    return this.service.updateConfig(dto, req.user.id);
  }

  /** GET /admin/payouts/overview — platform earnings KPIs */
  @Get('overview')
  getOverview() {
    return this.service.getEarningsOverview();
  }

  /** GET /admin/payouts/summary — pending payout per tenant */
  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }

  /** GET /admin/payouts/history — all payouts with filters */
  @Get('history')
  listPayouts(@Query() query: any) {
    return this.service.listPayouts(query);
  }

  /** GET /admin/payouts/tenant/:tenantId — pending orders for one tenant */
  @Get('tenant/:tenantId')
  getTenantPending(@Param('tenantId') tenantId: string) {
    return this.service.getTenantPendingOrders(tenantId);
  }

  /** POST /admin/payouts/tenant/:tenantId — create payout (mark as paid) */
  @Post('tenant/:tenantId')
  @HttpCode(HttpStatus.CREATED)
  createPayout(
    @Param('tenantId') tenantId: string,
    @Body() dto: { reference?: string; notes?: string },
    @Request() req: any,
  ) {
    return this.service.createPayout(tenantId, dto, req.user.id);
  }
}
