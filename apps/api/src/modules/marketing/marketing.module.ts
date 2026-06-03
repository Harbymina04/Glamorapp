import { Module } from '@nestjs/common';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';
import { MarketingDispatchService } from './marketing-dispatch.service';
import { EmailModule } from '../email/email.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [EmailModule, WhatsAppModule],
  controllers: [MarketingController],
  providers: [MarketingService, MarketingDispatchService],
  exports: [MarketingService, MarketingDispatchService],
})
export class MarketingModule {}
