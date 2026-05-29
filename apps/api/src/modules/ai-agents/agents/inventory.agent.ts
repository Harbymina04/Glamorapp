import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseAgent, AgentContext, AgentTool } from './base.agent';

@Injectable()
export class InventoryAgent extends BaseAgent {
  slug = 'inventory';
  name = 'Agente de Inventario';

  getSystemPrompt(ctx: AgentContext): string {
    return `Eres ${this.name}, especializado en gestión de inventario para un salón de belleza en Colombia.

ANALIZAS: niveles de stock, rotación de productos, productos con bajo rendimiento, necesidades de reabastecimiento, predicción de demanda.

NIVEL DE AUTONOMÍA: ${ctx.autonomyLevel}

Responde en español con recomendaciones accionables en COP.`;
  }

  getTools(ctx: AgentContext): AgentTool[] {
    return [...this.getSharedTools(ctx),
      {
        name: 'analyze_stock_levels',
        description: 'Analiza niveles de stock: productos agotados, bajo mínimo, sobreestock',
        input_schema: { type: 'object', properties: { category: { type: 'string', description: 'Filtrar por categoría (opcional)' } } },
      },
      {
        name: 'analyze_product_performance',
        description: 'Analiza rendimiento: revenue, rotación, margen por producto',
        input_schema: { type: 'object', properties: { period: { type: 'string', enum: ['30d', '90d', 'all'] }, sort_by: { type: 'string', enum: ['revenue', 'quantity', 'margin'] } } },
      },
      {
        name: 'detect_low_stock',
        description: 'Detecta productos con stock crítico y riesgo de quiebre',
        input_schema: { type: 'object', properties: {} },
      },
      {
        name: 'suggest_reorder',
        description: 'Sugiere cantidades de reorden basado en velocidad de venta y stock mínimo',
        input_schema: { type: 'object', properties: { lead_time_days: { type: 'number', description: 'Días de lead time del proveedor (default 7)' } } },
      },
      {
        name: 'forecast_demand',
        description: 'Pronostica demanda futura basada en histórico de ventas',
        input_schema: { type: 'object', properties: { days_ahead: { type: 'number', description: 'Días a pronosticar (default 30)' } } },
      },
    ];
  }

  async observe(ctx: AgentContext): Promise<Record<string, any>> {
    const products = await this.prisma.product.findMany({
      where: { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null },
      include: { category: true, saleItems: true },
    });

    const outOfStock = products.filter(p => p.currentStock <= 0);
    const lowStock = products.filter(p => p.currentStock > 0 && p.currentStock <= p.minStock);
    const overStock = products.filter(p => p.currentStock > p.minStock * 3 && p.minStock > 0);

    const totalValue = products.reduce((s, p) => s + p.currentStock * Number(p.salePrice), 0);

    const topSelling = products
      .map(p => ({ name: p.name, sold: p.saleItems.reduce((s: number, i: any) => s + i.quantity, 0) }))
      .filter(p => p.sold > 0)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 10);

    const notSold = products.filter(p => p.saleItems.length === 0).map(p => p.name);

