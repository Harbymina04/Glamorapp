import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseAgent, AgentContext, AgentTool } from './base.agent';

@Injectable()
export class SalesAgent extends BaseAgent {
  slug = 'sales';
  name = 'Agente de Ventas';

  getSystemPrompt(ctx: AgentContext): string {
    return `Eres ${this.name}, especializado en optimización de ventas para un salón de belleza en Colombia.
Analizas tendencias, detectas oportunidades de crecimiento y generas recomendaciones accionables en COP.
NIVEL DE AUTONOMÍA: ${ctx.autonomyLevel}.
Responde en español con recomendaciones concretas.`;
  }

  getTools(ctx: AgentContext): AgentTool[] {
    return [...this.getSharedTools(ctx),
      {
        name: 'analyze_sales_trend',
        description: 'Analiza tendencias de ventas por período, producto, o categoría',
        input_schema: { type: 'object', properties: { period: { type: 'string', enum: ['7d', '30d', '90d', 'this_month', 'last_month'] }, group_by: { type: 'string', enum: ['day', 'week', 'product', 'category'] } }, required: ['period'] },
      },
      {
        name: 'get_top_products',
        description: 'Productos más vendidos por revenue o cantidad',
        input_schema: { type: 'object', properties: { limit: { type: 'number' }, sort_by: { type: 'string', enum: ['revenue', 'quantity'] }, period: { type: 'string', enum: ['7d', '30d'] } } },
      },
      {
        name: 'analyze_customer_behavior',
        description: 'Analiza comportamiento de compra de clientes por segmento',
        input_schema: { type: 'object', properties: { segment: { type: 'string', enum: ['all', 'frequent', 'occasional', 'new', 'lost'] }, period: { type: 'string', enum: ['30d', '90d', 'all'] } } },
      },
      {
        name: 'analyze_pricing',
        description: 'Analiza estructura de precios y márgenes',
        input_schema: { type: 'object', properties: { category: { type: 'string' } } },
      },
      {
        name: 'forecast_revenue',
        description: 'Pronostica ingresos futuros basado en datos históricos',
        input_schema: { type: 'object', properties: { period: { type: 'string', enum: ['next_week', 'next_month', 'next_quarter'] } }, required: ['period'] },
      },
    ];
  }

  async observe(ctx: AgentContext): Promise<Record<string, any>> {
    const [sales30d, sales7d, inventory, customers] = await Promise.all([
      this.querySales(ctx.tenantId, ctx.storeId, 30),
      this.querySales(ctx.tenantId, ctx.storeId, 7),
      this.queryInventory(ctx.tenantId, ctx.storeId),
      this.queryCustomers(ctx.tenantId, ctx.storeId, 90),
    ]);

    // Top products by revenue
    const productRevenue: Record<string, { name: string; revenue: number; quantity: number }> = {};
    for (const sale of sales30d.sales) {
      for (const item of (sale as any).saleItems || []) {
        const key = item.productId || item.serviceId || 'unknown';
        if (!productRevenue[key]) productRevenue[key] = { name: item.name || key, revenue: 0, quantity: 0 };
        productRevenue[key].revenue += Number(item.total || 0);
        productRevenue[key].quantity += item.quantity;
      }
    }

    return {
      resumen: {
        ingresos_30d: sales30d.totalRevenue, ingresos_7d: sales7d.totalRevenue,
        tickets_30d: sales30d.totalSales, ticket_promedio: sales30d.avgTicket,
        productos_activos: inventory.totalProducts, stock_bajo: inventory.lowStockCount,
        clientes_activos: customers.activeCustomers, clientes_inactivos: customers.inactiveCustomers,
      },
      top_productos: Object.values(productRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      alertas: [
        ...(inventory.lowStockCount > 0 ? [`${inventory.lowStockCount} productos con stock bajo`] : []),
        ...(customers.inactiveCustomers > customers.activeCustomers ? ['Más clientes inactivos que activos'] : []),
        ...(sales30d.totalSales < 5 ? ['Volumen de ventas muy bajo'] : []),
      ],
    };
  }

  async executeTool(ctx: AgentContext, toolName: string, args: Record<string, any>): Promise<any> {
    if (['create_recommendation', 'create_notification', 'finish_analysis', 'create_draft', 'execute_action'].includes(toolName)) {
      return this.executeSharedTool(ctx, toolName, args);
    }

    switch (toolName) {
      case 'analyze_sales_trend': {
        const days = args.period === '7d' ? 7 : args.period === '90d' ? 90 : 30;
        const sales = await this.querySales(ctx.tenantId, ctx.storeId, days);
        const byDay: Record<string, number> = {};
        for (const s of sales.sales) {
          const day = new Date(s.createdAt).toISOString().slice(0, 10);
          byDay[day] = (byDay[day] || 0) + Number(s.total);
        }
        return {
          periodo: `${days}d`, ingreso_total: sales.totalRevenue, tickets: sales.totalSales,
          ticket_promedio: Math.round(sales.avgTicket), promedio_diario: Math.round(sales.totalRevenue / days),
          tendencia: Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0])).map(([d, v]) => ({ fecha: d, valor: Math.round(v) })),
        };
      }

