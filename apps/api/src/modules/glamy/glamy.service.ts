import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

// Patrones básicos de inyección de prompt (defensa simple).
const INJECTION_PATTERNS = [
  /ignora\s+(las\s+)?instrucciones/i, /olvida\s+(tu\s+)?(rol|instrucciones|sistema)/i,
  /system\s*prompt/i, /jailbreak/i, /ignore\s+(previous|all)\s+instructions/i,
  /forget\s+(your\s+)?(role|instructions)/i,
];

interface ChatTurn { role: 'user' | 'assistant'; content: string }
interface GlamyContext { tenantId: string; storeId?: string | null; firstName?: string }

// Tools (formato OpenAI/DeepSeek) — TODAS de solo lectura.
const GLAMY_TOOLS = [
  { type: 'function', function: {
    name: 'get_business_summary',
    description: 'Resumen del negocio: ventas del mes y de hoy, ticket promedio, conteo de productos, clientes y productos con stock bajo.',
    parameters: { type: 'object', properties: {}, required: [] },
  }},
  { type: 'function', function: {
    name: 'get_low_stock',
    description: 'Lista de productos con stock bajo (por debajo de su mínimo).',
    parameters: { type: 'object', properties: { limit: { type: 'number', description: 'Máximo de productos a listar (default 10)' } }, required: [] },
  }},
  { type: 'function', function: {
    name: 'get_today_appointments',
    description: 'Citas agendadas para hoy con su hora, servicio y estado.',
    parameters: { type: 'object', properties: {}, required: [] },
  }},
  { type: 'function', function: {
    name: 'get_top_products',
    description: 'Productos más vendidos del mes (por cantidad).',
    parameters: { type: 'object', properties: { limit: { type: 'number', description: 'Máximo a listar (default 5)' } }, required: [] },
  }},
];

@Injectable()
export class GlamyService {
  private readonly logger = new Logger(GlamyService.name);
  private readonly deepseekKey: string;
  private readonly deepseekModel: string;
  private readonly deepseekUrl = 'https://api.deepseek.com/v1/chat/completions';

  constructor(private config: ConfigService, private prisma: PrismaService) {
    this.deepseekKey = config.get<string>('DEEPSEEK_API_KEY', '');
    this.deepseekModel = config.get<string>('DEEPSEEK_MODEL', 'deepseek-chat');
  }

  async chat(ctx: GlamyContext, message: string, history: ChatTurn[] = []) {
    const msg = (message || '').trim().slice(0, 1000);
    if (!msg) return { reply: '¿En qué puedo ayudarte con tu negocio?' };
    if (INJECTION_PATTERNS.some(p => p.test(msg))) {
      return { reply: 'Estoy aquí para ayudarte a gestionar tu negocio en Glamorapp. ¿Qué necesitas?' };
    }
    if (!this.deepseekKey) {
      return { reply: 'El asistente no está disponible en este momento. Intenta más tarde.' };
    }

    const messages: any[] = [
      { role: 'system', content: this.systemPrompt(ctx) },
      ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: msg },
    ];

