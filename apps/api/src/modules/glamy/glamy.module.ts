import { Module } from '@nestjs/common';
import { GlamyController } from './glamy.controller';
import { GlamyService } from './glamy.service';

@Module({
  controllers: [GlamyController],
  providers: [GlamyService],
})
export class GlamyModule {}
