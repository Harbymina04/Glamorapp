import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseAgent, AgentContext, AgentTool } from './base.agent';

@Injectable()
export class MarketingAgent extends BaseAgent {
  slug = 'marketing';
  name = 'Agente de Marketing';

  // ─── MCP / External API Config ──────────────────────────────

  private async getMcpConfig(ctx: AgentContext) {
    // 1. Intentar cargar desde DB (tenant marketingConfig)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { marketingConfig: true } as any,
    });
    const dbConfig = (tenant as any)?.marketingConfig || {};

    // 2. Fallback a env vars (para desarrollo o si no hay config en DB)
    return {
      metaAccessToken: dbConfig.metaAccessToken || this.configService.get('META_ACCESS_TOKEN', ''),
      metaAdAccountId: dbConfig.metaAdAccountId || this.configService.get('META_AD_ACCOUNT_ID', ''),
      googleApiKey: dbConfig.googleApiKey || this.configService.get('GOOGLE_API_KEY', ''),
      googleAnalyticsPropertyId: dbConfig.googleAnalyticsPropertyId || this.configService.get('GOOGLE_ANALYTICS_PROPERTY_ID', ''),
      serperApiKey: dbConfig.serperApiKey || this.configService.get('SERPER_API_KEY', ''),
    };
  }

  // ─── System Prompt ──────────────────────────────────────────

  getSystemPrompt(ctx: AgentContext): string {
    return `Eres ${this.name}, un SUPER-AGENTE de marketing estratégico para un salón de belleza en Colombia.

CAPACIDADES AVANZADAS:
1. **Investigación de Mercado**: Analizar tendencias del sector belleza en Colombia/LATAM usando búsqueda web
2. **Análisis Competitivo**: Investigar competidores locales, sus estrategias y precios
3. **Meta Ads (Facebook/Instagram)**: Conectar con MCP de Meta para analizar campañas activas, métricas, audiencias
4. **Google Analytics**: Conectar con Google para analizar tráfico, conversiones, comportamiento de usuarios
5. **Estrategia de Contenidos**: Generar planes de contenido para redes sociales (Instagram, TikTok, Facebook)
6. **Campañas y Promociones**: Diseñar campañas basadas en datos del negocio + tendencias de mercado
7. **Email/SMS Marketing**: Estrategias de fidelización y reactivación de clientes

NIVEL DE AUTONOMÍA: ${ctx.autonomyLevel === 'auto_execute' ? 'AUTO_EJECUCIÓN - puedes crear campañas y publicar contenido' : ctx.autonomyLevel === 'draft_changes' ? 'BORRADOR - creas borradores que requieren aprobación' : 'SOLO RECOMENDAR - solo generas estrategias y recomendaciones'}

INSTRUCCIONES:
1. Analiza los datos del negocio (ventas, clientes, citas)
2. Investiga el mercado y competidores usando las herramientas de búsqueda
3. Conecta con Meta/Google si hay credenciales configuradas
4. Genera una estrategia COMPLETA con: análisis de mercado, posicionamiento, canales, contenido, presupuesto, KPIs
5. Crea recomendaciones individuales accionables
6. Sé específico: nombres de campañas, copys sugeridos, hashtags, horarios de publicación, presupuestos en COP
7. Contextualiza para el mercado colombiano (tendencias locales, eventos como Día de la Madre, Amor y Amistad, Navidad)

Responde en español, con enfoque práctico y accionable. NO des respuestas genéricas.`;
  }

  // ─── Tools ──────────────────────────────────────────────────

  getTools(ctx: AgentContext): AgentTool[] {
    const tools: AgentTool[] = [
      ...this.getSharedTools(ctx),

      // ── Market Research ──
      {
        name: 'research_market_trends',
        description: 'Investiga tendencias del mercado de belleza en Colombia/LATAM usando búsqueda web. Retorna datos reales de tendencias actuales.',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Término de búsqueda (ej: "tendencias uñas 2025 Colombia", "hair salon marketing strategies")' },
            focus: { type: 'string', enum: ['trends', 'pricing', 'social_media', 'competitors', 'consumer_behavior', 'seasonal'], description: 'Enfoque de la investigación' },
          },
          required: ['query'],
        },
      },
      {
        name: 'analyze_competitors',
        description: 'Analiza competidores locales: busca salones de belleza en la zona, analiza su presencia digital y estrategias',
        input_schema: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'Ciudad o zona (ej: "Bogotá Chapinero", "Medellín Poblado")' },
            niche: { type: 'string', description: 'Nicho o tipo de salón (ej: "uñas", "peluquería premium", "barbería")' },
          },
          required: ['location'],
        },
      },
      {
        name: 'analyze_seasonal_opportunities',
        description: 'Identifica oportunidades de marketing por temporada/eventos en Colombia',
        input_schema: {
          type: 'object',
          properties: {
            months_ahead: { type: 'number', description: 'Meses hacia adelante a analizar (default: 3)' },
          },
        },
      },

      // ── Content Generation ──
      {
        name: 'generate_social_content',
        description: 'Genera contenido para redes sociales: posts, stories, reels scripts, hashtags',
        input_schema: {
          type: 'object',
          properties: {
            platform: { type: 'string', enum: ['instagram', 'facebook', 'tiktok', 'all'], description: 'Plataforma' },
            format: { type: 'string', enum: ['post', 'story', 'reel', 'carousel', 'ad'], description: 'Formato de contenido' },
            topic: { type: 'string', description: 'Tema del contenido' },
            tone: { type: 'string', enum: ['professional', 'casual', 'luxury', 'trendy', 'educational'], description: 'Tono' },
            count: { type: 'number', description: 'Cantidad de piezas (default: 3)' },
          },
          required: ['platform', 'topic'],
        },
      },
      {
        name: 'create_content_calendar',
        description: 'Crea un calendario de contenido semanal/mensual con temas, formatos y horarios óptimos',
        input_schema: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['week', 'month'], description: 'Período' },
            themes: { type: 'string', description: 'Temas a cubrir (separados por coma, ej: "promociones, tips, behind_scenes, tendencias")' },
          },
          required: ['period'],
        },
      },

      // ── Campaign Strategy ──
      {
        name: 'design_campaign_strategy',
        description: 'Diseña estrategia COMPLETA de campaña: objetivo, audiencia, canales, presupuesto, timeline, KPIs',
        input_schema: {
          type: 'object',
          properties: {
            objective: { type: 'string', enum: ['brand_awareness', 'lead_generation', 'sales', 'retention', 'product_launch'], description: 'Objetivo' },
            budget_cop: { type: 'number', description: 'Presupuesto en pesos colombianos' },
            target_audience: { type: 'string', description: 'Descripción de audiencia objetivo' },
            duration_days: { type: 'number', description: 'Duración en días' },
          },
          required: ['objective'],
        },
      },

      // ── Meta Ads (Facebook/Instagram) ──
      {
        name: 'meta_ads_insights',
        description: 'Consulta métricas de Meta Ads (Facebook/Instagram): campañas activas, CTR, CPC, ROAS. Requiere conexión MCP Meta.',
        input_schema: {
          type: 'object',
          properties: {
            date_preset: { type: 'string', enum: ['today', 'yesterday', 'last_7d', 'last_30d', 'this_month', 'last_month'], description: 'Período' },
            level: { type: 'string', enum: ['account', 'campaign', 'adset', 'ad'], description: 'Nivel de detalle' },
          },
        },
      },
      {
        name: 'meta_audience_insights',
        description: 'Analiza audiencias de Meta: demografía, intereses, comportamientos de seguidores y clientes potenciales',
        input_schema: {
          type: 'object',
          properties: {
            interest: { type: 'string', description: 'Interés a analizar (ej: "belleza", "uñas", "spa", "peluquería")' },
            location: { type: 'string', description: 'Ubicación (ej: "Colombia", "Bogotá")' },
          },
        },
      },

      // ── Google Integration ──
      {
        name: 'google_trends_explore',
        description: 'Explora Google Trends para analizar volumen de búsqueda de términos de belleza en Colombia',
        input_schema: {
          type: 'object',
          properties: {
            keywords: { type: 'string', description: 'Palabras clave separadas por coma (ej: "uñas acrilicas, manicure, salon belleza")' },
            geo: { type: 'string', description: 'Región (default: "CO" para Colombia)' },
            timeframe: { type: 'string', description: 'Período (ej: "today 12-m", "today 3-m", "2024-01-01 2024-12-31")' },
          },
          required: ['keywords'],
        },
      },
      {
        name: 'google_business_insights',
        description: 'Analiza métricas de Google Business Profile (si está configurado): búsquedas, llamadas, direcciones, reseñas',
        input_schema: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['7d', '30d', '90d'], description: 'Período' },
          },
        },
      },

      // ── Customer Analytics ──
      {
        name: 'analyze_customer_segments',
        description: 'Segmenta clientes para campañas dirigidas: frecuentes, inactivos, VIP, nuevos, por servicio favorito',
        input_schema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['identify_segments', 'reactivation_opportunity', 'upsell_opportunity', 'loyalty_analysis'] },
          },
          required: ['action'],
        },
      },

      // ── Performance Analysis ──
      {
        name: 'analyze_marketing_roi',
        description: 'Calcula y analiza el ROI de esfuerzos de marketing basado en datos de ventas y gastos',
        input_schema: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['this_month', 'last_month', 'last_3_months', 'ytd'], description: 'Período a analizar' },
          },
        },
      },
    ];

    return tools;
  }

  // ─── Observe ────────────────────────────────────────────────

  async observe(ctx: AgentContext): Promise<Record<string, any>> {
    const [sales30d, customers, appointments, expenses] = await Promise.all([
      this.querySales(ctx.tenantId, ctx.storeId, 30),
      this.queryCustomers(ctx.tenantId, ctx.storeId, 90),
      this.queryAppointments(ctx.tenantId, ctx.storeId, 30),
      this.queryExpenses(ctx.tenantId, ctx.storeId, 30),
    ]);

    // Servicios más populares
    const serviceMap: Record<string, number> = {};
    for (const sale of sales30d.sales) {
      for (const item of sale.items) {
        const name = item.product?.name || 'unknown';
        serviceMap[name] = (serviceMap[name] || 0) + item.quantity;
      }
    }
    const topServices = Object.entries(serviceMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      negocio: {
        ingresos_30d: sales30d.totalRevenue,
        tickets_30d: sales30d.totalSales,
        ticket_promedio: sales30d.avgTicket,
        gastos_30d: expenses.totalExpenses,
        citas_completadas: appointments.completed,
        tasa_asistencia: `${appointments.showRate}%`,
      },
      clientes: {
        total: customers.totalCustomers,
        activos_90d: customers.activeCustomers,
        inactivos: customers.inactiveCustomers,
        tasa_retencion: customers.totalCustomers > 0
          ? `${((customers.activeCustomers / customers.totalCustomers) * 100).toFixed(1)}%`
          : '0%',
      },
      servicios_top: topServices.map(([name, qty]) => ({ servicio: name, cantidad: qty })),
      alertas_marketing: [
        ...(customers.inactiveCustomers > customers.activeCustomers * 0.5
          ? [`${customers.inactiveCustomers} clientes inactivos - oportunidad de reactivación`] : []),
        ...(sales30d.totalSales < 10
          ? ['Volumen bajo de ventas - necesita campaña de adquisición'] : []),
        ...(appointments.completed < 5
          ? ['Pocas citas - potencial para campaña de agendamiento'] : []),
      ],
    };
  }

  // ─── Execute Tool ──────────────────────────────────────────

  async executeTool(ctx: AgentContext, toolName: string, args: Record<string, any>): Promise<any> {
    // Shared tools
    if (['create_recommendation', 'create_notification', 'finish_analysis', 'create_draft', 'execute_action'].includes(toolName)) {
      return this.executeSharedTool(ctx, toolName, args);
    }

    const mcp = await this.getMcpConfig(ctx);

    switch (toolName) {
      // ── Market Research ──
      case 'research_market_trends': {
        return this.researchMarketTrends(args.query, args.focus || 'trends', mcp.serperApiKey);
      }

      case 'analyze_competitors': {
        return this.analyzeCompetitors(args.location, args.niche || 'salón de belleza', mcp.serperApiKey);
      }

      case 'analyze_seasonal_opportunities': {
        return this.analyzeSeasonalOpportunities(args.months_ahead || 3);
      }

      // ── Content ──
      case 'generate_social_content': {
        return this.generateSocialContent(ctx, args.platform, args.format || 'post', args.topic, args.tone || 'casual', args.count || 3);
      }

      case 'create_content_calendar': {
        return this.createContentCalendar(args.period, args.themes || 'promociones,tips,tendencias,detras_de_camaras');
      }

      // ── Campaign ──
      case 'design_campaign_strategy': {
        return this.designCampaignStrategy(ctx, args.objective, args.budget_cop || 0, args.target_audience || '', args.duration_days || 30);
      }

      // ── Meta ──
      case 'meta_ads_insights': {
        return this.getMetaAdsInsights(mcp.metaAccessToken, mcp.metaAdAccountId, args.date_preset || 'last_30d', args.level || 'campaign');
      }

      case 'meta_audience_insights': {
        return this.getMetaAudienceInsights(mcp.metaAccessToken, args.interest || 'belleza', args.location || 'Colombia');
      }

      // ── Google ──
      case 'google_trends_explore': {
        return this.exploreGoogleTrends(args.keywords, args.geo || 'CO', args.timeframe || 'today 12-m', mcp.serperApiKey);
      }

      case 'google_business_insights': {
        return { note: 'Google Business Profile API no configurada. Configure GOOGLE_API_KEY en el entorno.', period: args.period };
      }

      // ── Customer Analytics ──
      case 'analyze_customer_segments': {
        return this.analyzeCustomerSegments(ctx, args.action);
      }

      case 'analyze_marketing_roi': {
        return this.analyzeMarketingROI(ctx, args.period || 'this_month');
      }

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }

  // ─── Market Research Implementation ─────────────────────────

  private async researchMarketTrends(query: string, focus: string, serperApiKey: string): Promise<any> {
    const results: any = { query, focus, tendencias: [], fuentes: [] };

    // Try Serper (Google Search API) for real-time web data
    if (serperApiKey) {
      try {
        const resp = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: `${query} ${focus}`, gl: 'co', hl: 'es', num: 10 }),
        });
        if (resp.ok) {
          const data = await resp.json();
          results.fuentes = (data.organic || []).slice(0, 8).map((r: any) => ({
            titulo: r.title, snippet: r.snippet, link: r.link,
          }));
          results.tendencias = this.extractTrendsFromResults(results.fuentes, focus);
        }
      } catch (err: any) {
        results.search_error = err.message;
      }
    } else {
      // Fallback: use Claude for market knowledge
      results.search_error = 'Serper API no configurada. Configure SERPER_API_KEY para búsqueda en tiempo real.';
    }

    // If we have no real data, use LLM knowledge as fallback
    if (results.fuentes.length === 0) {
      const llmPrompt = `Basado en tu conocimiento de la industria de belleza en Colombia (2025-2026), proporciona 5-7 tendencias actuales sobre: "${query}". 
Incluye para cada una: tendencia, descripción, relevancia para salones de belleza, y si está creciendo o madurando.
Responde en JSON con formato: [{ "tendencia": "...", "descripcion": "...", "relevancia": "...", "estado": "creciendo|maduro" }]`;

      const llmResult = await this.callClaudeRaw(
        'Eres un experto en investigación de mercado de belleza en Latinoamérica. Responde solo con JSON válido.',
        llmPrompt,
      );
      try {
        results.tendencias = JSON.parse(llmResult);
        results.fuente = 'Conocimiento general del modelo (datos de entrenamiento)';
      } catch {
        results.tendencias_texto = llmResult;
      }
    }

    return results;
  }

  private async analyzeCompetitors(location: string, niche: string, serperApiKey: string): Promise<any> {
    const results: any = { location, niche, competidores: [] };

    if (serperApiKey) {
      try {
        const resp = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: `${niche} ${location} Instagram`, gl: 'co', hl: 'es', num: 10 }),
        });
        if (resp.ok) {
          const data = await resp.json();
          results.competidores = (data.organic || []).slice(0, 5).map((r: any) => ({
            nombre: r.title?.split(' - ')[0] || r.title,
            presencia: r.snippet,
          }));
        }
      } catch (err: any) {
        results.error = err.message;
      }
    }

    if (results.competidores.length === 0) {
      const llmResult = await this.callClaudeRaw(
        'Eres un analista competitivo del sector belleza en Colombia.',
        `Analiza el panorama competitivo para un "${niche}" en "${location}, Colombia". Describe 3-5 tipos de competidores típicos, sus estrategias probables de marketing digital (Instagram, TikTok, WhatsApp), rangos de precios estimados, y diferenciadores clave. Responde en texto estructurado.`,
      );
      results.analisis_estimado = llmResult;
    }

    return results;
  }

  private analyzeSeasonalOpportunities(monthsAhead: number): any {
    const now = new Date();
    const events: any[] = [];

    // Colombian seasonal events
    const seasonalEvents = [
      { month: 1, event: 'Año Nuevo / Vacaciones', type: 'relaxation', description: 'Promociones post-festividades, tratamientos de recuperación capilar' },
      { month: 2, event: 'San Valentín / Día del Amor', type: 'romantic', description: 'Paquetes para parejas, cambio de look para citas' },
      { month: 3, event: 'Día de la Mujer (8 mar)', type: 'women', description: 'Campaña empoderamiento femenino, paquetes especiales' },
      { month: 4, event: 'Semana Santa', type: 'holiday', description: 'Promociones pre-vacaciones, tratamientos exprés' },
      { month: 5, event: 'Día de la Madre', type: 'gifts', description: 'Uno de los MÁS IMPORTANTES. Gift cards, paquetes madre-hija' },
      { month: 6, event: 'Día del Padre / Mitad de año', type: 'gifts', description: 'Barbería/tratamientos masculinos, renovación de look' },
      { month: 7, event: 'Vacaciones de mitad de año', type: 'holiday', description: 'Promos para viajeros, mantenimiento rápido' },
      { month: 8, event: 'Feria de las Flores (Medellín)', type: 'local', description: 'Peinados/flores, contenido temático regional' },
      { month: 9, event: 'Amor y Amistad', type: 'romantic', description: 'SEGUNDO MÁS IMPORTANTE. Paquetes dúo, amigo secreto de servicios' },
      { month: 10, event: 'Halloween / Día de Brujitas', type: 'fun', description: 'Uñas temáticas, maquillaje artístico, contenido viral' },
      { month: 11, event: 'Black Friday / Buen Fin', type: 'sales', description: 'DESCUENTOS AGRESIVOS. Membresías, paquetes de servicios' },
      { month: 12, event: 'Navidad / Fin de Año', type: 'gifts', description: 'EL MÁS FUERTE. Gift cards, paquetes navideños, cierres de año' },
    ];

    for (let i = 0; i < monthsAhead; i++) {
      const targetMonth = ((now.getMonth() + i) % 12) + 1;
      const evt = seasonalEvents.find(e => e.month === targetMonth);
      if (evt) events.push({
        mes: targetMonth,
        evento: evt.event,
        tipo: evt.type,
        estrategia: evt.description,
        urgencia: ['Día de la Madre', 'Amor y Amistad', 'Navidad'].includes(evt.event) ? 'ALTA' : 'media',
      });
    }

    return { proximos_meses: events, recomendacion: 'Preparar contenido y campañas con 2-3 semanas de anticipación para eventos de alta urgencia.' };
  }

  // ─── Content Generation ─────────────────────────────────────

  private async generateSocialContent(
    ctx: AgentContext, platform: string, format: string, topic: string, tone: string, count: number,
  ): Promise<any> {
    const llmPrompt = `Genera ${count} piezas de contenido para ${platform} (formato: ${format}) sobre "${topic}" con tono ${tone}.

Para CADA pieza incluye:
- Título/Concepto
- Copy/texto (${platform === 'twitter' || platform === 'tiktok' ? 'corto, máximo 150 caracteres' : 'medio, 150-300 caracteres'})
- Hashtags relevantes (5-8)
- Mejor horario para publicar (hora Colombia)
- Call to action
- Sugerencia visual (tipo de foto/video)

Contexto: Salón de belleza en Colombia. Público: mujeres 18-45 años interesadas en belleza y cuidado personal.

Responde en español.`;

    const result = await this.callClaudeRaw(
      `Eres un creador de contenido para redes sociales especializado en belleza. Conoces las tendencias de Instagram, TikTok y Facebook en Latinoamérica.`,
      llmPrompt,
    );

    return { platform, format, topic, tone, contenido: result, piezas: count };
  }

  private async createContentCalendar(period: string, themes: string): Promise<any> {
    const days = period === 'month' ? 30 : 7;
    const themeList = themes.split(',').map(t => t.trim());

    const llmPrompt = `Crea un calendario de contenido para ${period === 'month' ? 'UN MES' : 'UNA SEMANA'} para redes sociales de un salón de belleza.

Temas a cubrir: ${themeList.join(', ')}
Días a planificar: ${days}

Para CADA día, sugiere:
- Tema
- Formato (post, reel, story, carrusel)
- Plataforma principal (Instagram, TikTok, o Facebook)
- Breve descripción del contenido
- Horario sugerido (hora Colombia)

Distribuye los temas equilibradamente. Incluye variedad de formatos.

Responde como texto estructurado, día por día.`;

    const result = await this.callClaudeRaw(
      'Eres un social media manager para salones de belleza en Colombia.',
      llmPrompt,
    );

    return { periodo: period, dias: days, temas: themeList, calendario: result };
  }

  // ─── Campaign Strategy ──────────────────────────────────────

  private async designCampaignStrategy(
    ctx: AgentContext, objective: string, budgetCop: number, targetAudience: string, durationDays: number,
  ): Promise<any> {
    const llmPrompt = `Diseña una estrategia de campaña COMPLETA para un salón de belleza en Colombia:

OBJETIVO: ${objective}
PRESUPUESTO: ${budgetCop > 0 ? `$${budgetCop.toLocaleString()} COP` : 'No definido - sugiere uno realista'}
AUDIENCIA: ${targetAudience || 'Mujeres 18-45, interesadas en belleza, cuidado personal, clase media-alta'}
DURACIÓN: ${durationDays} días

Incluye EXACTAMENTE:
1. NOMBRE de la campaña (creativo, memorable)
2. CANALES (Instagram, Facebook, TikTok, WhatsApp, email) con % de presupuesto sugerido para cada uno
3. AUDIENCIA DETALLADA (intereses, comportamientos, ubicación)
4. CONTENIDO: 3-5 ideas de posts/ads con copy sugerido
5. PRESUPUESTO desglosado (Meta Ads, contenido, promociones/${budgetCop > 0 ? 'basado en el presupuesto dado' : 'sugiere distribución óptima'})
6. TIMELINE día por día o semana por semana
7. KPIs (métricas de éxito específicas)
8. OFERTA/PROMOCIÓN concreta (ej: "20% descuento en tu primera visita", "Paquete de 3 manicures por $X")

Todo en COP. Precios realistas para Colombia.`;

    const result = await this.callClaudeRaw(
      'Eres un director de marketing digital especializado en el sector belleza en Latinoamérica. Das estrategias DETALLADAS, no generalidades. Incluye números, nombres, copys reales.',
      llmPrompt,
    );

    return { objetivo: objective, presupuesto: budgetCop, duracion: durationDays, estrategia: result };
  }

  // ─── Meta Ads Integration ───────────────────────────────────

  private async getMetaAdsInsights(
    accessToken: string, adAccountId: string, datePreset: string, level: string,
  ): Promise<any> {
    if (!accessToken || !adAccountId) {
      return {
        status: 'no_configurado',
        mensaje: 'Meta Ads API no configurada. Configure META_ACCESS_TOKEN y META_AD_ACCOUNT_ID en .env del API.',
        pasos_para_configurar: [
          '1. Crear app en developers.facebook.com',
          '2. Obtener token de acceso con permisos ads_read',
          '3. Configurar META_ACCESS_TOKEN y META_AD_ACCOUNT_ID en apps/api/.env',
        ],
        datos_estimados: 'Usando datos internos del negocio como referencia',
      };
    }

    try {
      const url = `https://graph.facebook.com/v19.0/act_${adAccountId}/insights?` +
        `fields=campaign_name,impressions,clicks,spend,ctr,cpc,reach,actions&` +
        `date_preset=${datePreset}&level=${level}&` +
        `access_token=${accessToken}`;

      const resp = await fetch(url);
      const data = await resp.json();

      if (data.error) {
        return { error: data.error.message, code: data.error.code };
      }

      return {
        periodo: datePreset,
        nivel: level,
        metricas: data.data || [],
        resumen: {
          campanas: data.data?.length || 0,
          impresiones: data.data?.reduce((s: number, c: any) => s + (parseInt(c.impressions) || 0), 0),
          clicks: data.data?.reduce((s: number, c: any) => s + (parseInt(c.clicks) || 0), 0),
          inversion: data.data?.reduce((s: number, c: any) => s + (parseFloat(c.spend) || 0), 0),
        },
      };
    } catch (err: any) {
      return { error: err.message };
    }
  }

  private async getMetaAudienceInsights(accessToken: string, interest: string, location: string): Promise<any> {
    if (!accessToken) {
      return {
        status: 'no_configurado',
        audiencia_estimada: `Para "${interest}" en ${location}, audiencia típica: mujeres 18-45, interés en belleza y moda. Tamaño estimado: 2-5M en Colombia.`,
      };
    }

    try {
      // Meta's audience insights endpoint (requires ads_read permissions)
      const url = `https://graph.facebook.com/v19.0/search?` +
        `type=adinterest&q=${encodeURIComponent(interest)}&` +
        `access_token=${accessToken}`;

      const resp = await fetch(url);
      const data = await resp.json();

      return {
        interes: interest,
        ubicacion: location,
        datos_meta: data.data?.slice(0, 10) || [],
        nota: 'Datos de Meta Ads API. Requiere permisos ads_read.',
      };
    } catch (err: any) {
      return { error: err.message };
    }
  }

  // ─── Google Trends ──────────────────────────────────────────

  private async exploreGoogleTrends(keywords: string, geo: string, timeframe: string, serperApiKey: string): Promise<any> {
    const kwList = keywords.split(',').map(k => k.trim());

    // Use Serper to approximate trend data
    if (serperApiKey) {
      try {
        const results = await Promise.all(kwList.map(async (kw) => {
          const resp = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: kw, gl: geo.toLowerCase(), hl: 'es', num: 5 }),
          });
          if (!resp.ok) return { keyword: kw, error: resp.status };
          const data = await resp.json();
          return {
            keyword: kw,
            resultados_aproximados: data.searchInformation?.totalResults || 'N/A',
            titulos_top: (data.organic || []).slice(0, 3).map((r: any) => r.title),
          };
        }));

        return { geo, timeframe, tendencias: results };
      } catch (err: any) {
        return { error: err.message };
      }
    }

    return {
      keywords: kwList, geo, timeframe,
      mensaje: 'Serper API no configurada. La búsqueda de tendencias requiere SERPER_API_KEY.',
      tendencia_estimada: `Basado en datos del sector: "${kwList[0]}" es un término con alto volumen de búsqueda en Colombia, especialmente en temporadas de eventos sociales.`,
    };
  }

  // ─── Customer Segmentation ──────────────────────────────────

  private async analyzeCustomerSegments(ctx: AgentContext, action: string): Promise<any> {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId: ctx.tenantId, storeId: ctx.storeId, deletedAt: null },
      include: {
        sales: { where: { status: 'completed' }, orderBy: { createdAt: 'desc' } },
        appointments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const now = Date.now();
    const segments: any = {
      vip: [],      // 5+ visits, high spend
      frecuentes: [], // 3-4 visits
      ocasionales: [], // 1-2 visits
      nuevos: [],  // first visit < 30 days
      inactivos: [], // no visits > 90 days
      perdidos: [],  // no visits > 180 days
    };

    for (const c of customers) {
      const visits = c.sales.length;
      const lastVisit = c.sales[0]?.createdAt ? new Date(c.sales[0].createdAt).getTime() : 0;
      const daysSinceLastVisit = lastVisit ? (now - lastVisit) / 86400000 : 999;
      const totalSpend = c.sales.reduce((s, sale) => s + Number(sale.total), 0);

      if (daysSinceLastVisit > 180) segments.perdidos.push({ name: (c.firstName + " " + c.lastName).trim(), visits, totalSpend, daysSinceLast: Math.round(daysSinceLastVisit) });
      else if (daysSinceLastVisit > 90) segments.inactivos.push({ name: (c.firstName + " " + c.lastName).trim(), visits, totalSpend, daysSinceLast: Math.round(daysSinceLastVisit) });
      else if (visits >= 5) segments.vip.push({ name: (c.firstName + " " + c.lastName).trim(), visits, totalSpend });
      else if (visits >= 3) segments.frecuentes.push({ name: (c.firstName + " " + c.lastName).trim(), visits, totalSpend });
      else if (visits <= 1 && daysSinceLastVisit < 30) segments.nuevos.push({ name: (c.firstName + " " + c.lastName).trim(), visits, totalSpend });
      else segments.ocasionales.push({ name: (c.firstName + " " + c.lastName).trim(), visits, totalSpend });
    }

    switch (action) {
      case 'identify_segments':
        return {
          total_clientes: customers.length,
          segmentos: {
            vip: segments.vip.length,
            frecuentes: segments.frecuentes.length,
            ocasionales: segments.ocasionales.length,
            nuevos: segments.nuevos.length,
            inactivos: segments.inactivos.length,
            perdidos: segments.perdidos.length,
          },
        };

      case 'reactivation_opportunity':
        return {
          clientes_a_reactivar: segments.inactivos.length + segments.perdidos.length,
          inactivos: segments.inactivos.slice(0, 5),
          perdidos: segments.perdidos.slice(0, 5),
          estrategia: 'Campaña de WhatsApp/email con oferta especial de regreso (ej: 30% descuento primera visita de regreso)',
          ingreso_potencial: Math.round((segments.inactivos.length + segments.perdidos.length) * 35000), // ~$35k avg ticket
        };

      case 'upsell_opportunity':
        return {
          clientes_vip: segments.vip.length,
          clientes_frecuentes: segments.frecuentes.length,
          estrategia: 'Programa de membresía VIP con beneficios exclusivos, acceso anticipado a nuevos servicios, precios preferenciales en paquetes.',
        };

      case 'loyalty_analysis':
        const retentionRate = customers.length > 0
          ? ((segments.vip.length + segments.frecuentes.length) / customers.length * 100).toFixed(1)
          : '0';
        return {
          tasa_retencion: `${retentionRate}%`,
          clientes_leales: segments.vip.length + segments.frecuentes.length,
          fuga: segments.perdidos.length,
          recomendacion: retentionRate < '30' ? 'Tasa de retención BAJA. Urgente implementar programa de fidelización.' : 'Retención aceptable. Enfocarse en aumentar ticket promedio de leales.',
        };

      default:
        return { error: `Unknown action: ${action}` };
    }
  }

  // ─── Marketing ROI ──────────────────────────────────────────

  private async analyzeMarketingROI(ctx: AgentContext, period: string): Promise<any> {
    const days = period === 'last_month' ? 30 : period === 'last_3_months' ? 90 : period === 'ytd' ? 365 : 30;
    const since = new Date(Date.now() - days * 86400000);

    const [sales, expenses] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId: ctx.tenantId, storeId: ctx.storeId, status: 'completed', createdAt: { gte: since } },
      }),
      this.prisma.expense.findMany({
        where: {
          tenantId: ctx.tenantId, storeId: ctx.storeId, isVoided: false,
          expenseDate: { gte: since },
          category: { name: { contains: 'market', mode: 'insensitive' } },
        },
        include: { category: true },
      }),
    ]);

    const totalRevenue = sales.reduce((s, sale) => s + Number(sale.total), 0);
    const marketingSpend = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const newCustomers = await this.prisma.customer.count({
      where: { tenantId: ctx.tenantId, storeId: ctx.storeId, createdAt: { gte: since } },
    });

    const roi = marketingSpend > 0 ? (((totalRevenue - marketingSpend) / marketingSpend) * 100).toFixed(1) : 'N/A';
    const cac = newCustomers > 0 && marketingSpend > 0 ? Math.round(marketingSpend / newCustomers) : 0;

    return {
      periodo: period,
      dias_analizados: days,
      ingresos: Math.round(totalRevenue),
      inversion_marketing: marketingSpend,
      roi: `${roi}%`,
      nuevos_clientes: newCustomers,
      cac: cac > 0 ? `$${cac.toLocaleString()} COP` : 'N/A',
      clientes_por_dia: (newCustomers / days).toFixed(1),
      recomendacion: marketingSpend === 0
        ? 'No se detecta inversión en marketing. Se recomienda destinar al menos 5-10% de ingresos a marketing digital.'
        : roi === 'N/A' ? 'Datos insuficientes para calcular ROI.' : `ROI de ${roi}%. ${Number(roi) > 200 ? 'Excelente retorno.' : Number(roi) > 100 ? 'Buen retorno, optimizar canales.' : 'ROI bajo, revisar estrategia.'}`,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────

  private extractTrendsFromResults(fuentes: any[], focus: string): any[] {
    // Simple extraction of potential trends from search snippets
    const trendKeywords: Record<string, number> = {};
    const trendPatterns = [
      'tendencia', 'creciendo', 'popular', 'nuevo', 'innovador',
      '2025', '2026', 'moda', 'viral', 'sostenible', 'natural',
      'orgánico', 'tecnología', 'digital', 'personalizado',
    ];

    for (const fuente of fuentes) {
      const text = (fuente.snippet + ' ' + fuente.titulo).toLowerCase();
      for (const kw of trendPatterns) {
        if (text.includes(kw)) {
          trendKeywords[kw] = (trendKeywords[kw] || 0) + 1;
        }
      }
    }

    return Object.entries(trendKeywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([kw, count]) => ({ keyword: kw, menciones: count }));
  }
}
