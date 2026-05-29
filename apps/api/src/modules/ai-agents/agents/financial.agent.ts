import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseAgent, AgentContext, AgentTool } from './base.agent';

@Injectable()
export class FinancialAgent extends BaseAgent {
  slug = 'financial';
  name = 'Agente Financiero';

  constructor(prisma: PrismaService, configService: ConfigService) {
    super(prisma, configService);
  }

  // ─── System Prompt (español Colombia) ──────────────────────────

  getSystemPrompt(_ctx: AgentContext): string {
    return `Eres un Agente Financiero especializado en análisis de rentabilidad para salones de belleza en Colombia.
Tu objetivo es analizar ingresos, gastos, flujo de caja y detectar oportunidades de mejora financiera.

REGLAS:
- Responde SIEMPRE en español (Colombia).
- Usa COP ($) como moneda.
- Piensa paso a paso: OBSERVA los datos → USA herramientas para profundizar → GENERA recomendaciones.
- Sé específico con números, porcentajes y tendencias.
- Prioriza hallazgos por impacto financiero (crítico > alto > medio > bajo).
- Cuando termines, llama a finish_analysis con un resumen ejecutivo.

HERRAMIENTAS DISPONIBLES:
- get_financial_summary: Resume ingresos, gastos, ganancia y margen del período.
- analyze_cashflow: Analiza flujo de caja (entradas vs salidas) por semana/mes.
- detect_anomalies: Detecta anomalías en transacciones (gastos inusuales, picos, caídas).
- suggest_budget: Sugiere presupuestos basados en datos históricos.
- forecast_profitability: Proyecta rentabilidad futura con base en tendencias.`;
  }

  // ─── Tools ─────────────────────────────────────────────────────

  getTools(ctx: AgentContext): AgentTool[] {
    const specificTools: AgentTool[] = [
      {
        name: 'get_financial_summary',
        description: 'Obtiene resumen financiero completo: ingresos totales, gastos totales, ganancia neta, margen de ganancia, ticket promedio y cantidad de ventas del período.',
        input_schema: {
          type: 'object',
          properties: {
            days: { type: 'number', description: 'Días hacia atrás para analizar (default: 30)' },
            compare_previous: { type: 'boolean', description: 'Si es true, compara con el período anterior del mismo largo' },
          },
        },
      },
      {
        name: 'analyze_cashflow',
        description: 'Analiza el flujo de caja (cashflow): entradas vs salidas agrupadas por semana o mes. Calcula saldo neto por período y tendencia.',
        input_schema: {
          type: 'object',
          properties: {
            days: { type: 'number', description: 'Período de análisis en días (default: 90)' },
            granularity: { type: 'string', enum: ['week', 'month'], description: 'Agrupación: por semana o por mes' },
          },
        },
      },
      {
        name: 'detect_anomalies',
        description: 'Detecta anomalías financieras: gastos atípicos, caídas bruscas de ingreso, transacciones duplicadas, picos inusuales. Usa detección estadística básica (z-score).',
        input_schema: {
          type: 'object',
          properties: {
            days: { type: 'number', description: 'Período de análisis en días (default: 60)' },
            threshold: { type: 'number', description: 'Umbral de sensibilidad para detección (1.5 = sensible, 3.0 = solo outliers extremos). Default: 2.0' },
          },
        },
      },
      {
        name: 'suggest_budget',
        description: 'Sugiere un presupuesto mensual basado en gastos históricos, estacionalidad y márgenes objetivo. Desglosa por categoría de gasto.',
        input_schema: {
          type: 'object',
          properties: {
            target_margin: { type: 'number', description: 'Margen de ganancia objetivo en porcentaje (ej: 30 para 30%). Default: 25' },
            months_of_history: { type: 'number', description: 'Meses de historial a usar como base (default: 3)' },
          },
        },
      },
      {
        name: 'forecast_profitability',
        description: 'Proyecta rentabilidad futura (30, 60, 90 días) usando tendencias históricas, estacionalidad y crecimiento. Incluye escenarios optimista, realista y conservador.',
        input_schema: {
          type: 'object',
          properties: {
            days_ahead: { type: 'number', description: 'Días a proyectar hacia adelante (default: 90)' },
            include_seasonality: { type: 'boolean', description: 'Ajustar por factores estacionales (default: true)' },
          },
        },
      },
    ];

    return [...this.getSharedTools(ctx), ...specificTools];
  }

