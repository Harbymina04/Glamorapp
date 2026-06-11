import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { StorefrontService } from '../storefront/storefront.service';
import { PlansService } from '../plans/plans.service';

const PLATFORM_CONFIG_ID = '00000000-0000-0000-0000-000000000001';

// ─── Wompi base URLs ──────────────────────────────────────────────
const WOMPI_SANDBOX = 'https://sandbox.wompi.co/v1';
const WOMPI_PROD    = 'https://production.wompi.co/v1';

// ─── PSE document types accepted by Wompi ────────────────────────
export const PSE_DOC_TYPES = ['CC', 'CE', 'NIT', 'TI', 'PP', 'IDC', 'CEL', 'RC', 'DE'] as const;
export type PseDocType = typeof PSE_DOC_TYPES[number];

export interface CreatePseTransactionDto {
  orderNumber: string;        // GA-XXXXXX — used as Wompi reference
  tenantId: string;
  amountCOP: number;          // full COP amount (not cents)
  buyerFullName: string;
  buyerEmail: string;
  buyerPhone: string;
  bankCode: string;           // financial_institution_code from Wompi
  userType: 0 | 1;           // 0=natural, 1=empresa
  docType: PseDocType;
  docNumber: string;
  redirectUrl: string;        // where browser goes after bank
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly baseUrl: string;
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly integrityKey: string;
  private readonly eventsKey: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private storefront: StorefrontService,
    private plans: PlansService,
  ) {
    const env = this.config.get('WOMPI_ENV', 'sandbox');
    this.baseUrl    = env === 'production' ? WOMPI_PROD : WOMPI_SANDBOX;
    this.publicKey  = this.config.get('WOMPI_PUBLIC_KEY', '');
    this.privateKey = this.config.get('WOMPI_PRIVATE_KEY', '');
    this.integrityKey = this.config.get('WOMPI_INTEGRITY_KEY', '');
    this.eventsKey  = this.config.get('WOMPI_EVENTS_KEY', '');

    if (!this.publicKey) {
      this.logger.warn('WOMPI_PUBLIC_KEY not set — payments are disabled');
    }
  }

  // ── PSE banks list ────────────────────────────────────────────

  async getPseBanks(): Promise<{ financialInstitutionCode: string; financialInstitutionName: string }[]> {
    const res = await fetch(`${this.baseUrl}/pse/financial_institutions`, {
      headers: { Authorization: `Bearer ${this.publicKey}` },
    });

    if (!res.ok) {
      throw new BadRequestException(`Wompi error fetching banks: ${res.status}`);
    }

    const json = await res.json();
    return json.data ?? [];
  }

  // ── Create PSE transaction ────────────────────────────────────

  async createPseTransaction(dto: CreatePseTransactionDto) {
    if (!this.privateKey) {
      throw new BadRequestException('Wompi no está configurado en este servidor.');
    }

    const amountInCents = Math.round(dto.amountCOP * 100);
    const reference     = dto.orderNumber;
    const currency      = 'COP';

    // Integrity signature: SHA256(reference + amount_in_cents + currency + integrity_secret)
    const signature = createHash('sha256')
      .update(`${reference}${amountInCents}${currency}${this.integrityKey}`)
      .digest('hex');

    const body = {
      amount_in_cents: amountInCents,
      currency,
      signature: { integrity: signature },
      customer_email: dto.buyerEmail,
      payment_method: {
        type: 'PSE',
        user_type: dto.userType,
        user_legal_id_type: dto.docType,
        user_legal_id: dto.docNumber,
        financial_institution_code: dto.bankCode,
        payment_description: `Pedido ${reference} — Glamorapp`,
      },
      redirect_url: dto.redirectUrl,
      reference,
      customer_data: {
        phone_number: dto.buyerPhone.replace(/\D/g, ''),
        full_name: dto.buyerFullName,
        legal_id: dto.docNumber,
        legal_id_type: dto.docType,
      },
    };

    const res = await fetch(`${this.baseUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.privateKey}`,
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (!res.ok) {
      this.logger.error('Wompi PSE error', JSON.stringify(json));
      const msg = json?.error?.messages
        ? Object.values(json.error.messages).flat().join(', ')
        : (json?.error?.reason ?? 'Error al crear la transacción');
      throw new BadRequestException(msg);
    }

    const tx = json.data;
    const pseRedirectUrl: string = tx.payment_method_info?.redirect_url ?? '';

    this.logger.log(`PSE transaction created: ${tx.id} for order ${reference}`);

    // Persist the Wompi transaction ID on the order immediately
    await this.prisma.storefrontOrder.updateMany({
      where: { orderNumber: reference },
      data: {
        paymentTransactionId: tx.id,
        paymentStatus: 'PENDING',
      },
    });

    return {
      transactionId: tx.id as string,
      redirectUrl: pseRedirectUrl,
      status: tx.status as string,
      reference,
    };
  }

  // ── Check transaction status ──────────────────────────────────

  async getTransactionStatus(transactionId: string) {
    const res = await fetch(`${this.baseUrl}/transactions/${transactionId}`, {
      headers: { Authorization: `Bearer ${this.publicKey}` },
    });

    if (!res.ok) {
      throw new BadRequestException(`Could not fetch transaction ${transactionId}`);
    }

    const json = await res.json();
    const tx = json.data;

    return {
      id: tx.id,
      status: tx.status,               // PENDING | APPROVED | DECLINED | VOIDED | ERROR
      reference: tx.reference,
      amountInCents: tx.amount_in_cents,
      currency: tx.currency,
      paymentMethod: tx.payment_method_type,
      createdAt: tx.created_at,
      finalizedAt: tx.finalized_at,
    };
  }

  // ── Webhook handler ───────────────────────────────────────────

  /**
   * Wompi posts events to this endpoint.
   * We verify the checksum and react to transaction.updated events.
   */
  async handleWebhook(payload: any, checksumHeader: string) {
    // Verify signature
    if (!this.verifyWebhookChecksum(payload, checksumHeader)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const { event, data } = payload;
    if (event !== 'transaction.updated') return { received: true };

    const tx = data?.transaction;
    if (!tx) return { received: true };

    const { reference, status } = tx;
    this.logger.log(`Webhook: transaction ${tx.id} → ${status} (order: ${reference})`);

    if (status === 'APPROVED') {
      if (reference.startsWith('SUB|')) {
        await this.plans.activateSubscriptionFromPayment(reference);
        this.logger.log(`Subscription activated via payment: ${reference}`);
      } else {
        await this.handleApprovedTransaction(reference, tx.amount_in_cents);
      }
    } else if (status === 'DECLINED' || status === 'VOIDED' || status === 'ERROR') {
      if (!reference.startsWith('SUB|')) {
        await this.handleFailedTransaction(reference, status);
      }
    }

    return { received: true };
  }

  // ── Private helpers ───────────────────────────────────────────

  private verifyWebhookChecksum(payload: any, checksum: string): boolean {
    if (!this.eventsKey || !checksum) return false;

    // Wompi checksum: SHA256(event_id + created_at + environment + JSON(data) + events_secret)
    const { id, created_at, environment, data } = payload;
    const raw = `${id}${created_at}${environment}${JSON.stringify(data)}${this.eventsKey}`;
    const expected = createHash('sha256').update(raw).digest('hex');

    return expected === checksum;
  }

  private async handleApprovedTransaction(orderNumber: string, amountInCents?: number) {
    const order = await this.prisma.storefrontOrder.findFirst({
      where: { orderNumber },
    });

    if (!order) {
      this.logger.warn(`Webhook: order ${orderNumber} not found`);
      return;
    }

    if (order.status === 'confirmed' || order.status === 'completed') {
      this.logger.log(`Webhook: order ${orderNumber} already ${order.status}, skipping`);
      return;
    }

    // Verify the amount actually paid matches the order's authoritative total.
    // Wompi reports amount_in_cents; order.total is in COP. Reject underpayment
    // so a tampered/short PSE charge can't confirm a full-value order.
    const expectedCents = Math.round(Number(order.total) * 100);
    if (typeof amountInCents === 'number' && Number.isFinite(amountInCents) && amountInCents < expectedCents) {
      this.logger.error(
        `Webhook: order ${orderNumber} amount mismatch — paid ${amountInCents} < expected ${expectedCents}. NOT confirming.`,
      );
      await this.prisma.storefrontOrder.update({
        where: { id: order.id },
        data: { paymentStatus: 'AMOUNT_MISMATCH' },
      });
      return;
    }

    // Calculate platform commission
    const cfg = await this.prisma.platformConfig.findUnique({
      where: { id: PLATFORM_CONFIG_ID },
    });
    const commissionRate = Number(cfg?.commissionRate ?? 0.03);
    const total          = Number(order.total);
    const platformFee    = Math.round(total * commissionRate * 100) / 100;
    const tenantPayout   = Math.round((total - platformFee) * 100) / 100;

    // Update payment status + fees
    await this.prisma.storefrontOrder.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'APPROVED',
        platformFee,
        tenantPayout,
      },
    });

    // Confirm the order — also triggers stock deduction
    await this.storefront.updateOrderStatus(order.tenantId, order.id, 'confirmed');
    this.logger.log(`Webhook: order ${orderNumber} confirmed | fee: ${platformFee} | payout: ${tenantPayout}`);
  }

  private async handleFailedTransaction(orderNumber: string, status: string) {
    const order = await this.prisma.storefrontOrder.findFirst({
      where: { orderNumber },
    });

    if (!order || order.status === 'cancelled') return;

    // Only cancel if still pending (not already confirmed by other means)
    if (order.status === 'pending') {
      await this.storefront.updateOrderStatus(order.tenantId, order.id, 'cancelled');
      this.logger.log(`Webhook: order ${orderNumber} cancelled — transaction ${status}`);
    }
  }
}
