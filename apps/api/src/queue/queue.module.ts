import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiAgentProcessor } from './processors/ai-agent.processor';
import { SalesAgent } from '../modules/ai-agents/agents/sales.agent';
import { InventoryAgent } from '../modules/ai-agents/agents/inventory.agent';
import { CustomersAgent } from '../modules/ai-agents/agents/customers.agent';
import { AppointmentsAgent } from '../modules/ai-agents/agents/appointments.agent';
import { MarketingAgent } from '../modules/ai-agents/agents/marketing.agent';
import { FinancialAgent } from '../modules/ai-agents/agents/financial.agent';
import { SuppliersAgent } from '../modules/ai-agents/agents/suppliers.agent';
import { CatalogAgent } from '../modules/ai-agents/agents/catalog.agent';

@Module({
  imports: [BullModule.registerQueue({ name: 'ai-agents' })],
  providers: [
    AiAgentProcessor,
    SalesAgent, InventoryAgent, CustomersAgent, AppointmentsAgent,
    MarketingAgent, FinancialAgent, SuppliersAgent, CatalogAgent,
  ],
})
export class QueueModule {}
