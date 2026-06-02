import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface AppointmentEmailData {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  date: string;
  time: string;
  professionalName?: string;
  storeName?: string;
  price?: number;
  reason?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly enabled: boolean;

  constructor(private config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.from = config.get<string>('SMTP_FROM') || 'Glamorapp <no-reply@glamorapp.com>';
    this.enabled = !!host;

    if (this.enabled) {
      const port = config.get<number>('SMTP_PORT') || 587;
      const secure = String(config.get('SMTP_SECURE')).toLowerCase() === 'true';
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        requireTLS: !secure,
        auth: {
          user: config.get<string>('SMTP_USER'),
          pass: config.get<string>('SMTP_PASS'),
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    }
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(`[Email disabled] To: ${to} | Subject: ${subject}`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
    }
  }

  async sendAppointmentCreated(data: AppointmentEmailData): Promise<void> {
    const subject = `✅ Cita confirmada – ${data.serviceName}`;
    const html = this.appointmentCreatedTemplate(data);
    await this.send(data.customerEmail, subject, html);
  }

  async sendAppointmentConfirmed(data: AppointmentEmailData): Promise<void> {
    const subject = `🎉 Tu cita fue confirmada – ${data.serviceName}`;
    const html = this.appointmentConfirmedTemplate(data);
    await this.send(data.customerEmail, subject, html);
  }

  async sendAppointmentCancelled(data: AppointmentEmailData): Promise<void> {
    const subject = `❌ Tu cita fue cancelada – ${data.serviceName}`;
    const html = this.appointmentCancelledTemplate(data);
    await this.send(data.customerEmail, subject, html);
  }

  async sendWelcome(email: string, firstName: string, appUrl: string): Promise<void> {
    const dashboardUrl = `${appUrl}/tenant`;
    const subject = '🎉 ¡Bienvenido a Glamorapp! Tu cuenta está lista';
    const html = this.welcomeTemplate(firstName, dashboardUrl);
    await this.send(email, subject, html);
  }

  async sendPasswordReset(email: string, token: string, appUrl: string): Promise<void> {
    const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;
    const subject = '🔐 Restablecer contraseña – Glamorapp';
    const html = this.passwordResetTemplate(resetUrl);
    await this.send(email, subject, html);
  }

  // ─── HTML Templates ────────────────────────────────────────────────────────

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
    .detail-box { background: #fdf4ff; border-left: 4px solid #a855f7; border-radius: 4px; padding: 16px 20px; margin: 20px 0; }
    .detail-box p { margin: 6px 0; font-size: 14px; }
    .detail-box strong { display: inline-block; width: 110px; color: #6b21a8; }
    .btn { display: inline-block; margin-top: 24px; padding: 12px 28px; background: linear-gradient(135deg, #ec4899, #a855f7); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; }
    .footer { background: #f9fafb; text-align: center; padding: 16px 32px; font-size: 12px; color: #9ca3af; border-top: 1px solid #f0f0f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>💅 Glamorapp</h1></div>
    <div class="body">${content}</div>
    <div class="footer">Este correo fue generado automáticamente. Por favor no respondas a este mensaje.</div>
  </div>
</body>
</html>`;
  }

  private formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('es-CO', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  private appointmentCreatedTemplate(d: AppointmentEmailData): string {
    return this.baseLayout(`
      <h2>¡Hola, ${d.customerName}!</h2>
      <p>Tu cita ha sido registrada exitosamente. Te esperamos pronto.</p>
      <div class="detail-box">
        <p><strong>Servicio:</strong> ${d.serviceName}</p>
        <p><strong>Fecha:</strong> ${this.formatDate(d.date)}</p>
        <p><strong>Hora:</strong> ${d.time}</p>
        ${d.professionalName ? `<p><strong>Profesional:</strong> ${d.professionalName}</p>` : ''}
        ${d.storeName ? `<p><strong>Sede:</strong> ${d.storeName}</p>` : ''}
        ${d.price ? `<p><strong>Valor:</strong> $${d.price.toLocaleString('es-CO')}</p>` : ''}
      </div>
      <p>Si necesitas hacer algún cambio, comunícate con nosotros con anticipación.</p>
    `);
  }

  private appointmentConfirmedTemplate(d: AppointmentEmailData): string {
    return this.baseLayout(`
      <h2>¡Cita confirmada, ${d.customerName}!</h2>
      <p>Tu cita ha sido <strong>confirmada</strong> por nuestro equipo. ¡Ya está todo listo!</p>
      <div class="detail-box">
        <p><strong>Servicio:</strong> ${d.serviceName}</p>
        <p><strong>Fecha:</strong> ${this.formatDate(d.date)}</p>
        <p><strong>Hora:</strong> ${d.time}</p>
        ${d.professionalName ? `<p><strong>Profesional:</strong> ${d.professionalName}</p>` : ''}
        ${d.storeName ? `<p><strong>Sede:</strong> ${d.storeName}</p>` : ''}
      </div>
      <p>Te recomendamos llegar 5 minutos antes de tu cita. ¡Nos vemos pronto! 🎉</p>
    `);
  }

  private appointmentCancelledTemplate(d: AppointmentEmailData): string {
    return this.baseLayout(`
      <h2>Tu cita fue cancelada</h2>
      <p>Hola ${d.customerName}, lamentamos informarte que tu cita ha sido <strong>cancelada</strong>.</p>
      <div class="detail-box">
        <p><strong>Servicio:</strong> ${d.serviceName}</p>
        <p><strong>Fecha:</strong> ${this.formatDate(d.date)}</p>
        <p><strong>Hora:</strong> ${d.time}</p>
        ${d.reason ? `<p><strong>Motivo:</strong> ${d.reason}</p>` : ''}
      </div>
      <p>Puedes agendar una nueva cita cuando lo desees. Lamentamos los inconvenientes causados.</p>
    `);
  }

  private welcomeTemplate(firstName: string, dashboardUrl: string): string {
    return this.baseLayout(`
      <h2>¡Hola, ${firstName}! Bienvenido a Glamorapp 🎉</h2>
      <p>Tu cuenta está lista y tienes <strong>14 días gratis</strong> del Plan Profesional para explorar todo lo que Glamorapp puede hacer por tu salón.</p>
      <div class="detail-box">
        <p><strong>¿Qué puedes hacer ahora?</strong></p>
        <p>✅ Configurar tu primera sucursal</p>
        <p>✅ Agregar tu catálogo de servicios</p>
        <p>✅ Invitar a tu equipo</p>
        <p>✅ Activar el Agente IA Glamy en WhatsApp</p>
      </div>
      <div style="text-align:center;">
        <a href="${dashboardUrl}" class="btn">Ir a mi panel →</a>
      </div>
      <p style="margin-top:24px; font-size:13px; color:#6b7280;">
        Si tienes dudas, escríbenos y te ayudamos a configurar todo. Soporte en español 🇨🇴
      </p>
    `);
  }

  private passwordResetTemplate(resetUrl: string): string {
    return this.baseLayout(`
      <h2>Restablecer contraseña</h2>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Glamorapp.</p>
      <p>Haz clic en el siguiente botón para crear una nueva contraseña. Este enlace es válido por <strong>15 minutos</strong>.</p>
      <div style="text-align:center;">
        <a href="${resetUrl}" class="btn">Restablecer contraseña</a>
      </div>
      <p style="margin-top:24px; font-size:13px; color:#6b7280;">
        Si no solicitaste este cambio, ignora este correo. Tu contraseña no será modificada.
      </p>
      <p style="font-size:12px; color:#9ca3af; word-break:break-all;">
        O copia este enlace en tu navegador: ${resetUrl}
      </p>
    `);
  }
}
