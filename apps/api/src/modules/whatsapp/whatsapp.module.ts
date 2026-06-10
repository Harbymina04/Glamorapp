import { Module } from '@nestjs/common';
import { WhatsAppBridgeController } from './whatsapp-bridge.controller';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';

@Module({
  controllers: [WhatsAppBridgeController, WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
