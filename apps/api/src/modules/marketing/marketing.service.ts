import { Injectable, NotFoundException, BadRequestException, Logger, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';
import { CreateCampaignDto, UpdateCampaignDto, ReviewCampaignDto, ProposeAiCampaignDto } from './dto/marketing.dto';
import { MarketingDispatchService } from './marketing-dispatch.service';

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private prisma: PrismaService,
    private dispatch: MarketingDispatchService,
  ) {}

  // ── List ────────────────────────────────────────────────────────
  async findAll(tenantId: string, storeId: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 20);

    const where: any = {
      tenantId,
      storeId,
      deletedAt: null,
      ...(query.status  ? { status: query.status }  : {}),
      ...(query.type    ? { type: query.type }      : {}),
      ...(query.search  ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.marketingCampaign.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.marketingCampaign.count({ where }),
    ]);

    return new PaginatedResponse(data, total, query.page || 1, query.limit || 20);
  }

  // ── Single ──────────────────────────────────────────────────────
  async findOne(tenantId: string, storeId: string, id: string) {
    const c = await this.prisma.marketingCampaign.findFirst({
      where: { id, tenantId, storeId, deletedAt: null },
    });
    if (!c) throw new NotFoundException('Campaign not found');
    return c;
  }

  // ── Stats ───────────────────────────────────────────────────────
  async getStats(tenantId: string, storeId: string) {
    const [total, proposed, active, completed] = await Promise.all([
      this.prisma.marketingCampaign.count({ where: { tenantId, storeId, deletedAt: null } }),
      this.prisma.marketingCampaign.count({ where: { tenantId, storeId, deletedAt: null, status: 'proposed' } }),
      this.prisma.marketingCampaign.count({ where: { tenantId, storeId, deletedAt: null, status: 'active' } }),
      this.prisma.marketingCampaign.count({ where: { tenantId, storeId, deletedAt: null, status: 'completed' } }),
    ]);
    return { total, proposed, active, completed };
  }

  // ── Create (manual) ─────────────────────────────────────────────
  async create(tenantId: string, storeId: string, userId: string, dto: CreateCampaignDto) {
    return this.prisma.marketingCampaign.create({
      data: {
        tenantId,
        storeId,
        createdBy: userId,
        isAiProposed: false,
        status: 'draft',
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });
  }

  // ── Propose (AI agent) ──────────────────────────────────────────
  async proposeByAi(tenantId: string, storeId: string, agentUserId: string, dto: ProposeAiCampaignDto) {
    return this.prisma.marketingCampaign.create({
      data: {
        tenantId,
        storeId,
        createdBy: agentUserId,
        isAiProposed: true,
        status: 'proposed',
        aiReason: dto.aiReason,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        channels: dto.channels,
        targetSegment: dto.targetSegment,
        targetTier: dto.targetTier,
        subject: dto.subject,
        message: dto.message,
        imageUrl: dto.imageUrl,
        ctaText: dto.ctaText,
        ctaUrl: dto.ctaUrl,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });
  }

  // ── Review AI proposal ──────────────────────────────────────────
  async review(tenantId: string, storeId: string, id: string, userId: string, dto: ReviewCampaignDto) {
    const campaign = await this.findOne(tenantId, storeId, id);

    if (campaign.status !== 'proposed') {
      throw new BadRequestException('Only proposed campaigns can be reviewed');
    }

    return this.prisma.marketingCampaign.update({
      where: { id },
      data: {
        status: dto.approved ? 'draft' : 'cancelled',
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: dto.reviewNotes,
      },
    });
  }

  // ── Update ──────────────────────────────────────────────────────
  async update(tenantId: string, storeId: string, id: string, dto: UpdateCampaignDto) {
    const campaign = await this.findOne(tenantId, storeId, id);

    if (['active', 'completed', 'cancelled'].includes(campaign.status)) {
      throw new BadRequestException(`Cannot edit a campaign with status "${campaign.status}"`);
    }

    return this.prisma.marketingCampaign.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });
  }

  // ── Launch ──────────────────────────────────────────────────────
  async launch(tenantId: string, storeId: string, id: string) {
    const campaign = await this.findOne(tenantId, storeId, id);

    if (!['draft', 'scheduled', 'paused'].includes(campaign.status)) {
      throw new BadRequestException(`Cannot launch a campaign with status "${campaign.status}"`);
    }

    // Count target customers
    const targetCount = await this.countTargetAudience(tenantId, storeId, campaign);

    // Mark as active first
    const updated = await this.prisma.marketingCampaign.update({
      where: { id },
      data: { status: 'active', startedAt: new Date(), targetCount },
    });

    // Dispatch in background (fire-and-forget — never blocks the response)
    this.dispatch.dispatch(tenantId, storeId, id)
      .then(result => {
        this.logger.log(`Campaign "${campaign.name}" dispatched — sent: ${result.sent}, failed: ${result.failed}`);
      })
      .catch(err => {
        this.logger.error(`Campaign dispatch error for ${id}: ${err.message}`);
      });

    return updated;
  }

  // ── Pause ───────────────────────────────────────────────────────
  async pause(tenantId: string, storeId: string, id: string) {
    const campaign = await this.findOne(tenantId, storeId, id);
    if (campaign.status !== 'active') throw new BadRequestException('Only active campaigns can be paused');
    return this.prisma.marketingCampaign.update({ where: { id }, data: { status: 'paused' } });
  }

  // ── Complete ────────────────────────────────────────────────────
  async complete(tenantId: string, storeId: string, id: string) {
    const campaign = await this.findOne(tenantId, storeId, id);
    if (!['active', 'paused'].includes(campaign.status)) {
      throw new BadRequestException('Only active or paused campaigns can be completed');
    }
    return this.prisma.marketingCampaign.update({
      where: { id },
      data: { status: 'completed', completedAt: new Date() },
    });
  }

  // ── Cancel ──────────────────────────────────────────────────────
  async cancel(tenantId: string, storeId: string, id: string) {
    const campaign = await this.findOne(tenantId, storeId, id);
    if (['completed', 'cancelled'].includes(campaign.status)) {
      throw new BadRequestException(`Cannot cancel a campaign with status "${campaign.status}"`);
    }
    return this.prisma.marketingCampaign.update({ where: { id }, data: { status: 'cancelled' } });
  }

  // ── Soft delete ─────────────────────────────────────────────────
  async remove(tenantId: string, storeId: string, id: string) {
    await this.findOne(tenantId, storeId, id);
    return this.prisma.marketingCampaign.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Update metrics (called by send integrations) ─────────────────
  async updateMetrics(id: string, metrics: { sentCount?: number; openCount?: number; clickCount?: number; conversionCount?: number }) {
    return this.prisma.marketingCampaign.update({ where: { id }, data: metrics });
  }

  // ── Audience count helper ────────────────────────────────────────
  private async countTargetAudience(tenantId: string, storeId: string, campaign: any): Promise<number> {
    const where: any = { tenantId, storeId, deletedAt: null };
    if (campaign.targetSegment && campaign.targetSegment !== 'all') where.segment = campaign.targetSegment;
    if (campaign.targetTier && campaign.targetTier !== 'all') where.loyaltyTier = campaign.targetTier;
    return this.prisma.customer.count({ where });
  }

  // ── AI context: list pending proposals ──────────────────────────
  async getPendingProposals(tenantId: string, storeId: string) {
    return this.prisma.marketingCampaign.findMany({
      where: { tenantId, storeId, deletedAt: null, status: 'proposed' },
      orderBy: { createdAt: 'desc' },
    });
  }
}
