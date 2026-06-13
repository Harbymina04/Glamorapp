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
  private readonly resendApiKey: string | null;
  private readonly useResendApi: boolean;

  constructor(private config: ConfigService) {
    const host    = config.get<string>('SMTP_HOST');
    const apiKey  = config.get<string>('SMTP_PASS') || '';
    this.from     = config.get<string>('SMTP_FROM') || 'Glamorapp <onboarding@resend.dev>';
    this.enabled  = !!host || apiKey.startsWith('re_');

    // Use Resend HTTP API when key starts with re_ (avoids domain verification issues with SMTP)
    this.resendApiKey  = apiKey.startsWith('re_') ? apiKey : null;
    this.useResendApi  = !!this.resendApiKey;

    if (this.enabled && !this.useResendApi) {
      const port   = config.get<number>('SMTP_PORT') || 587;
      const secure = String(config.get('SMTP_SECURE')).toLowerCase() === 'true';
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        requireTLS: !secure,
        auth: {
          user: config.get<string>('SMTP_USER'),
          pass: apiKey,
        },
        tls: { rejectUnauthorized: false },
      });
    }

    if (this.useResendApi) {
      this.logger.log('Email provider: Resend HTTP API');
    } else if (this.enabled) {
      this.logger.log(`Email provider: SMTP (${host})`);
    } else {
      this.logger.warn('Email disabled — set SMTP_HOST or SMTP_PASS=re_...');
    }
  }

  /** Generic send — public so other services (e.g. marketing) can use it */
  async sendRaw(to: string, subject: string, html: string): Promise<void> {
    return this.send(to, subject, html);
  }

  /** Send with optional PDF attachment and CC recipients */
  async sendWithAttachment(opts: {
    to: string;
    cc?: string[];
    subject: string;
    html: string;
    attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
  }): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(`[Email disabled] To: ${opts.to} | Subject: ${opts.subject}`);
      return;
    }
    if (this.useResendApi) {
      await this.sendViaResendApiWithAttachment(opts);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: opts.to,
        cc: opts.cc?.join(', '),
        subject: opts.subject,
        html: opts.html,
        attachments: opts.attachments?.map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType ?? 'application/pdf',
        })),
      });
      this.logger.log(`Email sent to ${opts.to}: ${opts.subject}`);
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${opts.to}: ${err.message}`);
    }
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(`[Email disabled] To: ${to} | Subject: ${subject}`);
      return;
    }

    if (this.useResendApi) {
      await this.sendViaResendApi(to, subject, html);
      return;
    }

    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
    }
  }

  private async sendViaResendApi(to: string, subject: string, html: string): Promise<void> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.from, to, subject, html }),
      });
      const data = await res.json() as any;
      if (!res.ok) {
        this.logger.error(`Resend API error to ${to}: ${JSON.stringify(data)}`);
      } else {
        this.logger.log(`Email sent via Resend to ${to}: ${subject} (id: ${data.id})`);
      }
    } catch (err: any) {
      this.logger.error(`Resend API fetch failed to ${to}: ${err.message}`);
    }
  }

  private async sendViaResendApiWithAttachment(opts: {
    to: string;
    cc?: string[];
    subject: string;
    html: string;
    attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
  }): Promise<void> {
    try {
      const body: any = {
        from: this.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      };
      if (opts.cc?.length) body.cc = opts.cc;
      if (opts.attachments?.length) {
        body.attachments = opts.attachments.map(a => ({
          filename: a.filename,
          content: a.content.toString('base64'),
        }));
      }
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json() as any;
      if (!res.ok) {
        this.logger.error(`Resend API error to ${opts.to}: ${JSON.stringify(data)}`);
      } else {
        this.logger.log(`Email+attachment sent via Resend to ${opts.to}: ${opts.subject} (id: ${data.id})`);
      }
    } catch (err: any) {
      this.logger.error(`Resend API fetch failed to ${opts.to}: ${err.message}`);
    }
  }

  async sendPurchaseOrder(opts: {
    to: string;
    cc?: string[];
    purchaseNumber: string;
    supplierName: string;
    storeName: string;
    storeColor?: string;
    total: number;
    itemCount: number;
    pdfBuffer: Buffer;
  }): Promise<void> {
    const subject = `📦 Orden de Compra ${opts.purchaseNumber} – ${opts.storeName}`;
    const html = this.purchaseOrderTemplate(opts);
    await this.sendWithAttachment({
      to: opts.to,
      cc: opts.cc,
      subject,
      html,
      attachments: [{ filename: `OC-${opts.purchaseNumber}.pdf`, content: opts.pdfBuffer }],
    });
  }

  // ─── Storefront orders ──────────────────────────────────────────

  /** Notifica a la TIENDA un nuevo pedido (solo sus productos). */
  async sendStorefrontOrderToStore(opts: {
    to: string;
    orderNumber: string;
    storeName: string;
    buyerName: string;
    buyerPhone?: string;
    deliveryMethod?: string;
    deliveryAddress?: string;
    items: { name: string; qty: number; price: number }[];
    total: number;
  }): Promise<void> {
    const subject = `🛍️ Nuevo pedido ${opts.orderNumber} – ${opts.storeName}`;
    const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
    const rows = opts.items.map(i =>
      `<tr><td style="padding:6px 0;color:#374151;">${i.name} × ${i.qty}</td><td style="padding:6px 0;text-align:right;color:#111827;font-weight:600;">${fmt(i.price * i.qty)}</td></tr>`,
    ).join('');
    const delivery = opts.deliveryMethod === 'delivery'
      ? `<p><strong>Entrega:</strong> Domicilio</p><p><strong>Dirección:</strong> ${opts.deliveryAddress ?? '—'}</p>`
      : `<p><strong>Entrega:</strong> Recoge en tienda</p>`;
    const html = this.baseLayout(`
      <h2>Nuevo pedido recibido 🎉</h2>
      <p>Tienes un nuevo pedido en tu tienda online.</p>
      <div class="detail-box">
        <p><strong>Pedido:</strong> ${opts.orderNumber}</p>
        <p><strong>Cliente:</strong> ${opts.buyerName}</p>
        ${opts.buyerPhone ? `<p><strong>Teléfono:</strong> ${opts.buyerPhone}</p>` : ''}
        ${delivery}
      </div>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        ${rows}
        <tr><td style="padding:10px 0 0;border-top:2px solid #a855f7;font-weight:800;">TOTAL</td><td style="padding:10px 0 0;border-top:2px solid #a855f7;text-align:right;font-weight:800;color:#a855f7;">${fmt(opts.total)}</td></tr>
      </table>
      <p style="margin-top:20px;font-size:13px;color:#6b7280;">Ingresa a tu panel para gestionar el pedido.</p>
    `);
    await this.send(opts.to, subject, html);
  }

  /** Confirma al CLIENTE su(s) pedido(s) en un solo correo (agrega multi-tienda). */
  async sendStorefrontOrderToCustomer(opts: {
    to: string;
    customerName: string;
    orders: {
      orderNumber: string;
      storeName: string;
      items: { name: string; qty: number; price: number }[];
      total: number;
      deliveryMethod?: string;
      deliveryAddress?: string;
    }[];
    grandTotal: number;
  }): Promise<void> {
    const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
    const multi = opts.orders.length > 1;
    const subject = multi
      ? `✅ Recibimos tus ${opts.orders.length} pedidos`
      : `✅ Recibimos tu pedido ${opts.orders[0]?.orderNumber ?? ''}`;

    const blocks = opts.orders.map(o => {
      const rows = o.items.map(i =>
        `<tr><td style="padding:5px 0;color:#374151;font-size:14px;">${i.name} × ${i.qty}</td><td style="padding:5px 0;text-align:right;color:#111827;font-size:14px;">${fmt(i.price * i.qty)}</td></tr>`,
      ).join('');
      const delivery = o.deliveryMethod === 'delivery'
        ? `Domicilio${o.deliveryAddress ? ` · ${o.deliveryAddress}` : ''}`
        : 'Recoge en tienda';
      return `
        <div class="detail-box">
          <p style="margin:0 0 8px;"><strong style="width:auto;">${o.storeName}</strong> — Pedido ${o.orderNumber}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${delivery}</p>
          <table style="width:100%;border-collapse:collapse;">
            ${rows}
            <tr><td style="padding:8px 0 0;border-top:1px solid #e5e7eb;font-weight:700;">Subtotal</td><td style="padding:8px 0 0;border-top:1px solid #e5e7eb;text-align:right;font-weight:700;">${fmt(o.total)}</td></tr>
          </table>
        </div>`;
    }).join('');

    const grand = multi
      ? `<table style="width:100%;border-collapse:collapse;margin-top:8px;"><tr><td style="font-weight:800;font-size:16px;">TOTAL GENERAL</td><td style="text-align:right;font-weight:800;font-size:16px;color:#a855f7;">${fmt(opts.grandTotal)}</td></tr></table>`
      : '';

    const html = this.baseLayout(`
      <h2>¡Gracias por tu compra, ${opts.customerName}!</h2>
      <p>Recibimos tu${multi ? 's' : ''} pedido${multi ? 's' : ''}. ${multi ? 'Cada tienda procesará el suyo y te contactará.' : 'La tienda procesará tu pedido y te contactará.'}</p>
      ${blocks}
      ${grand}
      <p style="margin-top:20px;font-size:13px;color:#6b7280;">Puedes ver el estado de tus pedidos en tu cuenta.</p>
    `);
    await this.send(opts.to, subject, html);
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

  private purchaseOrderTemplate(opts: {
    purchaseNumber: string;
    supplierName: string;
    storeName: string;
    storeColor?: string;
    total: number;
    itemCount: number;
  }): string {
    const color = opts.storeColor && /^#[0-9A-Fa-f]{6}$/.test(opts.storeColor) ? opts.storeColor : '#1a1a2e';
    const totalFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(opts.total);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #f3f4f6; }
  .wrap { max-width: 580px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 8px rgba(0,0,0,.08); }
  .header { background: ${color}; padding: 28px 32px; }
  .header h1 { margin: 0; color: #fff; font-size: 20px; font-weight: 800; }
  .header p  { margin: 4px 0 0; color: rgba(255,255,255,.75); font-size: 13px; }
  .body { padding: 28px 32px; }
  .body p { color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
  table.info { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin: 20px 0; }
  table.info td { padding: 11px 16px; font-size: 13px; }
  table.info tr:nth-child(odd) td { background: #f9fafb; }
  table.info td:first-child { color: #6b7280; font-weight: 600; width: 42%; }
  table.info td:last-child  { color: #111827; font-weight: 500; }
  .total-row td { border-top: 2px solid ${color} !important; }
  .total-row td:first-child { color: #374151; font-size: 14px; font-weight: 700; }
  .total-row td:last-child  { color: ${color}; font-size: 18px; font-weight: 800; }
  .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 32px; text-align: center; color: #9ca3af; font-size: 12px; }
</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>${opts.storeName}</h1>
    <p>Orden de Compra · ${opts.purchaseNumber}</p>
  </div>
  <div class="body">
    <p>Se ha generado una nueva orden de compra que requiere tu atención.</p>
    <table class="info">
      <tr><td>Número de OC</td><td><strong>${opts.purchaseNumber}</strong></td></tr>
      <tr><td>Proveedor</td><td>${opts.supplierName}</td></tr>
      <tr><td>Emitido por</td><td>${opts.storeName}</td></tr>
      <tr><td>Productos</td><td>${opts.itemCount} ítem${opts.itemCount !== 1 ? 's' : ''}</td></tr>
      <tr class="total-row"><td>TOTAL</td><td>${totalFmt}</td></tr>
    </table>
    <p>Se adjunta el PDF con el detalle completo: productos, cantidades, precios e IVA.</p>
    <p style="color:#6b7280; font-size:13px;">Por favor revisa el documento adjunto y coordina el despacho según las condiciones acordadas.</p>
  </div>
  <div class="footer">${opts.storeName} · Documento generado automáticamente</div>
</div>
</body></html>`;
  }
}
