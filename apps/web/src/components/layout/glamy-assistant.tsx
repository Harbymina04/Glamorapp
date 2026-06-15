'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, MessageCircle, Minimize2, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';

interface Message { role: 'user' | 'assistant'; content: string }

const SUGGESTED = [
  '¿Cuánto vendí hoy?',
  '¿Qué productos tienen stock bajo?',
  '¿Cuáles son mis citas de hoy?',
  '¿Cómo configuro el IVA?',
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

function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>,
  );
}

export function GlamyAssistant() {
  const { user, token, plan } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `¡Hola${user?.firstName ? `, ${user.firstName}` : ''}! ✨ Soy **Glamy**, tu asistente. Puedo darte el resumen de tu negocio, ventas de hoy, stock bajo, citas, o ayudarte a usar la plataforma. ¿En qué te ayudo?`,
      }]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  // Gating: solo si el plan incluye el módulo de IA (Básico no lo tiene).
  const hasAI = !!(plan?.features as any)?.modules?.ai_agents;
  if (!mounted || !hasAI || !token) return null;

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    const next = [...messages, { role: 'user' as const, content: msg }];
    setMessages(next);
    setLoading(true);
    try {
      const history = next.filter(m => m.role === 'user' || m.role === 'assistant').slice(-6);
      const data = await api.post('/ai/glamy/chat', { message: msg, history }, { token });
      setMessages(prev => [...prev, { role: 'assistant', content: data?.reply || 'No pude procesar tu mensaje. Intenta de nuevo.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hubo un problema de conexión. Intenta de nuevo.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #EF2D8F, #8B5CF6)' }}
        aria-label="Abrir Glamy"
      >
        {open ? <Minimize2 className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100"
          style={{ maxHeight: '80vh', height: '560px' }}
        >
          <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: 'linear-gradient(135deg, #EF2D8F, #8B5CF6)' }}>
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-tight">Glamy</p>
              <p className="text-white/70 text-xs truncate">Tu asistente de negocio</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-full hover:bg-white/20 transition">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full shrink-0 mr-2 flex items-center justify-center text-sm mt-1" style={{ background: 'linear-gradient(135deg, #EF2D8F, #8B5CF6)' }}>✨</div>
                )}
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-[#EF2D8F] text-white rounded-br-md' : 'bg-white text-gray-800 shadow-sm rounded-bl-md'}`}>
                  {renderContent(m.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full shrink-0 mr-2 flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg, #EF2D8F, #8B5CF6)' }}>✨</div>
                <div className="bg-white rounded-2xl rounded-bl-md shadow-sm"><TypingDots /></div>
              </div>
            )}
            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTED.map(s => (
                  <button key={s} onClick={() => send(s)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 hover:border-[#EF2D8F] hover:text-[#EF2D8F] transition shadow-sm">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-gray-100 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder="Escribe tu mensaje..." disabled={loading}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F] disabled:opacity-50" />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-full flex items-center justify-center transition disabled:opacity-40 shrink-0" style={{ background: 'linear-gradient(135deg, #EF2D8F, #8B5CF6)' }}>
                {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-300 mt-2">Powered by Glamorapp IA · solo lectura</p>
          </div>
        </div>
      )}
    </>
  );
}
