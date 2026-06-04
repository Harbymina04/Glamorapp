import { Module } from '@nestjs/common';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';
import { StorefrontChatService } from './storefront-chat.service';

@Module({
  controllers: [StorefrontController],
  providers: [StorefrontService, StorefrontChatService],
  exports: [StorefrontService, StorefrontChatService],
})
export class StorefrontModule {}
