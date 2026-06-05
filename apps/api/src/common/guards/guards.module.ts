import { Global, Module } from '@nestjs/common';
import { SubscriptionGuard } from './subscription.guard';

@Global()
@Module({
  providers: [SubscriptionGuard],
  exports: [SubscriptionGuard],
})
export class GuardsModule {}
