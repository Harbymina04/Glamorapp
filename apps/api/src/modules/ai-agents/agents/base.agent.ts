import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../../prisma/prisma.service';

// ─── Types ────────────────────────────────────────────────────────

export interface AgentTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface AgentContext {
  tenantId: string;
  storeId: string;
  agentId: string;
  autonomyLevel: 'recommend_only' | 'draft_changes' | 'auto_execute';
  maxIterations: number;
  executionLog: string[];
  provider: 'claude' | 'deepseek';
}

export interface AgentResult {
  success: boolean;
  iterations: number;
  summary: string;
  recommendations: any[];
  actions: any[];
  logs: string[];
}

// ─── LLM Providers ────────────────────────────────────────────────

type LLMMessage = { role: 'user' | 'assistant'; content: string };

interface LLMResponse {
  text: string;
  toolCalls: { id: string; name: string; input: Record<string, any> }[];
}

// ─── Base Agent ───────────────────────────────────────────────────

@Injectable()
export abstract class BaseAgent {
  protected anthropic: Anthropic | null = null;
  protected deepseekKey: string;
  protected deepseekModel: string;
  protected claudeModel: string;

  constructor(
    protected prisma: PrismaService,
    protected configService: ConfigService,
  ) {
    // Claude setup
    const anthropicKey = this.configService.get<string>('ANTHROPIC_API_KEY', '');
    if (anthropicKey && anthropicKey !== 'sk-ant-xxx') {
      this.anthropic = new Anthropic({ apiKey: anthropicKey });
    }
    this.claudeModel = this.configService.get('CLAUDE_MODEL', 'claude-sonnet-4-20250514');

    // DeepSeek setup (OpenAI-compatible)
    this.deepseekKey = this.configService.get('DEEPSEEK_API_KEY', '');
    this.deepseekModel = this.configService.get('DEEPSEEK_MODEL', 'deepseek-chat');
  }

  // ─── Abstract ────────────────────────────────────────────────

  abstract get slug(): string;
  abstract get name(): string;
  abstract getSystemPrompt(ctx: AgentContext): string;
  abstract getTools(ctx: AgentContext): AgentTool[];
  abstract observe(ctx: AgentContext): Promise<Record<string, any>>;
  abstract executeTool(ctx: AgentContext, toolName: string, args: Record<string, any>): Promise<any>;

  // ─── Public: Run the agent ───────────────────────────────────

