import { Global, Module } from '@nestjs/common';
import { SubscriptionGuard } from './subscription.guard';
import { PlanModuleGuard } from './plan-module.guard';

@Global()
@Module({
  providers: [SubscriptionGuard, PlanModuleGuard],
  exports: [SubscriptionGuard, PlanModuleGuard],
})
export class GuardsModule {}
