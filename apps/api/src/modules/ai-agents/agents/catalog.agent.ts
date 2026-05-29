import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseAgent, AgentContext, AgentTool } from './base.agent';

@Injectable()
export class CatalogAgent extends BaseAgent {
  slug = 'catalog';
  name = 'Agente de Catálogo';

  getSystemPrompt(ctx: AgentContext): string {
    return `Eres ${this.name}, especializado en optimización de catálogo de productos y servicios para un salón de belleza en Colombia.

ANALIZAS: tendencias de consumo, gaps en el catálogo, estacionalidad, precios, rotación de productos.

HERRAMIENTAS: analizar gaps del catálogo, detectar estilos en tendencia, sugerir nuevos servicios, analizar estacionalidad, optimizar catálogo.

NIVEL DE AUTONOMÍA: ${ctx.autonomyLevel}

Responde en español con recomendaciones concretas para Colombia.`;
  }

  getTools(ctx: AgentContext): AgentTool[] {
    return [...this.getSharedTools(ctx),
      {
        name: 'analyze_catalog_gaps',
        description: 'Identifica brechas en el catálogo: categorías faltantes, servicios no ofrecidos vs demanda',
        input_schema: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'detect_trending_styles',
        description: 'Detecta estilos y servicios en tendencia basado en datos de ventas recientes',
        input_schema: { type: 'object', properties: { period: { type: 'string', enum: ['7d', '30d', '90d'] } } },
      },
      {
        name: 'suggest_new_services',
        description: 'Sugiere nuevos servicios/productos basados en análisis de mercado de belleza colombiano',
        input_schema: { type: 'object', properties: { category: { type: 'string', description: 'Categoría: uñas, cabello, skincare, etc.' } } },
      },
      {
        name: 'analyze_seasonality',
        description: 'Analiza patrones estacionales de consumo por mes',
        input_schema: { type: 'object', properties: {} },
      },
      {
        name: 'optimize_catalog',
        description: 'Clasifica productos en: destacar, descontinuar, revisar precio, promocionar',
        input_schema: { type: 'object', properties: {} },
      },
    ];
  }

  async observe(ctx: AgentContext): Promise<Record<string, any>> {
    const products = await this.prisma.product.findMany({
      where: { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null },
      include: { category: true, saleItems: { include: { sale: true } } },
      orderBy: { catalogViews: 'desc' },
    });

    const services = await this.prisma.service.findMany({
      where: { tenantId: ctx.tenantId, storeId: ctx.storeId },
      include: { saleItems: { include: { sale: true } } },
    });

    const nailDesigns = await this.prisma.nailDesign.findMany({
      where: { tenantId: ctx.tenantId, storeId: ctx.storeId },
    });

    const topByViews = products.slice(0, 10).map(p => ({
      name: p.name, category: p.category?.name || 'N/D', views: p.catalogViews,
      price: Number(p.salePrice), stock: p.currentStock,
    }));

    const topBySales = products
      .map(p => ({ name: p.name, sold: p.saleItems.reduce((s: number, i: any) => s + i.quantity, 0) }))
      .filter(p => p.sold > 0)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 10);

    const noSales = products.filter(p => p.saleItems.length === 0).map(p => p.name);

    const categories = [...Array.from(new Set(products.map(p => p.category?.name).filter(Boolean)))];