  async run(tenantId: string, storeId: string, agentId: string, existingExecutionId?: string): Promise<AgentResult> {
    const startTime = Date.now();

    // Reuse an existing execution record (fire-and-forget mode) or create one
    const execution = existingExecutionId
      ? { id: existingExecutionId }
      : await this.prisma.aiAgentExecution.create({
          data: { agentId, tenantId, storeId, status: 'running' },
        });

    const agent = await this.prisma.aiAgent.findUnique({ where: { id: agentId } });
    if (!agent) {
      await this.finishExecution(execution.id, 'failed', { error: 'Agent not found' }, []);
      throw new Error(`Agent ${agentId} not found`);
    }

    const provider = (agent.aiProvider as 'claude' | 'deepseek') || 'deepseek';

    const ctx: AgentContext = {
      tenantId, storeId, agentId,
      autonomyLevel: (agent.autonomyLevel as any) || 'recommend_only',
      maxIterations: 8,
      executionLog: [],
      provider,
    };

    this.log(ctx, `🚀 Iniciando agente: ${agent.name} (${provider.toUpperCase()})`);
    this.log(ctx, `📋 Autonomía: ${ctx.autonomyLevel}`);

    // ─── 1. OBSERVE ──────────────────────────────────────────
    this.log(ctx, `👁️ Observando datos...`);
    let observation: Record<string, any>;
    try {
      observation = await this.observe(ctx);
      this.log(ctx, `✅ Datos recolectados: ${Object.keys(observation).join(', ')}`);
    } catch (err: any) {
      this.log(ctx, `❌ Error observación: ${err.message}`);
      await this.finishExecution(execution.id, 'failed', { error: err.message }, ctx.executionLog);
      return { success: false, iterations: 0, summary: `Error: ${err.message}`, recommendations: [], actions: [], logs: ctx.executionLog };
    }

    // ─── 2. THINK → ACT loop ──────────────────────────────────
    // Append structured-output instructions to every agent's system prompt
    const structuredInstructions = `

---
REGLAS DE FORMATO PARA RECOMENDACIONES:
Cuando uses la herramienta create_recommendation, SIEMPRE completa TODOS los campos:
- titulo: título corto y específico (máx 80 caracteres)
- problema: describe el hallazgo con datos concretos y números del análisis (ej: "Las ventas cayeron 23% en los últimos 7 días vs semana anterior: $1.200.000 vs $1.560.000")
- accion_concreta: pasos numerados exactos que el dueño debe ejecutar (ej: "1. Contactar a los 12 clientes inactivos\\n2. Ofrecer 15% de descuento\\n3. Revisar respuestas en 48h")
- impacto_esperado: qué mejorará y magnitud aproximada en COP o porcentaje (ej: "Recuperar 4-6 clientes, ingreso adicional estimado $280.000 COP")
- como_medir: métrica específica y plazo para verificar el resultado (ej: "Comparar ventas semana siguiente vs esta semana")
Crea UNA recomendación por hallazgo. No agrupes múltiples problemas.
Llama a finish_analysis SIEMPRE como última herramienta.`;
    const systemPrompt = this.getSystemPrompt(ctx) + structuredInstructions;
    const tools = this.getTools(ctx) as any[];
    const messages: LLMMessage[] = [];
    let currentData = observation;
    const allActions: any[] = [];
    const allRecommendations: any[] = [];

    for (let i = 0; i < ctx.maxIterations; i++) {
      this.log(ctx, `🧠 Iteración ${i + 1}/${ctx.maxIterations}`);

      const userMsg = i === 0
        ? `📊 DATOS INICIALES:\n${JSON.stringify(currentData, null, 2).slice(0, 5000)}\n\nAnaliza los datos. Puedes usar herramientas para profundizar. Piensa paso a paso y actúa.`
        : 'Resultados de herramientas ejecutadas. Continúa tu análisis. Si ya tienes conclusiones, llama a finish_analysis.';

      messages.push({ role: 'user', content: userMsg });

      let response: LLMResponse;
      try {
        response = await this.callLLM(ctx, systemPrompt, messages, tools);
      } catch (err: any) {
        this.log(ctx, `❌ Error LLM: ${err.message}`);
        break;
      }

      // No tool calls → agent is done
      if (response.toolCalls.length === 0) {
        this.log(ctx, `✅ Análisis completado`);
        messages.push({ role: 'assistant', content: response.text });

        // Save the final analysis as a recommendation if meaningful
        if (response.text && response.text.length > 20) {
          const structured = JSON.stringify({
            problema: 'Análisis general del agente.',
            accion_concreta: response.text,
            impacto_esperado: '',
            como_medir: '',
          });
          const saved = await this.saveRecommendation(
            ctx.tenantId, ctx.storeId, ctx.agentId,
            'other', `Análisis — ${this.name}`, structured,
            `Ejecutado por ${this.name} (${provider})`, 'medium',
          );
          allRecommendations.push(saved);
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        this.log(ctx, `⏱️ ${duration}s | 📊 ${allRecommendations.length} recs, ${allActions.length} acciones`);

        await this.prisma.aiAgent.update({
          where: { id: agentId },
          data: { lastRunAt: new Date(), totalActions: { increment: 1 } },
        });

        const result: AgentResult = {
          success: true, iterations: i + 1,
          summary: response.text || 'Análisis completado',
          recommendations: allRecommendations, actions: allActions, logs: ctx.executionLog,
        };

        await this.finishExecution(execution.id, 'completed', result, ctx.executionLog, Date.now() - startTime, i + 1);
        return result;
      }

      // ─── 3. ACT: Execute tool calls ────────────────────────
      messages.push({ role: 'assistant', content: JSON.stringify(response.toolCalls) });

      const toolResults: string[] = [];
      for (const tc of response.toolCalls) {
        this.log(ctx, `🔧 ${tc.name}(${JSON.stringify(tc.input).slice(0, 150)})`);

        let result: any;
        try {
          result = await this.executeTool(ctx, tc.name, tc.input);
          allActions.push({ tool: tc.name, input: tc.input, result });
          this.log(ctx, `   ✅ OK`);
        } catch (err: any) {
          result = { error: err.message };
          this.log(ctx, `   ❌ ${err.message}`);
        }

        if (result && typeof result === 'object') {
          currentData = { ...currentData, [`tool_${tc.name}`]: result };
        }

        toolResults.push(`[${tc.name}]: ${typeof result === 'string' ? result : JSON.stringify(result).slice(0, 500)}`);
      }

      messages.push({ role: 'user', content: `Resultados:\n${toolResults.join('\n\n')}` });

      // Persist logs after each iteration so the frontend can poll them
      await this.flushLogs(execution.id, ctx.executionLog);
    }

    // Max iterations
    this.log(ctx, `⚠️ Máx iteraciones (${ctx.maxIterations})`);
    await this.prisma.aiAgent.update({
      where: { id: agentId },
      data: { lastRunAt: new Date(), totalActions: { increment: 1 } },
    });

    const result: AgentResult = {
      success: true, iterations: ctx.maxIterations,
      summary: 'Límite de iteraciones alcanzado',
      recommendations: allRecommendations, actions: allActions, logs: ctx.executionLog,
    };
    await this.finishExecution(execution.id, 'completed', result, ctx.executionLog, Date.now() - startTime, ctx.maxIterations);
    return result;
  }

  // ─── LLM Call Router ────────────────────────────────────────

  private async callLLM(
    ctx: AgentContext, systemPrompt: string, messages: LLMMessage[], tools: any[],
  ): Promise<LLMResponse> {
    if (ctx.provider === 'claude' && this.anthropic) {
      return this.callClaude(systemPrompt, messages, tools);
    }
    return this.callDeepSeek(systemPrompt, messages, tools);
  }

  // ─── Claude (Anthropic) ─────────────────────────────────────

  private async callClaude(systemPrompt: string, messages: LLMMessage[], tools: any[]): Promise<LLMResponse> {
    // Convert tools to Claude format
    const claudeTools = tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }));

    const response = await this.anthropic!.messages.create({
      model: this.claudeModel,
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      tools: claudeTools.length > 0 ? claudeTools : undefined,
    });

    let text = '';
    const toolCalls: any[] = [];

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        toolCalls.push({ id: block.id, name: block.name, input: (block as any).input || {} });
      } else if (block.type === 'text') {
        text += block.text;
      }
    }

    return { text, toolCalls };
  }

  // ─── DeepSeek (OpenAI-compatible) ───────────────────────────

  private async callDeepSeek(systemPrompt: string, messages: LLMMessage[], tools: any[]): Promise<LLMResponse> {
    // Convert tools to OpenAI format
    const openaiTools = tools.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }));

    const apiMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const body: any = {
      model: this.deepseekModel,
      messages: apiMessages,
      max_tokens: 2048,
      temperature: 0.3,
    };

    if (openaiTools.length > 0) {
      body.tools = openaiTools;
      body.tool_choice = 'auto';
    }

    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.deepseekKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`DeepSeek API error ${resp.status}: ${err.slice(0, 300)}`);
    }

    const data = await resp.json();
    const choice = data.choices?.[0];
    if (!choice) throw new Error('DeepSeek: no response');

    let text = '';
    const toolCalls: any[] = [];

    if (choice.message?.content) {
      text = choice.message.content;
    }

    if (choice.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        let input = {};
        try { input = JSON.parse(tc.function.arguments); } catch {}
        toolCalls.push({ id: tc.id, name: tc.function.name, input });
      }
    }

    return { text, toolCalls };
  }

  // ─── Execution logging ──────────────────────────────────────

  /** Persist current logs mid-run so the frontend can poll them in real time */
  private async flushLogs(executionId: string, logs: string[]) {
    try {
      await this.prisma.aiAgentExecution.update({
        where: { id: executionId },
        data: { logs: logs as any },
      });
    } catch { /* non-fatal */ }
  }

  private async finishExecution(
    id: string, status: string, result: any, logs: string[], durationMs?: number, iterations?: number,
  ) {
    await this.prisma.aiAgentExecution.update({
      where: { id },
      data: {
        status,
        result: result as any,
        logs: logs as any,
        summary: typeof result === 'string' ? result : (result.summary || ''),
        iterations: iterations || result.iterations || 0,
        durationMs: durationMs || 0,
        finishedAt: new Date(),
      },
    });
  }

  protected log(ctx: AgentContext, msg: string) {
    const entry = `[${new Date().toISOString()}] ${msg}`;
    ctx.executionLog.push(entry);
    console.log(`[${this.name}] ${msg}`);
  }

  // ─── Helpers ─────────────────────────────────────────────────

  protected async callClaudeRaw(systemPrompt: string, userMessage: string): Promise<string> {
    if (!this.anthropic) return '';
    try {
      const response = await this.anthropic.messages.create({
        model: this.claudeModel,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });
      const content = response.content[0];
      if (content.type === 'text') return content.text;
      return JSON.stringify(content);
    } catch (error: any) {
      console.error(`[${this.name}] Claude error:`, error.message);
      return '';
    }
  }

  protected async saveRecommendation(
    tenantId: string, storeId: string, agentId: string,
    type: string, title: string, description: string, reason: string,
    priority: string = 'medium', estimatedImpact?: number,
  ) {
    return this.prisma.aiRecommendation.create({
      data: {
        tenantId, storeId, agentId,
        type, title, description, reason, priority,
        estimatedImpact,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  protected async createNotification(
    tenantId: string, title: string, message: string,
    type: any = 'info', sourceId?: string,
  ) {
    return this.prisma.notification.create({
      data: { tenantId, title, message, type, source: 'ai_agent', sourceId },
    });
  }

  // ─── Shared tools ───────────────────────────────────────────

  protected getSharedTools(ctx: AgentContext): AgentTool[] {
    const tools: AgentTool[] = [
      {
        name: 'create_recommendation',
        description: 'Crea una recomendación accionable estructurada. Úsala para CADA hallazgo específico, no agrupes varios.',
        input_schema: {
          type: 'object',
          properties: {
            titulo: { type: 'string', description: 'Título corto y específico (máx 80 caracteres)' },
            problema: { type: 'string', description: 'Describe el hallazgo con datos concretos y números del análisis. Ej: "Las ventas cayeron 23% esta semana: $1.200.000 vs $1.560.000 la semana anterior"' },
            accion_concreta: { type: 'string', description: 'Pasos numerados exactos que el dueño debe ejecutar. Ej: "1. Contactar a los 12 clientes inactivos\\n2. Ofrecer 15% descuento\\n3. Revisar respuestas en 48h"' },
            impacto_esperado: { type: 'string', description: 'Qué mejorará y magnitud aproximada. Ej: "Recuperar 4-6 clientes, ingreso adicional estimado $280.000 COP"' },
            como_medir: { type: 'string', description: 'Métrica específica y plazo para verificar el resultado. Ej: "Comparar ventas de la semana siguiente vs esta semana"' },
            type: { type: 'string', enum: ['revenue', 'cost_saving', 'customer_experience', 'efficiency', 'marketing', 'inventory', 'pricing', 'other'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            estimated_impact: { type: 'number', description: 'Impacto estimado en COP (número, opcional)' },
          },
          required: ['titulo', 'problema', 'accion_concreta', 'impacto_esperado', 'priority', 'type'],
        },
      },
      {
        name: 'create_notification',
        description: 'Envía notificación a usuarios del negocio sobre hallazgos urgentes',
        input_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            message: { type: 'string', description: 'Mensaje detallado (máx 500 chars)' },
            level: { type: 'string', enum: ['info', 'warning', 'alert', 'success'] },
          },
          required: ['title', 'message'],
        },
      },
      {
        name: 'finish_analysis',
        description: 'FINALIZA el análisis cuando tengas conclusiones completas. Debes llamar esto como ÚLTIMA herramienta.',
        input_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string', description: 'Resumen ejecutivo de hallazgos y acciones tomadas' },
            next_steps: { type: 'string', description: 'Próximos pasos recomendados (una línea por paso)' },
          },
          required: ['summary'],
        },
      },
    ];

    if (ctx.autonomyLevel === 'draft_changes' || ctx.autonomyLevel === 'auto_execute') {
      tools.push({
        name: 'create_draft',
        description: 'Crea borrador de cambio que requiere aprobación (promoción, campaña, ajuste de precio)',
        input_schema: {
          type: 'object',
          properties: {
            entity_type: { type: 'string', enum: ['promotion', 'campaign', 'price_change', 'purchase_order'] },
            title: { type: 'string' },
            details: { type: 'string', description: 'Detalles del borrador en texto estructurado' },
          },
          required: ['entity_type', 'title', 'details'],
        },
      });
    }

    if (ctx.autonomyLevel === 'auto_execute') {
      tools.push({
        name: 'execute_action',
        description: 'EJECUTA cambios reales en el sistema (precios, promociones, campañas). SOLO auto_execute.',
        input_schema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['update_price', 'create_promotion', 'send_campaign', 'reorder_stock'] },
            params: { type: 'object', description: 'Parámetros específicos de la acción' },
          },
          required: ['action', 'params'],
        },
      });
    }

    return tools;
  }

  protected async executeSharedTool(ctx: AgentContext, toolName: string, args: Record<string, any>): Promise<any> {
    switch (toolName) {
      case 'create_recommendation': {
        // Store structured data as JSON so the frontend can render each section clearly
        const structured = JSON.stringify({
          problema: args.problema || args.description || '',
          accion_concreta: args.accion_concreta || '',
          impacto_esperado: args.impacto_esperado || '',
          como_medir: args.como_medir || '',
        });
        return this.saveRecommendation(
          ctx.tenantId, ctx.storeId, ctx.agentId,
          args.type || 'other', args.titulo || args.title || 'Recomendación',
          structured,
          `Generado por ${this.name}`,
          args.priority || 'medium', args.estimated_impact,
        );
      }

      case 'create_notification': {
        // Map level to valid NotificationType: alert→error, success→info
        const levelMap: Record<string, string> = { alert: 'error', success: 'info', info: 'info', warning: 'warning', error: 'error' };
        return this.createNotification(ctx.tenantId, args.title, args.message, levelMap[args.level] || 'info');
      }

      case 'finish_analysis':
        return { finished: true, summary: args.summary, next_steps: args.next_steps };

      case 'create_draft':
        return this.saveRecommendation(
          ctx.tenantId, ctx.storeId, ctx.agentId,
          `draft_${args.entity_type}`, `[BORRADOR] ${args.title}`,
          args.details, 'Requiere aprobación humana', 'high',
        );

      case 'execute_action':
        if (ctx.autonomyLevel !== 'auto_execute') {
          throw new Error('execute_action requiere modo auto_execute');
        }
        return this.executeAutonomousAction(ctx, args.action, args.params);

      default:
        return { error: `Unknown: ${toolName}` };
    }
  }

  protected async executeAutonomousAction(ctx: AgentContext, action: string, params: Record<string, any>): Promise<any> {
    return { executed: true, action, params, message: `Acción "${action}" registrada` };
  }

  // ─── DB query helpers ───────────────────────────────────────

  protected async querySales(tenantId: string, storeId: string, days: number = 30) {
    const since = new Date(Date.now() - days * 86400000);
    const sales = await this.prisma.sale.findMany({
      where: { tenantId, storeId, status: 'completed', createdAt: { gte: since } },
      include: { items: { include: { product: true } }, customer: true },
    });
    const totalRevenue = sales.reduce((s, sale) => s + Number(sale.total), 0);
    const totalSales = sales.length;
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
    return { totalRevenue: Math.round(totalRevenue), totalSales, avgTicket: Math.round(avgTicket), sales };
  }

  protected async queryInventory(tenantId: string, storeId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, storeId, deletedAt: null },
      orderBy: { currentStock: 'asc' },
    });
    const lowStock = products.filter(p => p.currentStock <= p.minStock);
    return {
      totalProducts: products.length,
      totalValue: Math.round(products.reduce((s, p) => s + (p.currentStock * Number(p.salePrice)), 0)),
      lowStockCount: lowStock.length,
      lowStockItems: lowStock.slice(0, 10).map(p => ({ name: p.name, stock: p.currentStock, alert: p.minStock })),
    };
  }

  protected async queryCustomers(tenantId: string, storeId: string, days: number = 90) {
    const since = new Date(Date.now() - days * 86400000);
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, storeId, deletedAt: null },
      include: { sales: { where: { createdAt: { gte: since } } } },
    });
    const active = customers.filter(c => c.sales.length > 0).length;
    return { totalCustomers: customers.length, activeCustomers: active, inactiveCustomers: customers.length - active };
  }

  protected async queryAppointments(tenantId: string, storeId: string, days: number = 30) {
    const since = new Date(Date.now() - days * 86400000);
    const appointments = await this.prisma.appointment.findMany({
      where: { tenantId, storeId, createdAt: { gte: since } },
    });
    const total = appointments.length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    return { total, completed, cancelled: appointments.filter(a => a.status === 'cancelled').length, showRate: total > 0 ? ((completed / total) * 100).toFixed(1) : '0' };
  }

  protected async queryExpenses(tenantId: string, storeId: string, days: number = 30) {
    const since = new Date(Date.now() - days * 86400000);
    const expenses = await this.prisma.expense.findMany({
      where: { tenantId, storeId, isVoided: false, expenseDate: { gte: since } },
    });
    return { totalExpenses: Math.round(expenses.reduce((s, e) => s + Number(e.amount), 0)), count: expenses.length };
  }
}
