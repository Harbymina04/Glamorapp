import { Module } from '@nestjs/common';
import { WhatsAppBridgeController } from './whatsapp-bridge.controller';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { WhatsAppService } from './whatsapp.service';
import { StorefrontModule } from '../storefront/storefront.module';

@Module({
  imports: [StorefrontModule],
  controllers: [WhatsAppBridgeController, WhatsAppController, WhatsAppWebhookController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
