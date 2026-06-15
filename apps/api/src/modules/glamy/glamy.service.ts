import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { searchHelp } from './glamy-knowledge';

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
  // ── Ayuda / configuración (base de conocimiento curada) ──────────────────
  { type: 'function', function: {
    name: 'get_help',
    description: 'Busca en la guía oficial de Glamorapp CÓMO configurar o usar algo (IVA, planes, inventario, tienda online, factura electrónica, horarios, domicilios, comisiones, usuarios, etc.). Devuelve artículos con la ruta exacta del menú. ÚSALA SIEMPRE para preguntas de "cómo/dónde configuro...".',
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'Tema o pregunta del usuario, ej. "configurar iva", "horario de atencion", "envio gratis"' } }, required: ['query'] },
  }},
  // ── Ventas / caja ────────────────────────────────────────────────────────
  { type: 'function', function: {
    name: 'get_sales_summary',
    description: 'Resumen de ventas (total, número de ventas, ticket promedio, IVA generado) para un periodo.',
    parameters: { type: 'object', properties: { period: { type: 'string', enum: ['today', 'week', 'month', 'year'], description: 'Periodo, default month' } }, required: [] },
  }},
  { type: 'function', function: {
    name: 'get_cash_register_status',
    description: 'Estado de la caja: si hay una sesión de caja abierta, desde cuándo, saldo inicial y movimientos.',
    parameters: { type: 'object', properties: {}, required: [] },
  }},
  // ── Inventario / catálogo ──────────────────────────────────────────────────
  { type: 'function', function: {
    name: 'get_inventory_value',
    description: 'Valor total del inventario a costo y a precio de venta, y número de productos.',
    parameters: { type: 'object', properties: {}, required: [] },
  }},
  { type: 'function', function: {
    name: 'find_product',
    description: 'Busca un producto por nombre y devuelve su precio, costo, stock y stock mínimo.',
    parameters: { type: 'object', properties: { name: { type: 'string', description: 'Nombre o parte del nombre del producto' } }, required: ['name'] },
  }},
  { type: 'function', function: {
    name: 'list_services',
    description: 'Lista los servicios del salón con su precio, duración y tasa de comisión. Opcionalmente filtra por nombre.',
    parameters: { type: 'object', properties: { name: { type: 'string', description: 'Filtro opcional por nombre' } }, required: [] },
  }},
  // ── Citas ──────────────────────────────────────────────────────────────────
  { type: 'function', function: {
    name: 'get_appointments',
    description: 'Citas en un periodo (hoy, mañana, semana) con hora, servicio, cliente y estado.',
    parameters: { type: 'object', properties: { period: { type: 'string', enum: ['today', 'tomorrow', 'week'], description: 'Periodo, default today' } }, required: [] },
  }},
  // ── Clientes ────────────────────────────────────────────────────────────────
  { type: 'function', function: {
    name: 'get_customers_summary',
    description: 'Resumen de clientes: total, nuevos del mes y top clientes por compras.',
    parameters: { type: 'object', properties: {}, required: [] },
  }},
  { type: 'function', function: {
    name: 'find_customer',
    description: 'Busca un cliente por nombre, teléfono o email y devuelve sus datos y total gastado.',
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'Nombre, teléfono o email' } }, required: ['query'] },
  }},
  // ── Comisiones ──────────────────────────────────────────────────────────────
  { type: 'function', function: {
    name: 'get_pending_commissions',
    description: 'Comisiones pendientes de pago, totalizadas por profesional.',
    parameters: { type: 'object', properties: {}, required: [] },
  }},
  // ── Gastos / IVA / resultados ────────────────────────────────────────────────
  { type: 'function', function: {
    name: 'get_expenses_summary',
    description: 'Resumen de gastos de un periodo: total, IVA descontable y desglose por categoría.',
    parameters: { type: 'object', properties: { period: { type: 'string', enum: ['month', 'year'], description: 'Periodo, default month' } }, required: [] },
  }},
  { type: 'function', function: {
    name: 'get_iva_summary',
    description: 'Resumen de IVA del periodo: IVA generado (ventas), IVA descontable (gastos) y saldo a pagar.',
    parameters: { type: 'object', properties: { period: { type: 'string', enum: ['month', 'year'], description: 'Periodo, default month' } }, required: [] },
  }},
  { type: 'function', function: {
    name: 'get_income_statement',
    description: 'Estado de resultados simple del periodo: ingresos (ventas), gastos y utilidad.',
    parameters: { type: 'object', properties: { period: { type: 'string', enum: ['month', 'year'], description: 'Periodo, default month' } }, required: [] },
  }},
  // ── Tienda online ─────────────────────────────────────────────────────────────
  { type: 'function', function: {
    name: 'get_online_orders',
    description: 'Pedidos de la tienda online: total, ventas y desglose por estado (pendiente, confirmado, etc.).',
    parameters: { type: 'object', properties: { period: { type: 'string', enum: ['week', 'month'], description: 'Periodo, default month' } }, required: [] },
  }},
  // ── Análisis (pronóstico, márgenes, proveedores) ───────────────────────────
  { type: 'function', function: {
    name: 'forecast_sales',
    description: 'Pronostica las ventas del próximo periodo (semana o mes) con base en el promedio diario de los últimos 30 días.',
    parameters: { type: 'object', properties: { period: { type: 'string', enum: ['next_week', 'next_month'], description: 'Periodo a pronosticar, default next_month' } }, required: [] },
  }},
  { type: 'function', function: {
    name: 'analyze_margins',
    description: 'Analiza los márgenes del catálogo: productos con mejor y peor margen (precio de venta vs costo). Útil para decisiones de precios.',
    parameters: { type: 'object', properties: { limit: { type: 'number', description: 'Cuántos productos por lista (default 5)' } }, required: [] },
  }},
  { type: 'function', function: {
    name: 'get_suppliers_summary',
    description: 'Resumen de proveedores: total activos, principales por compras, saldo pendiente por pagar y compras del último mes.',
    parameters: { type: 'object', properties: {}, required: [] },
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
      '- Para preguntas sobre DATOS (ventas, caja, stock, citas, clientes, comisiones, gastos, IVA, pedidos) SIEMPRE usa las herramientas; nunca inventes números.',
      '- Para preguntas de CÓMO o DÓNDE configurar/hacer algo en la plataforma, SIEMPRE usa la herramienta get_help y básate ÚNICAMENTE en lo que devuelva (incluida la ruta del menú). NUNCA inventes rutas, nombres de menú ni pasos.',
      '- Si get_help no trae un artículo relevante, dilo con honestidad ("no tengo esa guía") en vez de adivinar.',
      '- Eres de solo lectura: no puedes crear, editar ni borrar nada. Si te lo piden, explica cómo hacerlo en la plataforma (usando get_help).',
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
        case 'get_business_summary':     return await this.getBusinessSummary(ctx);
        case 'get_low_stock':            return await this.getLowStock(ctx, input?.limit);
        case 'get_today_appointments':   return await this.getTodayAppointments(ctx);
        case 'get_top_products':         return await this.getTopProducts(ctx, input?.limit);
        case 'get_help':                 return this.getHelp(input?.query);
        case 'get_sales_summary':        return await this.getSalesSummary(ctx, input?.period);
        case 'get_cash_register_status': return await this.getCashRegisterStatus(ctx);
        case 'get_inventory_value':      return await this.getInventoryValue(ctx);
        case 'find_product':             return await this.findProduct(ctx, input?.name);
        case 'list_services':            return await this.listServices(ctx, input?.name);
        case 'get_appointments':         return await this.getAppointments(ctx, input?.period);
        case 'get_customers_summary':    return await this.getCustomersSummary(ctx);
        case 'find_customer':            return await this.findCustomer(ctx, input?.query);
        case 'get_pending_commissions':  return await this.getPendingCommissions(ctx);
        case 'get_expenses_summary':     return await this.getExpensesSummary(ctx, input?.period);
        case 'get_iva_summary':          return await this.getIvaSummary(ctx, input?.period);
        case 'get_income_statement':     return await this.getIncomeStatement(ctx, input?.period);
        case 'get_online_orders':        return await this.getOnlineOrders(ctx, input?.period);
        case 'forecast_sales':           return await this.forecastSales(ctx, input?.period);
        case 'analyze_margins':          return await this.analyzeMargins(ctx, input?.limit);
        case 'get_suppliers_summary':    return await this.getSuppliersSummary(ctx);
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

  // ── Helper de rangos de fecha ───────────────────────────────────────────────
  private periodRange(period?: string): { start: Date; label: string } {
    const now = new Date();
    switch (period) {
      case 'today': { const d = new Date(); d.setHours(0, 0, 0, 0); return { start: d, label: 'hoy' }; }
      case 'week': { const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return { start: d, label: 'últimos 7 días' }; }
      case 'year': return { start: new Date(now.getFullYear(), 0, 1), label: 'este año' };
      case 'month':
      default: return { start: new Date(now.getFullYear(), now.getMonth(), 1), label: 'este mes' };
    }
  }

  // ── get_help ────────────────────────────────────────────────────────────────
  private getHelp(query?: string) {
    const articles = searchHelp(query || '', 3);
    if (articles.length === 0) {
      return { encontrado: false, nota: 'No hay una guía específica para eso. No inventes la respuesta; sugiere al usuario revisar el menú o contactar soporte.' };
    }
    return { encontrado: true, articulos: articles.map(a => ({ tema: a.title, contenido: a.content })) };
  }

  // ── Ventas ──────────────────────────────────────────────────────────────────
  private async getSalesSummary(ctx: GlamyContext, period?: string) {
    const { start, label } = this.periodRange(period);
    const agg = await this.prisma.sale.aggregate({
      where: { ...this.storeWhere(ctx), status: 'completed', createdAt: { gte: start } },
      _sum: { total: true, taxAmount: true }, _count: true,
    });
    const total = Number(agg._sum.total || 0);
    const count = agg._count || 0;
    return {
      periodo: label,
      ventasTotal: total,
      numeroVentas: count,
      ticketPromedio: count > 0 ? Math.round(total / count) : 0,
      ivaGenerado: Number(agg._sum.taxAmount || 0),
    };
  }

  // ── Caja ──────────────────────────────────────────────────────────────────────
  private async getCashRegisterStatus(ctx: GlamyContext) {
    const session = await this.prisma.cashRegisterSession.findFirst({
      where: { ...this.storeWhere(ctx), status: 'open' },
      orderBy: { openedAt: 'desc' },
      select: { openedAt: true, openingBalance: true, openedByUser: { select: { firstName: true, lastName: true } }, _count: { select: { movements: true } } },
    });
    if (!session) return { cajaAbierta: false, nota: 'No hay ninguna sesión de caja abierta. Se abre desde Ventas POS.' };
    return {
      cajaAbierta: true,
      abiertaDesde: session.openedAt,
      saldoInicial: Number(session.openingBalance || 0),
      abiertaPor: `${session.openedByUser?.firstName ?? ''} ${session.openedByUser?.lastName ?? ''}`.trim(),
      movimientos: session._count?.movements ?? 0,
    };
  }

  // ── Inventario ──────────────────────────────────────────────────────────────────
  private async getInventoryValue(ctx: GlamyContext) {
    const products = await this.prisma.product.findMany({
      where: { ...this.storeWhere(ctx), deletedAt: null },
      select: { currentStock: true, costPrice: true, salePrice: true },
    });
    let costo = 0, venta = 0, unidades = 0;
    for (const p of products) {
      const stock = Number(p.currentStock || 0);
      unidades += stock;
      costo += stock * Number(p.costPrice || 0);
      venta += stock * Number(p.salePrice || 0);
    }
    return { numeroProductos: products.length, unidadesEnStock: unidades, valorCosto: Math.round(costo), valorVenta: Math.round(venta) };
  }

  private async findProduct(ctx: GlamyContext, name?: string) {
    const q = (name || '').trim();
    if (!q) return { error: 'Indica el nombre del producto a buscar.' };
    const products = await this.prisma.product.findMany({
      where: { ...this.storeWhere(ctx), deletedAt: null, name: { contains: q, mode: 'insensitive' } },
      select: { name: true, salePrice: true, costPrice: true, currentStock: true, minStock: true },
      take: 8,
    });
    if (products.length === 0) return { encontrado: false, nota: `No encontré productos que coincidan con "${q}".` };
    return {
      encontrado: true,
      productos: products.map(p => ({
        nombre: p.name, precioVenta: Number(p.salePrice || 0), costo: Number(p.costPrice || 0),
        stock: Number(p.currentStock || 0), stockMinimo: Number(p.minStock || 0),
      })),
    };
  }

  private async listServices(ctx: GlamyContext, name?: string) {
    const q = (name || '').trim();
    const services = await this.prisma.service.findMany({
      where: { ...this.storeWhere(ctx), isActive: true, ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) },
      select: { name: true, price: true, durationMinutes: true, commissionRate: true, allowsOnlineBooking: true },
      orderBy: { name: 'asc' }, take: 25,
    });
    return {
      count: services.length,
      servicios: services.map(s => ({
        nombre: s.name, precio: Number(s.price || 0), duracionMin: s.durationMinutes,
        comisionPct: Number(s.commissionRate || 0), agendaOnline: s.allowsOnlineBooking,
      })),
    };
  }

  // ── Citas ──────────────────────────────────────────────────────────────────────
  private async getAppointments(ctx: GlamyContext, period?: string) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    let end = new Date(start); end.setDate(end.getDate() + 1);
    let label = 'hoy';
    if (period === 'tomorrow') { start.setDate(start.getDate() + 1); end = new Date(start); end.setDate(end.getDate() + 1); label = 'mañana'; }
    else if (period === 'week') { end = new Date(start); end.setDate(end.getDate() + 7); label = 'los próximos 7 días'; }
    const appts = await this.prisma.appointment.findMany({
      where: { ...this.storeWhere(ctx), date: { gte: start, lt: end } },
      select: { date: true, startTime: true, status: true, service: { select: { name: true } }, customer: { select: { firstName: true, lastName: true } } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }], take: 40,
    });
    return {
      periodo: label,
      count: appts.length,
      citas: appts.map(a => ({
        fecha: a.date, hora: a.startTime,
        servicio: a.service?.name ?? 'Servicio',
        cliente: `${a.customer?.firstName ?? ''} ${a.customer?.lastName ?? ''}`.trim() || 'Cliente',
        estado: a.status,
      })),
    };
  }

  // ── Clientes ──────────────────────────────────────────────────────────────────
  private async getCustomersSummary(ctx: GlamyContext) {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const [total, nuevos, top] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId: ctx.tenantId } }),
      this.prisma.customer.count({ where: { tenantId: ctx.tenantId, createdAt: { gte: monthStart } } }),
      this.prisma.sale.groupBy({
        by: ['customerId'],
        where: { ...this.storeWhere(ctx), status: 'completed', customerId: { not: null } },
        _sum: { total: true }, orderBy: { _sum: { total: 'desc' } }, take: 5,
      }),
    ]);
    const ids = top.map(t => t.customerId).filter(Boolean) as string[];
    const customers = await this.prisma.customer.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } });
    const byId = new Map(customers.map(c => [c.id, `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim()]));
    return {
      totalClientes: total,
      nuevosEsteMes: nuevos,
      topClientes: top.map(t => ({ nombre: byId.get(t.customerId!) ?? 'Cliente', totalComprado: Number(t._sum.total || 0) })),
    };
  }

  private async findCustomer(ctx: GlamyContext, query?: string) {
    const q = (query || '').trim();
    if (!q) return { error: 'Indica el nombre, teléfono o email del cliente.' };
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, phone: true, email: true },
      take: 8,
    });
    if (customers.length === 0) return { encontrado: false, nota: `No encontré clientes que coincidan con "${q}".` };
    const ids = customers.map(c => c.id);
    const sales = await this.prisma.sale.groupBy({
      by: ['customerId'],
      where: { ...this.storeWhere(ctx), status: 'completed', customerId: { in: ids } },
      _sum: { total: true }, _count: true,
    });
    const spentById = new Map(sales.map(s => [s.customerId, { total: Number(s._sum.total || 0), count: s._count || 0 }]));
    return {
      encontrado: true,
      clientes: customers.map(c => ({
        nombre: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim(), telefono: c.phone, email: c.email,
        totalGastado: spentById.get(c.id)?.total ?? 0, numeroCompras: spentById.get(c.id)?.count ?? 0,
      })),
    };
  }

  // ── Comisiones ────────────────────────────────────────────────────────────────
  private async getPendingCommissions(ctx: GlamyContext) {
    const grouped = await this.prisma.commission.groupBy({
      by: ['userId'],
      where: { ...this.storeWhere(ctx), status: 'pending' },
      _sum: { amount: true }, _count: true,
    });
    const ids = grouped.map(g => g.userId);
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } });
    const byId = new Map(users.map(u => [u.id, `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()]));
    const totalPendiente = grouped.reduce((s, g) => s + Number(g._sum.amount || 0), 0);
    return {
      totalPendiente,
      porProfesional: grouped.map(g => ({ profesional: byId.get(g.userId) ?? 'Profesional', monto: Number(g._sum.amount || 0), comisiones: g._count || 0 })),
    };
  }

  // ── Gastos ──────────────────────────────────────────────────────────────────────
  private async getExpensesSummary(ctx: GlamyContext, period?: string) {
    const { start, label } = this.periodRange(period === 'year' ? 'year' : 'month');
    const expenses = await this.prisma.expense.findMany({
      where: { ...this.storeWhere(ctx), isVoided: false, expenseDate: { gte: start } },
      select: { amount: true, ivaAmount: true, category: { select: { name: true } } },
    });
    let total = 0, iva = 0;
    const porCategoria = new Map<string, number>();
    for (const e of expenses) {
      const amt = Number(e.amount || 0);
      total += amt; iva += Number(e.ivaAmount || 0);
      const cat = e.category?.name ?? 'Sin categoría';
      porCategoria.set(cat, (porCategoria.get(cat) || 0) + amt);
    }
    return {
      periodo: label,
      gastosTotal: Math.round(total),
      ivaDescontable: Math.round(iva),
      numeroGastos: expenses.length,
      porCategoria: Array.from(porCategoria.entries()).map(([categoria, monto]) => ({ categoria, monto: Math.round(monto) })).sort((a, b) => b.monto - a.monto),
    };
  }

  // ── IVA ──────────────────────────────────────────────────────────────────────────
  private async getIvaSummary(ctx: GlamyContext, period?: string) {
    const { start, label } = this.periodRange(period === 'year' ? 'year' : 'month');
    const [salesAgg, expenses] = await Promise.all([
      this.prisma.sale.aggregate({ where: { ...this.storeWhere(ctx), status: 'completed', createdAt: { gte: start } }, _sum: { taxAmount: true } }),
      this.prisma.expense.aggregate({ where: { ...this.storeWhere(ctx), isVoided: false, expenseDate: { gte: start } }, _sum: { ivaAmount: true } }),
    ]);
    const ivaGenerado = Number(salesAgg._sum.taxAmount || 0);
    const ivaDescontable = Number(expenses._sum.ivaAmount || 0);
    const saldo = ivaGenerado - ivaDescontable;
    return {
      periodo: label,
      ivaGenerado: Math.round(ivaGenerado),
      ivaDescontable: Math.round(ivaDescontable),
      saldoIva: Math.round(saldo),
      nota: saldo >= 0 ? 'Saldo a pagar a la DIAN' : 'Saldo a favor',
    };
  }

  // ── Estado de resultados ──────────────────────────────────────────────────────────
  private async getIncomeStatement(ctx: GlamyContext, period?: string) {
    const { start, label } = this.periodRange(period === 'year' ? 'year' : 'month');
    const [salesAgg, expensesAgg] = await Promise.all([
      this.prisma.sale.aggregate({ where: { ...this.storeWhere(ctx), status: 'completed', createdAt: { gte: start } }, _sum: { total: true } }),
      this.prisma.expense.aggregate({ where: { ...this.storeWhere(ctx), isVoided: false, expenseDate: { gte: start } }, _sum: { amount: true } }),
    ]);
    const ingresos = Number(salesAgg._sum.total || 0);
    const gastos = Number(expensesAgg._sum.amount || 0);
    return { periodo: label, ingresos: Math.round(ingresos), gastos: Math.round(gastos), utilidad: Math.round(ingresos - gastos) };
  }

  // ── Pedidos online ──────────────────────────────────────────────────────────────
  private async getOnlineOrders(ctx: GlamyContext, period?: string) {
    const { start, label } = this.periodRange(period === 'week' ? 'week' : 'month');
    const orders = await this.prisma.storefrontOrder.findMany({
      where: { tenantId: ctx.tenantId, ...(ctx.storeId ? { storeId: ctx.storeId } : {}), createdAt: { gte: start } },
      select: { total: true, status: true },
    });
    const porEstado = new Map<string, number>();
    let totalVentas = 0;
    for (const o of orders) {
      totalVentas += Number(o.total || 0);
      porEstado.set(o.status, (porEstado.get(o.status) || 0) + 1);
    }
    return {
      periodo: label,
      numeroPedidos: orders.length,
      ventasTotal: Math.round(totalVentas),
      porEstado: Array.from(porEstado.entries()).map(([estado, cantidad]) => ({ estado, cantidad })),
    };
  }

  // ── Pronóstico de ventas ────────────────────────────────────────────────────
  private async forecastSales(ctx: GlamyContext, period?: string) {
    const since = new Date(); since.setDate(since.getDate() - 30); since.setHours(0, 0, 0, 0);
    const agg = await this.prisma.sale.aggregate({
      where: { ...this.storeWhere(ctx), status: 'completed', createdAt: { gte: since } },
      _sum: { total: true }, _count: true,
    });
    const total30d = Number(agg._sum.total || 0);
    const promedioDiario = total30d / 30;
    const dias = period === 'next_week' ? 7 : 30;
    return {
      periodo: period === 'next_week' ? 'próxima semana' : 'próximo mes',
      baseUltimos30d: Math.round(total30d),
      ventasUltimos30dCount: agg._count || 0,
      promedioDiario: Math.round(promedioDiario),
      ventasEstimadas: Math.round(promedioDiario * dias),
      metodo: 'Promedio diario de los últimos 30 días (estimación simple, no considera estacionalidad).',
    };
  }

  // ── Análisis de márgenes ────────────────────────────────────────────────────
  private async analyzeMargins(ctx: GlamyContext, limit?: number) {
    const take = Math.min(Math.max(Number(limit) || 5, 1), 15);
    const products = await this.prisma.product.findMany({
      where: { ...this.storeWhere(ctx), deletedAt: null, costPrice: { gt: 0 }, salePrice: { gt: 0 } },
      select: { name: true, salePrice: true, costPrice: true, currentStock: true },
    });
    const withMargin = products.map(p => {
      const venta = Number(p.salePrice || 0);
      const costo = Number(p.costPrice || 0);
      const margenPct = venta > 0 ? ((venta - costo) / venta) * 100 : 0;
      return { nombre: p.name, precioVenta: venta, costo, margenPct: Math.round(margenPct * 10) / 10, gananciaUnidad: Math.round(venta - costo), stock: Number(p.currentStock || 0) };
    });
    const ordenados = [...withMargin].sort((a, b) => b.margenPct - a.margenPct);
    // Productos sin costo cargado (margen no calculable)
    const sinCosto = await this.prisma.product.count({ where: { ...this.storeWhere(ctx), deletedAt: null, costPrice: { lte: 0 } } });
    return {
      productosAnalizados: withMargin.length,
      productosSinCostoCargado: sinCosto,
      mejorMargen: ordenados.slice(0, take),
      peorMargen: ordenados.slice(-take).reverse(),
    };
  }

  // ── Resumen de proveedores ──────────────────────────────────────────────────
  private async getSuppliersSummary(ctx: GlamyContext) {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const base = this.storeWhere(ctx);
    const [activos, suppliers, comprasMes] = await Promise.all([
      this.prisma.supplier.count({ where: { ...base, deletedAt: null, isActive: true } }),
      this.prisma.supplier.findMany({
        where: { ...base, deletedAt: null },
        select: { businessName: true, totalPurchases: true, purchaseCount: true, currentBalance: true },
        orderBy: { totalPurchases: 'desc' },
        take: 5,
      }),
      this.prisma.purchase.aggregate({
        where: { ...base, createdAt: { gte: monthStart } },
        _sum: { total: true }, _count: true,
      }),
    ]);
    const saldoPorPagar = suppliers.reduce((s, sup) => s + Number(sup.currentBalance || 0), 0);
    return {
      proveedoresActivos: activos,
      comprasEsteMes: Number(comprasMes._sum.total || 0),
      numeroComprasEsteMes: comprasMes._count || 0,
      saldoPorPagarTop: Math.round(saldoPorPagar),
      principales: suppliers.map(s => ({
        nombre: s.businessName,
        totalComprado: Number(s.totalPurchases || 0),
        numeroCompras: s.purchaseCount,
        saldoPendiente: Number(s.currentBalance || 0),
      })),
    };
  }
}
