import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const REMINDER_HOUR = 7; // 7:00 a.m. hora local de la sucursal

/**
 * Recordatorio diario de citas. Corre cada hora y, para cada sucursal, dispara
 * cuando son las 7:00 a.m. EN LA ZONA HORARIA DE LA SUCURSAL (store.timezone),
 * no la del servidor. Crea una notificación in-app con el resumen de las citas
 * de hoy (según esa zona).
 */
@Injectable()
export class AppointmentsTasksService {
  private readonly logger = new Logger(AppointmentsTasksService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Hora (0-23) y fecha local (YYYY-MM-DD) actuales en una zona horaria IANA. */
  private localParts(timezone: string): { hour: number; dateStr: string } | null {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', hour12: false,
      }).formatToParts(new Date());
      const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
      let hour = parseInt(get('hour'), 10);
      if (hour === 24) hour = 0; // algunos entornos devuelven 24 a medianoche
      return { hour, dateStr: `${get('year')}-${get('month')}-${get('day')}` };
    } catch {
      return null; // zona horaria inválida → se omite la sucursal
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async remindTodaysAppointments() {
    const stores = await this.prisma.store.findMany({
      select: { id: true, tenantId: true, name: true, timezone: true },
    });

    // Sucursales donde en este momento son las 7:00 a.m. locales
    const due = stores
      .map(s => ({ ...s, local: this.localParts(s.timezone || 'America/Bogota') }))
      .filter(s => s.local && s.local.hour === REMINDER_HOUR);

    if (due.length === 0) return;

    let created = 0;
    for (const s of due) {
      const start = new Date(`${s.local!.dateStr}T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);

      const count = await this.prisma.appointment.count({
        where: {
          storeId: s.id,
          date: { gte: start, lt: end },
          status: { in: ['pending', 'confirmed'] },
        },
      });
      if (count === 0) continue;

      // Evitar duplicado del mismo día (reinicios dentro de la hora): una
      // notificación por sucursal en las últimas ~23h.
      const existing = await this.prisma.notification.findFirst({
        where: {
          tenantId: s.tenantId,
          source: 'appointment_reminder',
          sourceId: s.id,
          createdAt: { gte: new Date(Date.now() - 23 * 3600 * 1000) },
        },
      });
      if (existing) continue;

      await this.notifications.create({
        tenantId: s.tenantId,
        type: 'info',
        title: 'Citas de hoy',
        message: `Tienes ${count} cita${count === 1 ? '' : 's'} programada${count === 1 ? '' : 's'} para hoy${s.name ? ` en ${s.name}` : ''}.`,
        link: '/dashboard/appointments',
        source: 'appointment_reminder',
        sourceId: s.id,
      });
      created++;
    }

    if (created > 0) this.logger.log(`Recordatorios de citas creados: ${created}`);
  }
}