    const MAX_ITER = 4;
    for (let i = 0; i < MAX_ITER; i++) {
      const res = await this.callDeepSeek(messages);
      if (!res.ok) {
        this.logger.warn(`DeepSeek ${res.status}: ${await res.text().catch(() => '')}`);
        return { reply: 'Tuve un problema procesando tu mensaje. Intenta de nuevo.' };
      }
      const data = await res.json();
      const choice = data.choices?.[0];
      if (!choice) break;
      const assistant = choice.message;
      messages.push(assistant);

      if (!assistant.tool_calls || assistant.tool_calls.length === 0) {
        return { reply: assistant.content || 'No pude generar una respuesta. Intenta de nuevo.' };
      }

      for (const tc of assistant.tool_calls) {
        let input: any = {};
        try { input = JSON.parse(tc.function.arguments || '{}'); } catch { /* ignore */ }
        const result = await this.executeTool(tc.function.name, input, ctx);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
      }
    }
    return { reply: 'No pude completar tu solicitud en este momento. Intenta de nuevo.' };
  }

  private callDeepSeek(messages: any[]) {
    return fetch(this.deepseekUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.deepseekKey}` },
      body: JSON.stringify({ model: this.deepseekModel, messages, tools: GLAMY_TOOLS, tool_choice: 'auto', max_tokens: 900, temperature: 0.5 }),
    });
  }

  private systemPrompt(ctx: GlamyContext): string {
    return [
      'Eres Glamy, la asistente de IA de Glamorapp para el DUEÑO/ADMINISTRADOR de un salón de belleza.',
      'Ayudas con: cómo usar la plataforma (POS, inventario, citas, contabilidad, IVA, planes, comisiones),',
      'consejos para hacer crecer el negocio, y respondes sobre los DATOS reales del negocio usando las herramientas disponibles.',
      'Reglas:',
      '- Responde en español, claro y conciso. Usa **negrita** para resaltar cifras clave.',
      '- Para preguntas sobre datos (ventas, stock, citas, top productos) SIEMPRE usa las herramientas; nunca inventes números.',
      '- Si no tienes una herramienta para algo, dilo y orienta dónde verlo en la plataforma.',
      '- Eres de solo lectura: no puedes crear, editar ni borrar nada. Si te lo piden, explica cómo hacerlo en la plataforma.',
      '- Formatea montos en pesos colombianos (ej. $150.000).',
      ctx.firstName ? `El usuario se llama ${ctx.firstName}.` : '',
    ].filter(Boolean).join('\n');
  }

  // ── Tools (solo lectura, acotadas al tenant/sucursal del usuario) ──────────
  private storeWhere(ctx: GlamyContext) {
    return ctx.storeId ? { tenantId: ctx.tenantId, storeId: ctx.storeId } : { tenantId: ctx.tenantId };
  }

  private async executeTool(name: string, input: any, ctx: GlamyContext): Promise<any> {
    try {
      switch (name) {
        case 'get_business_summary':   return await this.getBusinessSummary(ctx);
        case 'get_low_stock':          return await this.getLowStock(ctx, input?.limit);
        case 'get_today_appointments': return await this.getTodayAppointments(ctx);
        case 'get_top_products':       return await this.getTopProducts(ctx, input?.limit);
        default: return { error: 'Herramienta desconocida' };
      }
    } catch (e: any) {
      this.logger.warn(`Tool ${name} falló: ${e.message}`);
      return { error: 'No se pudo obtener la información.' };
    }
  }

  private async getBusinessSummary(ctx: GlamyContext) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const base = this.storeWhere(ctx);

    const [month, todayAgg, productsCount, customersCount, lowStock] = await Promise.all([
      this.prisma.sale.aggregate({ where: { ...base, status: 'completed', createdAt: { gte: monthStart } }, _sum: { total: true }, _count: true }),
      this.prisma.sale.aggregate({ where: { ...base, status: 'completed', createdAt: { gte: today } }, _sum: { total: true }, _count: true }),
      this.prisma.product.count({ where: { ...base, deletedAt: null } }),
      this.prisma.customer.count({ where: { tenantId: ctx.tenantId } }),
      this.prisma.product.count({ where: { ...base, deletedAt: null, currentStock: { lte: 5 } } }),
    ]);

    const monthRevenue = Number(month._sum.total || 0);
    const monthCount = month._count || 0;
    return {
      ventasMes: monthRevenue,
      ventasMesCount: monthCount,
      ticketPromedio: monthCount > 0 ? Math.round(monthRevenue / monthCount) : 0,
      ventasHoy: Number(todayAgg._sum.total || 0),
      ventasHoyCount: todayAgg._count || 0,
      totalProductos: productsCount,
      totalClientes: customersCount,
      productosStockBajo: lowStock,
    };
  }

  private async getLowStock(ctx: GlamyContext, limit?: number) {
    const take = Math.min(Math.max(Number(limit) || 10, 1), 30);
    const products = await this.prisma.product.findMany({
      where: { ...this.storeWhere(ctx), deletedAt: null, currentStock: { lte: 10 } },
      select: { name: true, currentStock: true, minStock: true },
      orderBy: { currentStock: 'asc' },
      take: 50,
    });
    const low = products
      .filter(p => p.currentStock <= (p.minStock > 0 ? p.minStock : 5))
      .slice(0, take);
    return { count: low.length, productos: low.map(p => ({ nombre: p.name, stock: p.currentStock, minimo: p.minStock })) };
  }

  private async getTodayAppointments(ctx: GlamyContext) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    const appts = await this.prisma.appointment.findMany({
      where: { ...this.storeWhere(ctx), date: { gte: start, lt: end } },
      select: { startTime: true, status: true, service: { select: { name: true } }, customer: { select: { firstName: true, lastName: true } } },
      orderBy: { startTime: 'asc' },
      take: 30,
    });
    return {
      count: appts.length,
      citas: appts.map(a => ({
        hora: a.startTime,
        servicio: a.service?.name ?? 'Servicio',
        cliente: `${a.customer?.firstName ?? ''} ${a.customer?.lastName ?? ''}`.trim() || 'Cliente',
        estado: a.status,
      })),
    };
  }

  private async getTopProducts(ctx: GlamyContext, limit?: number) {
    const take = Math.min(Math.max(Number(limit) || 5, 1), 15);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const grouped = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        productId: { not: null },
        sale: { ...this.storeWhere(ctx), status: 'completed', createdAt: { gte: monthStart } },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take,
    });
    const ids = grouped.map(g => g.productId).filter(Boolean) as string[];
    const products = await this.prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    const nameById = new Map(products.map(p => [p.id, p.name]));
    return {
      top: grouped.map(g => ({ nombre: nameById.get(g.productId!) ?? 'Producto', unidadesVendidas: Number(g._sum.quantity || 0) })),
    };
  }
}
