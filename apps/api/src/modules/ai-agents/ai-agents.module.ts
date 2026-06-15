import { Module } from '@nestjs/common';
import { AiAgentsController } from './ai-agents.controller';
import { AiAgentsService } from './ai-agents.service';
import { AiAgentsScheduler } from './ai-agents.scheduler';
import { InventoryAgent } from './agents/inventory.agent';
import { CustomersAgent } from './agents/customers.agent';
import { FinancialAgent } from './agents/financial.agent';

@Module({
  controllers: [AiAgentsController],
  providers: [
    AiAgentsService,
    AiAgentsScheduler,
    InventoryAgent, CustomersAgent, FinancialAgent,
  ],
  exports: [AiAgentsService],
})
export class AiAgentsModule {}
