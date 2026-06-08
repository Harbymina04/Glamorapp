import { Controller, Post, Body, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';

interface IncomingMessage {
  sessionId: string;   // bridge session ID → maps to storeId in multi-session
  from: string;        // sender phone (digits only)
  fromJid: string;     // full JID, e.g. 1234@s.whatsapp.net or 1234@lid
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

    this.logger.log(`Webhook: ${payload.fromJid || payload.from} → "${payload.body.substring(0, 60)}" [session: ${payload.sessionId}]`);

    // Bot responses temporarily disabled — incoming messages are logged only
    // Re-enable by removing the early return below when the bridge is ready
    return { ok: true, note: 'bot_responses_disabled' };
  }
}
