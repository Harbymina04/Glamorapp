import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface WhatsAppMessage {
  to: string;           // phone number with country code
  text: string;         // message body
}

export interface WhatsAppWebhookPayload {
  id: string;
  from: string;         // sender phone
  to: string;           // bot phone
  body: string;         // message text
  timestamp: number;
  fromName?: string;
  hasMedia?: boolean;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private bridgeUrl: string;
  private bridgeKey: string;
  private enabled: boolean;

  private multiSession: boolean;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.bridgeUrl = this.config.get('WHATSAPP_BRIDGE_URL') || 'http://localhost:8081';
    this.bridgeKey = this.config.get('WHATSAPP_BRIDGE_API_KEY') || 'glamorapp_wa_2026';
    this.enabled = this.config.get('WHATSAPP_ENABLED') === 'true';
    // WAHA Core (free) = single session "default". Set WHATSAPP_MULTI_SESSION=true only with WAHA Plus.
    this.multiSession = this.config.get('WHATSAPP_MULTI_SESSION') === 'true';

    if (this.enabled) {
      this.logger.log(`WhatsApp multi-store service enabled — bridge: ${this.bridgeUrl}`);
    } else {
      this.logger.warn('WhatsApp service is DISABLED. Set WHATSAPP_ENABLED=true to enable.');
    }
  }

  /**
   * Resolve store → whatsappSessionId.
   * With WAHA Core (free), always returns "default" (single-session limit).
   * With WAHA Plus (WHATSAPP_MULTI_SESSION=true), uses the store's custom ID.
   */
  async resolveSessionId(storeId: string): Promise<string> {
    if (!this.multiSession) return 'default';
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { whatsappSessionId: true },
    });
    return store?.whatsappSessionId || `store_${storeId}`;
  }

  /**
   * Ensure a session is started on the bridge for the given store.
   * WAHA Core (free) only supports a single session named "default".
   * WAHA Plus supports multi-session with custom IDs.
   */
  async ensureSession(storeId: string): Promise<string> {
    const sessionId = await this.resolveSessionId(storeId);

    try {
      // server-baileys.js: POST /api/sessions/:sessionId/start  { phone? }  — idempotent
      await this.bridgeFetch(`/api/sessions/${sessionId}/start`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    } catch (e: any) {
      this.logger.warn(`Could not ensure session ${sessionId}: ${e.message}`);
    }
    return sessionId;
  }

  /**
   * Send a WhatsApp text message via the bridge for a specific store.
   */
  async sendMessage(storeId: string, to: string, text: string): Promise<boolean> {
    if (!this.enabled) {
      this.logger.debug(`[WHATSAPP DISABLED] Would send to ${to}: ${text.substring(0, 80)}...`);
      return false;
    }

    const sessionId = await this.ensureSession(storeId);
    const cleanPhone = to.replace(/[+\s\-()]/g, '');

    try {
      const res = await this.bridgeFetch('/api/sendText', {
        method: 'POST',
        body: JSON.stringify({
          chatId: `${cleanPhone}@s.whatsapp.net`,
          text: text,
          sessionId: sessionId,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`WhatsApp send failed for store ${storeId}: ${err}`);
        return false;
      }

      const data = await res.json();
      this.logger.log(`WhatsApp sent to ${cleanPhone} via session ${sessionId} (id: ${data.id})`);
      return true;
    } catch (e: any) {
      this.logger.error(`WhatsApp send error: ${e.message}`);
      return false;
    }
  }

  /**
   * Send appointment confirmation template
   */
  async sendAppointmentCreated(storeId: string, data: {
    customerName: string;
    customerPhone: string;
    serviceName: string;
    date: string;
    time: string;
    professionalName: string;
    price: number;
  }): Promise<boolean> {
    const dateFormatted = new Date(data.date).toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const message = [
      `💅 *Glamorapp — Cita Agendada*`,
      ``,
      `Hola ${data.customerName}, tu cita ha sido agendada exitosamente:`,
      ``,
      `📋 *Servicio:* ${data.serviceName}`,
      `📅 *Fecha:* ${dateFormatted}`,
      `🕐 *Hora:* ${data.time}`,
      `👩‍🎨 *Profesional:* ${data.professionalName}`,
      `💰 *Precio:* $${data.price.toFixed(2)}`,
      ``,
      `📍 *Ubicación:* Av. Reforma 222, CDMX`,
      ``,
      `Para confirmar, responde *CONFIRMAR*.`,
      `Si necesitas reagendar o cancelar, responde *CANCELAR*.`,
      ``,
      `¡Te esperamos! ✨`,
    ].join('\n');

    return this.sendMessage(storeId, data.customerPhone, message);
  }

  /**
   * Send appointment confirmation notification
   */
  async sendAppointmentConfirmed(storeId: string, data: {
    customerName: string;
    customerPhone: string;
    serviceName: string;
    date: string;
    time: string;
  }): Promise<boolean> {
    const dateFormatted = new Date(data.date).toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const message = [
      `✅ *Cita Confirmada*`,
      ``,
      `Hola ${data.customerName}, tu cita ha sido *confirmada*:`,
      ``,
      `📋 *Servicio:* ${data.serviceName}`,
      `📅 *Fecha:* ${dateFormatted}`,
      `🕐 *Hora:* ${data.time}`,
      ``,
      `Te recordamos llegar 5 minutos antes.`,
      `¡Gracias por confiar en Glamorapp! 💖`,
    ].join('\n');

    return this.sendMessage(storeId, data.customerPhone, message);
  }

  /**
   * Send appointment reminder (24h before)
   */
  async sendAppointmentReminder(storeId: string, data: {
    customerName: string;
    customerPhone: string;
    serviceName: string;
    date: string;
    time: string;
    professionalName: string;
  }): Promise<boolean> {
    const dateFormatted = new Date(data.date).toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const message = [
      `⏰ *Recordatorio de Cita*`,
      ``,
      `Hola ${data.customerName}, te recordamos tu cita de mañana:`,
      ``,
      `📋 *Servicio:* ${data.serviceName}`,
      `📅 *Fecha:* ${dateFormatted}`,
      `🕐 *Hora:* ${data.time}`,
      `👩‍🎨 *Profesional:* ${data.professionalName}`,
      ``,
      `Responde *CONFIRMAR* para confirmar asistencia.`,
      `¿No podrás asistir? Responde *CANCELAR*.`,
    ].join('\n');

    return this.sendMessage(storeId, data.customerPhone, message);
  }

  /**
   * Send cancellation notification
   */
  async sendAppointmentCancelled(storeId: string, data: {
    customerName: string;
    customerPhone: string;
    serviceName: string;
    date: string;
    time: string;
    reason?: string;
  }): Promise<boolean> {
    const dateFormatted = new Date(data.date).toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const message = [
      `❌ *Cita Cancelada*`,
      ``,
      `Hola ${data.customerName}, tu cita ha sido cancelada:`,
      ``,
      `📋 *Servicio:* ${data.serviceName}`,
      `📅 *Fecha:* ${dateFormatted}`,
      `🕐 *Hora:* ${data.time}`,
      ...(data.reason ? [`📝 *Motivo:* ${data.reason}`] : []),
      ``,
      `¿Deseas reagendar? Responde *REAGENDAR* y te ayudaremos.`,
      `O visita nuestra web para agendar una nueva cita.`,
    ].join('\n');

    return this.sendMessage(storeId, data.customerPhone, message);
  }

  /**
   * Parse incoming WhatsApp message for booking commands
   */
  parseCommand(body: string): {
    command: 'book' | 'confirm' | 'cancel' | 'reagendar' | 'info' | 'help' | 'unknown';
    args: string;
  } {
    const text = body.trim().toUpperCase();

    if (['HOLA', 'HI', 'INFO', 'AYUDA', 'HELP', 'MENU', 'MENÚ'].some(c => text.startsWith(c))) {
      return { command: 'info', args: '' };
    }
    if (text.startsWith('AGENDAR') || text.startsWith('CITA') || text.startsWith('RESERVAR') || text.startsWith('QUIERO')) {
      return { command: 'book', args: body };
    }
    if (text.startsWith('CONFIRMAR') || text === 'SI' || text === 'SÍ' || text === 'OK') {
      return { command: 'confirm', args: '' };
    }
    if (text.startsWith('CANCELAR') || text.startsWith('CANCEL')) {
      return { command: 'cancel', args: body };
    }
    if (text.startsWith('REAGENDAR') || text.startsWith('CAMBIAR') || text.startsWith('MOVER')) {
      return { command: 'reagendar', args: body };
    }

    return { command: 'unknown', args: body };
  }

  /**
   * Get help/info response message with real store data
   */
  getHelpMessage(storeName?: string, storePhone?: string | null, bookingUrl?: string): string {
    const name = storeName || 'el salón';
    const url  = bookingUrl || 'https://glamorapp.co/tienda';
    return [
      `💅 *${name} — Asistente WhatsApp*`,
      ``,
      `¡Hola! Puedo ayudarte con lo siguiente:`,
      ``,
      `📅 *AGENDAR* — Ver servicios y agendar tu cita`,
      `✅ *CONFIRMAR* — Confirmar tu cita pendiente`,
      `❌ *CANCELAR* — Cancelar tu cita`,
      `🔄 *REAGENDAR* — Cambiar la fecha de tu cita`,
      ``,
      `🌐 *Agenda en línea:*`,
      url,
      ...(storePhone ? [``, `📞 *Teléfono:* ${storePhone}`] : []),
      ``,
      `_Responde con una de las palabras en negrita para continuar._`,
    ].join('\n');
  }

  /**
   * Check if a phone number is valid for WhatsApp
   */
  isValidPhone(phone: string): boolean {
    const cleaned = phone.replace(/[+\s\-()]/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  // ═══════════════════════════════════════════════════════════
  // BRIDGE PROXY METHODS (multi-session, per-store)
  // ═══════════════════════════════════════════════════════════

  private async bridgeFetch(path: string, options?: RequestInit) {
    const res = await fetch(`${this.bridgeUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.bridgeKey,
        ...(options?.headers || {}),
      },
    });
    return res;
  }

  /**
   * Get overall bridge status — all sessions overview
   */
  async getBridgeStatus() {
    try {
      // server-baileys.js: GET /api/status → { uptime, totalSessions, connectedSessions, sessions }
      const res = await this.bridgeFetch('/api/status');
      if (!res.ok) throw new Error(`Bridge responded ${res.status}`);
      const data = await res.json();
      // Normalise: bridge already returns our format, just ensure shape
      return {
        uptime: data.uptime ?? 0,
        totalSessions: data.totalSessions ?? 0,
        connectedSessions: data.connectedSessions ?? 0,
        sessions: (data.sessions ?? []).map((s: any) => ({
          sessionId: s.sessionId,
          phone: s.phone || null,
          status: s.status,                     // already 'connected'/'reconnecting'/etc.
          connected: s.connected ?? (s.status === 'connected'),
          startedAt: s.startedAt ?? new Date().toISOString(),
        })),
      };
    } catch (e: any) {
      this.logger.error(`Bridge status error: ${e.message}`);
      return { uptime: 0, totalSessions: 0, connectedSessions: 0, sessions: [], error: e.message };
    }
  }

  /**
   * Get status of a specific store's session
   */
  async getStoreSessionStatus(storeId: string) {
    const sessionId = await this.resolveSessionId(storeId);
    try {
      // server-baileys.js: GET /api/sessions/:sessionId/status
      const res = await this.bridgeFetch(`/api/sessions/${sessionId}/status`);
      if (!res.ok) return { sessionId, status: 'not_started', connected: false };
      const data = await res.json();
      return {
        sessionId: data.sessionId ?? sessionId,
        phone: data.phone || null,
        status: data.status,
        connected: data.connected ?? false,
        startedAt: data.startedAt ?? new Date().toISOString(),
      };
    } catch (e: any) {
      return { sessionId, status: 'error', connected: false, error: e.message };
    }
  }

  /**
   * Get session status by raw sessionId (for superadmin bridge monitoring)
   */
  async getSessionStatusById(sessionId: string) {
    try {
      const res = await this.bridgeFetch(`/api/sessions/${sessionId}/status`);
      if (!res.ok) return { sessionId, status: 'not_found', connected: false };
      return await res.json();
    } catch (e: any) {
      return { sessionId, status: 'error', connected: false, error: e.message };
    }
  }

  /**
   * Start a session for a store
   */
  async startStoreSession(storeId: string) {
    await this.ensureSession(storeId);
    return this.getStoreSessionStatus(storeId);
  }

  /**
   * Stop a session for a store
   */
  async stopStoreSession(storeId: string) {
    const sessionId = await this.resolveSessionId(storeId);
    try {
      // server-baileys.js: POST /api/sessions/:sessionId/stop
      const res = await this.bridgeFetch(`/api/sessions/${sessionId}/stop`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { error: err.error || `Bridge responded ${res.status}` };
      }
      return await res.json();
    } catch (e: any) {
      return { error: e.message };
    }
  }

  /**
   * Get QR as base64 string for a specific store.
   * Retries up to 5 times with 1.5s delay to handle the async QR generation
   * that Baileys does after the session starts (~1-3 seconds).
   */
  async getStoreQrBase64(storeId: string): Promise<{ qrBase64: string; status: string } | null> {
    const sessionId = await this.ensureSession(storeId);
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const res = await this.bridgeFetch(`/api/sessions/${sessionId}/qr`);

        if (res.status === 404) {
          // Session not started or QR not generated yet — wait and retry
          if (attempt < 4) { await delay(1500); continue; }
          return { qrBase64: '', status: 'not_ready' };
        }

        const data = await res.json();

        if (data.status === 'already_connected') return { qrBase64: '', status: 'already_connected' };
        if (data.qr) return { qrBase64: data.qr, status: 'qr_ready' };

        // QR field not present yet — retry
        if (attempt < 4) { await delay(1500); continue; }
      } catch (e: any) {
        this.logger.error(`QR error for store ${storeId} (attempt ${attempt + 1}): ${e.message}`);
        if (attempt < 4) { await delay(1500); continue; }
      }
    }
    return { qrBase64: '', status: 'not_ready' };
  }

  /**
   * Request pairing code for a store.
   * phoneOverride: number passed directly from the frontend form.
   * Falls back to store.whatsappNumber in DB if not provided.
   */
  async requestPairingCode(storeId: string, phoneOverride?: string) {
    const sessionId = await this.ensureSession(storeId);

    let phone = phoneOverride?.replace(/[+\s\-()]/g, '') || '';

    if (!phone && storeId) {
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { whatsappNumber: true },
      });
      phone = (store?.whatsappNumber || '').replace(/[+\s\-()]/g, '');
    }

    if (!phone) return { success: false, error: 'Ingresa un número de teléfono válido' };

    // phone is already stripped of non-digits above
    const phoneNumber = phone;
    try {
      // server-baileys.js: POST /api/sessions/:sessionId/pair  { phone }
      const res = await this.bridgeFetch(`/api/sessions/${sessionId}/pair`, {
        method: 'POST',
        body: JSON.stringify({ phone: phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || data.message || JSON.stringify(data) };
      return { success: true, code: data.code, ...data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // INCOMING MESSAGE HANDLER
  // ═══════════════════════════════════════════════════════════

  /**
   * Process a message received from a customer via WhatsApp.
   * Called by the webhook controller with the payload from the bridge.
   */
  async handleIncomingMessage(payload: {
    sessionId: string;
    from: string;
    fromName: string;
    body: string;
    timestamp: number;
  }): Promise<void> {
    const { sessionId, from, fromName, body } = payload;

    // 1. Resolve storeId and tenantId from sessionId
    const storeIdFromSession = sessionId.startsWith('store_')
      ? sessionId.replace('store_', '')
      : null;

    const store = this.multiSession ? await this.prisma.store.findFirst({
      where: {
        OR: [
          { whatsappSessionId: sessionId },
          ...(storeIdFromSession ? [{ id: storeIdFromSession }] : []),
        ],
      },
      select: { id: true, tenantId: true, name: true, phone: true, slug: true },
    }) : null;

    if (!store && this.multiSession) {
      this.logger.warn(`No store found for sessionId ${sessionId} — ignoring message`);
      return;
    }

    const storeId  = store?.id  || sessionId;
    const tenantId = store?.tenantId;

    // 1b. Fetch storefront slug for booking link
    const APP_URL = this.config.get('NEXT_PUBLIC_APP_URL') || 'https://glamorapp.co';
    const storefront = tenantId ? await this.prisma.storefront.findFirst({
      where: { tenantId },
      select: { slug: true, displayName: true },
    }) : null;

    const bookingUrl = storefront?.slug
      ? `${APP_URL}/tienda/${storefront.slug}`
      : `${APP_URL}/tienda`;

    const storePhone  = store?.phone || null;
    const storeName   = storefront?.displayName || store?.name || 'el salón';

    // 2. Parse command
    const { command } = this.parseCommand(body);

    // 3. Find customer by phone in this store/tenant
    // Strip @lid / @s.whatsapp.net suffixes and non-digit chars
    const cleanPhone = from.replace(/@[\w.]+$/, '').replace(/[+\s\-()]/g, '');
    const last10 = cleanPhone.slice(-10);
    const customer = tenantId ? await this.prisma.user.findFirst({
      where: {
        tenantId,
        // No role filter — avoids enum mismatch if DB migration is pending
        OR: [
          { phone: { contains: cleanPhone } },
          { phone: { endsWith: last10 } },
        ],
      },
      select: { id: true, firstName: true, phone: true },
    }) : null;

    // 4. Find latest active appointment for this customer
    const appointment = customer ? await this.prisma.appointment.findFirst({
      where: {
        storeId,
        customerId: customer.id,
        status: { in: ['pending', 'confirmed'] },
        date: { gte: new Date() },
      },
      include: {
        service: { select: { name: true } },
        professional: { select: { firstName: true } },
      },
      orderBy: { date: 'asc' },
    }) : null;

    const customerName = customer?.firstName || fromName || 'Cliente';

    // 5. Execute command
    switch (command) {
      case 'confirm': {
        if (!appointment) {
          await this.sendMessage(storeId, from,
            `Hola ${customerName} 👋\n\nNo encontramos una cita pendiente asociada a este número.\n\nSi necesitas agendar una cita, visita nuestro sitio web o escríbenos *AYUDA*.`);
          break;
        }
        if (appointment.status === 'confirmed') {
          const dateStr = new Date(appointment.date).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
          await this.sendMessage(storeId, from,
            `✅ Tu cita del *${dateStr}* a las *${appointment.startTime}* ya estaba confirmada.\n\n¡Te esperamos! 💅`);
          break;
        }
        // Update appointment status
        await this.prisma.appointment.update({
          where: { id: appointment.id },
          data: { status: 'confirmed', confirmedAt: new Date() },
        });
        const dateStr = new Date(appointment.date).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
        await this.sendMessage(storeId, from,
          `✅ *¡Cita confirmada!*\n\n` +
          `📋 *Servicio:* ${appointment.service?.name || 'Tu servicio'}\n` +
          `📅 *Fecha:* ${dateStr}\n` +
          `🕐 *Hora:* ${appointment.startTime}\n` +
          `${appointment.professional ? `👩‍🎨 *Profesional:* ${appointment.professional.firstName}\n` : ''}` +
          `\nTe recordamos llegar 5 minutos antes. ¡Gracias! 💖`);
        this.logger.log(`Cita ${appointment.id} confirmada por WhatsApp desde ${from}`);
        break;
      }

      case 'cancel': {
        if (!appointment) {
          await this.sendMessage(storeId, from,
            `Hola ${customerName} 👋\n\nNo encontramos una cita activa para cancelar.\n\n` +
            `Para agendar una nueva cita visita:\n${bookingUrl}\n\n` +
            `Escribe *AYUDA* para ver todas las opciones.`);
          break;
        }
        await this.prisma.appointment.update({
          where: { id: appointment.id },
          data: { status: 'cancelled', cancelledAt: new Date(), cancelReason: 'Cancelado por cliente vía WhatsApp' },
        });
        const cancelDateStr = new Date(appointment.date).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
        await this.sendMessage(storeId, from,
          `❌ *Cita cancelada*\n\n` +
          `Tu cita del *${cancelDateStr}* a las *${appointment.startTime}* ha sido cancelada.\n\n` +
          `¿Quieres agendar una nueva? 👇\n${bookingUrl}`);
        this.logger.log(`Cita ${appointment.id} cancelada por WhatsApp desde ${from}`);
        break;
      }

      case 'reagendar': {
        if (appointment) {
          const reagDateStr = new Date(appointment.date).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
          await this.sendMessage(storeId, from,
            `🔄 *Reagendar cita*\n\n` +
            `Tienes una cita el *${reagDateStr}* a las *${appointment.startTime}*.\n\n` +
            `Para elegir una nueva fecha y hora agenda directamente en:\n${bookingUrl}\n\n` +
            (storePhone ? `O llámanos: 📞 ${storePhone}` : ''));
        } else {
          await this.sendMessage(storeId, from,
            `Hola ${customerName} 👋\n\nNo encontramos una cita activa para reagendar.\n\n` +
            `Puedes agendar una nueva aquí:\n${bookingUrl}`);
        }
        break;
      }

      case 'book': {
        await this.sendMessage(storeId, from,
          `📅 *Agendar cita en ${storeName}*\n\n` +
          `Puedes ver nuestros servicios, precios y disponibilidad en:\n${bookingUrl}\n\n` +
          (storePhone ? `También puedes llamarnos: 📞 ${storePhone}\n\n` : '') +
          `¡Con gusto te atendemos! 💅`);
        break;
      }

      case 'info':
      case 'help':
      default: {
        await this.sendMessage(storeId, from, this.getHelpMessage(storeName, storePhone, bookingUrl));
        break;
      }
    }
  }

  /**
   * Update store's WhatsApp number and generate a sessionId if missing
   */
  async updateStoreWhatsApp(storeId: string, whatsappNumber: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new Error('Store no encontrada');

    const sessionId = store.whatsappSessionId || store.id;

    const updated = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        whatsappNumber,
        whatsappSessionId: sessionId,
      },
    });

    return { whatsappNumber: updated.whatsappNumber, whatsappSessionId: updated.whatsappSessionId };
  }
}
