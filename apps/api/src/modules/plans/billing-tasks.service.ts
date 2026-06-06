import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatDateCO(d: Date): string {
  return d.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class BillingTasksService {
  private readonly logger = new Logger(BillingTasksService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private notifications: NotificationsService,
    private config: ConfigService,
  ) {}

  // ── Cron: daily at 9:00 AM Colombia time ──────────────────────────────────

  @Cron('0 9 * * *', { timeZone: 'America/Bogota' })
  async runDailyBillingTasks() {
    this.logger.log('[BillingTasks] Starting daily billing check...');
    const [reminders, expired] = await Promise.all([
      this.sendRenewalReminders(),
      this.expireOverdueSubscriptions(),
    ]);
    this.logger.log(
      `[BillingTasks] Done — reminders sent: ${reminders}, expired: ${expired}`,
    );
  }

  // ── Manual trigger (called from admin endpoint) ───────────────────────────

  async triggerManually(): Promise<{ reminders: number; expired: number }> {
    const [reminders, expired] = await Promise.all([
      this.sendRenewalReminders(),
      this.expireOverdueSubscriptions(),
    ]);
    return { reminders, expired };
  }

  // ── Get subscriptions expiring soon (for admin dashboard) ─────────────────

  async getExpiringSoon(days = 14) {
    const now = new Date();
    const limit = addDays(now, days);

    return this.prisma.subscription.findMany({
      where: {
        status: 'active',
        currentPeriodEnd: { gte: now, lte: limit },
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        plan: { select: { id: true, name: true, monthlyPrice: true, yearlyPrice: true } },
      },
      orderBy: { currentPeriodEnd: 'asc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CORE TASKS
  // ─────────────────────────────────────────────────────────────────────────

  // ── Send reminder emails (7, 3 and 1 day before expiration) ──────────────

  async sendRenewalReminders(): Promise<number> {
    const now = new Date();
    let sent = 0;

    const reminderDays = [7, 3, 1];

    for (const daysLeft of reminderDays) {
      const targetDate = addDays(now, daysLeft);

      const subs = await this.prisma.subscription.findMany({
        where: {
          status: 'active',
          currentPeriodEnd: {
            gte: startOfDay(targetDate),
            lte: endOfDay(targetDate),
          },
        },
        include: {
          plan: true,
          tenant: {
            include: {
              users: {
                where: { role: 'tenant_admin', isActive: true },
                orderBy: { createdAt: 'asc' },
                take: 1,
                select: { id: true, firstName: true, email: true },
              },
            },
          },
        },
      });

      for (const sub of subs) {
        const admin = sub.tenant.users[0];
        if (!admin?.email) continue;

        const amount =
          sub.billingCycle === 'yearly'
            ? Number(sub.plan.yearlyPrice)
            : Number(sub.plan.monthlyPrice);

        const renewalUrl = `${this.appUrl}/tenant/billing`;

        // Email
        await this.email.sendRaw(
          admin.email,
          `⏳ Tu suscripción de Glamorapp vence en ${daysLeft} día${daysLeft > 1 ? 's' : ''}`,
          this.renewalReminderTemplate({
            firstName: admin.firstName,
            tenantName: sub.tenant.name,
            planName: sub.plan.name,
            daysLeft,
            expirationDate: sub.currentPeriodEnd!,
            billingCycle: sub.billingCycle,
            amount,
            renewalUrl,
          }),
        );

        // In-app notification
        await this.notifications.create({
          tenantId: sub.tenantId,
          userId: admin.id,
          type: 'warning',
          title: `Tu plan vence en ${daysLeft} día${daysLeft > 1 ? 's' : ''}`,
          message: `El Plan ${sub.plan.name} vence el ${formatDateCO(sub.currentPeriodEnd!)}. Renueva para mantener el acceso completo.`,
          link: '/tenant/billing',
          source: 'billing',
          sourceId: sub.id,
        });

        this.logger.log(
          `[BillingTasks] Reminder (${daysLeft}d) sent → ${admin.email} | tenant: ${sub.tenant.name}`,
        );
        sent++;
      }
    }

    return sent;
  }

  // ── Expire subscriptions whose period has ended ───────────────────────────

  async expireOverdueSubscriptions(): Promise<number> {
    const now = new Date();

    const overdueList = await this.prisma.subscription.findMany({
      where: {
        status: 'active',
        currentPeriodEnd: { lt: now },
      },
      include: {
        plan: true,
        tenant: {
          include: {
            users: {
              where: { role: 'tenant_admin', isActive: true },
              orderBy: { createdAt: 'asc' },
              take: 1,
              select: { id: true, firstName: true, email: true },
            },
          },
        },
      },
    });

    for (const sub of overdueList) {
      // Mark expired in DB
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'expired' },
      });

      const admin = sub.tenant.users[0];
      if (!admin?.email) continue;

      const renewalUrl = `${this.appUrl}/tenant/billing`;

      // Email
      await this.email.sendRaw(
        admin.email,
        '🚫 Tu suscripción de Glamorapp ha expirado',
        this.subscriptionExpiredTemplate({
          firstName: admin.firstName,
          tenantName: sub.tenant.name,
          planName: sub.plan.name,
          renewalUrl,
        }),
      );

      // In-app notification
      await this.notifications.create({
        tenantId: sub.tenantId,
        userId: admin.id,
        type: 'error',
        title: 'Suscripción expirada',
        message: `El Plan ${sub.plan.name} expiró. Tu acceso ha sido suspendido. Renueva para continuar operando.`,
        link: '/tenant/billing',
        source: 'billing',
        sourceId: sub.id,
      });

      this.logger.log(
        `[BillingTasks] Expired → tenant: ${sub.tenant.name} | plan: ${sub.plan.name}`,
      );
    }

    return overdueList.length;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EMAIL TEMPLATES
  // ─────────────────────────────────────────────────────────────────────────

  private get appUrl(): string {
    return this.config.get<string>('APP_URL') || 'https://app.glamorapp.co';
  }

  private baseLayout(content: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #ec4899, #a855f7); padding: 28px 32px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px; }
    .body { padding: 32px; color: #333333; line-height: 1.6; }
    .body h2 { color: #111827; margin-top: 0; font-size: 18px; }
    .alert-box { border-radius: 6px; padding: 16px 20px; margin: 20px 0; }
    .alert-warning { background: #fffbeb; border-left: 4px solid #f59e0b; }
    .alert-danger  { background: #fef2f2; border-left: 4px solid #ef4444; }
    .alert-box p { margin: 6px 0; font-size: 14px; }
    .alert-box strong { color: #374151; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #6b7280; }
    .detail-value { font-weight: 600; color: #111827; }
    .btn { display: inline-block; margin-top: 24px; padding: 13px 32px; background: linear-gradient(135deg, #ec4899, #a855f7); color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; }
    .btn-outline { display: inline-block; margin-top: 12px; padding: 11px 28px; border: 2px solid #a855f7; color: #a855f7 !important; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; }
    .footer { background: #f9fafb; text-align: center; padding: 16px 32px; font-size: 12px; color: #9ca3af; border-top: 1px solid #f0f0f0; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger  { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>💅 Glamorapp</h1></div>
    <div class="body">${content}</div>
    <div class="footer">Este correo fue generado automáticamente por Glamorapp · No respondas a este mensaje.</div>
  </div>
</body>
</html>`;
  }

  private renewalReminderTemplate(d: {
    firstName: string;
    tenantName: string;
    planName: string;
    daysLeft: number;
    expirationDate: Date;
    billingCycle: string;
    amount: number;
    renewalUrl: string;
  }): string {
    const urgency = d.daysLeft === 1 ? 'danger' : 'warning';
    const emoji   = d.daysLeft === 1 ? '🚨' : d.daysLeft <= 3 ? '⚠️' : '⏳';
    const cycleLabel = d.billingCycle === 'yearly' ? 'anual' : 'mensual';

    return this.baseLayout(`
      <h2>${emoji} Hola ${d.firstName}, tu plan vence pronto</h2>
      <p>Tu suscripción de <strong>${d.tenantName}</strong> en Glamorapp está próxima a vencer.</p>

      <div class="alert-box alert-${urgency}">
        <p>⚠️ <strong>Quedan solo ${d.daysLeft} día${d.daysLeft > 1 ? 's' : ''} para que expire tu acceso.</strong></p>
        <p>Si no renuevas, tu panel quedará suspendido el <strong>${formatDateCO(d.expirationDate)}</strong>.</p>
      </div>

      <div style="background:#f9fafb; border-radius:6px; padding:16px 20px; margin:20px 0;">
        <div class="detail-row"><span class="detail-label">Plan</span><span class="detail-value">Plan ${d.planName}</span></div>
        <div class="detail-row"><span class="detail-label">Ciclo</span><span class="detail-value">${cycleLabel.charAt(0).toUpperCase() + cycleLabel.slice(1)}</span></div>
        <div class="detail-row"><span class="detail-label">Monto a pagar</span><span class="detail-value">${formatCurrency(d.amount)}</span></div>
        <div class="detail-row"><span class="detail-label">Vence el</span><span class="detail-value">${d.expirationDate.toLocaleDateString('es-CO')}</span></div>
      </div>

      <p>Renueva ahora para continuar usando todas las funciones de Glamorapp sin interrupciones.</p>

      <div style="text-align:center;">
        <a href="${d.renewalUrl}" class="btn">Renovar mi plan →</a>
      </div>

      <p style="margin-top:24px; font-size:13px; color:#6b7280;">
        Si ya realizaste el pago, ignora este correo. Si tienes dudas escríbenos por WhatsApp o a soporte@glamorapp.co.
      </p>
    `);
  }

  private subscriptionExpiredTemplate(d: {
    firstName: string;
    tenantName: string;
    planName: string;
    renewalUrl: string;
  }): string {
    return this.baseLayout(`
      <h2>🚫 Tu suscripción ha expirado</h2>
      <p>Hola <strong>${d.firstName}</strong>, te informamos que la suscripción de <strong>${d.tenantName}</strong> al Plan <strong>${d.planName}</strong> ha <strong>expirado</strong>.</p>

      <div class="alert-box alert-danger">
        <p>❌ <strong>Tu acceso al panel ha sido suspendido temporalmente.</strong></p>
        <p>Todos tus datos están seguros y serán restaurados en cuanto renueves.</p>
      </div>

      <p>Para volver a operar normalmente, ingresa a tu panel de facturación y realiza el pago de renovación:</p>

      <div style="text-align:center; margin: 28px 0;">
        <a href="${d.renewalUrl}" class="btn">Reactivar mi suscripción →</a>
      </div>

      <p style="font-size:13px; color:#6b7280;">
        ¿Tienes alguna duda o necesitas un plan diferente? Escríbenos a <a href="mailto:soporte@glamorapp.co" style="color:#a855f7;">soporte@glamorapp.co</a> y te ayudamos.
      </p>
    `);
  }
}
