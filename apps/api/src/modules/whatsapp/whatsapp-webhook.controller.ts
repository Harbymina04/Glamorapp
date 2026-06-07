import { Controller, Post, Body, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';

interface IncomingMessage {
  sessionId: string;   // bridge session ID → maps to storeId in multi-session
  from: string;        // sender phone (digits only, no @s.whatsapp.net)
  fromName: string;    // WhatsApp display name
  body: string;        // message text
  timestamp: number;
}

@ApiTags('WhatsApp Webhook')
@Controller('whatsapp/webhook')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);
  private readonly bridgeKey: string;

  constructor(
    private whatsapp: WhatsAppService,
    private config: ConfigService,
  ) {
    this.bridgeKey = this.config.get('WHATSAPP_BRIDGE_API_KEY') || 'glamorapp_wa_2026';
  }

  @Post()
  async handleIncoming(
    @Headers('x-api-key') apiKey: string,
    @Body() payload: IncomingMessage,
  ) {
    if (apiKey !== this.bridgeKey) throw new UnauthorizedException();

    this.logger.log(`Webhook: ${payload.from} → "${payload.body.substring(0, 60)}" [session: ${payload.sessionId}]`);

    // Process async — respond 200 immediately so bridge doesn't retry
    this.whatsapp.handleIncomingMessage(payload).catch(err =>
      this.logger.error(`Error procesando mensaje de ${payload.from}: ${err.message}`),
    );

    return { ok: true };
  }
}
