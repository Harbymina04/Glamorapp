import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { AccountingModule } from '../accounting/accounting.module';
import { CommissionsModule } from '../commissions/commissions.module';

@Module({
  imports: [AccountingModule, CommissionsModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
