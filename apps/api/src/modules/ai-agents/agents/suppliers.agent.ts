import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseAgent, AgentContext, AgentTool } from './base.agent';

@Injectable()
export class SuppliersAgent extends BaseAgent {
  slug = 'suppliers';
  name = 'Agente de Proveedores';

  constructor(prisma: PrismaService, configService: ConfigService) {
    super(prisma, configService);
  }

  // ─── System Prompt (español Colombia) ──────────────────────────

  getSystemPrompt(_ctx: AgentContext): string {
    return `Eres un Agente de Gestión de Proveedores para un salón de belleza en Colombia.
Tu objetivo es analizar el desempeño de proveedores, detectar dependencias, comparar precios y sugerir negociaciones.

REGLAS:
- Responde SIEMPRE en español (Colombia).
- Usa COP ($) como moneda.
- Piensa paso a paso: OBSERVA los datos → USA herramientas para profundizar → GENERA recomendaciones.
- Evalúa proveedores por: calidad, precio, puntualidad, frecuencia y confiabilidad.
- Prioriza hallazgos que reduzcan costos o mejoren la cadena de suministro.
- Cuando termines, llama a finish_analysis con un resumen ejecutivo.

HERRAMIENTAS DISPONIBLES:
- analyze_supplier_performance: Evalúa desempeño de proveedores con métricas clave.
- compare_prices: Compara precios entre proveedores para productos similares.
- detect_dependencies: Detecta dependencia excesiva de un solo proveedor.
- suggest_negotiation: Sugiere estrategias de negociación basadas en historial.
- evaluate_quality: Evalúa calidad del proveedor (devoluciones, incidencias, calificaciones).`;
  }

  // ─── Tools ─────────────────────────────────────────────────────

  getTools(ctx: AgentContext): AgentTool[] {
    const specificTools: AgentTool[] = [
      {
        name: 'analyze_supplier_performance',
        description: 'Analiza el desempeño de todos los proveedores: volumen de compras, frecuencia, puntualidad de pagos, días desde última compra, y score compuesto.',
        input_schema: {
          type: 'object',
          properties: {
            days: { type: 'number', description: 'Días de historial a analizar (default: 180)' },
            supplier_id: { type: 'string', description: 'ID de proveedor específico (opcional, si no se pasa analiza todos)' },
          },
        },
      },
      {
        name: 'compare_prices',
        description: 'Compara precios de productos entre proveedores para identificar oportunidades de ahorro. Muestra diferencia porcentual y proveedor más económico.',
        input_schema: {
          type: 'object',
          properties: {
            product_name: { type: 'string', description: 'Nombre o parte del nombre del producto a comparar (opcional, vacío = todos)' },
            max_price_diff_pct: { type: 'number', description: 'Solo mostrar diferencias mayores a este % (default: 5)' },
          },
        },
      },
      {
        name: 'detect_dependencies',
        description: 'Detecta dependencia excesiva de proveedores: concentración de compras, productos sin alternativa de proveedor, riesgo de desabastecimiento.',
        input_schema: {
          type: 'object',
          properties: {
            dependency_threshold_pct: { type: 'number', description: 'Umbral de % de compras a un solo proveedor para alertar (default: 60)' },
            days: { type: 'number', description: 'Período de análisis en días (default: 180)' },
          },
        },
      },
      {
        name: 'suggest_negotiation',
        description: 'Genera estrategias de negociación basadas en historial de compras, frecuencia, volumen y relación con cada proveedor. Sugiere descuentos por volumen, plazos de pago, consolidación.',
        input_schema: {
          type: 'object',
          properties: {
            supplier_id: { type: 'string', description: 'ID del proveedor objetivo (opcional, todos si no se especifica)' },
            target_savings_pct: { type: 'number', description: 'Porcentaje de ahorro objetivo (default: 10)' },
          },
        },
      },
      {
        name: 'evaluate_quality',
        description: 'Evalúa calidad del proveedor con base en: productos defectuosos, devoluciones, quejas, consistencia de entregas y calificaciones si existen.',
        input_schema: {
          type: 'object',
          properties: {
            supplier_id: { type: 'string', description: 'ID del proveedor a evaluar (opcional, evalúa todos si no se pasa)' },
            days: { type: 'number', description: 'Período de evaluación en días (default: 365)' },
          },
        },
      },
    ];

    return [...this.getSharedTools(ctx), ...specificTools];
  }

