import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesTasksService } from './sales-tasks.service';
import { AccountingModule } from '../accounting/accounting.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AccountingModule, CommissionsModule, NotificationsModule],
  controllers: [SalesController],
  providers: [SalesService, SalesTasksService],
  exports: [SalesService],
})
export class SalesModule {}
