"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import "./landing.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface ApiPlan {
  id: string; name: string; slug: string; description: string;
  monthlyPrice: string; yearlyPrice: string;
  maxUsers: number; maxBranches: number; isPopular: boolean;
  features?: { limits?: { maxUsers: number; maxBranches: number; aiTokensMonthly: number } };
}

function formatPrice(value: string | number) {
  return Number(value).toLocaleString("es-CO");
}

// Static feature lists per plan position (marketing copy)
const PLAN_FEATURES = [
  { // plan 0 — starter
    tag: "Para empezar",
    moduleCount: "5",
    moduleLabel: "módulos esenciales incluidos",
    prevLabel: "Incluye",
    items: [
      { ok: true, text: "Inicio + Resumen del negocio" },
      { ok: true, text: "Ventas POS" },
      { ok: true, text: "Agendamiento de citas" },
      { ok: true, text: "Catálogo de productos" },
      { ok: true, text: (m: number, b: number) => `Hasta ${m} usuarios · ${b} sucursal` },
      { ok: false, text: "Agentes IA" },
      { ok: false, text: "Reportes avanzados" },
    ],
  },
  { // plan 1 — profesional
    tag: "★ Más popular",
    moduleCount: "10",
    moduleLabel: "módulos + Agente IA Glamy",
    prevLabel: "Todo lo del Inicial, más",
    items: [
      { ok: true, text: "Agente IA Glamy en WhatsApp", bold: true },
      { ok: true, text: "Inventario + alertas de stock" },
      { ok: true, text: "Catálogo de diseño de uñas" },
      { ok: true, text: "Clientes + segmentos + puntos" },
      { ok: true, text: "Reportes y comisiones" },
      { ok: true, text: (m: number, b: number) => `Hasta ${m} usuarios · ${b} sucursales` },
      { ok: true, text: "Soporte prioritario" },
    ],
  },
  { // plan 2 — enterprise
    tag: "Multi‑sucursal",
    moduleCount: "12+",
    moduleLabel: "módulos · IA · API · Multi‑IA",
    prevLabel: "Todo lo del Profesional, más",
    items: [
      { ok: true, text: "Múltiples agentes IA personalizados", bold: true },
      { ok: true, text: "Sucursales ilimitadas" },
      { ok: true, text: "Usuarios ilimitados con roles" },
      { ok: true, text: "Proveedores + cuentas por pagar" },
      { ok: true, text: "API y webhooks" },
      { ok: true, text: "Account manager dedicado" },
      { ok: true, text: "SLA 99.9% y onboarding 1:1" },
    ],
  },
];

const CHECK = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const CROSS = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