    return {
      resumen: {
        total_productos: products.length,
        valor_inventario: Math.round(totalValue),
        agotados: outOfStock.length,
        stock_bajo: lowStock.length,
        sobre_stock: overStock.length,
        sin_ventas: notSold.length,
      },
      top_vendidos: topSelling,
      alertas: [
        ...(outOfStock.length > 0 ? [`${outOfStock.length} productos AGOTADOS: ${outOfStock.slice(0, 5).map(p => p.name).join(', ')}`] : []),
        ...(lowStock.length > 0 ? [`${lowStock.length} productos con stock bajo`] : []),
        ...(notSold.length > products.length * 0.3 ? [`${((notSold.length / products.length) * 100).toFixed(0)}% sin ventas`] : []),
      ],
    };
  }

  async executeTool(ctx: AgentContext, toolName: string, args: Record<string, any>): Promise<any> {
    if (['create_recommendation', 'create_notification', 'finish_analysis', 'create_draft', 'execute_action'].includes(toolName)) {
      return this.executeSharedTool(ctx, toolName, args);
    }

    const where: any = { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null };
    if (args.category) where.category = { name: { contains: args.category, mode: 'insensitive' } };

    const products = await this.prisma.product.findMany({
      where,
      include: { category: true, saleItems: { include: { sale: { select: { createdAt: true } } } } },
    });

    switch (toolName) {
      case 'analyze_stock_levels': {
        return {
          agotados: products.filter(p => p.currentStock <= 0).map(p => ({ name: p.name, categoria: p.category?.name })),
          bajo_minimo: products.filter(p => p.currentStock > 0 && p.currentStock <= p.minStock).map(p => ({
            name: p.name, stock: p.currentStock, minimo: p.minStock, valor: Math.round(p.currentStock * Number(p.salePrice)),
          })),
          saludable: products.filter(p => p.currentStock > p.minStock && p.currentStock <= p.minStock * 2).length,
          sobre_stock: products.filter(p => p.currentStock > p.minStock * 3 && p.minStock > 0).length,
        };
      }

      case 'analyze_product_performance': {
        const analysis = products.map(p => {
          const sold = p.saleItems.reduce((s: number, i: any) => s + i.quantity, 0);
          const revenue = p.saleItems.reduce((s: number, i: any) => s + Number(i.total || 0), 0);
          const margin = Number(p.salePrice) > 0 ? ((Number(p.salePrice) - Number(p.costPrice)) / Number(p.salePrice) * 100) : 0;
          const rotation = p.currentStock > 0 ? sold / p.currentStock : 0;
          return { name: p.name, categoria: p.category?.name, vendidos: sold, ingresos: Math.round(revenue), margen: `${margin.toFixed(1)}%`, rotacion: rotation.toFixed(2), stock: p.currentStock };
        });
        const sortBy = args.sort_by || 'revenue';
        analysis.sort((a: any, b: any) => b[sortBy === 'revenue' ? 'ingresos' : sortBy === 'quantity' ? 'vendidos' : 'margen'] - a[sortBy === 'revenue' ? 'ingresos' : sortBy === 'quantity' ? 'vendidos' : 'margen']);
        return { productos: analysis.slice(0, 20), total: analysis.length };
      }

      case 'detect_low_stock': {
        const critical = products.filter(p => {
          const sold7d = p.saleItems.filter((i: any) => new Date(i.sale.createdAt).getTime() > Date.now() - 7 * 86400000).reduce((s: number, i: any) => s + i.quantity, 0);
          const dailyRate = sold7d / 7;
          return p.currentStock > 0 && dailyRate > 0 && p.currentStock / dailyRate < 7;
        });
        return {
          criticos: critical.map(p => ({
            name: p.name, stock: p.currentStock, minimo: p.minStock,
            venta_diaria: (p.saleItems.filter((i: any) => new Date(i.sale.createdAt).getTime() > Date.now() - 7 * 86400000).reduce((s: number, i: any) => s + i.quantity, 0) / 7).toFixed(1),
            dias_restantes: 'menos de 7',
          })),
          total_criticos: critical.length,
        };
      }

      case 'suggest_reorder': {
        const leadTime = args.lead_time_days || 7;
        const reorderList = products
          .filter(p => p.currentStock <= p.minStock)
          .map(p => {
            const sold30d = p.saleItems.filter((i: any) => new Date(i.sale.createdAt).getTime() > Date.now() - 30 * 86400000).reduce((s: number, i: any) => s + i.quantity, 0);
            const dailyRate = sold30d / 30;
            const suggested = Math.max(p.minStock, Math.ceil(dailyRate * leadTime * 1.5));
            return { name: p.name, stock_actual: p.currentStock, minimo: p.minStock, venta_diaria: dailyRate.toFixed(1), sugerido: suggested, costo_estimado: Math.round(suggested * Number(p.costPrice)) };
          });
        return { productos_a_reordenar: reorderList, total: reorderList.length, costo_total: Math.round(reorderList.reduce((s, p) => s + p.costo_estimado, 0)) };
      }

      case 'forecast_demand': {
        const daysAhead = args.days_ahead || 30;
        const forecast = products.map(p => {
          const sold30d = p.saleItems.filter((i: any) => new Date(i.sale.createdAt).getTime() > Date.now() - 30 * 86400000).reduce((s: number, i: any) => s + i.quantity, 0);
          const dailyRate = sold30d / 30;
          const projected = Math.round(dailyRate * daysAhead);
          const risk = p.currentStock < projected ? (p.currentStock === 0 ? 'CRÍTICO' : 'ALTO') : p.currentStock < projected * 1.3 ? 'MEDIO' : 'BAJO';
          return { name: p.name, venta_diaria: dailyRate.toFixed(1), demanda_proyectada: projected, stock_actual: p.currentStock, deficit: Math.max(0, projected - p.currentStock), riesgo: risk };
        }).filter(p => (p as any).riesgo !== 'BAJO').sort((a, b) => b.deficit - a.deficit);
        return { pronosticos: forecast.slice(0, 15), total_con_riesgo: forecast.length, dias_proyectados: daysAhead };
      }

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }
}
