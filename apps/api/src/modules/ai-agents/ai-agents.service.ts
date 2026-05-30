import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResponse } from '../../common/dto/response.dto';
import { getPaginationParams } from '../../common/utils/pagination';

// Agent implementations
import { SalesAgent } from './agents/sales.agent';
import { InventoryAgent } from './agents/inventory.agent';
import { CustomersAgent } from './agents/customers.agent';
import { AppointmentsAgent } from './agents/appointments.agent';
import { MarketingAgent } from './agents/marketing.agent';
import { FinancialAgent } from './agents/financial.agent';
import { SuppliersAgent } from './agents/suppliers.agent';
import { CatalogAgent } from './agents/catalog.agent';

@Injectable()
export class AiAgentsService {
  private agents: Map<string, any> = new Map();

  constructor(
    private prisma: PrismaService,
    sales: SalesAgent,
    inventory: InventoryAgent,
    customers: CustomersAgent,
    appointments: AppointmentsAgent,
    marketing: MarketingAgent,
    financial: FinancialAgent,
    suppliers: SuppliersAgent,
    catalog: CatalogAgent,
  ) {
    this.agents.set('sales', sales);
    this.agents.set('inventory', inventory);
    this.agents.set('customers', customers);
    this.agents.set('appointments', appointments);
    this.agents.set('marketing', marketing);
    this.agents.set('financial', financial);
    this.agents.set('suppliers', suppliers);
    this.agents.set('catalog', catalog);
  }