    return {
      resumen: {
        total_productos: products.length,
        total_servicios: services.length,
        total_disenos_unas: nailDesigns.length,
        categorias: categories,
        categorias_count: categories.length,
      },
      top_vistos: topByViews,
      top_vendidos: topBySales,
      sin_ventas: noSales.slice(0, 10),
      sin_ventas_count: noSales.length,
      alertas: [
        ...(noSales.length > products.length * 0.3 ? [`${noSales.length} productos sin ventas (${((noSales.length/products.length)*100).toFixed(0)}%)`] : []),
        ...(products.filter(p => p.currentStock === 0).length > 0 ? [`${products.filter(p => p.currentStock === 0).length} productos agotados`] : []),
      ],
    };
  }

  async executeTool(ctx: AgentContext, toolName: string, args: Record<string, any>): Promise<any> {
    if (['create_recommendation', 'create_notification', 'finish_analysis', 'create_draft', 'execute_action'].includes(toolName)) {
      return this.executeSharedTool(ctx, toolName, args);
    }

    switch (toolName) {
      case 'analyze_catalog_gaps': {
        const products = await this.prisma.product.findMany({
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null },
          include: { category: true },
        });
        const categories = products.map(p => p.category?.name).filter(Boolean);
        const uniqueCats = [...Array.from(new Set(categories))];

        // Common beauty salon categories missing
        const expectedCats = ['Uñas', 'Cabello', 'Skincare', 'Pestañas', 'Maquillaje', 'Depilación', 'Masajes', 'Tratamientos', 'Productos'];
        const missing = expectedCats.filter(ec => !uniqueCats.some(uc => (uc || '').toLowerCase().includes(ec.toLowerCase())));

        return { categorias_actuales: uniqueCats, categorias_faltantes: missing, total_productos: products.length };
      }

      case 'detect_trending_styles': {
        const days = args.period === '7d' ? 7 : args.period === '90d' ? 90 : 30;
        const since = new Date(Date.now() - days * 86400000);

        const products = await this.prisma.product.findMany({
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null },
          include: { saleItems: { where: { createdAt: { gte: since } } }, category: true },
        });

        const trending = products
          .map(p => ({ name: p.name, category: p.category?.name || 'N/D', recentSales: p.saleItems.reduce((s: number, i: any) => s + i.quantity, 0), views: p.catalogViews }))
          .filter(p => p.recentSales > 0 || p.views > 10)
          .sort((a, b) => b.recentSales - a.recentSales || b.views - a.views)
          .slice(0, 10);

        return { periodo: `${days}d`, tendencias: trending };
      }

      case 'suggest_new_services': {
        const category = args.category || 'general';
        const suggestions: Record<string, string[]> = {
          uñas: ['Uñas press-on premium', 'Nail art 3D', 'Esmaltado semipermanente express', 'Uñas cromadas glitter', 'Manicure japonesa'],
          cabello: ['Botox capilar', 'Tratamiento de keratina express', 'Peinados para eventos', 'Balayage inverso', 'Corte tendencia 2025'],
          skincare: ['Hydrafacial', 'Microdermoabrasión', 'Mascarilla LED', 'Peeling enzimático', 'Limpieza facial profunda + masaje'],
          pestañas: ['Lifting de pestañas + tinte', 'Extensiones pelo a pelo', 'Diseño personalizado de cejas', 'Laminado de cejas'],
          maquillaje: ['Maquillaje social express', 'Maquillaje para novias paquete completo', 'Clases de automaquillaje'],
          general: ['Paquete "Día de Spa"', 'Membresía mensual de bienestar', 'Servicio VIP a domicilio', 'Experiencia de belleza para parejas', 'Consultoría de imagen personal'],
        };

        return { categoria: category, sugerencias: suggestions[category] || suggestions.general };
      }

      case 'analyze_seasonality': {
        const products = await this.prisma.product.findMany({
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null },
          include: { saleItems: { include: { sale: { select: { createdAt: true } } } } },
        });

        const monthlySales: Record<string, number> = {};
        for (const p of products) {
          for (const item of (p as any).saleItems) {
            const month = item.sale.createdAt.toISOString().slice(0, 7); // YYYY-MM
            monthlySales[month] = (monthlySales[month] || 0) + item.quantity;
          }
        }

        const sorted = Object.entries(monthlySales).sort((a, b) => a[0].localeCompare(b[0]));

        return { ventas_mensuales: sorted.map(([m, v]) => ({ mes: m, ventas: v })), total_meses: sorted.length };
      }

      case 'optimize_catalog': {
        const products = await this.prisma.product.findMany({
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null },
          include: { saleItems: { include: { sale: { select: { createdAt: true } } } }, category: true },
        });

        const now = Date.now();
        const classified = { destacar: [] as string[], descontinuar: [] as string[], revisar_precio: [] as string[], promocionar: [] as string[] };

        for (const p of products) {
          const totalSold = p.saleItems.reduce((s: number, i: any) => s + i.quantity, 0);
          const hasRecentSales = p.saleItems.some((i: any) => new Date(i.sale.createdAt).getTime() > now - 90 * 86400000);
          const outOfStock = p.currentStock <= 0;

          if (totalSold > 20 && hasRecentSales) classified.destacar.push(p.name);
          else if (totalSold === 0 && !hasRecentSales) classified.descontinuar.push(p.name);
          else if (totalSold > 0 && totalSold < 5) classified.revisar_precio.push(p.name);
          else if (outOfStock && totalSold > 10) classified.promocionar.push(p.name);
        }

        return {
          destacar: classified.destacar.slice(0, 5),
          descontinuar: classified.descontinuar.slice(0, 5),
          revisar_precio: classified.revisar_precio.slice(0, 5),
          promocionar: classified.promocionar.slice(0, 5),
          resumen: {
            total_analizados: products.length,
            a_destacar: classified.destacar.length,
            a_descontinuar: classified.descontinuar.length,
            a_revisar_precio: classified.revisar_precio.length,
            a_promocionar: classified.promocionar.length,
          },
        };
      }

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }
}
