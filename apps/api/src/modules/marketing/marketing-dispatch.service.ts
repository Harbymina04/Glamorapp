import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class MarketingDispatchService {
  private readonly logger = new Logger(MarketingDispatchService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private whatsapp: WhatsAppService,
    private config: ConfigService,
  ) {}

  // ── Main dispatch entry point ────────────────────────────────
  async dispatch(tenantId: string, storeId: string, campaignId: string): Promise<{
    sent: number; failed: number; channels: string[];
  }> {
    const campaign = await this.prisma.marketingCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return { sent: 0, failed: 0, channels: [] };

    const channels: string[] = Array.isArray(campaign.channels)
      ? campaign.channels as string[]
      : JSON.parse(campaign.channels as any || '[]');

    // Get target customers
    const customers = await this.getTargetCustomers(tenantId, storeId, campaign);
    this.logger.log(`Campaign "${campaign.name}" → ${customers.length} customers, channels: ${channels.join(', ')}`);

    let sent = 0;
    let failed = 0;

    // ── Email ──────────────────────────────────────────────────
    if (channels.includes('email')) {
      const emailCustomers = customers.filter(c => c.email);
      for (const customer of emailCustomers) {
        try {
          await this.sendEmailCampaign(campaign, customer);
          sent++;
        } catch (e: any) {
          this.logger.warn(`Email failed for ${customer.email}: ${e.message}`);
          failed++;
        }
      }
      this.logger.log(`Email: ${sent} sent`);
    }

    // ── WhatsApp ───────────────────────────────────────────────
    if (channels.includes('whatsapp')) {
      const waCustomers = customers.filter(c => c.phone);
      let waSent = 0;
      for (const customer of waCustomers) {
        try {
          const msg = await this.buildWhatsAppMessage(campaign, customer);
          const ok = await this.whatsapp.sendMessage(storeId, customer.phone!, msg);
          if (ok) { sent++; waSent++; }
          else failed++;
          // Small delay to avoid rate limits
          await new Promise(r => setTimeout(r, 300));
        } catch (e: any) {
          this.logger.warn(`WhatsApp failed for ${customer.phone}: ${e.message}`);
          failed++;
        }
      }
      this.logger.log(`WhatsApp: ${waSent} sent`);
    }

    // ── Facebook / Instagram ──────────────────────────────────
    if (channels.includes('facebook') || channels.includes('instagram')) {
      try {
        const result = await this.postToMeta(tenantId, campaign, channels);
        if (result.success) {
          sent++;
          this.logger.log(`Meta post published: ${result.postId}`);
        }
      } catch (e: any) {
        this.logger.warn(`Meta post failed: ${e.message}`);
        failed++;
      }
    }

    // Update metrics
    await this.prisma.marketingCampaign.update({
      where: { id: campaignId },
      data: { sentCount: sent },
    });

    return { sent, failed, channels };
  }

  // ── Target audience ───────────────────────────────────────────
  private async getTargetCustomers(tenantId: string, storeId: string, campaign: any) {
    const where: any = { tenantId, storeId, deletedAt: null, isActive: true };
    if (campaign.targetSegment && campaign.targetSegment !== 'all') where.segment = campaign.targetSegment;
    if (campaign.targetTier    && campaign.targetTier    !== 'all') where.loyaltyTier = campaign.targetTier;
    return this.prisma.customer.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });
  }

  // ── Email ─────────────────────────────────────────────────────
  private async sendEmailCampaign(campaign: any, customer: any) {
    const subject   = campaign.subject || campaign.name;
    const store     = await this.getStoreInfo(campaign.storeId);
    const html      = this.buildEmailHtml(campaign, customer, store);
    await this.email.sendRaw(customer.email, subject, html);
  }

  private async getStoreInfo(storeId: string): Promise<{ name: string; slug: string; logoUrl: string | null }> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { name: true, slug: true, logoUrl: true },
    });
    return store ?? { name: 'Glamorapp', slug: '', logoUrl: null };
  }

  private buildEmailHtml(campaign: any, customer: any, store: { name: string; slug: string; logoUrl: string | null }): string {
    const appUrl   = this.config.get('APP_URL', 'https://glamorapp.co');
    const apiUrl   = this.config.get('API_URL', 'https://glamorapp.co');
    const storeUrl = store.slug ? `${appUrl}/tienda/${store.slug}` : appUrl;

    // Resolve image URL to absolute
    const resolveUrl = (url: string) => {
      if (!url) return '';
      if (url.startsWith('http')) return url;
      return `${apiUrl}${url}`;
    };

    const imageBlock = campaign.imageUrl
      ? `<img src="${resolveUrl(campaign.imageUrl)}" alt="${campaign.name}"
             style="width:100%;max-width:536px;border-radius:8px;margin-bottom:24px;display:block;" />`
      : '';

    const ctaBlock = campaign.ctaText && campaign.ctaUrl
      ? `<div style="text-align:center;margin-top:28px;">
           <a href="${campaign.ctaUrl}"
              style="background:#8b5cf6;color:white;padding:14px 32px;border-radius:8px;
                     text-decoration:none;font-weight:600;font-size:16px;display:inline-block;">
             ${campaign.ctaText}
           </a>
         </div>`
      : '';

    const storeLogoBlock = store.logoUrl
      ? `<img src="${resolveUrl(store.logoUrl)}" alt="${store.name}"
               style="height:40px;object-fit:contain;margin-bottom:8px;display:block;margin:0 auto 8px;" />`
      : '';

    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${campaign.name}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:white;border-radius:16px;overflow:hidden;max-width:600px;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

        <!-- Header gradient -->
        <tr><td style="background:linear-gradient(135deg,#8b5cf6,#ec4899);padding:28px 32px;text-align:center;">
          ${storeLogoBlock}
          <h1 style="margin:0;color:white;font-size:22px;font-weight:700;letter-spacing:-0.3px;">${store.name}</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Impulsado por Glamorapp</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          ${imageBlock}
          <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700;">${campaign.name}</h2>
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 12px;">
            Hola <strong>${customer.firstName}</strong>,
          </p>
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">
            ${campaign.message.replace(/\n/g, '<br>')}
          </p>
          ${ctaBlock}

          <!-- Visitar tienda -->
          <div style="margin-top:32px;padding-top:24px;border-top:1px solid #f0f0f0;text-align:center;">
            <a href="${storeUrl}"
               style="color:#8b5cf6;font-size:14px;text-decoration:none;font-weight:500;">
              🛍️ Visitar la tienda en línea →
            </a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0 0 4px;color:#6b7280;font-size:13px;font-weight:500;">${store.name}</p>
          <p style="margin:0;color:#9ca3af;font-size:11px;">
            © ${new Date().getFullYear()} ${store.name} · Impulsado por
            <a href="${appUrl}" style="color:#8b5cf6;text-decoration:none;">Glamorapp</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  // ── WhatsApp ──────────────────────────────────────────────────
  private async buildWhatsAppMessage(campaign: any, customer: any): Promise<string> {
    const storeName = await this.getStoreName(campaign.storeId);
    const greeting  = `¡Hola ${customer.firstName}! 👋`;
    const header    = campaign.subject ? `*${campaign.subject}*\n\n` : '';
    const body      = campaign.message;
    const cta       = campaign.ctaText && campaign.ctaUrl
      ? `\n\n👉 ${campaign.ctaText}: ${campaign.ctaUrl}`
      : '';
    return `${greeting}\n\n${header}${body}${cta}\n\n_— ${storeName}_`;
  }

  private async getStoreName(storeId: string): Promise<string> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId }, select: { name: true } });
    return store?.name || 'Glamorapp';
  }

  // ── Meta (Facebook / Instagram) ──────────────────────────────
  private async postToMeta(tenantId: string, campaign: any, channels: string[]): Promise<{ success: boolean; postId?: string }> {
    // Get marketing config (tokens stored by tenant)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { marketingConfig: true } as any,
    });
    const cfg = (tenant as any)?.marketingConfig || {};
    const accessToken = cfg.metaAccessToken || this.config.get('META_ACCESS_TOKEN', '');
    const pageId      = cfg.metaPageId      || this.config.get('META_PAGE_ID', '');

    if (!accessToken || !pageId) {
      this.logger.warn('Meta post skipped: META_ACCESS_TOKEN or META_PAGE_ID not configured');
      return { success: false };
    }

    // Build post message
    const message = [
      campaign.subject ? `📢 ${campaign.subject}` : `📢 ${campaign.name}`,
      '',
      campaign.message,
      campaign.ctaUrl ? `\n👉 ${campaign.ctaText || 'Ver más'}: ${campaign.ctaUrl}` : '',
    ].filter(Boolean).join('\n');

    // Decide endpoint: photo post (with image) or simple post
    const baseUrl = 'https://graph.facebook.com/v19.0';

    if (campaign.imageUrl) {
      // Post with image
      const body: Record<string, string> = {
        caption: message,
        url: campaign.imageUrl.startsWith('http') ? campaign.imageUrl : `${this.config.get('APP_URL', '')}${campaign.imageUrl}`,
        access_token: accessToken,
      };

      // Instagram if configured
      if (channels.includes('instagram') && cfg.instagramAccountId) {
        try {
          // Step 1: create media container
          const containerRes = await fetch(`${baseUrl}/${cfg.instagramAccountId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, media_type: 'IMAGE' }),
          });
          const container = await containerRes.json() as any;
          if (container.id) {
            // Step 2: publish
            await fetch(`${baseUrl}/${cfg.instagramAccountId}/media_publish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
            });
            this.logger.log('Instagram post published');
          }
        } catch (e: any) {
          this.logger.warn(`Instagram post failed: ${e.message}`);
        }
      }

      // Facebook photo post
      const fbRes = await fetch(`${baseUrl}/${pageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const fbData = await fbRes.json() as any;
      if (fbData.id) return { success: true, postId: fbData.id };
      this.logger.warn(`Meta photo post error: ${JSON.stringify(fbData)}`);
      return { success: false };

    } else {
      // Simple text post on Facebook page
      const fbRes = await fetch(`${baseUrl}/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, access_token: accessToken }),
      });
      const fbData = await fbRes.json() as any;
      if (fbData.id) return { success: true, postId: fbData.id };
      this.logger.warn(`Meta feed post error: ${JSON.stringify(fbData)}`);
      return { success: false };
    }
  }
}
