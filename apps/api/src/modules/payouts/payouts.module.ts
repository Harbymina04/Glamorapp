import { Module } from '@nestjs/common';
import { PayoutsController, PlatformPublicController } from './payouts.controller';
import { PayoutsService } from './payouts.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../../storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [PlatformPublicController, PayoutsController],
  providers: [PayoutsService],
  exports: [PayoutsService],
})
export class PayoutsModule {}
