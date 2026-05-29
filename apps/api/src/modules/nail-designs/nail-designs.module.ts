import { Module } from '@nestjs/common';
import { NailDesignsController } from './nail-designs.controller';
import { NailDesignsService } from './nail-designs.service';
import { StorageModule } from '../../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [NailDesignsController],
  providers: [NailDesignsService],
  exports: [NailDesignsService],
})
export class NailDesignsModule {}
