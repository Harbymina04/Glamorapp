import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlansService } from './plans.service';
import { PlansController, PublicPlansController } from './plans.controller';
import { AdminAiController } from './admin-ai.controller';
import { BillingTasksService } from './billing-tasks.service';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ConfigModule, EmailModule, NotificationsModule],
  controllers: [PublicPlansController, PlansController, AdminAiController],
  providers: [PlansService, BillingTasksService],
  exports: [PlansService, BillingTasksService],
})
export class PlansModule {}
