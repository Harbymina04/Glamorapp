import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AiAgentsService } from './ai-agents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, StoreId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { PlanModuleGuard } from '../../common/guards/plan-module.guard';
import { RequirePlanModule } from '../../common/decorators/require-plan-module.decorator';

@ApiTags('AI Agents')
@Controller('ai-agents')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard, PlanModuleGuard)
@RequirePlanModule('ai_agents')
@ApiBearerAuth()
export class AiAgentsController {
  constructor(private service: AiAgentsService) {}

  @Get()
  findAll(@TenantId() t: string, @StoreId() s: string, @Query() q: PaginationDto & { status?: string }) {
    return this.service.findAll(t, s, q);
  }

  @Get('activity/recent')
  recentActivity(@TenantId() t: string, @StoreId() s: string) { return this.service.getRecentActivity(t, s); }

  @Get(':id')
  findOne(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.findOne(t, s, id); }

  @Get(':id/recommendations')
  getRecommendations(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @Query() q: PaginationDto & { status?: string; type?: string }) {
    return this.service.getRecommendations(t, s, id, q);
  }

  @Get(':id/performance')
  getPerformance(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.getPerformance(t, s, id); }

  // ─── Executions ────────────────────────────────────────────

  @Get(':id/executions')
  getExecutions(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @Query() q: PaginationDto) {
    return this.service.getExecutions(t, s, id, q);
  }

  @Get('executions/:execId')
  getExecution(@Param('execId') execId: string) { return this.service.getExecution(execId); }

  // ─── Trigger Run ───────────────────────────────────────────

  @Post(':id/run')
  async triggerRun(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) {
    return this.service.triggerRun(t, s, id);
  }

  // ─── CRUD ──────────────────────────────────────────────────

  @Post() create(@TenantId() t: string, @StoreId() s: string, @Body() d: any) { return this.service.create(t, s, d); }
  @Put(':id') update(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string, @Body() d: any) { return this.service.update(t, s, id, d); }

  @Post(':id/activate') activate(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.activate(t, s, id); }
  @Post(':id/pause') pause(@TenantId() t: string, @StoreId() s: string, @Param('id') id: string) { return this.service.pause(t, s, id); }

  // ─── Recommendations actions ───────────────────────────────

  @Post('recommendations/:id/accept')
  acceptRecommendation(@TenantId() t: string, @Param('id') id: string, @CurrentUser('id') u: string) { return this.service.acceptRecommendation(t, id, u); }

  @Post('recommendations/:id/reject')
  rejectRecommendation(@TenantId() t: string, @Param('id') id: string, @CurrentUser('id') u: string, @Body('notes') notes?: string) {
    return this.service.rejectRecommendation(t, id, u, notes);
  }
}