  // ─── Observe (ReAct step 1) ────────────────────────────────────

  async observe(ctx: AgentContext): Promise<Record<string, any>> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [salesData, expensesData, inventoryData] = await Promise.all([
      this.querySales(ctx.tenantId, ctx.storeId, 30),
      this.queryExpenses(ctx.tenantId, ctx.storeId, 30),
      this.queryInventory(ctx.tenantId, ctx.storeId),
    ]);

    // También obtenemos datos del mes actual completo
    const [revenueMonth, expensesMonth] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { tenantId: ctx.tenantId, storeId: ctx.storeId, status: 'completed', createdAt: { gte: monthStart } },
        _sum: { total: true },
      }),
      this.prisma.expense.aggregate({
        where: { tenantId: ctx.tenantId, storeId: ctx.storeId, isVoided: false, expenseDate: { gte: monthStart } },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenueMonth = Number(revenueMonth._sum.total || 0);
    const totalExpensesMonth = Number(expensesMonth._sum.amount || 0);
    const profitMonth = totalRevenueMonth - totalExpensesMonth;
    const marginMonth = totalRevenueMonth > 0 ? parseFloat(((profitMonth / totalRevenueMonth) * 100).toFixed(1)) : 0;

    // Gastos por categoría (últimos 30 días)
    const expensesByCategory = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: { tenantId: ctx.tenantId, storeId: ctx.storeId, isVoided: false, expenseDate: { gte: new Date(Date.now() - 30 * 86400000) } },
      _sum: { amount: true },
    });

    // Ventas de los últimos 7 días para tendencia reciente
    const last7Days = await this.prisma.sale.aggregate({
      where: { tenantId: ctx.tenantId, storeId: ctx.storeId, status: 'completed', createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      _sum: { total: true },
      _count: true,
    });

    return {
      periodo: {
        inicio: monthStart.toISOString().split('T')[0],
        fin: now.toISOString().split('T')[0],
      },
      ultimos_30_dias: {
        ingresos: salesData.totalRevenue,
        ventas_count: salesData.totalSales,
        ticket_promedio: salesData.avgTicket,
        gastos: expensesData.totalExpenses,
        gastos_count: expensesData.count,
        ganancia: salesData.totalRevenue - expensesData.totalExpenses,
        margen: salesData.totalRevenue > 0
          ? parseFloat((((salesData.totalRevenue - expensesData.totalExpenses) / salesData.totalRevenue) * 100).toFixed(1))
          : 0,
      },
      mes_actual: {
        ingresos: totalRevenueMonth,
        gastos: totalExpensesMonth,
        ganancia: profitMonth,
        margen: marginMonth,
      },
      ultimos_7_dias: {
        ingresos: Number(last7Days._sum.total || 0),
        ventas_count: last7Days._count,
        tendencia: 'reciente', // el LLM puede inferir tendencia comparando
      },
      gastos_por_categoria: expensesByCategory.map(e => ({
        categoria: e.categoryId,
        monto: Math.round(Number(e._sum.amount || 0)),
      })),
      inventario: {
        total_productos: inventoryData.totalProducts,
        valor_total: inventoryData.totalValue,
        productos_bajo_stock: inventoryData.lowStockCount,
        alertas: inventoryData.lowStockItems,
      },
    };
  }

  // ─── Execute Tool (ReAct step 3) ───────────────────────────────

  async executeTool(ctx: AgentContext, toolName: string, args: Record<string, any>): Promise<any> {
    // Primero delegar herramientas compartidas
    const sharedResult = await this.executeSharedTool(ctx, toolName, args);
    // Si executeSharedTool no reconoce la herramienta, devuelve { error: 'Unknown: ...' }
    if (sharedResult && typeof sharedResult === 'object' && !('error' in sharedResult)) {
      return sharedResult;
    }

    // Herramientas específicas del agente financiero
    switch (toolName) {
      case 'get_financial_summary': {
        const days = args.days || 30;
        const comparePrevious = args.compare_previous || false;

        const [sales, expenses] = await Promise.all([
          this.querySales(ctx.tenantId, ctx.storeId, days),
          this.queryExpenses(ctx.tenantId, ctx.storeId, days),
        ]);

        const profit = sales.totalRevenue - expenses.totalExpenses;
        const margin = sales.totalRevenue > 0 ? parseFloat(((profit / sales.totalRevenue) * 100).toFixed(1)) : 0;

        const result: any = {
          periodo_dias: days,
          ingresos: sales.totalRevenue,
          gastos: expenses.totalExpenses,
          ganancia: profit,
          margen_porcentaje: margin,
          ticket_promedio: sales.avgTicket,
          total_ventas: sales.totalSales,
        };

        if (comparePrevious) {
          const prevSales = await this.querySales(ctx.tenantId, ctx.storeId, days * 2);
          const prevExpenses = await this.queryExpenses(ctx.tenantId, ctx.storeId, days * 2);
          // Aproximar período anterior restando el actual del doble
          const prevRevenue = prevSales.totalRevenue - sales.totalRevenue;
          const prevExp = prevExpenses.totalExpenses - expenses.totalExpenses;
          const prevProfit = prevRevenue - prevExp;

          result.periodo_anterior = {
            ingresos: prevRevenue,
            gastos: prevExp,
            ganancia: prevProfit,
            variacion_ingresos_pct: prevRevenue > 0
              ? parseFloat((((sales.totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1))
              : null,
          };
        }

        return result;
      }

      case 'analyze_cashflow': {
        const days = args.days || 90;
        const granularity = args.granularity || 'week';
        const now = new Date();
        const since = new Date(now.getTime() - days * 86400000);

        // Ventas completadas en el período
        const sales = await this.prisma.sale.findMany({
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, status: 'completed', createdAt: { gte: since } },
          select: { total: true, createdAt: true },
        });

        // Gastos en el período
        const expenses = await this.prisma.expense.findMany({
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, isVoided: false, expenseDate: { gte: since } },
          select: { amount: true, expenseDate: true },
        });

        // Agrupar por período
        const buckets = new Map<string, { ingresos: number; gastos: number }>();
        const getKey = (d: Date): string => {
          if (granularity === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          // week: ISO week
          const startOfWeek = new Date(d);
          startOfWeek.setDate(d.getDate() - d.getDay());
          return startOfWeek.toISOString().split('T')[0];
        };

        for (const s of sales) {
          const key = getKey(new Date(s.createdAt));
          const b = buckets.get(key) || { ingresos: 0, gastos: 0 };
          b.ingresos += Number(s.total);
          buckets.set(key, b);
        }
        for (const e of expenses) {
          const key = getKey(new Date(e.expenseDate));
          const b = buckets.get(key) || { ingresos: 0, gastos: 0 };
          b.gastos += Number(e.amount);
          buckets.set(key, b);
        }

        const flujo = Array.from(buckets.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([periodo, data]) => ({
            periodo,
            ingresos: Math.round(data.ingresos),
            gastos: Math.round(data.gastos),
            saldo_neto: Math.round(data.ingresos - data.gastos),
          }));

        const saldoTotal = flujo.reduce((sum, f) => sum + f.saldo_neto, 0);
        const semanasPositivas = flujo.filter(f => f.saldo_neto > 0).length;

        return {
          granularidad: granularity,
          periodo_dias: days,
          total_periodos: flujo.length,
          saldo_neto_total: saldoTotal,
          periodos_positivos: semanasPositivas,
          periodos_negativos: flujo.length - semanasPositivas,
          tendencia: saldoTotal > 0 ? 'positiva' : saldoTotal < 0 ? 'negativa' : 'neutral',
          flujo,
        };
      }

      case 'detect_anomalies': {
        const days = args.days || 60;
        const threshold = args.threshold || 2.0;
        const since = new Date(Date.now() - days * 86400000);

        // Obtener gastos diarios
        const dailyExpenses = await this.prisma.expense.groupBy({
          by: ['expenseDate'],
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, isVoided: false, expenseDate: { gte: since } },
          _sum: { amount: true },
          _count: true,
        });

        const dailyRevenue = await this.prisma.sale.groupBy({
          by: ['createdAt'],
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, status: 'completed', createdAt: { gte: since } },
          _sum: { total: true },
        });

        // Calcular media y desviación para detectar anomalías (z-score simple)
        const calcStats = (values: number[]) => {
          const n = values.length;
          if (n < 5) return { mean: 0, std: 0 };
          const mean = values.reduce((s, v) => s + v, 0) / n;
          const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
          return { mean, std: Math.sqrt(variance) };
        };

        const gastosMontos = dailyExpenses.map(e => Number(e._sum.amount || 0));
        const ingresosMontos = dailyRevenue.map(r => Number(r._sum.total || 0));

        const gastosStats = calcStats(gastosMontos);
        const ingresosStats = calcStats(ingresosMontos);

        const anomalias: any[] = [];

        // Detectar gastos anómalos
        for (const e of dailyExpenses) {
          const monto = Number(e._sum.amount || 0);
          if (gastosStats.std > 0) {
            const z = Math.abs((monto - gastosStats.mean) / gastosStats.std);
            if (z > threshold) {
              anomalias.push({
                tipo: 'gasto_atipico',
                fecha: e.expenseDate.toISOString().split('T')[0],
                monto,
                z_score: parseFloat(z.toFixed(2)),
                comparacion_media: Math.round(gastosStats.mean),
              });
            }
          }
        }

        // Detectar caídas/picos de ingreso
        for (const r of dailyRevenue) {
          const monto = Number(r._sum.total || 0);
          if (ingresosStats.std > 0) {
            const z = Math.abs((monto - ingresosStats.mean) / ingresosStats.std);
            if (z > threshold) {
              anomalias.push({
                tipo: monto > ingresosStats.mean ? 'pico_ingreso' : 'caida_ingreso',
                fecha: r.createdAt.toISOString().split('T')[0],
                monto,
                z_score: parseFloat(z.toFixed(2)),
                comparacion_media: Math.round(ingresosStats.mean),
              });
            }
          }
        }

        // Ordenar por z-score descendente
        anomalias.sort((a, b) => b.z_score - a.z_score);

        return {
          periodo_dias: days,
          umbral: threshold,
          total_anomalias: anomalias.length,
          media_gasto_diario: Math.round(gastosStats.mean),
          media_ingreso_diario: Math.round(ingresosStats.mean),
          anomalias: anomalias.slice(0, 15), // top 15
        };
      }

      case 'suggest_budget': {
        const targetMargin = args.target_margin || 25;
        const monthsOfHistory = args.months_of_history || 3;
        const since = new Date(Date.now() - monthsOfHistory * 30 * 86400000);

        // Gastos históricos por categoría
        const expensesByCategory = await this.prisma.expense.groupBy({
          by: ['categoryId'],
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, isVoided: false, expenseDate: { gte: since } },
          _sum: { amount: true },
          _avg: { amount: true },
          _count: true,
        });

        // Ingreso promedio mensual
        const revenueMonthly = await this.prisma.sale.aggregate({
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, status: 'completed', createdAt: { gte: since } },
          _sum: { total: true },
        });
        const monthlyRevenue = Number(revenueMonthly._sum.total || 0) / monthsOfHistory;

        // Total gastos
        const totalExpenses = expensesByCategory.reduce((s, e) => s + Number(e._sum.amount || 0), 0);
        const monthlyExpenses = totalExpenses / monthsOfHistory;

        // Presupuesto sugerido: gasto máximo para alcanzar margen objetivo
        const maxExpensesForTarget = monthlyRevenue * (1 - targetMargin / 100);
        const adjustmentPct = monthlyExpenses > 0
          ? parseFloat((((maxExpensesForTarget - monthlyExpenses) / monthlyExpenses) * 100).toFixed(1))
          : 0;

        const categorias = expensesByCategory.map(e => {
          const avgMonthly = Number(e._sum.amount || 0) / monthsOfHistory;
          const proporcion = monthlyExpenses > 0 ? (avgMonthly / monthlyExpenses) * 100 : 0;
          const sugerido = maxExpensesForTarget * (proporcion / 100);
          return {
            categoria: e.categoryId,
            gasto_promedio_mensual: Math.round(avgMonthly),
            proporcion_pct: parseFloat(proporcion.toFixed(1)),
            presupuesto_sugerido: Math.round(sugerido),
            ajuste_pct: parseFloat((((sugerido - avgMonthly) / (avgMonthly || 1)) * 100).toFixed(1)),
          };
        });

        return {
          meses_historial: monthsOfHistory,
          margen_objetivo_pct: targetMargin,
          ingreso_promedio_mensual: Math.round(monthlyRevenue),
          gasto_promedio_mensual: Math.round(monthlyExpenses),
          gasto_maximo_para_margen: Math.round(maxExpensesForTarget),
          ajuste_total_pct: adjustmentPct,
          accion: adjustmentPct < 0 ? 'REDUCIR_GASTOS' : 'DENTRO_DEL_OBJETIVO',
          categorias,
        };
      }

      case 'forecast_profitability': {
        const daysAhead = args.days_ahead || 90;
        const includeSeasonality = args.include_seasonality !== false;
        const historyDays = Math.max(daysAhead, 90); // usar al menos 90 días de historia

        // Datos históricos diarios
        const since = new Date(Date.now() - historyDays * 86400000);
        const dailySales = await this.prisma.sale.groupBy({
          by: ['createdAt'],
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, status: 'completed', createdAt: { gte: since } },
          _sum: { total: true },
        });

        const dailyExpenses = await this.prisma.expense.groupBy({
          by: ['expenseDate'],
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, isVoided: false, expenseDate: { gte: since } },
          _sum: { amount: true },
        });

        // Promedio diario
        const totalRevenueHist = dailySales.reduce((s, d) => s + Number(d._sum.total || 0), 0);
        const totalExpensesHist = dailyExpenses.reduce((s, d) => s + Number(d._sum.amount || 0), 0);
        const daysWithSales = dailySales.length || 1;
        const avgDailyRevenue = totalRevenueHist / daysWithSales;
        const avgDailyExpenses = totalExpensesHist / daysWithSales;
        const avgDailyProfit = avgDailyRevenue - avgDailyExpenses;

        // Tendencia: comparar primera mitad vs segunda mitad del historial
        const mid = Math.floor(dailySales.length / 2);
        const firstHalf = dailySales.slice(0, mid).reduce((s, d) => s + Number(d._sum.total || 0), 0);
        const secondHalf = dailySales.slice(mid).reduce((s, d) => s + Number(d._sum.total || 0), 0);
        const trendFactor = firstHalf > 0 ? (secondHalf / firstHalf) : 1.0;

        // Proyección con escenarios
        const project = (factor: number) => {
          const dailyRev = avgDailyRevenue * factor;
          const dailyExp = avgDailyExpenses;
          const dailyProf = dailyRev - dailyExp;
          return {
            ingresos_proyectados: Math.round(dailyRev * daysAhead),
            gastos_proyectados: Math.round(dailyExp * daysAhead),
            ganancia_proyectada: Math.round(dailyProf * daysAhead),
            margen_proyectado: dailyRev > 0 ? parseFloat(((dailyProf / dailyRev) * 100).toFixed(1)) : 0,
          };
        };

        return {
          dias_proyectados: daysAhead,
          dias_historial: historyDays,
          promedio_diario_actual: {
            ingresos: Math.round(avgDailyRevenue),
            gastos: Math.round(avgDailyExpenses),
            ganancia: Math.round(avgDailyProfit),
          },
          tendencia_detectada: trendFactor > 1.05 ? 'crecimiento' : trendFactor < 0.95 ? 'decrecimiento' : 'estable',
          factor_tendencia: parseFloat(trendFactor.toFixed(2)),
          incluye_estacionalidad: includeSeasonality,
          escenarios: {
            optimista: project(Math.max(trendFactor, 1.0) * 1.15),
            realista: project(Math.max(trendFactor, 1.0)),
            conservador: project(Math.max(trendFactor, 1.0) * 0.85),
          },
        };
      }

      default:
        return { error: `Herramienta desconocida: ${toolName}` };
    }
  }
}
