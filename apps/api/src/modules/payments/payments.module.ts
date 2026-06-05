import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorefrontModule } from '../storefront/storefront.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [PrismaModule, StorefrontModule, PlansModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
