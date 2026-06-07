'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, MessageCircle, Minimize2, Sparkles, ShoppingCart, CheckCircle2, Package } from 'lucide-react';
import { useStoreCart } from '@/stores/store-cart';

// ─── Types (mirror backend GlamyAction) ───────────────────────────────────────

interface GlamyProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  category: string | null;
  stock: number;
  tenantId: string;
  storeName: string;
}

interface GlamyService {
  id: string;
  name: string;
  price: number;
  duration: number | null;
  category: string | null;
}

type GlamyAction =
  | { type: 'show_products'; products: GlamyProduct[] }
  | { type: 'show_services'; services: GlamyService[] }
  | { type: 'add_to_cart'; items: GlamyProduct[] }
  | { type: 'order_created'; order: { id: string; orderNumber: string; total: number; buyerName: string } };

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
  actions?: GlamyAction[];
}

interface Props {
  tenantId?: string;
  slug?: string;
  storeName?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const SUGGESTED = [
  '¿Qué productos tienen?',
  '¿Cuánto cuesta una manicure?',
  'Quiero comprar un esmalte',
  '¿Cómo agendo una cita?',
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

function ProductCards({ products, onAddToCart }: { products: GlamyProduct[]; onAddToCart: (p: GlamyProduct) => void }) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      {products.map(p => (
        <div key={p.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm flex gap-3 p-2">
          {p.imageUrl ? (
            <img src={p.imageUrl} alt={p.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-pink-50 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-pink-300" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
            {p.category && <p className="text-xs text-gray-400">{p.category}</p>}
            <p className="text-sm font-bold text-[#EF2D8F] mt-0.5">${p.price.toLocaleString('es-CO')}</p>
          </div>
          <button
            onClick={() => onAddToCart(p)}
            disabled={p.stock === 0}
            className="self-center shrink-0 p-1.5 rounded-lg transition disabled:opacity-40 hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #EF2D8F, #8B5CF6)' }}
            title={p.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
          >
            <ShoppingCart className="w-4 h-4 text-white" />
          </button>
        </div>
      ))}
    </div>
  );
}

function ServiceCards({ services }: { services: GlamyService[] }) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      {services.map(s => (
        <div key={s.id} className="bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
              {s.category && <p className="text-xs text-gray-400">{s.category}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-[#EF2D8F]">${s.price.toLocaleString('es-CO')}</p>
              {s.duration && <p className="text-xs text-gray-400">{s.duration} min</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function OrderConfirmation({ order }: { order: { id: string; orderNumber: string; total: number; buyerName: string } }) {
  return (
    <div className="mt-2 bg-green-50 border border-green-200 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
        <p className="text-sm font-bold text-green-800">¡Pedido creado!</p>
      </div>
      <p className="text-xs text-green-700">
        <span className="font-semibold">{order.buyerName}</span> · Orden <span className="font-mono font-semibold">{order.orderNumber}</span>
      </p>
      <p className="text-xs text-green-700 mt-0.5">
        Total: <span className="font-bold">${order.total.toLocaleString('es-CO')} COP</span>
      </p>
      <p className="text-xs text-green-600 mt-1">El salón confirmará tu pedido pronto 💅</p>
    </div>
  );
}

function AddedToCart({ items }: { items: GlamyProduct[] }) {
  return (
    <div className="mt-2 bg-purple-50 border border-purple-200 rounded-xl p-2.5">
      <div className="flex items-center gap-2">
        <ShoppingCart className="w-4 h-4 text-purple-600 shrink-0" />
        <p className="text-xs text-purple-800">
          <span className="font-semibold">{items.map(i => i.name).join(', ')}</span>
          {items.length === 1 ? ' agregado' : ' agregados'} al carrito
        </p>
      </div>
    </div>
  );
}

function ActionBlock({ action, onAddToCart }: { action: GlamyAction; onAddToCart: (p: GlamyProduct) => void }) {
  switch (action.type) {
    case 'show_products':
      return <ProductCards products={action.products} onAddToCart={onAddToCart} />;
    case 'show_services':
      return <ServiceCards services={action.services} />;
    case 'add_to_cart':
      return <AddedToCart items={action.items} />;
    case 'order_created':
      return <OrderConfirmation order={action.order} />;
    default:
      return null;
  }
}

// ─── Main component ────────────────────────────────────────────────────────────

export function StoreChatbot({ tenantId, slug, storeName = 'Glamorapp' }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { addItem, items: cartItems } = useStoreCart();

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `¡Hola! 💅 Soy Glamy, tu asistente de **${storeName}**. Puedo ayudarte a encontrar productos, ver servicios, agregar al carrito y hasta crear tu pedido. ¿En qué te ayudo?`,
        ts: Date.now(),
      }]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (open) setUnread(0);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleAddToCart = (product: GlamyProduct) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      shopName: product.storeName,
      tenantId: product.tenantId,
      imageUrl: product.imageUrl ?? undefined,
    });
  };

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: msg, ts: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const history = newMessages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API}/storefront/public/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          slug,
          message: msg,
          history,
          cart: cartItems.map(i => ({
            productId: i.productId,
            name: i.name,
            price: i.price,
            qty: i.qty,
          })),
        }),
      });

      const data = await res.json();
      const reply: string = data.reply || 'Lo siento, no pude procesar tu mensaje. Intenta de nuevo.';
      const actions: GlamyAction[] = data.actions ?? [];

      // Auto-execute add_to_cart actions
      for (const action of actions) {
        if (action.type === 'add_to_cart') {
          for (const item of action.items) handleAddToCart(item);
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply, ts: Date.now(), actions }]);
      if (!open) setUnread(n => n + 1);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, hubo un problema de conexión. Por favor intenta de nuevo.',
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const renderContent = (text: string) => {
    // Split on bold (**text**), markdown links ([label](url)), and bare URLs
    const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)]+\)|https?:\/\/\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      // Markdown link: [label](url)
      const mdLink = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
      if (mdLink) {
        return (
          <a key={i} href={mdLink[2]} target="_blank" rel="noopener noreferrer"
            className="underline text-[#EF2D8F] font-medium">
            {mdLink[1]} 📍
          </a>
        );
      }
      // Bare URL
      if (part.startsWith('http://') || part.startsWith('https://')) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            className="underline text-[#EF2D8F] font-medium break-all">
            Ver en el mapa 📍
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #EF2D8F, #8B5CF6)' }}
        aria-label="Abrir chat"
      >
        {open
          ? <Minimize2 className="w-6 h-6 text-white" />
          : <MessageCircle className="w-6 h-6 text-white" />
        }
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100"
          style={{ maxHeight: '80vh', height: '580px' }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ background: 'linear-gradient(135deg, #EF2D8F, #8B5CF6)' }}
          >
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight">Glamy</p>
              <p className="text-white/70 text-xs truncate">Asistente de {storeName}</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-full hover:bg-white/20 transition">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div
                    className="w-7 h-7 rounded-full shrink-0 mr-2 flex items-center justify-center text-sm mt-1"
                    style={{ background: 'linear-gradient(135deg, #EF2D8F, #8B5CF6)' }}
                  >
                    💅
                  </div>
                )}
                <div className="max-w-[85%] flex flex-col">
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#EF2D8F] text-white rounded-br-md'
                      : 'bg-white text-gray-800 shadow-sm rounded-bl-md'
                  }`}>
                    {renderContent(m.content)}
                  </div>

                  {/* Action cards below assistant bubble */}
                  {m.role === 'assistant' && m.actions && m.actions.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {m.actions.map((action, ai) => (
                        <ActionBlock key={ai} action={action} onAddToCart={handleAddToCart} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="w-7 h-7 rounded-full shrink-0 mr-2 flex items-center justify-center text-sm"
                  style={{ background: 'linear-gradient(135deg, #EF2D8F, #8B5CF6)' }}
                >
                  💅
                </div>
                <div className="bg-white rounded-2xl rounded-bl-md shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            {/* Suggestions */}
            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTED.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 hover:border-[#EF2D8F] hover:text-[#EF2D8F] transition shadow-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Escribe tu mensaje..."
                disabled={loading}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F] disabled:opacity-50"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-full flex items-center justify-center transition disabled:opacity-40 shrink-0"
                style={{ background: 'linear-gradient(135deg, #EF2D8F, #8B5CF6)' }}
              >
                {loading
                  ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : <Send className="w-4 h-4 text-white" />
                }
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-300 mt-2">Powered by Glamorapp IA</p>
          </div>
        </div>
      )}
    </>
  );
}
