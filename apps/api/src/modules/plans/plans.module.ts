import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlansService } from './plans.service';
import { PlansController, PublicPlansController } from './plans.controller';
import { AdminAiController } from './admin-ai.controller';

@Module({
  imports: [ConfigModule],
  controllers: [PublicPlansController, PlansController, AdminAiController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
