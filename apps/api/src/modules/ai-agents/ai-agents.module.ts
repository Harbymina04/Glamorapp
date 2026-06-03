import { Module } from '@nestjs/common';
// import { BullModule } from '@nestjs/bullmq';
import { AiAgentsController } from './ai-agents.controller';
import { AiAgentsService } from './ai-agents.service';
// import { AiAgentProcessor } from '../../queue/processors/ai-agent.processor';
import { SalesAgent } from './agents/sales.agent';
import { InventoryAgent } from './agents/inventory.agent';
import { CustomersAgent } from './agents/customers.agent';
import { AppointmentsAgent } from './agents/appointments.agent';
import { MarketingAgent } from './agents/marketing.agent';
import { FinancialAgent } from './agents/financial.agent';
import { SuppliersAgent } from './agents/suppliers.agent';
import { CatalogAgent } from './agents/catalog.agent';
import { MarketingModule } from '../marketing/marketing.module';

@Module({
  imports: [MarketingModule],
  controllers: [AiAgentsController],
  providers: [
    AiAgentsService,
    // AiAgentProcessor,
    SalesAgent, InventoryAgent, CustomersAgent, AppointmentsAgent,
    MarketingAgent, FinancialAgent, SuppliersAgent, CatalogAgent,
  ],
  exports: [AiAgentsService],
})
export class AiAgentsModule {}
