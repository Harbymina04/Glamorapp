import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AiAgentsService } from './ai-agents.service';

/**
 * Ejecuta los agentes proactivos de forma automática según su frecuencia
 * (daily / weekly / monthly) y limpia ejecuciones colgadas.
 *
 * Reemplaza la antigua cola BullMQ (que estaba desactivada). Usa @nestjs/schedule.
 */
@Injectable()
export class AiAgentsScheduler {
  private readonly logger = new Logger(AiAgentsScheduler.name);

  constructor(
    private prisma: PrismaService,
    private service: AiAgentsService,
  ) {}

  /**
   * Cada día a las 7:00 corre los agentes activos cuya frecuencia toca hoy.
   *
   * ⏸️ PAUSADO mientras se rediseña el módulo de Agentes IA. Para reactivar las
   * corridas automáticas, descomenta el decorador @Cron de abajo.
   */
  // @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async runScheduledAgents() {
    const now = new Date();
    const isMonday = now.getDay() === 1;
    const isFirstOfMonth = now.getDate() === 1;

    const agents = await this.prisma.aiAgent.findMany({
      where: { status: 'active' },
      select: { id: true, tenantId: true, storeId: true, slug: true, name: true, analysisFrequency: true },
    });

    if (agents.length === 0) return;

    // Frecuencias que aplican hoy
    const shouldRun = (freq: string | null) => {
      const f = freq || 'weekly';
      if (f === 'daily') return true;
      if (f === 'weekly') return isMonday;
      if (f === 'monthly') return isFirstOfMonth;
      return false;
    };

    const due = agents.filter(a => shouldRun(a.analysisFrequency));
    this.logger.log(`Agentes activos: ${agents.length}, programados para hoy: ${due.length}`);

    // Cache de límite de tokens por tenant para no consultarlo repetido
    const overLimitCache = new Map<string, boolean>();

    for (const agent of due) {
      const impl = this.service.getAgentImpl(agent.slug);
      if (!impl) continue; // agente sin implementación (slug antiguo)

      // Respetar el límite mensual de tokens del plan
      if (!overLimitCache.has(agent.tenantId)) {
        const over = await this.service.isOverTokenLimit(agent.tenantId);
        overLimitCache.set(agent.tenantId, over !== null);
      }
      if (overLimitCache.get(agent.tenantId)) {
        this.logger.warn(`Tenant ${agent.tenantId} superó el límite de tokens — se omite ${agent.slug}`);
        continue;
      }

      try {
        const execution = await this.prisma.aiAgentExecution.create({
          data: { agentId: agent.id, tenantId: agent.tenantId, storeId: agent.storeId, status: 'running' },
        });
        this.service.runAgentInBackground(impl, agent.tenantId, agent.storeId, agent.id, execution.id);
        this.logger.log(`▶️ ${agent.name} (${agent.slug}) lanzado para tenant ${agent.tenantId}`);
      } catch (err: any) {
        this.logger.error(`Error lanzando ${agent.slug}: ${err.message}`);
      }
    }
  }

  /** Cada 10 minutos marca como fallidas las ejecuciones colgadas en 'running'. */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async cleanStuckExecutions() {
    const count = await this.service.sweepStuckExecutions(15);
    if (count > 0) this.logger.warn(`Ejecuciones colgadas marcadas como fallidas: ${count}`);
  }
}
