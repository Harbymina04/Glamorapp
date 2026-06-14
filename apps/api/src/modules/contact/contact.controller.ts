import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EmailService } from '../email/email.service';
import { SkipSubscriptionCheck } from '../../common/decorators/skip-subscription.decorator';
import { ContactDto } from './dto/contact.dto';

@ApiTags('Contact')
@SkipSubscriptionCheck()
@Controller('contact')
export class ContactController {
  constructor(
    private email: EmailService,
    private config: ConfigService,
  ) {}

  /** Formulario "Contáctanos" del landing — público, sin auth. */
  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 3_600_000, limit: 10 } }) // 10 mensajes/hora por IP
  @ApiOperation({ summary: 'Enviar mensaje de contacto al admin de la plataforma' })
  async submit(@Body() dto: ContactDto) {
    const to = this.config.get<string>('PLATFORM_ADMIN_EMAIL') || 'administracion@neurixa-ts.com';
    await this.email.sendContactInquiry({
      to,
      name: dto.name,
      email: dto.email,
      phone: dto.phone ?? null,
      message: dto.message,
    });
    return { success: true };
  }
}
