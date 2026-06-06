import {
  Controller, Get, Post, Put, Param, Body, Query,
  UseGuards, Request, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipSubscriptionCheck } from '../../common/decorators/skip-subscription.decorator';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StorageService } from '../../storage/storage.service';

// ── Public config endpoint (no auth) ────────────────────────────────────────
@ApiTags('Platform')
@SkipSubscriptionCheck()
@Controller('platform')
export class PlatformPublicController {
  constructor(private service: PayoutsService) {}

  @Get('config')
  getPublicConfig() {
    return this.service.getPublicConfig();
  }
}

// ── Admin payouts controller ─────────────────────────────────────────────────
@ApiTags('Payouts')
@SkipSubscriptionCheck()
@Controller('admin/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
@ApiBearerAuth()
export class PayoutsController {
  constructor(
    private service: PayoutsService,
    private storage: StorageService,
  ) {}

  /** GET /admin/payouts/config — commission rate & min payout */
  @Get('config')
  getConfig() {
    return this.service.getConfig();
  }

  /** PUT /admin/payouts/config — update commission + banner URL */
  @Put('config')
  updateConfig(
    @Body() dto: { commissionRate?: number; minPayoutAmount?: number; storeBannerUrl?: string | null },
    @Request() req: any,
  ) {
    return this.service.updateConfig(dto, req.user.id);
  }

  /** POST /admin/payouts/config/banner — upload store banner image */
  @Post('config/banner')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\//)) {
        return cb(new BadRequestException('Solo se permiten imágenes'), false);
      }
      cb(null, true);
    },
  }))
  async uploadBanner(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const saved = await this.storage.saveFile(file, 'banners');
    await this.service.updateConfig({ storeBannerUrl: saved.url }, req.user.id);
    return { url: saved.url };
  }

  /** DELETE /admin/payouts/config/banner — remove banner */
  @Put('config/banner/remove')
  removeBanner(@Request() req: any) {
    return this.service.updateConfig({ storeBannerUrl: null }, req.user.id);
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