      case 'get_top_products': {
        const days = args.period === '7d' ? 7 : 30;
        const sales = await this.querySales(ctx.tenantId, ctx.storeId, days);
        const map: Record<string, any> = {};
        for (const sale of sales.sales) {
          for (const item of (sale as any).saleItems || []) {
            const key = item.productId || item.serviceId || 'unknown';
            if (!map[key]) map[key] = { nombre: item.name || key, cantidad: 0, ingresos: 0 };
            map[key].cantidad += item.quantity;
            map[key].ingresos += Number(item.total || 0);
          }
        }
        const sorted = Object.values(map).sort((a: any, b: any) => b.ingresos - a.ingresos).slice(0, args.limit || 10);
        return { top_productos: sorted.map((p: any) => ({ ...p, ingresos: Math.round(p.ingresos) })) };
      }

      case 'analyze_customer_behavior': {
        const customers = await this.prisma.customer.findMany({
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null },
          include: { sales: { where: { status: 'completed' } } },
        });
        const segs = {
          frequent: customers.filter(c => c.sales.length >= 5).length,
          occasional: customers.filter(c => c.sales.length >= 2 && c.sales.length < 5).length,
          new: customers.filter(c => c.sales.length === 1).length,
          lost: customers.filter(c => c.sales.length === 0).length,
        };
        return args.segment && args.segment !== 'all'
          ? { segmento: args.segment, cantidad: (segs as any)[args.segment] || 0 }
          : { ...segs, total: customers.length };
      }

      case 'analyze_pricing': {
        const products = await this.prisma.product.findMany({
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null, ...(args.category ? { category: { name: { contains: args.category } } } : {}) },
          include: { saleItems: true },
        });
        const analysis = products.map(p => ({
          nombre: p.name, precio: Number(p.salePrice), costo: Number(p.costPrice),
          margen: Number(p.costPrice) > 0 ? `${(((Number(p.salePrice) - Number(p.costPrice)) / Number(p.salePrice)) * 100).toFixed(1)}%` : 'N/A',
          vendidos: p.saleItems.reduce((s: number, i: any) => s + i.quantity, 0), stock: p.currentStock,
        })).sort((a, b) => b.vendidos - a.vendidos);
        return { productos: analysis.slice(0, 20), total: products.length };
      }

      case 'forecast_revenue': {
        const sales30d = await this.querySales(ctx.tenantId, ctx.storeId, 30);
        const dailyAvg = sales30d.totalRevenue / 30;
        const periods: Record<string, number> = { next_week: 7, next_month: 30, next_quarter: 90 };
        const days = periods[args.period] || 30;
        return { periodo: args.period, dias: days, ingreso_estimado: Math.round(dailyAvg * days), metodo: 'Promedio diario 30d' };
      }

      default:
        return { error: `Unknown: ${toolName}` };
    }
  }
}
