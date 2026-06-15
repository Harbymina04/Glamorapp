import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { GlamyService } from './glamy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { PlanModuleGuard } from '../../common/guards/plan-module.guard';
import { RequirePlanModule } from '../../common/decorators/require-plan-module.decorator';
import { TenantId, StoreId, CurrentUser } from '../../common/decorators/tenant.decorator';

@ApiTags('Glamy')
@Controller('ai/glamy')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard, PlanModuleGuard)
@RequirePlanModule('ai_agents') // solo planes con IA (Básico no lo incluye)
@ApiBearerAuth()
export class GlamyController {
  constructor(private glamy: GlamyService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 30 } }) // 30 mensajes/min
  @ApiOperation({ summary: 'Chat con Glamy (asistente del negocio)' })
  chat(
    @TenantId() tenantId: string,
    @StoreId() storeId: string,
    @CurrentUser() user: any,
    @Body() body: { message: string; history?: { role: 'user' | 'assistant'; content: string }[] },
  ) {
    return this.glamy.chat(
      { tenantId, storeId: storeId || null, firstName: user?.firstName },
      body?.message ?? '',
      body?.history ?? [],
    );
  }
}
