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

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.bridgeUrl = this.config.get('WHATSAPP_BRIDGE_URL') || 'http://localhost:8082';
    this.bridgeKey = this.config.get('WHATSAPP_BRIDGE_API_KEY') || 'glamorapp_wa_2026';
    this.enabled = this.config.get('WHATSAPP_ENABLED') === 'true';

    if (this.enabled) {
      this.logger.log(`WhatsApp multi-store service enabled — bridge: ${this.bridgeUrl}`);
    } else {
      this.logger.warn('WhatsApp service is DISABLED. Set WHATSAPP_ENABLED=true to enable.');
    }
  }

  /**
   * Resolve store → whatsappSessionId.
   */
  async resolveSessionId(storeId: string): Promise<string> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { whatsappSessionId: true },
    });
    return store?.whatsappSessionId || `store_${storeId}`;
  }

  /**
   * Ensure a session is started on the bridge for the given store.
   */
  async ensureSession(storeId: string): Promise<string> {
    const sessionId = await this.resolveSessionId(storeId);
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { whatsappNumber: true },
    });

    try {
      await this.bridgeFetch(`/api/sessions/${sessionId}/start`, {
        method: 'POST',
        body: JSON.stringify({ phone: store?.whatsappNumber || undefined }),
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
   * Get help/info response message
   */
  getHelpMessage(): string {
    return [
      `💅 *Glamorapp — Asistente Virtual*`,
      ``,
      `¡Hola! Soy el asistente de Glamorapp. Puedes:`,
      ``,
      `📅 *AGENDAR* — Agendar una nueva cita`,
      `   Ej: \"AGENDAR Manicure para el viernes\"`,
      ``,
      `✅ *CONFIRMAR* — Confirmar tu cita`,
      `   Ej: \"CONFIRMAR\"`,
      ``,
      `❌ *CANCELAR* — Cancelar tu cita`,
      `   Ej: \"CANCELAR\"`,
      ``,
      `🔄 *REAGENDAR* — Cambiar fecha/hora`,
      `   Ej: \"REAGENDAR para el sábado\"`,
      ``,
      `📞 ¿Prefieres hablar? Llámanos al +52 55 1234 5678`,
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
      const res = await this.bridgeFetch('/api/status');
      return await res.json();
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
      const res = await this.bridgeFetch(`/api/sessions/${sessionId}/status`);
      if (!res.ok) return { sessionId, status: 'not_started', connected: false };
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
      const res = await this.bridgeFetch(`/api/sessions/${sessionId}/stop`, { method: 'POST' });
      return await res.json();
    } catch (e: any) {
      return { error: e.message };
    }
  }

  /**
   * Get QR as base64 string for a specific store
   */
  async getStoreQrBase64(storeId: string): Promise<{ qrBase64: string; status: string } | null> {
    const sessionId = await this.ensureSession(storeId);
    try {
      const res = await this.bridgeFetch(`/api/sessions/${sessionId}/qr`);
      if (res.status === 404) return null;
      const data = await res.json();
      if (data.status === 'already_connected') return { qrBase64: '', status: 'already_connected' };
      if (data.qr) {
        return { qrBase64: data.qr, status: 'qr_ready' };
      }
      return null;
    } catch (e: any) {
      this.logger.error(`QR error for store ${storeId}: ${e.message}`);
      return null;
    }
  }

  /**
   * Request pairing code for a store
   */
  async requestPairingCode(storeId: string) {
    const sessionId = await this.ensureSession(storeId);
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { whatsappNumber: true },
    });
    const phone = store?.whatsappNumber;
    if (!phone) return { success: false, error: 'La sucursal no tiene whatsappNumber configurado' };

    try {
      const res = await this.bridgeFetch(`/api/sessions/${sessionId}/pair`, {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
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
