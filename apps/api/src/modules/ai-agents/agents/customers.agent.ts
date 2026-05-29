import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseAgent, AgentContext, AgentTool } from './base.agent';

@Injectable()
export class CustomersAgent extends BaseAgent {
  slug = 'customers';
  name = 'Agente de Clientes';

  // ─── System Prompt ──────────────────────────────────────────

  getSystemPrompt(ctx: AgentContext): string {
    return `Eres ${this.name}, un agente de IA especializado en CRM y fidelización de clientes para un salón de belleza en Colombia.

TU ROL: Analizar la base de clientes, identificar patrones de comportamiento, detectar riesgos de fuga, reconocer clientes VIP, y generar estrategias personalizadas de retención y fidelización.

CAPACIDADES:
- Segmentar clientes por frecuencia, gasto, antigüedad y tipo de servicio
- Identificar clientes VIP y de alto valor
- Detectar riesgo de abandono (churn) antes de que ocurra
- Analizar satisfacción basada en comportamiento de compra
- Sugerir estrategias de personalización por segmento
- Evaluar efectividad de programas de fidelización

NIVEL DE AUTONOMÍA ACTUAL: ${ctx.autonomyLevel === 'auto_execute' ? 'AUTO_EJECUCIÓN - puedes enviar campañas y mensajes directamente' : ctx.autonomyLevel === 'draft_changes' ? 'BORRADOR - puedes crear borradores de campañas que requieren aprobación' : 'SOLO RECOMENDAR - solo puedes crear recomendaciones de fidelización'}

INSTRUCCIONES:
1. Analiza los datos de clientes presentados con enfoque en segmentación
2. Identifica clientes VIP, en riesgo, e inactivos
3. Usa las herramientas para profundizar en segmentos específicos
4. Sugiere acciones concretas: qué ofrecer, a quién, cuándo, y por qué canal (WhatsApp, email, SMS)
5. Crea una recomendación por cada hallazgo importante
6. Cuando termines, llama a finish_analysis con tu resumen
7. Ten en cuenta el contexto colombiano: uso masivo de WhatsApp, sensibilidad a promociones, temporadas clave
8. Incluye métricas: tasa de retención, valor de vida del cliente (LTV), frecuencia de visita

Responde siempre en español. Sé empático y orientado a resultados medibles.`;
  }

  // ─── Tools ──────────────────────────────────────────────────