  // ─── Observe (ReAct step 1) ────────────────────────────────────

  async observe(ctx: AgentContext): Promise<Record<string, any>> {
    const days = 180;
    const since = new Date(Date.now() - days * 86400000);

    // Proveedores activos
    const suppliers = await this.prisma.supplier.findMany({
      where: { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null },
      include: {
        purchases: {
          where: { createdAt: { gte: since } },
          select: { total: true, createdAt: true, paymentStatus: true },
        },
      },
    });

    const suppliersData = suppliers.map(s => {
      const purchases = s.purchases || [];
      const totalCompras = purchases.reduce((sum, p) => sum + Number(p.total), 0);
      const pendientes = purchases.filter(p => p.paymentStatus === 'pending');
      const totalPendiente = pendientes.reduce((sum, p) => sum + Number(p.total), 0);
      const ultimaCompra = purchases.length > 0
        ? purchases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
        : null;
      const diasDesdeUltima = ultimaCompra
        ? Math.floor((Date.now() - new Date(ultimaCompra).getTime()) / 86400000)
        : null;

      return {
        id: s.id,
        nombre: s.businessName,
        contacto: s.contactName || 'N/D',
        telefono: s.phone || 'N/D',
        email: s.email || 'N/D',
        total_compras: Math.round(totalCompras),
        cantidad_compras: purchases.length,
        total_pendiente: Math.round(totalPendiente),
        compras_pendientes: pendientes.length,
        ultima_compra: ultimaCompra?.toISOString().split('T')[0] || null,
        dias_desde_ultima_compra: diasDesdeUltima,
      };
    });

    // Ordenar por total compras descendente
    suppliersData.sort((a, b) => b.total_compras - a.total_compras);

    // Pagos pendientes globales
    const pendingPurchases = await this.prisma.purchase.findMany({
      where: { tenantId: ctx.tenantId, storeId: ctx.storeId, paymentStatus: 'pending' },
      include: { supplier: { select: { businessName: true, id: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const totalPendienteGlobal = pendingPurchases.reduce((sum, p) => sum + Number(p.total), 0);

    // Productos más comprados (para detectar dependencias)
    const topProducts = await this.prisma.purchaseItem.groupBy({
      by: ['productId'],
      where: {
        purchase: { tenantId: ctx.tenantId, storeId: ctx.storeId, createdAt: { gte: since } },
      },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 10,
    });

    // Resolver nombres de productos
    const productIds = topProducts.map(p => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map(p => [p.id, p.name]));

    return {
      resumen: {
        total_proveedores: suppliers.length,
        proveedores_activos: suppliers.filter(s => s.purchases.length > 0).length,
        proveedores_inactivos: suppliers.filter(s => s.purchases.length === 0).length,
        total_pendiente_pago: Math.round(totalPendienteGlobal),
        compras_pendientes: pendingPurchases.length,
      },
      proveedores: suppliersData,
      pagos_pendientes: pendingPurchases.slice(0, 20).map(p => ({
        id: p.id,
        proveedor: p.supplier.businessName,
        proveedor_id: p.supplier.id,
        total: Math.round(Number(p.total)),
        fecha: p.createdAt.toISOString().split('T')[0],
        estado: p.paymentStatus,
      })),
      productos_mas_comprados: topProducts.map(p => ({
        producto: productMap.get(p.productId) || p.productId,
        cantidad: p._sum.quantity,
        total: Math.round(Number(p._sum.total || 0)),
      })),
    };
  }

  // ─── Execute Tool (ReAct step 3) ───────────────────────────────

  async executeTool(ctx: AgentContext, toolName: string, args: Record<string, any>): Promise<any> {
    // Delegar herramientas compartidas primero
    const sharedResult = await this.executeSharedTool(ctx, toolName, args);
    if (sharedResult && typeof sharedResult === 'object' && !('error' in sharedResult)) {
      return sharedResult;
    }

    switch (toolName) {
      case 'analyze_supplier_performance': {
        const days = args.days || 180;
        const supplierId = args.supplier_id as string | undefined;
        const since = new Date(Date.now() - days * 86400000);

        const whereClause: any = { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null };
        if (supplierId) whereClause.id = supplierId;

        const suppliers = await this.prisma.supplier.findMany({
          where: whereClause,
          include: {
            purchases: {
              where: { createdAt: { gte: since } },
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        const performance = suppliers.map(s => {
          const compras = s.purchases || [];
          const totalCompras = compras.reduce((sum, p) => sum + Number(p.total), 0);

          // Puntualidad: % de compras pagadas a tiempo (paid = puntual)
          const pagadas = compras.filter(p => p.paymentStatus === 'paid').length;
          const puntualidad = compras.length > 0 ? (pagadas / compras.length) * 100 : 0;

          // Frecuencia promedio (días entre compras)
          let frecuenciaDias = 0;
          if (compras.length >= 2) {
            const fechas = compras.map(p => new Date(p.createdAt).getTime()).sort((a, b) => b - a);
            let totalDiff = 0;
            for (let i = 0; i < fechas.length - 1; i++) {
              totalDiff += (fechas[i] - fechas[i + 1]) / 86400000;
            }
            frecuenciaDias = Math.round(totalDiff / (fechas.length - 1));
          }

          // Días desde última compra
          const diasDesdeUltima = compras.length > 0
            ? Math.floor((Date.now() - new Date(compras[0].createdAt).getTime()) / 86400000)
            : 999;

          // Score compuesto (0-100)
          const scoreVolumen = Math.min((totalCompras / 5000000) * 40, 40);
          const scorePuntualidad = (puntualidad / 100) * 30;
          const scoreFrecuencia = frecuenciaDias > 0 ? Math.max(0, 30 - (frecuenciaDias / 90) * 30) : 15;
          const scoreCompuesto = Math.round(scoreVolumen + scorePuntualidad + scoreFrecuencia);

          return {
            id: s.id,
            nombre: s.businessName,
            total_compras: Math.round(totalCompras),
            cantidad_compras: compras.length,
            ticket_promedio: compras.length > 0 ? Math.round(totalCompras / compras.length) : 0,
            frecuencia_dias: frecuenciaDias,
            puntualidad_pct: parseFloat(puntualidad.toFixed(1)),
            dias_desde_ultima_compra: diasDesdeUltima,
            score: scoreCompuesto,
            clasificacion: scoreCompuesto >= 70 ? 'EXCELENTE' : scoreCompuesto >= 50 ? 'BUENO' : scoreCompuesto >= 30 ? 'REGULAR' : 'DEFICIENTE',
          };
        });

        performance.sort((a, b) => b.score - a.score);

        return {
          periodo_dias: days,
          proveedores_evaluados: performance.length,
          proveedores: performance,
        };
      }

      case 'compare_prices': {
        const productName = args.product_name as string | undefined;
        const maxPriceDiffPct = args.max_price_diff_pct || 5;

        // Obtener todos los purchase items con sus compras y proveedores
        const purchaseItems = await this.prisma.purchaseItem.findMany({
          where: {
            purchase: { tenantId: ctx.tenantId, storeId: ctx.storeId },
            ...(productName ? { product: { name: { contains: productName, mode: 'insensitive' } } } : {}),
          },
          include: {
            product: { select: { id: true, name: true } },
            purchase: { include: { supplier: { select: { id: true, businessName: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        });

        // Agrupar por producto y proveedor, calculando precio unitario promedio
        const priceMap = new Map<string, Map<string, { precios: number[]; ultimaFecha: Date }>>();

        for (const item of purchaseItems) {
          const productKey = item.product.id;
          const suppKey = item.purchase.supplier.id;
          const unitPrice = item.quantity > 0 ? Number(item.unitPrice || item.total || 0) / item.quantity : 0;

          if (!priceMap.has(productKey)) {
            priceMap.set(productKey, new Map());
          }
          const suppMap = priceMap.get(productKey)!;
          if (!suppMap.has(suppKey)) {
            suppMap.set(suppKey, { precios: [], ultimaFecha: new Date(0) });
          }
          const entry = suppMap.get(suppKey)!;
          entry.precios.push(unitPrice);
          const fecha = new Date(item.createdAt || item.purchase.createdAt);
          if (fecha > entry.ultimaFecha) entry.ultimaFecha = fecha;
        }

        const comparaciones: any[] = [];

        for (const [productId, suppMap] of priceMap.entries()) {
          if (suppMap.size < 2) continue; // necesita al menos 2 proveedores para comparar

          const proveedores = Array.from(suppMap.entries()).map(([suppId, data]) => {
            const avgPrice = data.precios.reduce((a, b) => a + b, 0) / data.precios.length;
            return {
              proveedor_id: suppId,
              proveedor_nombre: purchaseItems.find(i => i.purchase.supplier.id === suppId)?.purchase.supplier.businessName || suppId,
              precio_promedio: Math.round(avgPrice),
              muestras: data.precios.length,
              ultima_compra: data.ultimaFecha.toISOString().split('T')[0],
            };
          });

          proveedores.sort((a, b) => a.precio_promedio - b.precio_promedio);
          const masBarato = proveedores[0].precio_promedio;
          const masCaro = proveedores[proveedores.length - 1].precio_promedio;
          const diffPct = masBarato > 0 ? parseFloat((((masCaro - masBarato) / masBarato) * 100).toFixed(1)) : 0;

          if (diffPct >= maxPriceDiffPct) {
            comparaciones.push({
              producto: purchaseItems.find(i => i.product.id === productId)?.product.name || productId,
              proveedores,
              diferencia_porcentual: diffPct,
              ahorro_potencial_pct: diffPct,
              proveedor_recomendado: proveedores[0].proveedor_nombre,
            });
          }
        }

        comparaciones.sort((a, b) => b.diferencia_porcentual - a.diferencia_porcentual);

        return {
          productos_comparados: comparaciones.length,
          umbral_diferencia_pct: maxPriceDiffPct,
          oportunidades_ahorro: comparaciones.slice(0, 20),
        };
      }

      case 'detect_dependencies': {
        const thresholdPct = args.dependency_threshold_pct || 60;
        const days = args.days || 180;
        const since = new Date(Date.now() - days * 86400000);

        // Compras por proveedor
        const purchases = await this.prisma.purchase.findMany({
          where: { tenantId: ctx.tenantId, storeId: ctx.storeId, createdAt: { gte: since } },
          include: { supplier: { select: { id: true, businessName: true } } },
        });

        const totalGlobal = purchases.reduce((sum, p) => sum + Number(p.total), 0);

        // Agrupar por proveedor
        const bySupplier = new Map<string, { nombre: string; total: number; count: number }>();
        for (const p of purchases) {
          const key = p.supplier.id;
          const entry = bySupplier.get(key) || { nombre: p.supplier.businessName, total: 0, count: 0 };
          entry.total += Number(p.total);
          entry.count += 1;
          bySupplier.set(key, entry);
        }

        const dependencias: any[] = [];
        for (const [id, data] of bySupplier.entries()) {
          const pct = totalGlobal > 0 ? parseFloat(((data.total / totalGlobal) * 100).toFixed(1)) : 0;
          dependencias.push({
            proveedor_id: id,
            proveedor: data.nombre,
            total_compras: Math.round(data.total),
            cantidad_compras: data.count,
            porcentaje_del_total: pct,
            alerta: pct >= thresholdPct ? 'DEPENDENCIA_ALTA' : pct >= thresholdPct * 0.7 ? 'DEPENDENCIA_MODERADA' : 'NORMAL',
          });
        }

        dependencias.sort((a, b) => b.porcentaje_del_total - a.porcentaje_del_total);

        // También detectar productos con un solo proveedor
        const purchaseItems = await this.prisma.purchaseItem.findMany({
          where: { purchase: { tenantId: ctx.tenantId, storeId: ctx.storeId } },
          include: {
            product: { select: { id: true, name: true } },
            purchase: { select: { supplierId: true } },
          },
        });

        const productSuppliers = new Map<string, Set<string>>();
        for (const item of purchaseItems) {
          const key = item.product.id;
          if (!productSuppliers.has(key)) productSuppliers.set(key, new Set());
          productSuppliers.get(key)!.add(item.purchase.supplierId);
        }

        const sinAlternativa: any[] = [];
        for (const [prodId, supps] of productSuppliers.entries()) {
          if (supps.size === 1) {
            const prod = purchaseItems.find(i => i.product.id === prodId)?.product;
            sinAlternativa.push({
              producto: prod?.name || prodId,
              proveedor_unico: Array.from(supps)[0],
            });
          }
        }

        return {
          periodo_dias: days,
          total_compras: Math.round(totalGlobal),
          umbral_dependencia_pct: thresholdPct,
          dependencias: dependencias,
          productos_sin_alternativa: sinAlternativa.slice(0, 20),
          riesgo_global: dependencias.some(d => d.alerta === 'DEPENDENCIA_ALTA') ? 'ALTO'
            : dependencias.some(d => d.alerta === 'DEPENDENCIA_MODERADA') ? 'MEDIO' : 'BAJO',
        };
      }

      case 'suggest_negotiation': {
        const supplierId = args.supplier_id as string | undefined;
        const targetSavingsPct = args.target_savings_pct || 10;

        const whereSupplier: any = { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null };
        if (supplierId) whereSupplier.id = supplierId;

        const suppliers = await this.prisma.supplier.findMany({
          where: whereSupplier,
          include: {
            purchases: {
              include: { items: true },
              orderBy: { createdAt: 'desc' },
              take: 50,
            },
          },
        });

        const estrategias = suppliers.map(s => {
          const compras = s.purchases || [];
          const totalCompras = compras.reduce((sum, p) => sum + Number(p.total), 0);
          const comprasUltimoAnio = compras.filter(p =>
            new Date(p.createdAt).getTime() > Date.now() - 365 * 86400000
          );
          const totalAnual = comprasUltimoAnio.reduce((sum, p) => sum + Number(p.total), 0);

          // Frecuencia de compra
          const frecuenciaMensual = comprasUltimoAnio.length / 12;

          // Volumen de productos
          const totalItems = compras.reduce((sum, p) => sum + (p.items?.length || 0), 0);

          let estrategia = '';
          let descuentoEstimado = 0;
          let confianza = 'baja';

          if (totalAnual > 5000000) {
            estrategia = 'Negociar descuento por volumen alto (10-15%) y plazo de pago a 45-60 días. Proponer contrato marco anual con precios fijos.';
            descuentoEstimado = 12;
            confianza = 'alta';
          } else if (totalAnual > 2000000) {
            estrategia = 'Negociar descuento del 5-10% por consolidación de compras. Solicitar plazo de pago a 30 días. Comparar con competidores.';
            descuentoEstimado = 8;
            confianza = 'media';
          } else if (frecuenciaMensual >= 2) {
            estrategia = 'Negociar descuento por frecuencia (3-5%) y consolidar pedidos para reducir costos de envío. Evaluar proveedor alternativo.';
            descuentoEstimado = 5;
            confianza = 'media';
          } else {
            estrategia = 'Proveedor de bajo volumen. Cotizar con al menos 2 alternativas. Negociar descuento por pronto pago del 2-3%.';
            descuentoEstimado = 3;
            confianza = 'baja';
          }

          const ahorroPotencial = Math.round(totalAnual * (descuentoEstimado / 100));
          const ahorroObjetivo = Math.round(totalAnual * (targetSavingsPct / 100));

          return {
            proveedor_id: s.id,
            proveedor: s.businessName,
            total_compras_anual: Math.round(totalAnual),
            frecuencia_mensual: parseFloat(frecuenciaMensual.toFixed(1)),
            productos_comprados: totalItems,
            estrategia_sugerida: estrategia,
            descuento_estimado_pct: descuentoEstimado,
            ahorro_potencial: ahorroPotencial,
            ahorro_objetivo: ahorroObjetivo,
            confianza_negociacion: confianza,
          };
        });

        estrategias.sort((a, b) => b.ahorro_potencial - a.ahorro_potencial);

        return {
          ahorro_objetivo_pct: targetSavingsPct,
          proveedores_analizados: estrategias.length,
          estrategias,
        };
      }

      case 'evaluate_quality': {
        const supplierId = args.supplier_id as string | undefined;
        const days = args.days || 365;
        const since = new Date(Date.now() - days * 86400000);

        const whereSupplier: any = { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null };
        if (supplierId) whereSupplier.id = supplierId;

        const suppliers = await this.prisma.supplier.findMany({
          where: whereSupplier,
          include: {
            purchases: {
              where: { createdAt: { gte: since } },
              select: {
                total: true,
                createdAt: true,
                paymentStatus: true,
                status: true,
              },
            },
          },
        });

        const evaluaciones = suppliers.map(s => {
          const compras = s.purchases || [];
          const totalCompras = compras.reduce((sum, p) => sum + Number(p.total), 0);

          // Pagos a tiempo
          const pagadasATiempo = compras.filter(p => p.paymentStatus === 'paid').length;
          const puntualidadPago = compras.length > 0 ? (pagadasATiempo / compras.length) * 100 : 0;

          // Compras recibidas (asumimos que completed/cancelled indica estado)
          const recibidas = compras.filter(p => (p.status as string) === 'received').length;
          const tasaRecepcion = compras.length > 0 ? (recibidas / compras.length) * 100 : 0;

          // Consistencia: desviación del ticket promedio
          const tickets = compras.map(p => Number(p.total));
          const avgTicket = tickets.length > 0 ? tickets.reduce((a, b) => a + b, 0) / tickets.length : 0;
          const varianza = tickets.length > 1
            ? tickets.reduce((s, t) => s + (t - avgTicket) ** 2, 0) / tickets.length
            : 0;
          const cv = avgTicket > 0 ? Math.sqrt(varianza) / avgTicket : 0; // coeficiente de variación
          const consistencia = Math.max(0, 100 - cv * 100); // a menor CV, mayor consistencia

          // Score de calidad (0-100)
          const score = Math.round(
            (puntualidadPago * 0.4) + (tasaRecepcion * 0.3) + (Math.min(consistencia, 100) * 0.3)
          );

          return {
            proveedor_id: s.id,
            proveedor: s.businessName,
            total_compras: Math.round(totalCompras),
            cantidad_compras: compras.length,
            puntualidad_pago_pct: parseFloat(puntualidadPago.toFixed(1)),
            tasa_recepcion_pct: parseFloat(tasaRecepcion.toFixed(1)),
            consistencia_pct: parseFloat(consistencia.toFixed(1)),
            score_calidad: score,
            clasificacion: score >= 80 ? 'EXCELENTE' : score >= 60 ? 'BUENO' : score >= 40 ? 'REGULAR' : 'DEFICIENTE',
            recomendacion: score >= 80 ? 'Mantener y fortalecer relación' :
                           score >= 60 ? 'Relación aceptable, monitorear' :
                           score >= 40 ? 'Evaluar alternativas' :
                           'Buscar reemplazo urgente',
          };
        });

        evaluaciones.sort((a, b) => b.score_calidad - a.score_calidad);

        return {
          periodo_dias: days,
          proveedores_evaluados: evaluaciones.length,
          puntuacion_promedio: evaluaciones.length > 0
            ? parseFloat((evaluaciones.reduce((s, e) => s + e.score_calidad, 0) / evaluaciones.length).toFixed(1))
            : 0,
          evaluaciones,
        };
      }

      default:
        return { error: `Herramienta desconocida: ${toolName}` };
    }
  }
}
