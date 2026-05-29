import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { AdminAiController } from './admin-ai.controller';

@Module({
  controllers: [PlansController, AdminAiController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
