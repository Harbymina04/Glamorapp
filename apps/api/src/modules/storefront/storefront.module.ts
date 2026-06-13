import { Module } from '@nestjs/common';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';
import { StorefrontChatService } from './storefront-chat.service';
import { DiscountsModule } from '../discounts/discounts.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [DiscountsModule, EmailModule],
  controllers: [StorefrontController],
  providers: [StorefrontService, StorefrontChatService],
  exports: [StorefrontService, StorefrontChatService],
})
export class StorefrontModule {}
