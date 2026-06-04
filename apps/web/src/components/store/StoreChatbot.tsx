'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, MessageCircle, Minimize2, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

interface Props {
  tenantId?: string;
  slug?: string;
  storeName?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const SUGGESTED = [
  '¿Qué servicios tienen?',
  '¿Cuánto cuesta una manicure?',
  '¿Cómo agendo una cita?',
  '¿Tienen diseños de uñas?',
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

export function StoreChatbot({ tenantId, slug, storeName = 'Glamorapp' }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Welcome message on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `¡Hola! 💅 Soy Glamy, tu asistente virtual de **${storeName}**. Puedo ayudarte a encontrar productos, servicios, precios y agendar citas. ¿En qué te puedo ayudar?`,
        ts: Date.now(),
      }]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (open) setUnread(0);
  }, [open]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: msg, ts: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const history = newMessages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${API}/storefront/public/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, slug, message: msg, history }),
      });
      const data = await res.json();
      const reply = data.reply || 'Lo siento, no pude procesar tu mensaje. Intenta de nuevo.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply, ts: Date.now() }]);
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

  // Render markdown-ish: **bold** and newlines
  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
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
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100"
          style={{ maxHeight: '75vh', height: '520px' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ background: 'linear-gradient(135deg, #EF2D8F, #8B5CF6)' }}>
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
                  <div className="w-7 h-7 rounded-full shrink-0 mr-2 flex items-center justify-center text-sm"
                    style={{ background: 'linear-gradient(135deg, #EF2D8F, #8B5CF6)' }}>
                    💅
                  </div>
                )}
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#EF2D8F] text-white rounded-br-md'
                    : 'bg-white text-gray-800 shadow-sm rounded-bl-md'
                }`}>
                  {renderContent(m.content)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full shrink-0 mr-2 flex items-center justify-center text-sm"
                  style={{ background: 'linear-gradient(135deg, #EF2D8F, #8B5CF6)' }}>
                  💅
                </div>
                <div className="bg-white rounded-2xl rounded-bl-md shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            {/* Suggestions — show only after first assistant message, no user messages yet */}
            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTED.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 hover:border-[#EF2D8F] hover:text-[#EF2D8F] transition shadow-sm">
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
                placeholder="Escribe tu pregunta..."
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
