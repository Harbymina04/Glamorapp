import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesTasksService } from './sales-tasks.service';
import { AccountingModule } from '../accounting/accounting.module';
import { CommissionsModule } from '../commissions/commissions.module';

@Module({
  imports: [AccountingModule, CommissionsModule],
  controllers: [SalesController],
  providers: [SalesService, SalesTasksService],
  exports: [SalesService],
})
export class SalesModule {}
