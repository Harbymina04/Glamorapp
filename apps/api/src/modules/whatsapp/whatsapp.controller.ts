import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { WhatsAppService } from './whatsapp.service';

/** Alias routes matching the frontend URL patterns */
@ApiTags('WhatsApp Bridge')
@Controller('whatsapp/bridge')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WhatsAppController {
  constructor(private whatsapp: WhatsAppService) {}

  /** QR code — frontend calls /whatsapp/bridge/qr */
  @Get('qr')
  @Roles('store_admin', 'tenant_admin')
  async getQr(@Request() req: any) {
    return this.whatsapp.getStoreQrBase64(req.user.storeId);
  }
}
