import { Controller, Post, Get, Put, Body, Param, UseGuards, Request, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('WhatsApp Bridge')
@Controller('whatsapp/bridge')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WhatsAppBridgeController {
  constructor(private whatsapp: WhatsAppService) {}

  // ═══ Admin (superadmin) endpoints — overview ═══

  /**
   * [superadmin] Get overall bridge status — all sessions overview
   */
  @Get('status')
  @Roles('superadmin')
  async getBridgeStatus() {
    return this.whatsapp.getBridgeStatus();
  }

  // ═══ Store admin endpoints — per-store session management ═══

  /**
   * Get current store's WhatsApp session status
   */
  @Get('session/status')
  @Roles('store_admin', 'tenant_admin')
  async getSessionStatus(@Request() req: any) {
    return this.whatsapp.getStoreSessionStatus(req.user.storeId);
  }

  /**
   * Start/resume store's WhatsApp session
   */
  @Post('session/start')
  @Roles('store_admin', 'tenant_admin')
  async startSession(@Request() req: any) {
    return this.whatsapp.startStoreSession(req.user.storeId);
  }

  /**
   * Stop store's WhatsApp session
   */
  @Post('session/stop')
  @Roles('store_admin', 'tenant_admin')
  async stopSession(@Request() req: any) {
    return this.whatsapp.stopStoreSession(req.user.storeId);
  }

  /**
   * Get store's QR code as base64 (for inline display)
   */
  @Get('session/qr')
  @Roles('store_admin', 'tenant_admin')
  async getQrBase64(@Request() req: any) {
    return this.whatsapp.getStoreQrBase64(req.user.storeId);
  }

  /**
   * Request pairing code for store's WhatsApp number.
   * Accepts { phone } from body — overrides store.whatsappNumber.
   */
  @Post('session/pair')
  @Roles('store_admin', 'tenant_admin')
  async requestPairingCode(@Request() req: any, @Body() body: { phone?: string }) {
    return this.whatsapp.requestPairingCode(req.user.storeId, body?.phone);
  }

  /**
   * Update store's WhatsApp number
   */
  @Put('session/config')
  @Roles('store_admin', 'tenant_admin')
  async updateWhatsAppConfig(@Request() req: any, @Body() body: { whatsappNumber: string }) {
    return this.whatsapp.updateStoreWhatsApp(req.user.storeId, body.whatsappNumber);
  }

  // ═══ Superadmin: session management for any store ═══

  /**
   * [superadmin] Get any store's session status
   */
  @Get('admin/stores/:storeId/session')
  @Roles('superadmin')
  async getStoreSession(@Param('storeId') storeId: string) {
    return this.whatsapp.getStoreSessionStatus(storeId);
  }

  /**
   * [superadmin] Get bridge status for a specific session by sessionId
   * Frontend admin panel calls GET /whatsapp/sessions/:sessionId/status
   */
  @Get('admin/sessions/:sessionId/status')
  @Roles('superadmin')
  async getSessionByIdStatus(@Param('sessionId') sessionId: string) {
    // Proxy directly to the bridge — session ID is already resolved
    return this.whatsapp.getSessionStatusById(sessionId);
  }

  /**
   * [superadmin] Start session for any store
   */
  @Post('admin/stores/:storeId/session/start')
  @Roles('superadmin')
  async startStoreSession(@Param('storeId') storeId: string) {
    return this.whatsapp.startStoreSession(storeId);
  }

  /**
   * [superadmin] Update any store's WhatsApp config
   */
  @Put('admin/stores/:storeId/config')
  @Roles('superadmin')
  async updateStoreWhatsAppConfig(
    @Param('storeId') storeId: string,
    @Body() body: { whatsappNumber: string },
  ) {
    return this.whatsapp.updateStoreWhatsApp(storeId, body.whatsappNumber);
  }
}
