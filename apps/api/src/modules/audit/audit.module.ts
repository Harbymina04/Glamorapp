import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import {
  AdminAuditController,
  TenantAuditController,
  StoreAuditController,
} from './audit.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()   // AuditService disponible en todos los módulos sin imports explícitos
@Module({
  imports: [PrismaModule],
  controllers: [AdminAuditController, TenantAuditController, StoreAuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