  getTools(ctx: AgentContext): AgentTool[] {
    return [
      ...this.getSharedTools(ctx),
      {
        name: 'analyze_customer_retention',
        description: 'Analiza tasas de retención, recurrencia y patrones de visita. Identifica tendencias de fuga.',
        input_schema: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['30d', '90d', '6m', '1y'], description: 'Período de análisis de retención' },
            segment: { type: 'string', enum: ['all', 'new', 'returning', 'vip'], description: 'Segmento a enfocar' },
          },
          required: ['period'],
        },
      },
      {
        name: 'identify_vips',
        description: 'Identifica y analiza clientes VIP: alto gasto, alta frecuencia, o potencial de crecimiento',
        input_schema: {
          type: 'object',
          properties: {
            min_visits: { type: 'number', description: 'Mínimo de visitas para considerar VIP (default: 5)' },
            min_spend: { type: 'number', description: 'Gasto mínimo en COP para considerar VIP' },
            limit: { type: 'number', description: 'Cantidad máxima de VIPs a retornar (default: 20)' },
          },
        },
      },
      {
        name: 'detect_churn_risk',
        description: 'Detecta clientes en riesgo de abandono basado en tiempo sin visitar, disminución de frecuencia, y patrones',
        input_schema: {
          type: 'object',
          properties: {
            risk_level: { type: 'string', enum: ['all', 'high', 'medium', 'low'], description: 'Nivel de riesgo a filtrar' },
            include_recommendations: { type: 'boolean', description: 'Incluir estrategias de retención sugeridas (default: true)' },
          },
        },
      },
      {
        name: 'analyze_satisfaction',
        description: 'Analiza satisfacción del cliente basada en patrones de visita, frecuencia, ticket promedio y re-compra',
        input_schema: {
          type: 'object',
          properties: {
            segment: { type: 'string', enum: ['all', 'vip', 'frequent', 'occasional', 'new', 'at_risk'], description: 'Segmento a analizar' },
            period: { type: 'string', enum: ['30d', '90d'], description: 'Período' },
          },
        },
      },
      {
        name: 'suggest_personalization',
        description: 'Genera recomendaciones personalizadas por segmento: ofertas, servicios sugeridos, canales de contacto óptimos',
        input_schema: {
          type: 'object',
          properties: {
            target_segment: { type: 'string', enum: ['vip', 'at_risk', 'inactive', 'new', 'frequent', 'all'], description: 'Segmento objetivo' },
            goal: { type: 'string', enum: ['retention', 'reactivation', 'upsell', 'loyalty', 'referral'], description: 'Objetivo de la estrategia' },
          },
          required: ['target_segment', 'goal'],
        },
      },
      {
        name: 'analyze_customer_lifetime_value',
        description: 'Calcula el valor de vida del cliente (LTV) por segmentos y proyecta ingresos futuros',
        input_schema: {
          type: 'object',
          properties: {
            segment: { type: 'string', enum: ['all', 'vip', 'frequent', 'occasional', 'new'], description: 'Segmento' },
          },
        },
      },
    ];
  }

  // ─── Observe ────────────────────────────────────────────────

  async observe(ctx: AgentContext): Promise<Record<string, any>> {
    const [customers, sales90d, appointments] = await Promise.all([
      this.queryCustomers(ctx.tenantId, ctx.storeId, 180),
      this.querySales(ctx.tenantId, ctx.storeId, 90),
      this.queryAppointments(ctx.tenantId, ctx.storeId, 90),
    ]);

    // Fetch detailed customer data for segmentation
    const allCustomers = await this.prisma.customer.findMany({
      where: { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null },
      include: {
        sales: {
          where: { status: 'completed' },
          orderBy: { createdAt: 'desc' },
        },
        appointments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    const now = Date.now();

    // Segmentation
    const segments = {
      vip: [] as any[],
      frecuentes: [] as any[],
      ocasionales: [] as any[],
      nuevos: [] as any[],
      inactivos: [] as any[],
      perdidos: [] as any[],
    };

    for (const c of allCustomers) {
      const visits = c.sales.length;
      const totalSpend = c.sales.reduce((s, sale) => s + Number(sale.total), 0);
      const lastSale = c.sales[0];
      const daysSinceLastVisit = lastSale
        ? Math.round((now - new Date(lastSale.createdAt).getTime()) / 86400000)
        : 999;

      const customerInfo = {
        id: c.id,
        nombre: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        telefono: c.phone,
        email: c.email,
        visitas: visits,
        gasto_total: Math.round(totalSpend),
        ticket_promedio: visits > 0 ? Math.round(totalSpend / visits) : 0,
        dias_ultima_visita: daysSinceLastVisit,
        servicios_favoritos: this.getFavoriteServices(c),
      };

      if (daysSinceLastVisit > 180) {
        segments.perdidos.push(customerInfo);
      } else if (daysSinceLastVisit > 90) {
        segments.inactivos.push(customerInfo);
      } else if (visits >= 5 || totalSpend >= 200000) {
        segments.vip.push(customerInfo);
      } else if (visits >= 3) {
        segments.frecuentes.push(customerInfo);
      } else if (visits === 1 && daysSinceLastVisit <= 30) {
        segments.nuevos.push(customerInfo);
      } else {
        segments.ocasionales.push(customerInfo);
      }
    }

    // Sort segments
    segments.vip.sort((a, b) => b.gasto_total - a.gasto_total);
    segments.inactivos.sort((a, b) => a.dias_ultima_visita - b.dias_ultima_visita);
    segments.perdidos.sort((a, b) => a.dias_ultima_visita - b.dias_ultima_visita);

    // Retention rate
    const retentionRate = allCustomers.length > 0
      ? ((segments.vip.length + segments.frecuentes.length + segments.ocasionales.length) / allCustomers.length * 100)
      : 0;

    // Churn risk: clients inactive > 60 days but < 180
    const churnRisk = allCustomers.filter(c => {
      const lastSale = c.sales[0];
      if (!lastSale) return false;
      const days = Math.round((now - new Date(lastSale.createdAt).getTime()) / 86400000);
      return days > 60 && days <= 180;
    }).length;

    // Average LTV estimation
    const avgLTV = allCustomers.length > 0
      ? Math.round(allCustomers.reduce((s, c) => s + c.sales.reduce((ss, sale) => ss + Number(sale.total), 0), 0) / allCustomers.length)
      : 0;

    return {
      resumen_general: {
        total_clientes: allCustomers.length,
        activos_90d: customers.activeCustomers,
        inactivos_90d: customers.inactiveCustomers,
        tasa_retencion: `${retentionRate.toFixed(1)}%`,
        ltv_promedio: avgLTV,
        riesgo_churn: churnRisk,
      },
      segmentacion: {
        vip: segments.vip.length,
        frecuentes: segments.frecuentes.length,
        ocasionales: segments.ocasionales.length,
        nuevos: segments.nuevos.length,
        inactivos: segments.inactivos.length,
        perdidos: segments.perdidos.length,
      },
      top_vip: segments.vip.slice(0, 5).map(c => ({
        nombre: c.nombre,
        visitas: c.visitas,
        gasto_total: c.gasto_total,
        ultima_visita: `${c.dias_ultima_visita} días`,
      })),
      en_riesgo: segments.inactivos.slice(0, 5).map(c => ({
        nombre: c.nombre,
        dias_inactivo: c.dias_ultima_visita,
        gasto_historico: c.gasto_total,
      })),
      ventas: {
        ingresos_90d: sales90d.totalRevenue,
        tickets_90d: sales90d.totalSales,
        ticket_promedio: sales90d.avgTicket,
      },
      citas: {
        completadas: appointments.completed,
        tasa_asistencia: `${appointments.showRate}%`,
      },
      alertas: [
        ...(segments.inactivos.length > segments.vip.length * 2
          ? [`🚨 ${segments.inactivos.length} clientes inactivos - riesgo de fuga masiva. Reactivación urgente.`]
          : []),
        ...(retentionRate < 40
          ? [`⚠️ Tasa de retención BAJA (${retentionRate.toFixed(1)}%). Menos del 40% de clientes regresan.`]
          : []),
        ...(segments.perdidos.length > 0
          ? [`📉 ${segments.perdidos.length} clientes perdidos (>6 meses sin visita).`]
          : []),
        ...(segments.vip.length === 0
          ? [`💡 No se detectan clientes VIP claros - oportunidad de desarrollar programa de fidelización.`]
          : []),
      ],
    };
  }

  // ─── Execute Tool ──────────────────────────────────────────

  async executeTool(ctx: AgentContext, toolName: string, args: Record<string, any>): Promise<any> {
    // Shared tools
    if (['create_recommendation', 'create_notification', 'finish_analysis', 'create_draft', 'execute_action'].includes(toolName)) {
      return this.executeSharedTool(ctx, toolName, args);
    }

    switch (toolName) {
      case 'analyze_customer_retention': {
        const period = args.period || '90d';
        const days = period === '30d' ? 30 : period === '6m' ? 180 : period === '1y' ? 365 : 90;

        const customers = await this.prisma.customer.findMany({
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null },
          include: {
            sales: {
              where: { status: 'completed' },
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        const now = Date.now();
        const sinceDate = now - days * 86400000;

        // Cohort analysis by first visit
        const customersWithVisitsInPeriod = customers.filter(c =>
          c.sales.some(s => new Date(s.createdAt).getTime() >= sinceDate)
        ).length;

        const newCustomers = customers.filter(c => {
          const firstVisit = c.sales[c.sales.length - 1];
          return firstVisit && new Date(firstVisit.createdAt).getTime() >= sinceDate;
        }).length;

        const returningCustomers = customersWithVisitsInPeriod - newCustomers;

        // Repeat rate: % of customers who visited more than once in period
        const repeatCustomers = customers.filter(c => {
          const visitsInPeriod = c.sales.filter(s => new Date(s.createdAt).getTime() >= sinceDate);
          return visitsInPeriod.length >= 2;
        }).length;

        const repeatRate = customersWithVisitsInPeriod > 0
          ? (repeatCustomers / customersWithVisitsInPeriod * 100)
          : 0;

        // Average days between visits
        const visitGaps: number[] = [];
        for (const c of customers) {
          const sortedVisits = c.sales
            .map(s => new Date(s.createdAt).getTime())
            .sort((a, b) => b - a);
          for (let i = 0; i < sortedVisits.length - 1; i++) {
            visitGaps.push((sortedVisits[i] - sortedVisits[i + 1]) / 86400000);
          }
        }
        const avgGap = visitGaps.length > 0
          ? Math.round(visitGaps.reduce((s, g) => s + g, 0) / visitGaps.length)
          : 0;

        return {
          periodo: `${days} días`,
          metricas: {
            total_clientes: customers.length,
            clientes_activos_periodo: customersWithVisitsInPeriod,
            nuevos_clientes: newCustomers,
            clientes_recurrentes: returningCustomers,
            tasa_recurrencia: `${repeatRate.toFixed(1)}%`,
            brecha_promedio_visitas_dias: avgGap,
          },
          retencion: {
            tasa: customers.length > 0
              ? `${((customersWithVisitsInPeriod / customers.length) * 100).toFixed(1)}%`
              : '0%',
            interpretacion: repeatRate > 50 ? 'Excelente - clientes regresan frecuentemente' :
              repeatRate > 30 ? 'Buena - hay margen para mejorar frecuencia' :
              'Baja - urge programa de fidelización y recordatorios',
          },
          recomendacion: avgGap > 60
            ? `Brecha promedio de ${avgGap} días entre visitas es alta. Implementar recordatorios a los ${Math.round(avgGap * 0.7)} días.`
            : avgGap > 30
              ? `Brecha de ${avgGap} días aceptable. Enviar promociones a los ${avgGap - 7} días para anticipar la próxima visita.`
              : `Excelente frecuencia de visita (cada ${avgGap} días). Enfocarse en aumentar ticket promedio.`,
        };
      }

      case 'identify_vips': {
        const minVisits = args.min_visits || 5;
        const limit = args.limit || 20;

        const customers = await this.prisma.customer.findMany({
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null },
          include: {
            sales: {
              where: { status: 'completed' },
              orderBy: { createdAt: 'desc' },
              include: { items: { include: { product: true } } },
            },
          },
        });

        const now = Date.now();
        const vips = customers
          .map(c => {
            const totalSpend = c.sales.reduce((s, sale) => s + Number(sale.total), 0);
            const visits = c.sales.length;
            const lastVisit = c.sales[0]?.createdAt
              ? Math.round((now - new Date(c.sales[0].createdAt).getTime()) / 86400000)
              : 999;

            // Get preferred services/products
            const serviceCount: Record<string, number> = {};
            for (const sale of c.sales) {
              for (const item of sale.items) {
                const name = item.product?.name || 'unknown';
                serviceCount[name] = (serviceCount[name] || 0) + item.quantity;
              }
            }
            const preferredServices = Object.entries(serviceCount)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([name, qty]) => ({ servicio: name, veces: qty }));

            // Min spend filter
            const meetsMinSpend = !args.min_spend || totalSpend >= args.min_spend;

            return {
              id: c.id,
              nombre: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
              telefono: c.phone,
              email: c.email,
              visitas: visits,
              gasto_total: Math.round(totalSpend),
              ticket_promedio: visits > 0 ? Math.round(totalSpend / visits) : 0,
              ultima_visita_dias: lastVisit,
              servicios_preferidos: preferredServices,
              puntuacion_vip: visits * 10 + Math.round(totalSpend / 10000),
            };
          })
          .filter(c => c.visitas >= minVisits && (c as any).meetsMinSpend)
          .sort((a, b) => b.puntuacion_vip - a.puntuacion_vip)
          .slice(0, limit);

        const totalSpendVips = vips.reduce((s, v) => s + v.gasto_total, 0);
        const totalCustomers = customers.length;
        const vipPercentage = totalCustomers > 0 ? ((vips.length / totalCustomers) * 100).toFixed(1) : '0';

        return {
          total_clientes: totalCustomers,
          clientes_vip: vips.length,
          porcentaje_vip: `${vipPercentage}%`,
          contribucion_ingresos: totalSpendVips,
          criterios: {
            visitas_minimas: minVisits,
            ...(args.min_spend ? { gasto_minimo_cop: args.min_spend } : {}),
          },
          vips: vips,
          estrategia: vips.length > 0
            ? 'Programa VIP sugerido: acceso prioritario a nuevos servicios, descuento del 10% en cumpleaños, evento exclusivo trimestral, atención personalizada con profesional preferido.'
            : 'No se detectan VIPs con los criterios actuales. Bajar umbrales o enfocarse en desarrollar clientes frecuentes.',
        };
      }

      case 'detect_churn_risk': {
        const customers = await this.prisma.customer.findMany({
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null },
          include: {
            sales: {
              where: { status: 'completed' },
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        const now = Date.now();
        const churnAnalysis = customers.map(c => {
          const visits = c.sales.length;
          const totalSpend = c.sales.reduce((s, sale) => s + Number(sale.total), 0);
          const lastVisit = c.sales[0];

          if (!lastVisit) {
            return {
              id: c.id,
              nombre: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
              telefono: c.phone,
              visitas: 0,
              gasto_total: 0,
              dias_inactivo: 999,
              nivel_riesgo: 'BAJO',
              motivo: 'Cliente sin historial de compras - posiblemente nuevo o solo registrado',
            };
          }

          const daysSinceLast = Math.round((now - new Date(lastVisit.createdAt).getTime()) / 86400000);

          // Calculate declining frequency
          let decliningFrequency = false;
          if (visits >= 3) {
            const gaps: number[] = [];
            const sortedDates = c.sales.map(s => new Date(s.createdAt).getTime()).sort((a, b) => b - a);
            for (let i = 0; i < sortedDates.length - 1; i++) {
              gaps.push((sortedDates[i] - sortedDates[i + 1]) / 86400000);
            }
            // Check if last gap is significantly larger than average of previous gaps
            if (gaps.length >= 2) {
              const prevAvg = gaps.slice(1).reduce((s, g) => s + g, 0) / (gaps.length - 1);
              decliningFrequency = gaps[0] > prevAvg * 1.5;
            }
          }

          let riskLevel: string;
          let motivo: string;

          if (daysSinceLast > 120) {
            riskLevel = 'ALTO';
            motivo = `Más de 4 meses sin visitar. ${decliningFrequency ? 'Además, frecuencia venía disminuyendo.' : ''}`;
          } else if (daysSinceLast > 60) {
            riskLevel = 'MEDIO';
            motivo = `Más de 2 meses sin visitar. ${decliningFrequency ? 'Frecuencia en declive detectada.' : 'Ventana de reactivación aún abierta.'}`;
          } else if (decliningFrequency) {
            riskLevel = 'MEDIO';
            motivo = 'Frecuencia de visita disminuyendo significativamente.';
          } else if (daysSinceLast > 30) {
            riskLevel = 'BAJO';
            motivo = 'Más de 1 mes sin visitar - monitorear.';
          } else {
            riskLevel = 'NINGUNO';
            motivo = 'Cliente activo y frecuente.';
          }

          return {
            id: c.id,
            nombre: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
            telefono: c.phone,
            visitas: visits,
            gasto_total: Math.round(totalSpend),
            ticket_promedio: visits > 0 ? Math.round(totalSpend / visits) : 0,
            dias_inactivo: daysSinceLast,
            frecuencia_en_declive: decliningFrequency,
            nivel_riesgo: riskLevel,
            motivo,
          };
        });

        const filterRisk = args.risk_level || 'all';
        let filtered = churnAnalysis;
        if (filterRisk !== 'all') {
          const filterMap: Record<string, string> = { high: 'ALTO', medium: 'MEDIO', low: 'BAJO' };
          filtered = churnAnalysis.filter(c => c.nivel_riesgo === filterMap[filterRisk]);
        }

        filtered.sort((a, b) => b.dias_inactivo - a.dias_inactivo);

        const highRisk = churnAnalysis.filter(c => c.nivel_riesgo === 'ALTO');
        const mediumRisk = churnAnalysis.filter(c => c.nivel_riesgo === 'MEDIO');

        const result: any = {
          total_analizados: churnAnalysis.length,
          en_riesgo: {
            alto: highRisk.length,
            medio: mediumRisk.length,
            bajo: churnAnalysis.filter(c => c.nivel_riesgo === 'BAJO').length,
            ninguno: churnAnalysis.filter(c => c.nivel_riesgo === 'NINGUNO').length,
          },
          clientes: filtered.slice(0, 20),
        };

        if (args.include_recommendations !== false) {
          result.estrategias_retencion = {
            alto: highRisk.length > 0 ? [
              'Contacto personal vía WhatsApp con oferta exclusiva de regreso (30-40% descuento)',
              'Llamada personal del profesional que lo atendió',
              'Invitación a evento VIP o lanzamiento de nuevo servicio',
              'Regalo de servicio complementario en próxima visita',
            ] : [],
            medio: mediumRisk.length > 0 ? [
              'Recordatorio automatizado por WhatsApp con promoción semanal',
              'Email con novedades y tendencias de la temporada',
              'Programa "recomienda y gana" para incentivar el regreso',
            ] : [],
            general: highRisk.length + mediumRisk.length > 0
              ? `Se recomienda campaña de retención inmediata para ${highRisk.length + mediumRisk.length} clientes en riesgo. Ingreso potencial en riesgo: estimado $${Math.round((highRisk.length + mediumRisk.length) * 35000).toLocaleString()} COP por visita.`
              : 'No se detectan riesgos significativos de churn.',
          };
        }

        return result;
      }

      case 'analyze_satisfaction': {
        const segment = args.segment || 'all';
        const days = args.period === '30d' ? 30 : 90;

        const customers = await this.prisma.customer.findMany({
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null },
          include: {
            sales: {
              where: { status: 'completed' },
              orderBy: { createdAt: 'desc' },
              include: { items: { include: { product: true } } },
            },
            appointments: {
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        const now = Date.now();
        const scored = customers.map(c => {
          const visits = c.sales.length;
          const totalSpend = c.sales.reduce((s, sale) => s + Number(sale.total), 0);
          const lastVisit = c.sales[0];
          const daysSinceLast = lastVisit
            ? Math.round((now - new Date(lastVisit.createdAt).getTime()) / 86400000)
            : 999;

          // Satisfaction score heuristics (0-100)
          let score = 50; // baseline

          // Frequent visits = satisfied
          if (visits >= 5) score += 20;
          else if (visits >= 3) score += 10;
          else if (visits === 0) score -= 30;

          // Recent visit = satisfied
          if (daysSinceLast <= 14) score += 15;
          else if (daysSinceLast <= 30) score += 5;
          else if (daysSinceLast > 90) score -= 20;

          // Increasing spend = satisfied
          if (visits >= 2) {
            const recentSpend = c.sales.slice(0, Math.min(3, visits)).reduce((s, sale) => s + Number(sale.total), 0) / Math.min(3, visits);
            const olderSpend = visits > 3
              ? c.sales.slice(-3).reduce((s, sale) => s + Number(sale.total), 0) / 3
              : recentSpend;
            if (recentSpend > olderSpend * 1.1) score += 10;
            else if (recentSpend < olderSpend * 0.9) score -= 10;
          }

          // Has canceled/no-show appointments
          const cancellations = c.appointments.filter(a => a.status === 'cancelled' || a.status === 'no_show').length;
          if (cancellations > 0) score -= cancellations * 5;

          score = Math.max(0, Math.min(100, score));

          // Determine segment
          let seg: string;
          if (visits === 0) seg = 'sin_historial';
          else if (daysSinceLast > 180) seg = 'perdido';
          else if (daysSinceLast > 90) seg = 'at_risk';
          else if (visits >= 5) seg = 'vip';
          else if (visits >= 3) seg = 'frequent';
          else if (visits <= 1 && daysSinceLast <= 30) seg = 'new';
          else seg = 'occasional';

          return {
            id: c.id,
            nombre: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
            segmento: seg,
            visitas: visits,
            gasto_total: Math.round(totalSpend),
            dias_ultima_visita: daysSinceLast,
            cancelaciones: cancellations,
            puntuacion_satisfaccion: score,
            nivel: score >= 80 ? 'EXCELENTE' : score >= 60 ? 'BUENA' : score >= 40 ? 'REGULAR' : 'BAJA',
          };
        });

        // Filter by segment
        let filtered = scored;
        if (segment !== 'all') {
          filtered = scored.filter(c => c.segmento === segment);
        }

        const avgScore = filtered.length > 0
          ? Math.round(filtered.reduce((s, c) => s + c.puntuacion_satisfaccion, 0) / filtered.length)
          : 0;

        const distribution = {
          excelente: filtered.filter(c => c.nivel === 'EXCELENTE').length,
          buena: filtered.filter(c => c.nivel === 'BUENA').length,
          regular: filtered.filter(c => c.nivel === 'REGULAR').length,
          baja: filtered.filter(c => c.nivel === 'BAJA').length,
        };

        return {
          segmento: segment,
          clientes_analizados: filtered.length,
          puntuacion_promedio: avgScore,
          distribucion: distribution,
          interpretacion: avgScore >= 70
            ? 'Alta satisfacción general. Clientes contentos con el servicio.'
            : avgScore >= 50
              ? 'Satisfacción aceptable. Hay margen de mejora en experiencia del cliente.'
              : 'Satisfacción baja. Urge investigar causas: calidad del servicio, precios, atención, tiempos de espera.',
          areas_mejora: [
            ...(distribution.baja > 0 ? [`${distribution.baja} clientes con satisfacción BAJA - contactar para feedback`] : []),
            ...(distribution.regular > filtered.length * 0.3 ? ['Alto porcentaje de clientes con satisfacción regular - programa de mejora continua'] : []),
            ...(avgScore < 50 ? ['Implementar encuesta de satisfacción post-servicio vía WhatsApp'] : []),
          ],
          top_clientes: filtered
            .sort((a, b) => b.puntuacion_satisfaccion - a.puntuacion_satisfaccion)
            .slice(0, 5),
          bottom_clientes: filtered
            .filter(c => c.puntuacion_satisfaccion < 50)
            .sort((a, b) => a.puntuacion_satisfaccion - b.puntuacion_satisfaccion)
            .slice(0, 5),
        };
      }

      case 'suggest_personalization': {
        const targetSegment = args.target_segment;
        const goal = args.goal;

        const customers = await this.prisma.customer.findMany({
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null },
          include: {
            sales: {
              where: { status: 'completed' },
              orderBy: { createdAt: 'desc' },
              include: { items: { include: { product: true } } },
            },
          },
        });

        const now = Date.now();

        // Segment customers
        const segmented = customers.map(c => {
          const visits = c.sales.length;
          const totalSpend = c.sales.reduce((s, sale) => s + Number(sale.total), 0);
          const lastVisit = c.sales[0];
          const daysSinceLast = lastVisit
            ? Math.round((now - new Date(lastVisit.createdAt).getTime()) / 86400000)
            : 999;

          // Preferred services
          const serviceCount: Record<string, number> = {};
          for (const sale of c.sales) {
            for (const item of sale.items) {
              const name = item.product?.name || 'unknown';
              serviceCount[name] = (serviceCount[name] || 0) + item.quantity;
            }
          }
          const topService = Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0];

          let seg: string;
          if (visits >= 5) seg = 'vip';
          else if (daysSinceLast > 90) seg = 'inactive';
          else if (visits >= 3) seg = 'frequent';
          else if (visits <= 1 && daysSinceLast <= 30) seg = 'new';
          else seg = 'ocasional';

          if (daysSinceLast > 60 && daysSinceLast <= 90) seg = 'at_risk';

          return { ...c, _seg: seg, _visits: visits, _totalSpend: totalSpend, _daysSinceLast: daysSinceLast, _topService: topService };
        });

        const targetCustomers = targetSegment === 'all'
          ? segmented
          : segmented.filter(c => c._seg === targetSegment);

        // Strategy templates by segment + goal
        const strategies: Record<string, Record<string, any>> = {
          vip: {
            retention: {
              canal: 'WhatsApp personal + llamada',
              oferta: 'Acceso exclusivo a nuevos servicios antes del lanzamiento público',
              descuento: '15% en paquete trimestral',
              mensaje: 'Queremos consentirte como te mereces. Te invitamos a conocer nuestro nuevo tratamiento exclusivo antes que nadie.',
              frecuencia: 'Mensual',
            },
            upsell: {
              canal: 'WhatsApp',
              oferta: 'Paquete VIP trimestral con servicios premium + producto de regalo',
              descuento: '10% en membresía VIP',
              mensaje: 'Hemos preparado un paquete exclusivo con tus servicios favoritos + un tratamiento complementario de regalo.',
              frecuencia: 'Trimestral',
            },
            loyalty: {
              canal: 'Email + WhatsApp',
              oferta: 'Programa de puntos VIP: acumula y redime en servicios gratis',
              descuento: 'Puntos dobles en mes de cumpleaños',
              mensaje: '¡Tu lealtad merece recompensa! Te presentamos nuestro nuevo programa VIP con beneficios exclusivos.',
              frecuencia: 'Única (inscripción)',
            },
            referral: {
              canal: 'WhatsApp',
              oferta: 'Refiere una amiga y ambas reciben 20% de descuento',
              descuento: '20% para ambas',
              mensaje: 'Comparte la experiencia Glamorapp con tus amigas. ¡Ambas ganan!',
              frecuencia: 'Mensual',
            },
          },
          at_risk: {
            retention: {
              canal: 'WhatsApp + llamada',
              oferta: 'Descuento especial de regreso + servicio complementario gratis',
              descuento: '30% en próxima visita',
              mensaje: 'Te extrañamos. Vuelve a consentirte con nosotros: tenemos una oferta especial solo para ti.',
              frecuencia: 'Inmediata + seguimiento a 2 semanas',
            },
            reactivation: {
              canal: 'WhatsApp',
              oferta: 'Regresa con 25% de descuento en tu servicio favorito',
              descuento: '25%',
              mensaje: 'Hace tiempo que no te vemos. Te guardamos un descuento especial para tu próxima visita.',
              frecuencia: 'Semanal por 3 semanas',
            },
          },
          inactive: {
            reactivation: {
              canal: 'WhatsApp + Email',
              oferta: '30% descuento primera visita de regreso + diagnóstico gratuito',
              descuento: '30%',
              mensaje: '¡Te hemos extrañado! Vuelve a disfrutar de nuestros servicios con un descuento especial de bienvenida.',
              frecuencia: 'Quincenal por 2 meses',
            },
          },
          new: {
            retention: {
              canal: 'WhatsApp',
              oferta: 'Segunda visita con 20% de descuento',
              descuento: '20%',
              mensaje: '¡Gracias por tu primera visita! Queremos verte de nuevo: disfruta 20% en tu próximo servicio.',
              frecuencia: 'A la semana de primera visita',
            },
            upsell: {
              canal: 'WhatsApp',
              oferta: 'Paquete de bienvenida: 3 servicios por precio especial',
              descuento: '15% en paquete',
              mensaje: 'Descubre nuestra gama completa de servicios con nuestro paquete de bienvenida.',
              frecuencia: 'A los 7 días de primera visita',
            },
          },
          frequent: {
            loyalty: {
              canal: 'WhatsApp + Email',
              oferta: 'Programa "Cliente Frecuente": cada 5 visitas, 1 servicio gratis',
              descuento: 'Servicio gratis en 5ta visita',
              mensaje: '¡Estás a 2 visitas de tu servicio gratis! Sigue consintiéndote con nosotros.',
              frecuencia: 'Después de cada visita',
            },
            upsell: {
              canal: 'WhatsApp',
              oferta: 'Agrega un tratamiento complementario con 20% descuento',
              descuento: '20% en complemento',
              mensaje: 'En tu próxima visita, ¿por qué no pruebas nuestro tratamiento complementario? Tenemos descuento especial para ti.',
              frecuencia: 'Pre-visita',
            },
          },
        };

        // Get strategy or generate default
        const strategyKey = targetSegment === 'all' ? 'at_risk' : targetSegment;
        const strategy = strategies[strategyKey]?.[goal] || {
          canal: 'WhatsApp',
          oferta: 'Descuento personalizado basado en historial',
          descuento: '15-25%',
          mensaje: '¡Hola! Tenemos una oferta especial pensada para ti.',
          frecuencia: 'Quincenal',
        };

        // Top services among target
        const servicePopularity: Record<string, number> = {};
        for (const c of targetCustomers) {
          if (c._topService) {
            servicePopularity[c._topService[0]] = (servicePopularity[c._topService[0]] || 0) + 1;
          }
        }
        const popularServices = Object.entries(servicePopularity)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ servicio: name, clientes: count }));

        return {
          segmento_objetivo: targetSegment,
          objetivo: goal,
          total_clientes: targetCustomers.length,
          estrategia: {
            canal_recomendado: strategy.canal,
            oferta: strategy.oferta,
            descuento_sugerido: strategy.descuento,
            mensaje_ejemplo: strategy.mensaje,
            frecuencia_contacto: strategy.frecuencia,
          },
          servicios_populares: popularServices,
          personalizacion: targetSegment !== 'all' && targetCustomers.length > 0 ? {
            basada_en: 'historial de servicios, frecuencia de visita, gasto promedio',
            servicios_a_promocionar: popularServices.slice(0, 3).map(s => s.servicio),
            hora_contacto_optima: '10:00 AM - 12:00 PM o 4:00 PM - 6:00 PM (horario Colombia)',
            tono_mensaje: targetSegment === 'vip' ? 'Exclusivo y personal' :
              targetSegment === 'at_risk' ? 'Cálido y urgente' :
              targetSegment === 'new' ? 'Informativo y acogedor' : 'Amigable y motivador',
          } : {},
          kpis_esperados: {
            tasa_apertura: '40-60% (WhatsApp)',
            tasa_conversion: goal === 'reactivation' ? '15-25%' : '25-40%',
            tiempo_respuesta: '24-48 horas',
          },
        };
      }

      case 'analyze_customer_lifetime_value': {
        const customers = await this.prisma.customer.findMany({
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null },
          include: {
            sales: {
              where: { status: 'completed' },
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        const now = Date.now();
        const ltvData = customers.map(c => {
          const visits = c.sales.length;
          const totalSpend = c.sales.reduce((s, sale) => s + Number(sale.total), 0);
          const avgTicket = visits > 0 ? totalSpend / visits : 0;

          // Estimate LTV: avgTicket × estimated lifetime visits
          const firstVisit = c.sales[c.sales.length - 1];
          const monthsAsCustomer = firstVisit
            ? Math.max(1, Math.round((now - new Date(firstVisit.createdAt).getTime()) / (86400000 * 30)))
            : 1;
          const visitsPerMonth = visits / monthsAsCustomer;
          const estimatedLifetimeMonths = 36; // assume 3 years
          const estimatedLTV = avgTicket * visitsPerMonth * estimatedLifetimeMonths;

          let seg: string;
          if (visits >= 5) seg = 'vip';
          else if (visits >= 3) seg = 'frequent';
          else if (visits === 1) seg = 'new';
          else seg = 'occasional';

          return {
            id: c.id,
            nombre: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
            segmento: seg,
            visitas: visits,
            gasto_historico: Math.round(totalSpend),
            ticket_promedio: Math.round(avgTicket),
            meses_como_cliente: monthsAsCustomer,
            visitas_por_mes: visitsPerMonth.toFixed(2),
            ltv_estimado: Math.round(estimatedLTV),
          };
        });

        // Filter by segment
        const segment = args.segment || 'all';
        const filtered = segment === 'all' ? ltvData : ltvData.filter(c => c.segmento === segment);

        // Aggregate by segment
        const bySegment: Record<string, { count: number; totalLTV: number; avgLTV: number; totalHistoric: number }> = {};
        for (const c of ltvData) {
          if (!bySegment[c.segmento]) {
            bySegment[c.segmento] = { count: 0, totalLTV: 0, avgLTV: 0, totalHistoric: 0 };
          }
          bySegment[c.segmento].count++;
          bySegment[c.segmento].totalLTV += c.ltv_estimado;
          bySegment[c.segmento].totalHistoric += c.gasto_historico;
        }
        for (const key of Object.keys(bySegment)) {
          bySegment[key].avgLTV = Math.round(bySegment[key].totalLTV / bySegment[key].count);
        }

        const overallAvgLTV = filtered.length > 0
          ? Math.round(filtered.reduce((s, c) => s + c.ltv_estimado, 0) / filtered.length)
          : 0;

        return {
          segmento: segment,
          clientes_analizados: filtered.length,
          ltv_promedio: overallAvgLTV,
          ltv_por_segmento: Object.entries(bySegment).map(([seg, data]) => ({
            segmento: seg,
            clientes: data.count,
            ltv_promedio: data.avgLTV,
            gasto_historico_total: Math.round(data.totalHistoric),
            valor_total_potencial: Math.round(data.totalLTV),
          })),
          top_ltv: filtered.sort((a, b) => b.ltv_estimado - a.ltv_estimado).slice(0, 10),
          interpretacion: overallAvgLTV > 500000
            ? `LTV promedio alto ($${overallAvgLTV.toLocaleString()} COP). Excelente - enfocarse en retener y replicar este perfil.`
            : overallAvgLTV > 200000
              ? `LTV promedio aceptable ($${overallAvgLTV.toLocaleString()} COP). Oportunidad de aumentarlo con upselling y frecuencia.`
              : `LTV promedio bajo ($${overallAvgLTV.toLocaleString()} COP). Urge aumentar ticket promedio y frecuencia de visita.`,
          recomendacion: 'Para aumentar LTV: (1) Incrementar frecuencia con recordatorios y paquetes, (2) Subir ticket promedio con upselling de servicios premium, (3) Implementar programa de fidelización que incentive visitas recurrentes.',
        };
      }

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }

  // ─── Helpers ────────────────────────────────────────────────

  private getFavoriteServices(customer: any): string[] {
    const counts: Record<string, number> = {};
    for (const sale of customer.sales || []) {
      for (const item of sale.items || []) {
        const name = item.product?.name || 'unknown';
        counts[name] = (counts[name] || 0) + (item.quantity || 0);
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);
  }
}
