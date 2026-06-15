import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Recordatorio diario de citas: cada mañana crea una notificación in-app por
 * negocio con el resumen de las citas programadas para HOY.
 */
@Injectable()
export class AppointmentsTasksService {
  private readonly logger = new Logger(AppointmentsTasksService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async remindTodaysAppointments() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    // Citas vigentes de hoy (no canceladas/completadas), agrupadas por negocio
    const grouped = await this.prisma.appointment.groupBy({
      by: ['tenantId'],
      where: {
        date: { gte: start, lt: end },
        status: { in: ['pending', 'confirmed'] },
      },
      _count: { _all: true },
    });

    let created = 0;
    for (const g of grouped) {
      const count = g._count._all;
      if (count === 0) continue;

      // Evitar duplicado si el cron corre dos veces el mismo día (reinicios, etc.)
      const existing = await this.prisma.notification.findFirst({
        where: { tenantId: g.tenantId, source: 'appointment_reminder', createdAt: { gte: start } },
      });
      if (existing) continue;

      await this.notifications.create({
        tenantId: g.tenantId,
        type: 'info',
        title: 'Citas de hoy',
        message: `Tienes ${count} cita${count === 1 ? '' : 's'} programada${count === 1 ? '' : 's'} para hoy.`,
        link: '/dashboard/appointments',
        source: 'appointment_reminder',
      });
      created++;
    }

    if (created > 0) this.logger.log(`Recordatorios de citas creados: ${created}`);
  }
}
