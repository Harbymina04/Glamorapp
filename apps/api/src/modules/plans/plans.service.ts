import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlansService {
  private readonly wompiBase: string;
  private readonly wompiPrivateKey: string;
  private readonly wompiIntegrityKey: string;
  private readonly appUrl: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const env = this.config.get('WOMPI_ENV', 'sandbox');
    this.wompiBase = env === 'production'
      ? 'https://production.wompi.co/v1'
      : 'https://sandbox.wompi.co/v1';
    this.wompiPrivateKey  = this.config.get('WOMPI_PRIVATE_KEY', '');
    this.wompiIntegrityKey = this.config.get('WOMPI_INTEGRITY_KEY', '');
    this.appUrl = this.config.get('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
  }

  async findAll() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }

  async create(data: any) {
    return this.prisma.plan.create({ data });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.plan.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.plan.update({ where: { id }, data: { isActive: false } });
  }

  // Subscriptions
  async getSubscriptions(query: any) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.tenantId) where.tenantId = query.tenantId;
    
    const subs = await this.prisma.subscription.findMany({
      where,
      include: { plan: true, tenant: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: Number(query.limit) || 50,
    });

    return subs.map(s => ({
      id: s.id,
      tenantId: s.tenantId,
      tenantName: s.tenant.name,
      tenantSlug: s.tenant.slug,
      planId: s.planId,
      planName: s.plan.name,
      planSlug: s.plan.slug,
      monthlyPrice: Number(s.plan.monthlyPrice),
      yearlyPrice: Number(s.plan.yearlyPrice),
      status: s.status,
      billingCycle: s.billingCycle,
      trialEndsAt: s.trialEndsAt,
      trialDaysLeft: s.trialEndsAt
        ? Math.max(0, Math.ceil((new Date(s.trialEndsAt).getTime() - Date.now()) / 86400000))
        : null,
      currentPeriodStart: s.currentPeriodStart,
      currentPeriodEnd: s.currentPeriodEnd,
      cancelledAt: s.cancelledAt,
      createdAt: s.createdAt,
    }));
  }

  async updateSubscription(id: string, data: any) {
    const updated = await this.prisma.subscription.update({ where: { id }, data });
    // Sync tenant.plan with subscription plan
    if (data.planId) {
      const plan = await this.prisma.plan.findUnique({ where: { id: data.planId } });
      if (plan) {
        await this.prisma.tenant.update({
          where: { id: updated.tenantId },
          data: { plan: plan.slug },
        });
      }
    }
    return updated;
  }

  // Change plan for a tenant (full flow)
  async changeTenantPlan(tenantId: string, data: { planId: string; billingCycle?: string }) {
    const plan = await this.prisma.plan.findUnique({ where: { id: data.planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    // Cancel current active subscriptions
    await this.prisma.subscription.updateMany({
      where: { tenantId, status: { in: ['active', 'trial'] } },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });

    // Create new subscription
    const sub = await this.prisma.subscription.create({
      data: {
        tenantId,
        planId: data.planId,
        status: 'active',
        billingCycle: data.billingCycle || 'monthly',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
      include: { plan: true },
    });

    // Update tenant.plan
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: plan.slug },
    });

    return sub;
  }

  // ── Self-service subscription activation via PSE ──────────────────────────
  async initiateSubscriptionPayment(tenantId: string, dto: {
    planId: string;
    billingCycle: 'monthly' | 'yearly';
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string;
    bankCode: string;
    userType: 0 | 1;
    docType: string;
    docNumber: string;
  }) {
    if (!this.wompiPrivateKey) {
      throw new BadRequestException('Los pagos online no están configurados. Contacta a soporte.');
    }

    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    const price = dto.billingCycle === 'yearly'
      ? Number(plan.yearlyPrice)
      : Number(plan.monthlyPrice);

    if (price === 0) {
      throw new BadRequestException('Este plan no requiere pago.');
    }

    // Reference encodes all activation info — parsed by webhook
    const ts = Date.now().toString(36);
    const reference = `SUB|${tenantId}|${dto.planId}|${dto.billingCycle}|${ts}`;

    if (reference.length > 100) {
      throw new BadRequestException('Referencia de pago inválida.');
    }

    const amountInCents = price * 100;
    const currency = 'COP';
    const signature = createHash('sha256')
      .update(`${reference}${amountInCents}${currency}${this.wompiIntegrityKey}`)
      .digest('hex');

    const redirectUrl = `${this.appUrl}/tenant/billing/result`;

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
        payment_description: `Plan ${plan.name} — Glamorapp`,
      },
      redirect_url: redirectUrl,
      reference,
      customer_data: {
        phone_number: dto.buyerPhone.replace(/\D/g, ''),
        full_name: dto.buyerName,
        legal_id: dto.docNumber,
        legal_id_type: dto.docType,
      },
    };

    const res = await fetch(`${this.wompiBase}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.wompiPrivateKey}`,
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok) {
      const msg = json?.error?.messages
        ? Object.values(json.error.messages).flat().join(', ')
        : (json?.error?.reason ?? 'Error al crear la transacción');
      throw new BadRequestException(msg);
    }

    const tx = json.data;
    return {
      transactionId: tx.id as string,
      redirectUrl: tx.payment_method_info?.redirect_url as string,
      status: tx.status as string,
      reference,
      planName: plan.name,
      amount: price,
    };
  }

  // ── Activate subscription on approved payment (called by webhook) ──────────
  async activateSubscriptionFromPayment(reference: string) {
    // Reference format: SUB|tenantId|planId|billingCycle|timestamp
    const parts = reference.split('|');
    if (parts.length < 5 || parts[0] !== 'SUB') return;

    const [, tenantId, planId, billingCycle] = parts;

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return;

    const now = new Date();
    const periodEnd = billingCycle === 'yearly'
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    // Cancel existing subscriptions and create/update active one
    await this.prisma.subscription.updateMany({
      where: { tenantId, status: { in: ['trial', 'active', 'pending'] } },
      data: { status: 'cancelled', cancelledAt: now },
    });

    await this.prisma.subscription.create({
      data: {
        tenantId,
        planId,
        status: 'active',
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
      },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: plan.slug },
    });
  }

  // Payment exceptions
  async getPaymentExceptions(query: any) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.tenantId) where.tenantId = query.tenantId;

    return this.prisma.paymentException.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(query.limit) || 50,
    });
  }

  async createPaymentException(data: any) {
    return this.prisma.paymentException.create({ data });
  }

  async approvePaymentException(id: string, userId: string) {
    return this.prisma.paymentException.update({
      where: { id },
      data: { status: 'approved', approvedBy: userId },
    });
  }

  async rejectPaymentException(id: string) {
    return this.prisma.paymentException.update({
      where: { id },
      data: { status: 'rejected' },
    });
  }

  // ─── Tenants (Platform Admin) ───────────────────────────────
  async getTenants(query: any) {
    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const tenants = await this.prisma.tenant.findMany({
      where,
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
        users: {
          where: { isActive: true, deletedAt: null },
          select: { id: true },
        },
        stores: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(query.limit) || 50,
    });

    return tenants.map(t => {
      const activeSub = t.subscriptions.find(s => s.status === 'active' || s.status === 'trial');
      const trialDaysLeft = activeSub?.trialEndsAt
        ? Math.max(0, Math.ceil((new Date(activeSub.trialEndsAt).getTime() - Date.now()) / 86400000))
        : null;

      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        plan: t.plan,
        isActive: t.isActive,
        createdAt: t.createdAt,
        subscription: activeSub ? {
          id: activeSub.id,
          planName: activeSub.plan.name,
          planSlug: activeSub.plan.slug,
          status: activeSub.status,
          billingCycle: activeSub.billingCycle,
          monthlyPrice: Number(activeSub.plan.monthlyPrice),
          trialEndsAt: activeSub.trialEndsAt,
          trialDaysLeft,
          currentPeriodEnd: activeSub.currentPeriodEnd,
        } : null,
        stats: {
          users: t.users.length,
          stores: t.stores.length,
        },
      };
    });
  }
}
