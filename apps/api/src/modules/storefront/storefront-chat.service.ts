import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class StorefrontChatService {
  private readonly deepseekKey: string;
  private readonly deepseekModel: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.deepseekKey = config.get('DEEPSEEK_API_KEY', '');
    this.deepseekModel = config.get('DEEPSEEK_MODEL', 'deepseek-chat');
  }

  async chat(params: {
    tenantId?: string;
    slug?: string;
    message: string;
    history: ChatMessage[];
  }): Promise<{ reply: string }> {
    // Resolve tenant from slug if tenantId not provided
    let tenantId = params.tenantId;
    let storeName = 'Glamorapp';
    let storeDescription = '';
    let storeTagline = '';

    if (!tenantId && params.slug) {
      const sf = await this.prisma.storefront.findFirst({
        where: { slug: params.slug, isActive: true },
      });
      if (sf) {
        tenantId = sf.tenantId;
        storeName = (sf as any).displayName || storeName;
        storeDescription = (sf as any).description || '';
        storeTagline = (sf as any).tagline || '';
      }
    } else if (tenantId) {
      const sf = await this.prisma.storefront.findFirst({
        where: { tenantId, isActive: true },
      });
      if (sf) {
        storeName = (sf as any).displayName || storeName;
        storeDescription = (sf as any).description || '';
        storeTagline = (sf as any).tagline || '';
      }
    }

    // Build store context
    const context = await this.buildContext(tenantId);

    const systemPrompt = this.buildSystemPrompt({
      storeName,
      storeDescription,
      storeTagline,
      context,
    });

    const reply = await this.callDeepSeek(systemPrompt, params.history, params.message);
    return { reply };
  }

  private async buildContext(tenantId?: string): Promise<string> {
    if (!tenantId) return '';

    try {
      const [products, services, designs] = await Promise.all([
        this.prisma.product.findMany({
          where: { tenantId, deletedAt: null, isStoreVisible: true },
          select: { name: true, salePrice: true, category: { select: { name: true } }, description: true },
          take: 20,
          orderBy: { currentStock: 'desc' },
        }),
        this.prisma.service.findMany({
          where: { tenantId, isActive: true },
          select: { name: true, price: true, durationMinutes: true, category: true, description: true },
          take: 20,
          orderBy: { name: 'asc' },
        }),
        this.prisma.nailDesign.findMany({
          where: { tenantId, isActive: true },
          select: { name: true, technique: true, suggestedPrice: true },
          take: 10,
        }),
      ]);

      const parts: string[] = [];

      if (products.length > 0) {
        parts.push('PRODUCTOS DISPONIBLES:\n' + products.map(p =>
          `- ${p.name}${p.category ? ` (${p.category.name})` : ''}: $${Number(p.salePrice).toLocaleString('es-CO')} COP${p.description ? ` — ${p.description.slice(0, 80)}` : ''}`
        ).join('\n'));
      }

      if (services.length > 0) {
        parts.push('SERVICIOS:\n' + services.map(s =>
          `- ${s.name}${s.category ? ` [${s.category}]` : ''}: $${Number(s.price).toLocaleString('es-CO')} COP${s.durationMinutes ? `, ${s.durationMinutes} min` : ''}`
        ).join('\n'));
      }

      if (designs.length > 0) {
        parts.push('DISEÑOS DE UÑAS:\n' + designs.map(d =>
          `- ${d.name}${d.technique ? ` (${d.technique})` : ''}${d.suggestedPrice ? `: desde $${Number(d.suggestedPrice).toLocaleString('es-CO')} COP` : ''}`
        ).join('\n'));
      }

      return parts.join('\n\n');
    } catch {
      return '';
    }
  }

  private buildSystemPrompt(params: {
    storeName: string;
    storeDescription: string;
    storeTagline: string;
    context: string;
  }): string {
    return `Eres Glamy, la asistente virtual de ${params.storeName}${params.storeTagline ? ` — "${params.storeTagline}"` : ''}.
${params.storeDescription ? `\nSobre el salón: ${params.storeDescription}` : ''}

Tu misión es ayudar a los clientes a:
- Encontrar productos, servicios y diseños de uñas
- Conocer precios y disponibilidad
- Agendar citas (los invitas a hacer clic en "Agendar" junto al servicio)
- Resolver dudas sobre el salón

REGLAS:
- Responde siempre en español, de forma amable, breve y profesional
- Usa emojis con moderación (1-2 por mensaje máximo) 💅
- Si preguntan por algo que no tienes en el catálogo, díselo honestamente
- Para agendar, diles que hagan clic en el botón "Agendar" del servicio
- No inventes precios ni servicios que no estén en el catálogo
- Máximo 3-4 oraciones por respuesta salvo que el usuario pida más detalle
- Si no sabes algo, di "Te recomiendo contactar directamente al salón"

${params.context ? `CATÁLOGO ACTUAL:\n${params.context}` : 'El catálogo se está cargando. Puedo ayudarte con preguntas generales sobre el salón.'}`;
  }

  private async callDeepSeek(systemPrompt: string, history: ChatMessage[], userMessage: string): Promise<string> {
    if (!this.deepseekKey) {
      return 'Hola! Soy Glamy, tu asistente de belleza. En este momento estoy en mantenimiento. Por favor contacta directamente al salón. 💅';
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8).map(m => ({ role: m.role, content: m.content })), // max 8 turns of history
      { role: 'user', content: userMessage },
    ];

    try {
      const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.deepseekKey}`,
        },
        body: JSON.stringify({
          model: this.deepseekModel,
          messages,
          max_tokens: 512,
          temperature: 0.7,
        }),
      });

      if (!resp.ok) throw new Error(`DeepSeek error: ${resp.status}`);
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || 'Lo siento, no pude procesar tu mensaje. Intenta de nuevo. 😊';
    } catch (err: any) {
      console.error('[StorefrontChat] Error:', err.message);
      return 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo o contacta directamente al salón.';
    }
  }
}
