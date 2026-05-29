import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SalesAgent } from '../../modules/ai-agents/agents/sales.agent';
import { InventoryAgent } from '../../modules/ai-agents/agents/inventory.agent';
import { CustomersAgent } from '../../modules/ai-agents/agents/customers.agent';
import { AppointmentsAgent } from '../../modules/ai-agents/agents/appointments.agent';
import { MarketingAgent } from '../../modules/ai-agents/agents/marketing.agent';
import { FinancialAgent } from '../../modules/ai-agents/agents/financial.agent';
import { SuppliersAgent } from '../../modules/ai-agents/agents/suppliers.agent';
import { CatalogAgent } from '../../modules/ai-agents/agents/catalog.agent';

@Processor('ai-agents')
@Injectable()
export class AiAgentProcessor extends WorkerHost {
  private agents: Map<string, any> = new Map();

  constructor(
    private prisma: PrismaService,
    sales: SalesAgent, inventory: InventoryAgent,
    customers: CustomersAgent, appointments: AppointmentsAgent,
    marketing: MarketingAgent, financial: FinancialAgent,
    suppliers: SuppliersAgent, catalog: CatalogAgent,
  ) {
    super();
    this.agents.set('sales', sales);
    this.agents.set('inventory', inventory);
    this.agents.set('customers', customers);
    this.agents.set('appointments', appointments);
    this.agents.set('marketing', marketing);
    this.agents.set('financial', financial);
    this.agents.set('suppliers', suppliers);
    this.agents.set('catalog', catalog);
  }

  async process(job: Job) {
    const { agentId } = job.data;
    console.log(`[AI Agent] Processing agent ${agentId}`);

    const agent = await this.prisma.aiAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.status !== 'active') {
      console.log(`[AI Agent] Agent ${agentId} not active, skipping`);
      return { skipped: true, reason: 'Agent not active' };
    }

    const agentImpl = this.agents.get(agent.slug);
    if (!agentImpl) {
      console.log(`[AI Agent] No implementation for slug: ${agent.slug}`);
      return { skipped: true, reason: 'No implementation' };
    }

    try {
      const result = await agentImpl.analyze(agent.tenantId, agent.storeId, agentId);

      await this.prisma.aiAgent.update({
        where: { id: agentId },
        data: {
          lastRunAt: new Date(),
          actionsToday: { increment: 1 },
          totalActions: { increment: 1 },
        },
      });

      return { success: true, slug: agent.slug, result };
    } catch (error) {
      console.error(`[AI Agent] Error in ${agent.slug}:`, error.message);
      await this.prisma.aiAgent.update({
        where: { id: agentId },
        data: { status: 'error' },
      });
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`[AI Agent] Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    console.error(`[AI Agent] Job ${job.id} failed:`, error.message);
  }
}