export default function LandingPage() {
  const [billingMode, setBillingMode] = useState<"m" | "y">("m");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const DEFAULT_VIDEO = "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&rel=0&modestbranding=1&loop=1&playlist=dQw4w9WgXcQ";
  const [videoSrc, setVideoSrc] = useState(DEFAULT_VIDEO);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch(`${API}/platform/config`)
      .then(r => r.json())
      .then(d => { if (d.storeVideoUrl) setVideoSrc(d.storeVideoUrl); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API}/plans/public`)
      .then(r => r.json())
      .then((data: ApiPlan[]) => {
        // Show all active plans, up to 3
        setPlans(data.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {/* ===== NAV ===== */}
      <div className={scrolled ? "nav-wrap scrolled" : "nav-wrap"}>
        <nav className="nav">
          <a className="brand" href="#">
            <img src="/assets/logo.png" alt="Glamorapp" />
          </a>
          <div className="nav-links">
            <a href="#modulos">Módulos</a>
            <a href="#ia">IA Glamy</a>
            <a href="#planes">Planes</a>
            <a href="#recursos">Recursos</a>
            <Link href="/tienda" style={{ color: "var(--primary, #EF2D8F)", fontWeight: 600 }}>Tienda</Link>
          </div>
          <div className="nav-cta">
            <Link className="btn btn-ghost" href="/auth/login">Iniciar sesión</Link>
            <Link className="btn btn-primary" href="/auth/register">Registrarse</Link>
          </div>
          <button className={menuOpen ? "hamburger open" : "hamburger"} onClick={() => setMenuOpen(v => !v)} aria-label="Menú">
            <span /><span /><span />
          </button>
        </nav>
      </div>

      {/* Mobile menu */}
      <div className={menuOpen ? "mobile-menu open" : "mobile-menu"}>
        <a href="#modulos" onClick={() => setMenuOpen(false)}>Módulos</a>
        <a href="#ia" onClick={() => setMenuOpen(false)}>IA Glamy</a>
        <a href="#planes" onClick={() => setMenuOpen(false)}>Planes</a>
        <a href="#recursos" onClick={() => setMenuOpen(false)}>Recursos</a>
        <div className="mobile-ctas">
          <Link className="btn btn-ghost" href="/auth/login" onClick={() => setMenuOpen(false)}>Iniciar sesión</Link>
          <Link className="btn btn-primary" href="/auth/register" onClick={() => setMenuOpen(false)}>Registrarse gratis</Link>
        </div>
      </div>

      {/* ===== HERO ===== */}
      <section className="hero" style={{ paddingTop: 80 }}>
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="dot"></span>
            <span>Nuevo</span>
            <span className="ai-tag">· Agentes IA</span>
            <span>en tu salón</span>
          </span>
          <h1 className="hero-title">Gestiona la <em>belleza</em> de tu negocio en un solo lugar.</h1>
          <p className="hero-sub">
            Glamorapp es la plataforma todo‑en‑uno para salones de belleza, spas y estudios de uñas. Inventario, agenda, ventas, clientes y reportes — potenciado con agentes de IA que conversan con tus clientas por ti.
          </p>
          <div className="hero-ctas">
            <Link className="btn btn-primary btn-lg" href="/auth/register">
              Empezar gratis
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
            <Link className="btn btn-outline btn-lg" href="/auth/login">Iniciar sesión</Link>
          </div>
          <div className="hero-meta">
            <div className="hero-meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              14 días gratis
            </div>
            <div className="hero-meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Sin tarjeta
            </div>
            <div className="hero-meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Soporte en español
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="stack">
            <div className="stack-card main">
              <img src="/assets/inicio.png" alt="Dashboard de Glamorapp" />
            </div>
            <div className="stack-card float-top">
              <img src="/assets/citas.png" alt="Agendamiento de Citas" />
            </div>
          </div>
          <div className="float-badge badge-1">
            <div className="ico grad">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.93 19.07 1.41-1.41"/><path d="m17.66 6.34 1.41-1.41"/><circle cx="12" cy="12" r="4"/></svg>
            </div>
            <div>
              <p className="label">Cita confirmada por IA</p>
              <p className="val">+ 24 hoy</p>
            </div>
          </div>
          <div className="float-badge badge-2">
            <div className="ico pink">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
            </div>
            <div>
              <p className="label">Ingresos este mes</p>
              <p className="val">$125,430 <span style={{ color: '#16A34A', fontSize: 12, fontWeight: 600 }}>↑ 18.6%</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TRUST BAR ===== */}
      <div className="trust">
        <div className="trust-inner">
          <span className="trust-label">Confían en Glamorapp</span>
          <div className="trust-logos">
            <span className="trust-logo">Bella Estudio</span>
            <span className="trust-logo bold">ROSA &amp; CO</span>
            <span className="trust-logo">Nailcraft</span>
            <span className="trust-logo bold">SALON·V</span>
            <span className="trust-logo">Lumière Spa</span>
            <span className="trust-logo bold">Mía Beauty</span>
          </div>
        </div>
      </div>

      {/* ===== AI AGENTS SECTION ===== */}
      <section className="ai-section" id="ia">
        <div className="container">
          <div className="section-head">
            <span className="section-eyebrow" style={{ background: "linear-gradient(96deg, #FFB8D9, #E0CFFF)", WebkitBackgroundClip: "text", backgroundClip: "text" }}>★ Agentes de IA</span>
            <h2 className="section-title">Tu recepcionista, vendedora y <em>analista</em> —<br/>todo en una sola IA.</h2>
            <p className="section-sub">Glamy responde por WhatsApp, agenda citas, recomienda servicios y entiende tu inventario. Tú dedícate a lo que mejor sabes hacer: la belleza.</p>
          </div>
          <div className="ai-grid">
            <div className="ai-chat">
              <div className="ai-chat-head">
                <div className="ai-avatar"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg></div>
                <div style={{ flex: 1 }}><div className="ai-name">Glamy · Agente IA</div><div className="ai-status">Conectada con tu agenda</div></div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>WhatsApp</div>
              </div>
              <div className="msg in"><div><div className="bubble">Hola, quería agenda manicura para mañana en la tarde 💅</div><div className="msg-meta">María · 14:02</div></div></div>
              <div className="msg out"><div><div className="bubble">¡Hola María! Tengo disponibilidad mañana a las <strong>15:00</strong> con Sofía o a las <strong>17:30</strong> con Ana. ¿Cuál prefieres?</div><div className="msg-meta">Glamy · 14:02</div></div></div>
              <div className="msg in"><div><div className="bubble">A las 5:30 con Ana, perfecto</div><div className="msg-meta">María · 14:03</div></div></div>
              <div className="msg out"><div><div className="bubble">Listo ✨ Cita confirmada: <strong>Mañana 17:30 · Manicure con Ana</strong>. Te envío recordatorio el día anterior. ¿Te gustaría agregar diseño de uñas? Tenemos 20% en French Clásico esta semana.</div><div className="msg-meta">Glamy · 14:03</div></div></div>
              <div className="ai-suggestion"><div className="chip">+ Sugerir add‑on</div><div className="chip">+ Confirmar pago</div><div className="chip">+ Reagendar</div></div>
            </div>
            <div className="ai-feats">
              {[
                { ico: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z", title: "Agendamiento por WhatsApp", desc: "Tus clientas escriben en lenguaje natural y Glamy reserva la cita, asigna estilista y envía recordatorios automáticos." },
                { ico: "m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z", title: "Recomendaciones inteligentes", desc: "Sugiere productos, diseños de uñas y servicios según el historial y preferencias de cada clienta — aumenta tu ticket promedio." },
                { ico: "M3 3v18h18M19 9l-5 5-4-4-3 3", title: "Análisis y predicciones", desc: "Pregúntale en lenguaje natural: \"¿qué servicio crece más?\" o \"¿cuándo reordeno esmalte gel?\". Glamy lee tus datos y responde." },
                { ico: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z", title: "Atención 24/7 sin contratar", desc: "Glamy responde fuera de horario, en domingos y feriados. Tu salón nunca pierde una cita por no contestar a tiempo." },
              ].map((f, i) => (
                <div className="ai-feat" key={i}>
                  <div className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={f.ico}/></svg></div>
                  <div><h4>{f.title}</h4><p>{f.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== MODULES ===== */}
      <section id="modulos">
        <div className="container">
          <div className="section-head">
            <span className="section-eyebrow">12 módulos · una plataforma</span>
            <h2 className="section-title">Todo lo que tu salón necesita,<br/>en una sola <em>aplicación</em>.</h2>
            <p className="section-sub">Diseñado para salones de belleza, estudios de uñas y spas. Empieza con lo básico y activa módulos a medida que creces.</p>
          </div>
          <div className="modules-grid">
            {[
              { ico: "pink", svg: "M3 9 12 2l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10", title: "Inicio", desc: "Resumen de tu negocio: ventas del día, citas, stock y alertas en tiempo real." },
              { ico: "violet", svg: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96 12 12.01 20.73 6.96 M12 22.08V12", title: "Inventario", desc: "Controla stock, valoración, alertas de bajo inventario y movimientos por sucursal." },
              { ico: "rose", svg: "M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2 M20 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2 M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6", title: "Ventas POS", desc: "Caja rápida con productos, servicios y paquetes. Cobra en efectivo, tarjeta o transferencia." },
              { ico: "amber", svg: "M3 4h18v18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4z M16 2v4 M8 2v4 M3 10h18", title: "Agendamiento", desc: "Agenda visual por estilista, con recordatorios automáticos y reservas online." },
              { ico: "pink", svg: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4", title: "Catálogo de Productos", desc: "Organiza tu catálogo por categoría, marca y proveedor con fotos y SKU." },
              { ico: "violet", svg: "M13.5 6.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5 M19 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5 M5 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5 M10.5 19.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5", title: "Diseños de Uñas", desc: "Galería visual de diseños con técnicas, colores y favoritos para tus clientas." },
              { ico: "green", svg: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75", title: "Clientes", desc: "CRM con historial, puntos, segmentos VIP y cumpleaños para fidelizar." },
              { ico: "blue", svg: "M1 3h15v13a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3z M16 8h4l3 3v5h-7V8z M5.5 18.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5 M18.5 18.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5", title: "Proveedores", desc: "Administra contactos, cuentas por pagar y condiciones de cada proveedor." },
              { ico: "teal", svg: "M12 20V10 M18 20V4 M6 20v-4", title: "Reportes", desc: "KPIs en tiempo real: ingresos, top servicios, ticket promedio y comparativos." },
              { ico: "amber", svg: "M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", title: "Gastos", desc: "Registra y categoriza gastos operativos, comisiones y nómina." },
              { ico: "indigo", svg: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8", title: "Usuarios y Roles", desc: "Control granular de permisos para estilistas, recepción y administradoras." },
            ].map((m, i) => (
              <div className="mod" key={i}>
                <div className={`mod-ico ${m.ico}`}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={m.svg}/></svg></div>
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
              </div>
            ))}
            <div className="mod" style={{ background: "var(--ink)", color: "white", borderColor: "transparent" }}>
              <div className="mod-ai-pill">CON IA</div>
              <div className="mod-ico" style={{ background: "rgba(255,255,255,.08)", color: "#FFB8D9" }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg></div>
              <h3 style={{ color: "white" }}>Agentes IA</h3>
              <p style={{ color: "rgba(255,255,255,.65)" }}>Glamy responde por ti en WhatsApp, agenda, recomienda y analiza. 24/7.</p>
            </div>
          </div>
          <div className="features-row">
            <div className="feature-card"><div className="num">01</div><h4>Multisucursal nativo</h4><p>Administra varias ubicaciones, inventarios y equipos desde un solo panel.</p></div>
            <div className="feature-card"><div className="num">02</div><h4>Reservas online</h4><p>Tu agenda pública con link para Instagram y WhatsApp. Sin comisiones.</p></div>
            <div className="feature-card"><div className="num">03</div><h4>Respaldo automático</h4><p>Tus datos seguros en la nube, con respaldo diario y exportación a Excel/PDF.</p></div>
          </div>
        </div>
      </section>

      {/* ===== PLANS ===== */}
      <section className="plans-section" id="planes">
        <div className="container">
          <div className="section-head">
            <span className="section-eyebrow">Planes y precios</span>
            <h2 className="section-title">Empieza simple. Crece <em>tan rápido</em> como tu salón.</h2>
            <p className="section-sub">Sin permanencia. Cambia o cancela cuando quieras. Todos los planes incluyen 14 días gratis.</p>
            <div className="billing-toggle">
              <button className={billingMode === "m" ? "active" : ""} onClick={() => setBillingMode("m")}>Mensual</button>
              <button className={billingMode === "y" ? "active" : ""} onClick={() => setBillingMode("y")}>Anual <span className="save-tag">−20%</span></button>
            </div>
          </div>
          <div className="plans">
            {plans.map((plan, i) => {
              const feat = PLAN_FEATURES[i] ?? PLAN_FEATURES[2];
              const monthlyAmt = formatPrice(plan.monthlyPrice);
              const yearlyAmt  = formatPrice(plan.yearlyPrice);
              const yearlyTotal = (Number(plan.yearlyPrice)).toLocaleString("es-CO");
              const currentAmt = billingMode === "m" ? monthlyAmt : yearlyAmt;
              const billedText = billingMode === "m"
                ? "Facturado mensualmente · IVA incluido"
                : `Facturado anualmente · $${yearlyTotal}/año`;
              const isEnterprise = i === plans.length - 1;
              const maxU = plan.features?.limits?.maxUsers ?? plan.maxUsers;
              const maxB = plan.features?.limits?.maxBranches ?? plan.maxBranches;

              return (
                <div key={plan.id} className={plan.isPopular ? "plan featured" : "plan"}>
                  <span className="plan-tag">{feat.tag}</span>
                  <h3>{plan.name}</h3>
                  <p className="plan-desc">{plan.description}</p>
                  <div className="plan-price">
                    <span className="currency">$</span>
                    <span className="amount">{currentAmt}</span>
                    <span className="period">COP /mes</span>
                  </div>
                  <p className="plan-billed">{billedText}</p>
                  {isEnterprise ? (
                    <a href="mailto:ventas@glamorapp.com" className="plan-cta outline" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>Hablar con ventas</a>
                  ) : Number(plan.monthlyPrice) === 0 ? (
                    <Link href={`/auth/register?plan=${plan.slug}`} className="plan-cta outline" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>Empezar gratis</Link>
                  ) : (
                    <Link href={`/auth/register?plan=${plan.slug}`} className={plan.isPopular ? "plan-cta" : "plan-cta outline"} style={{ display: "block", textAlign: "center", textDecoration: "none" }}>Empezar 14 días gratis</Link>
                  )}
                  <div className="plan-count">
                    <span className="n">{feat.moduleCount}</span>
                    <span className="l">{feat.moduleLabel}</span>
                  </div>
                  <p className="plan-modlabel">{feat.prevLabel}</p>
                  <ul className="plan-feats">
                    {feat.items.map((item, j) => {
                      const text = typeof item.text === "function" ? item.text(maxU, maxB) : item.text;
                      return (
                        <li key={j} className={item.ok ? "" : "dim"}>
                          {item.ok ? CHECK : CROSS}
                          {" "}
                          {(item as any).bold ? <strong>{text}</strong> : text}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {/* Fallback skeleton while loading */}
            {plans.length === 0 && [0, 1, 2].map(i => (
              <div key={i} className="plan" style={{ opacity: 0.4 }}>
                <div style={{ height: 200, background: "#f3f4f6", borderRadius: 8 }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== VIDEO ===== */}
      <section className="video-section" id="recursos">
        <div className="container">
          <div className="section-head">
            <span className="section-eyebrow">Demo en vivo</span>
            <h2 className="section-title">Mira cómo funciona <em>la tienda</em> en acción.</h2>
            <p className="section-sub">Desde catálogo de productos hasta checkout con IA — todo en un solo lugar para tus clientas.</p>
          </div>
          <div className="video-wrapper">
            <iframe
              src={videoSrc}
              title="Glamorapp — Demo Tienda Virtual"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <div className="cta-final">
        <div className="cta-card">
          <h2>¿Lista para hacer crecer tu <em>salón</em>?<br/>Empieza gratis hoy.</h2>
          <p>14 días gratis del Plan Profesional. Sin tarjeta de crédito. Configuración guiada con tu agente IA Glamy.</p>
          <div className="ctas">
            <Link className="btn btn-primary btn-lg" href="/auth/register">Registrarme ahora <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></Link>
            <Link className="btn btn-outline btn-lg" href="/auth/login">Iniciar sesión</Link>
          </div>
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <footer>
        <div className="foot">
          <div className="foot-brand">
            <img src="/assets/logo.png" alt="Glamorapp" />
            <p>La plataforma todo‑en‑uno con agentes de IA para salones de belleza, spas y estudios de uñas en Latinoamérica.</p>
          </div>
          <div className="foot-col"><h5>Producto</h5><ul><li><a href="#modulos">Módulos</a></li><li><a href="#ia">Agente IA Glamy</a></li><li><a href="#planes">Planes</a></li><li><a href="#">Novedades</a></li></ul></div>
          <div className="foot-col"><h5>Recursos</h5><ul><li><a href="#">Centro de ayuda</a></li><li><a href="#">Guías para salones</a></li><li><a href="#">Blog de belleza</a></li><li><a href="#">API para desarrolladores</a></li></ul></div>
          <div className="foot-col"><h5>Empresa</h5><ul><li><a href="#">Sobre nosotros</a></li><li><a href="#">Contacto</a></li><li><a href="#">Privacidad</a></li><li><a href="#">Términos</a></li></ul></div>
        </div>
        <div className="foot-bottom">
          <span>© 2025 Glamorapp — Gestiona la belleza de tu negocio.</span>
          <span>Hecho con <span style={{ color: "var(--pink-500)" }}>♥</span> para salones de Latinoamérica</span>
        </div>
      </footer>
    </>
  );
}