  async findAll(tenantId: string, storeId: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 20);
    const where: any = {
      tenantId,
      // storeId can be null for superadmin — skip the filter in that case
      ...(storeId ? { storeId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.aiAgent.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { recommendations: { where: { status: 'pending' } } } },
        },
      }),
      this.prisma.aiAgent.count({ where }),
    ]);

    // Flatten _count into a friendlier field
    const enriched = data.map(a => ({
      ...a,
      pendingRecommendations: (a as any)._count?.recommendations ?? 0,
      _count: undefined,
    }));

    return new PaginatedResponse(enriched, total, query.page || 1, query.limit || 20);
  }

  async findOne(tenantId: string, storeId: string, id: string) {
    const a = await this.prisma.aiAgent.findFirst({
      where: { id, tenantId, ...(storeId ? { storeId } : {}) },
      include: { permissions: true },
    });
    if (!a) throw new NotFoundException('AI Agent not found');
    return a;
  }

  async create(tenantId: string, storeId: string, dto: any) {
    const { permissions, ...data } = dto;
    return this.prisma.aiAgent.create({
      data: {
        tenantId, storeId, ...data,
        ...(permissions ? { permissions: { create: permissions } } : {}),
      },
      include: { permissions: true },
    });
  }

  async update(tenantId: string, storeId: string, id: string, dto: any) {
    await this.findOne(tenantId, storeId, id);
    const { permissions, ...data } = dto;
    if (permissions) {
      await this.prisma.aiAgentPermission.deleteMany({ where: { agentId: id } });
      await this.prisma.aiAgentPermission.createMany({
        data: permissions.map((p: any) => ({ agentId: id, ...p })),
      });
    }
    return this.prisma.aiAgent.update({ where: { id }, data, include: { permissions: true } });
  }

  async activate(tenantId: string, storeId: string, id: string) {
    await this.findOne(tenantId, storeId, id);
    return this.prisma.aiAgent.update({ where: { id }, data: { status: 'active' } });
  }

  async pause(tenantId: string, storeId: string, id: string) {
    await this.findOne(tenantId, storeId, id);
    return this.prisma.aiAgent.update({ where: { id }, data: { status: 'paused' } });
  }

  // ─── Execute Agent (fire-and-forget with polling) ───────────

  async triggerRun(tenantId: string, storeId: string, id: string) {
    const agent = await this.findOne(tenantId, storeId, id);

    const agentImpl = this.agents.get(agent.slug);
    if (!agentImpl) {
      throw new NotFoundException(`No implementation for agent type: ${agent.slug}`);
    }

    // Create the execution record NOW so the frontend can poll its ID immediately
    const execution = await this.prisma.aiAgentExecution.create({
      data: { agentId: id, tenantId, storeId, status: 'running' },
    });

    // Fire the agent in the background — don't block the HTTP response
    setImmediate(async () => {
      try {
        const result = await agentImpl.run(tenantId, storeId, id, execution.id);

        // Update agent-level stats after run
        await this.prisma.aiAgent.update({
          where: { id },
          data: {
            estimatedImpact: result.recommendations.length * 50_000,
            alertsGenerated: result.recommendations.filter(
              (r: any) => r.priority === 'high' || r.priority === 'critical',
            ).length,
          },
        });
      } catch (err: any) {
        // Mark execution as failed if an unhandled error occurs
        await this.prisma.aiAgentExecution.update({
          where: { id: execution.id },
          data: { status: 'failed', finishedAt: new Date(), summary: err.message },
        }).catch(() => {});
      }
    });

    // Return immediately so the client can start polling
    return { executionId: execution.id, status: 'running', agentId: id };
  }

  // ─── Executions ─────────────────────────────────────────────

  async getExecutions(tenantId: string, storeId: string, agentId: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 10);
    const where: any = { tenantId, ...(storeId ? { storeId } : {}), agentId };
    const [data, total] = await Promise.all([
      this.prisma.aiAgentExecution.findMany({
        where, skip, take, orderBy: { startedAt: 'desc' },
      }),
      this.prisma.aiAgentExecution.count({ where }),
    ]);
    return new PaginatedResponse(data, total, query.page || 1, query.limit || 10);
  }

  async getExecution(id: string) {
    const e = await this.prisma.aiAgentExecution.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Execution not found');
    return e;
  }

  // ─── Recommendations ────────────────────────────────────────

  async getRecommendations(tenantId: string, storeId: string, agentId: string, query: any) {
    const { skip, take } = getPaginationParams(query.page || 1, query.limit || 10);
    const where: any = {
      tenantId, ...(storeId ? { storeId } : {}), agentId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.aiRecommendation.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.aiRecommendation.count({ where }),
    ]);
    return new PaginatedResponse(data, total, query.page || 1, query.limit || 10);
  }

  async acceptRecommendation(tenantId: string, id: string, userId: string) {
    const rec = await this.prisma.aiRecommendation.findFirst({ where: { id, tenantId } });
    if (!rec) throw new NotFoundException('Recommendation not found');
    return this.prisma.aiRecommendation.update({
      where: { id },
      data: { status: 'accepted', reviewedBy: userId, reviewedAt: new Date() },
    });
  }

  async rejectRecommendation(tenantId: string, id: string, userId: string, notes?: string) {
    return this.prisma.aiRecommendation.update({
      where: { id },
      data: { status: 'rejected', reviewedBy: userId, reviewedAt: new Date(), reviewNotes: notes },
    });
  }

  async getRecentActivity(tenantId: string, storeId: string) {
    return this.prisma.aiRecommendation.findMany({
      where: { tenantId, ...(storeId ? { storeId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { agent: { select: { name: true, icon: true } } },
    });
  }

  async getPerformance(tenantId: string, storeId: string, agentId: string) {
    const agent = await this.findOne(tenantId, storeId, agentId);
    const [recommendations, accepted, rejected] = await Promise.all([
      this.prisma.aiRecommendation.count({ where: { agentId, tenantId } }),
      this.prisma.aiRecommendation.count({ where: { agentId, tenantId, status: 'accepted' } }),
      this.prisma.aiRecommendation.count({ where: { agentId, tenantId, status: 'rejected' } }),
    ]);

    return {
      agent: { name: agent.name, slug: agent.slug, status: agent.status },
      totalRecommendations: recommendations,
      accepted,
      rejected,
      acceptanceRate: recommendations > 0 ? (accepted / recommendations * 100).toFixed(1) : '0',
      estimatedImpact: agent.estimatedImpact,
    };
  }
}
