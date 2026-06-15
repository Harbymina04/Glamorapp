import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentsTasksService } from './appointments-tasks.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [WhatsAppModule, EmailModule, NotificationsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsTasksService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
