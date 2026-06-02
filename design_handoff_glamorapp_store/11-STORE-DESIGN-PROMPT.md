# Glamorapp Store — Design Prompt para Tienda Digital

## Instrucción Principal

Eres el diseñador frontend de la **tienda digital de Glamorapp** (`tienda.glamorapp.com`), un marketplace de belleza donde los clientes compran productos, agendan citas y descubren salones de belleza. Esta NO es una herramienta administrativa — es una **experiencia de compra** orientada al consumidor final.

Piensa en la estética de **Sephora + Booksy + Rappi** adaptada al mundo beauty colombiano: visual, aspiracional, centrada en imágenes, con un flujo de compra limpio e intuitivo. La interfaz debe sentirse como navegar una tienda de belleza premium desde el celular o la computadora.

---

## Diferencia con el SaaS Admin

```
SaaS (app.glamorapp.com)          Tienda (tienda.glamorapp.com)
─────────────────────             ──────────────────────────
Dashboard, tablas, forms          Cards, grids, galerías
Sidebar fija 240px                Navbar top + categorías
Datos, KPIs, gestión              Imágenes, precios, CTAs
Desktop-first                     Mobile-first
Fucsia en acentos puntuales       Fucsia protagonista en branding
Fondo gris #F8FAFC                Fondo blanco + secciones con color
Tipografía compacta 14px          Tipografía aireada, más grande
Usuario: dueña del salón          Usuario: clienta buscando servicios
```

---

## Identidad Visual de la Tienda

### Personalidad
- **Sensación:** Como entrar a Sephora online — limpio, aspiracional, con productos que quieres tocar.
- **Tono:** Cálido, femenino, moderno. Invita a explorar, no a trabajar.
- **Imágenes:** Protagonistas absolutas. Productos en alta calidad, fotos de uñas, manos cuidadas, ambientes de salón.
- **Espacio:** Generoso. Mucho aire entre elementos. Nada apretado.
- **Mobile-first:** 70%+ del tráfico será desde celulares.

### Paleta de Colores

Mismos colores de marca pero usados diferente:

```css
:root {
  /* Brand — más protagonismo que en el SaaS */
  --store-primary: #EF2D8F;
  --store-primary-hover: #D4267E;
  --store-primary-light: #FFF1F8;         /* Fondos de secciones rosa */
  --store-primary-soft: #FCE7F3;          /* Badges, tags */

  /* Fondos — más blanco, más limpio */
  --store-bg: #FFFFFF;                     /* Fondo principal BLANCO */
  --store-bg-section: #FAFAFA;            /* Secciones alternas */
  --store-bg-accent: #FFF1F8;             /* Secciones rosa suave */
  --store-bg-dark: #1E1238;               /* Footer, banners oscuros */

  /* Texto */
  --store-text-primary: #111827;           /* Más oscuro que SaaS para legibilidad */
  --store-text-secondary: #6B7280;
  --store-text-muted: #9CA3AF;
  --store-text-on-dark: #FFFFFF;
  --store-text-price: #111827;             /* Precios siempre bold y oscuros */
  --store-text-price-old: #9CA3AF;         /* Precio tachado */

  /* Acciones */
  --store-cta: #EF2D8F;                   /* Botones de compra */
  --store-cta-hover: #D4267E;
  --store-cta-secondary: #1E1238;         /* Botón oscuro alternativo */
  --store-wishlist: #EF4444;              /* Corazón de favoritos */

  /* Rating */
  --store-star-filled: #FBBF24;           /* Estrellas amarillas */
  --store-star-empty: #E5E7EB;

  /* Status pedidos */
  --store-status-pending: #F97316;
  --store-status-confirmed: #22C55E;
  --store-status-shipping: #3B82F6;
  --store-status-delivered: #22C55E;
  --store-status-cancelled: #EF4444;

  /* Badges de categoría */
  --store-cat-nails: #F43F5E;
  --store-cat-hair: #8B5CF6;
  --store-cat-makeup: #EC4899;
  --store-cat-skin: #F97316;
  --store-cat-spa: #14B8A6;

  /* Gradientes */
  --store-gradient-hero: linear-gradient(135deg, #EF2D8F 0%, #8B5CF6 100%);
  --store-gradient-card: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.6) 100%);
  /* Para overlay sobre imágenes de banner */
}
```

### Tipografía

```
Font: Inter (misma que SaaS para coherencia de marca)

Hero title:        36-48px, Bold (700), tracking -0.02em
Section title:     24-28px, Bold (700)
Product name:      16px, Semibold (600)
Product price:     18px, Bold (700), color #111827
Price old:         14px, Regular (400), line-through, color #9CA3AF
Body:              16px, Regular (400) — MÁS GRANDE que en SaaS
Small/labels:      14px, Regular (400)
Caption:           12px, Medium (500)
Button:            14-16px, Semibold (600)
Rating:            14px, Medium (500)
Badge:             12px, Semibold (600)
Nav link:          14px, Medium (500)
```

**Importante:** La tienda usa font-size base 16px (no 14px como el SaaS). Los textos son más grandes porque el usuario lee desde el celular, no desde un monitor administrando datos.

---

## Layout

### Navbar (reemplaza el sidebar)
```
┌─────────────────────────────────────────────────────────────┐
│ [Logo Glamorapp]  [🔍 Buscar productos, servicios...]  [❤️] [🛒3] [👤] │
├─────────────────────────────────────────────────────────────┤
│ Categorías: Uñas | Cabello | Maquillaje | Piel | Spa | Ofertas │
└─────────────────────────────────────────────────────────────┘
```
- **Posición:** fixed top, z-index alto
- **Background:** blanco con shadow sutil al hacer scroll
- **Logo:** Glamorapp a la izquierda, tamaño moderado
- **Search:** barra central amplia, border-radius 999px (pill), placeholder "¿Qué estás buscando?"
- **Íconos derecha:** favoritos (corazón), carrito (con badge de cantidad), avatar/login
- **Segunda fila:** categorías como links horizontales, scroll en mobile
- **Mobile:** hamburger menu + search icon + cart icon. Categorías en drawer lateral

### Footer
```
┌─────────────────────────────────────────────────────────────┐
│ Background: #1E1238 (morado oscuro)                        │
│                                                             │
│ Glamorapp          Descubre         Para tu Salón  Soporte  │
│ Logo blanco        Productos        Registra tu    Ayuda    │
│ "Tu belleza,       Servicios        salón gratis   FAQ      │
│  a un click"       Salones          Planes         Contacto │
│                    Diseños          Blog                    │
│                                                             │
│ Redes: [IG] [FB] [TikTok]                                  │
│ © 2024 Glamorapp ♥                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Componentes de la Tienda

### Product Card
```
┌─────────────────────┐
│ ┌─────────────────┐ │
│ │                 │ │  Imagen: aspect-ratio 1:1 (cuadrada)
│ │    📷 Imagen    │ │  Object-fit: cover
│ │                 │ │  Border-radius: 12px (solo arriba)
│ │         [❤️]    │ │  Botón favorito: arriba-derecha sobre la imagen
│ └─────────────────┘ │
│ ⭐ 4.7 (23)          │  Rating: estrellas amarillas + count
│ Esmalte Gel OPI      │  Nombre: 16px, semibold, max 2 líneas
│ Rosa Pastel          │  
│ Glamour Studio 📍    │  Tienda: 12px, color muted, con ícono ubicación
│                      │
│ $25.000         COP  │  Precio: 18px, bold
│                      │
│ [🛒 Agregar]         │  Botón: fucsia, full-width, border-radius 8px
└──────────────────────┘
```
- **Width:** flexible (grid responsive)
- **Shadow:** ninguno en reposo, `shadow-md` en hover
- **Border:** 1px `#E5E7EB`
- **Border-radius:** 12px
- **Hover:** lift sutil (translateY -2px), shadow aparece
- **Transición:** 200ms ease

### Service Card
```
┌──────────────────────────────────────┐
│ ┌──────────┐                         │
│ │          │ Manicure Clásico        │  Horizontal en desktop
│ │  📷 img  │ ⭐ 4.8 (45 reseñas)     │  Vertical en mobile
│ │          │                         │
│ │          │ 60 min · Desde $35.000  │  Duración + precio
│ │          │                         │
│ │          │ 📍 15 salones disponibles│  Disponibilidad
│ │          │                         │
│ │          │ [Agendar cita →]        │  CTA: fucsia outline
│ └──────────┘                         │
└──────────────────────────────────────┘
```

### Shop Card (tarjeta de salón)
```
┌─────────────────────────┐
│ ┌─────────────────────┐ │
│ │   📷 Banner/Foto    │ │  Imagen del salón con overlay gradient
│ │                     │ │
│ │  [Logo] Glamour     │ │  Logo y nombre sobre la imagen
│ │         Studio      │ │
│ └─────────────────────┘ │
│ ⭐ 4.8 · 234 reseñas    │
│ Salón de belleza & spa  │  Tipo de negocio
│ 📍 Medellín · 0.8 km    │  Ciudad + distancia
│ 💅 Uñas · Cabello · Spa │  Tags de servicios
│                         │
│ [Ver salón →]           │
└─────────────────────────┘
```

### Nail Design Card
```
┌─────────────────────┐
│ ┌─────────────────┐ │
│ │                 │ │  Imagen: aspect-ratio 3:4 (vertical, tipo Instagram)
│ │    📷 Diseño    │ │  
│ │    de uñas      │ │  Hover: zoom suave (scale 1.05)
│ │                 │ │
│ │         [❤️]    │ │  Favorito
│ └─────────────────┘ │
│ French Pink Ombré   │  Nombre del diseño
│ Acrílico · $60.000  │  Técnica + precio
│ Glamour Studio      │  Salón
│ ♥ 234               │  Popularidad
└─────────────────────┘
```

### Hero Banner (Home)
```
┌─────────────────────────────────────────────────────────────┐
│ Background: gradient #EF2D8F → #8B5CF6                     │
│ O imagen de fondo con overlay oscuro                        │
│                                                             │
│                                                             │
│     Tu belleza, a un click de distancia                     │  
│     Descubre los mejores salones de belleza                 │
│     cerca de ti.                                            │
│                                                             │
│     📍 [Medellín  ▼]                                        │
│                                                             │
│     [Explorar productos]  [Agendar cita]                    │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
- **Altura:** 400-500px desktop, 300px mobile
- **Texto:** blanco, centrado
- **Título:** 36-48px bold
- **Subtítulo:** 18px regular
- **CTAs:** 2 botones lado a lado (blanco solid + blanco outline)
- **Ciudad selector:** pill con ícono de ubicación

### Section Title
```
⭐ Salones destacados                           [Ver todos →]
─────────────────────────────────────────────────────────────
```
- Título: 24px bold con emoji/ícono opcional
- "Ver todos" a la derecha: 14px, color `#EF2D8F`, con flecha

### Rating Stars
```
⭐⭐⭐⭐⭐  4.8 (234 reseñas)
```
- Estrellas: `#FBBF24` filled, `#E5E7EB` empty
- Tamaño: 16px
- Score: bold, junto a las estrellas
- Count: color muted, entre paréntesis

### Price Display
```
$25.000 COP                    ← Precio normal (18px bold)
$35.000  $25.000 COP  -29%    ← Con descuento (tachado + badge)
Desde $35.000                  ← Servicios (prefijo "Desde")
```
- Precio: siempre bold, color `#111827`
- Precio viejo: line-through, color `#9CA3AF`
- Badge descuento: background `#EF4444`, texto blanco, border-radius 4px, font 12px

### Cart Drawer (panel lateral del carrito)
```
                              ┌──────────────────────┐
                              │ 🛒 Tu carrito (3)     │  Header
                              │ ────────────────────  │
                              │                      │
                              │ Glamour Studio        │  Agrupado por tienda
                              │ ┌────┐ Esmalte OPI   │
                              │ │ img│ $25.000        │
                              │ └────┘ [- 1 +] [🗑️]  │
                              │                      │
                              │ ┌────┐ Acrílico CND  │
                              │ │ img│ $18.500        │
                              │ └────┘ [- 2 +] [🗑️]  │
                              │                      │
                              │ ──────────────────── │
                              │ Beauty Zone           │  Otro tenant
                              │ ┌────┐ Gel Base      │
                              │ │ img│ $32.000        │
                              │ └────┘ [- 1 +] [🗑️]  │
                              │                      │
                              │ ──────────────────── │
                              │ Subtotal:   $100.500 │
                              │ Envío:      Gratis   │
                              │ ──────────────────── │
                              │ Total:      $100.500 │
                              │                      │
                              │ [Ir al checkout →]   │  Botón fucsia full-width
                              └──────────────────────┘
```
- Ancho: 400px desktop, full-width mobile
- Slide-in desde la derecha, overlay oscuro detrás
- Items agrupados por tienda/tenant con separador

### Booking Calendar (agendar cita)
```
┌─────────────────────────────────────────────────────────────┐
│ Agendar cita: Manicure Clásico                              │
│ Glamour Studio · 60 min · $35.000                          │
│                                                             │
│ 📍 Elige sucursal:                                          │
│ ┌─────────────────────┐ ┌─────────────────────┐            │
│ │ ● Centro            │ │ ○ Laureles          │            │
│ │   0.8 km            │ │   2.1 km            │            │
│ │   Cra 43 # 10-50    │ │   Cra 76 # 33-12    │            │
│ └─────────────────────┘ └─────────────────────┘            │
│                                                             │
│ 📅 Elige fecha:                                             │
│ ┌─────────────────────────────────────────┐                 │
│ │ ◀  Junio 2024  ▶                       │                 │
│ │ L   M   M   J   V   S   D              │                 │
│ │                     1   2               │                 │
│ │ 3   4   5   6   7  [8]  9              │  8 seleccionado │
│ │ 10  11  12  13  14  15  16             │  (fucsia circle)│
│ │ ...                                     │                 │
│ └─────────────────────────────────────────┘                 │
│                                                             │
│ ⏰ Horarios disponibles:                                    │
│ [9:00] [10:00] [10:30] [11:30] [14:00] [15:00] [16:00]    │
│  Gris   Gris   FUCSIA   Gris    Gris    Gris    Gris      │
│         (seleccionado = fondo fucsia, texto blanco)         │
│                                                             │
│ 👩 Profesional: (opcional)                                   │
│ ┌────────┐ ┌────────┐ ┌────────┐                           │
│ │ avatar │ │ avatar │ │ avatar │                           │
│ │ María  │ │ Laura  │ │ Cual-  │                           │
│ │ ⭐ 4.9 │ │ ⭐ 4.7 │ │ quiera │                           │
│ └────────┘ └────────┘ └────────┘                           │
│                                                             │
│ [Confirmar cita — $35.000 →]                               │
└─────────────────────────────────────────────────────────────┘
```
- Calendario: minimalista, fecha seleccionada con círculo fucsia
- Slots: pills horizontales, seleccionado en fucsia
- Profesionales: mini cards con avatar y rating
- CTA: botón fucsia con precio, fixed en bottom en mobile

### Review Card
```
┌─────────────────────────────────────────────────────────────┐
│ ┌──────┐  Ana García             ⭐⭐⭐⭐⭐                  │
│ │avatar│  15 May 2024            ✓ Compra verificada       │
│ └──────┘                                                    │
│ "Excelente servicio, el manicure quedó perfecto.           │
│  María es muy profesional y el salón está hermoso."        │
│                                                             │
│  📷 📷 (fotos adjuntas, thumbnails)                         │
│                                                             │
│  💬 Glamour Studio respondió:                               │
│  "¡Gracias Ana! Nos alegra que te haya gustado..."         │
│                                                             │
│  👍 Útil (12)   🚩 Reportar                                 │
└─────────────────────────────────────────────────────────────┘
```

### Filter Sidebar (catálogo con filtros)
```
┌──────────────────┐
│ Filtros           │
│ ─────────────── │
│                  │
│ Categoría        │
│ ☑ Uñas      (89)│  Con conteo
│ ☐ Cabello   (45)│
│ ☐ Maquillaje(32)│
│ ☐ Piel      (18)│
│ ☐ Spa        (7)│
│                  │
│ Marca            │
│ ☑ OPI       (23)│
│ ☐ CND       (15)│
│ ☐ L'Oréal   (12)│
│ [Ver más]        │
│                  │
│ Precio           │
│ $0 ━━━━●━━━ $200K│  Range slider
│ $0 — $120.000    │
│                  │
│ Valoración       │
│ ○ ⭐⭐⭐⭐⭐ y más │  Radio buttons
│ ● ⭐⭐⭐⭐ y más  │
│ ○ ⭐⭐⭐ y más    │
│                  │
│ Ciudad           │
│ [Medellín     ▼] │
│                  │
│ [Limpiar filtros]│
└──────────────────┘
```
- Desktop: sidebar izquierdo fijo, 260px
- Mobile: bottom sheet o drawer, botón "Filtros" flotante

---

## Grids Responsive

### Products Grid
```
Desktop (≥1280px):  5 columnas
Tablet (768-1279px): 3 columnas
Mobile (480-767px):  2 columnas
Mobile sm (<480px):  2 columnas (cards más pequeñas)
```
Gap: 16px mobile, 24px desktop.

### Services Grid
```
Desktop:  3 columnas (cards horizontales)
Tablet:   2 columnas
Mobile:   1 columna (stack vertical)
```

### Shops Grid
```
Desktop:  4 columnas
Tablet:   2 columnas
Mobile:   1 columna (scroll horizontal opcional)
```

### Nail Designs Grid (estilo Pinterest/masonry)
```
Desktop:  4-5 columnas, masonry layout
Tablet:   3 columnas
Mobile:   2 columnas
```

---

## Páginas Clave

### Home
```
[Navbar]
[Hero Banner — gradient/imagen + CTA]
[⭐ Salones destacados — scroll horizontal de shop cards]
[🔥 Productos populares — grid 5 cols de product cards]
[💅 Servicios más buscados — grid 3 cols de service cards]
[💫 Diseños tendencia — masonry grid de nail designs]
[📍 Salones cerca de ti — grid con mapa opcional]
[Banner CTA: "¿Tienes un salón? Registra tu negocio gratis"]
[Footer]
```

### Catálogo de Productos
```
[Navbar]
[Breadcrumb: Inicio > Productos > Uñas]
[Header: "Productos de Uñas" — 89 resultados — [Ordenar: Relevancia ▼]]
[Filter sidebar | Product grid (4 cols)]
[Paginación]
[Footer]
```

### Detalle de Producto
```
[Navbar]
[Breadcrumb]
┌──────────────────────┬──────────────────────────┐
│ Galería de imágenes  │ Nombre del producto      │
│ ┌──────────────────┐ │ ⭐ 4.7 (23 reseñas)      │
│ │                  │ │ Marca: OPI               │
│ │  📷 Imagen       │ │                          │
│ │  principal       │ │ $25.000 COP              │
│ │                  │ │                          │
│ └──────────────────┘ │ En stock · 15 disponibles│
│ [📷][📷][📷][📷]     │                          │
│ (thumbnails)         │ Cantidad: [- 1 +]        │
│                      │                          │
│                      │ 📍 Disponible en:         │
│                      │ Glamour Studio           │
│                      │ ● Centro (0.8 km)        │
│                      │ ○ Laureles (2.1 km)      │
│                      │ ○ Poblado (3.5 km)       │
│                      │                          │
│                      │ [🛒 Agregar al carrito]   │
│                      │ [❤️ Agregar a favoritos]  │
└──────────────────────┴──────────────────────────┘
[Tabs: Descripción | Reseñas (23) | Productos similares]
[Contenido del tab seleccionado]
[Footer]
```

### Perfil del Salón
```
[Navbar]
[Banner del salón — imagen + overlay + logo + nombre + rating]
[Info bar: 📍 3 sucursales · ⭐ 4.8 · 💅 Uñas, Cabello, Spa]
[Tabs: Productos | Servicios | Diseños | Reseñas | Ubicaciones]
[Contenido del tab: grids de cards]
[Footer]
```

### Checkout
```
[Navbar simplificado — solo logo + pasos]
[Pasos: 1. Carrito → 2. Datos → 3. Pago → 4. Confirmación]

┌──────────────────────────────┬──────────────────────┐
│ Pedido 1: Glamour Studio     │ Resumen              │
│                              │                      │
│ Recoger en: ● Centro (0.8km)│ 3 productos          │
│             ○ Laureles       │ 2 tiendas            │
│                              │                      │
│ Items:                       │ Subtotal: $100.500   │
│ 📷 Esmalte OPI x1    $25.000│ Envío:       Gratis  │
│ 📷 Acrílico CND x2   $37.000│ ──────────────────   │
│                              │ Total:    $100.500   │
│ Pedido 2: Beauty Zone        │                      │
│ Recoger en: ● Envigado      │ Pagar con:           │
│ 📷 Gel Base x1       $32.000│ 💳 Tarjeta           │
│                              │ 🏦 PSE               │
│ Datos:                       │ 📱 Nequi             │
│ Nombre: [______________]    │ 💵 Pagar en tienda   │
│ Email:  [______________]    │                      │
│ Tel:    [______________]    │ [Pagar $100.500 →]   │
└──────────────────────────────┴──────────────────────┘
```

---

## Animaciones y Micro-interacciones

- **Hover en cards:** lift 2px + shadow aparece (200ms ease)
- **Hover en imágenes de producto:** zoom suave (scale 1.05, 300ms)
- **Agregar al carrito:** ícono del carrito hace bounce + badge incrementa
- **Favorito (corazón):** animación de llenado (scale 1.2 → 1, 300ms)
- **Scroll de categorías:** scroll snap horizontal, smooth
- **Skeleton loading:** shimmer effect (gradiente animado)
- **Page transitions:** fade-in 200ms
- **Rating stars hover:** llenar progresivamente al pasar el mouse
- **Filtros aplicados:** badge pill con X para remover, animación slide-in

---

## Mobile-Specific

### Bottom Navigation (solo mobile)
```
┌─────────────────────────────────────────────┐
│  🏠 Inicio  |  🔍 Buscar  |  ❤️ Favoritos  |  🛒 Carrito  |  👤 Perfil  │
└─────────────────────────────────────────────┘
```
- Fixed bottom, height 56px
- Background blanco, border-top `#E5E7EB`
- Ícono activo: `#EF2D8F`
- Ícono inactivo: `#9CA3AF`
- Badge en carrito: círculo fucsia con número

### Floating Action Buttons (mobile)
- "Filtros" button: fixed bottom-right cuando hay filtros disponibles
- "Agendar" button: fixed bottom en detalle de servicio
- Estilo: pill fucsia con shadow

### Swipe Gestures
- Product images: swipe horizontal en galería
- Categories: swipe horizontal en barra
- Cart drawer: swipe right to close

---

## Reglas de Diseño de la Tienda

1. **Las imágenes son protagonistas.** Nunca una card sin imagen. Si no hay imagen, usar placeholder con ícono y fondo gradient suave.
2. **Fondo blanco (#FFFFFF) como base**, no gris. Las secciones se alternan con `#FAFAFA` o `#FFF1F8` para ritmo visual.
3. **Mobile-first.** Diseña primero para 375px, luego escala a desktop.
4. **El botón de compra siempre es fucsia.** Nunca gris, nunca outline para el CTA principal.
5. **Precios siempre visibles.** Nunca ocultar el precio detrás de un click.
6. **Rating siempre visible.** Estrellas amarillas + número, en toda card.
7. **Espacio generoso.** Padding mínimo 16px en mobile, 24px en desktop. Gap 16-24px entre cards.
8. **Máximo 2 CTAs por card.** "Agregar" + "Favorito", o "Agendar" + "Ver más".
9. **Categorías como pills horizontales** con scroll, no como dropdown (mejor UX mobile).
10. **El carrito es un drawer lateral**, no una página nueva (excepto checkout).
11. **Checkout máximo 3 pasos.** Datos → Pago → Confirmación.
12. **Nunca pedir registro antes de navegar.** Login/registro solo al momento de comprar o agendar.

---

## Ejemplo de Prompt para Generar una Página de la Tienda

```
"Diseña la página de [nombre] de la tienda digital de Glamorapp 
(tienda.glamorapp.com) como un E-COMMERCE de belleza, NO como un 
dashboard administrativo.

Estética: Sephora + Booksy + marketplace moderno.
Colores: Fucsia #EF2D8F como acento principal, fondo blanco #FFFFFF,
texto #111827, secciones alternas en #FAFAFA o #FFF1F8.
Fuente: Inter. Mobile-first.

La página debe incluir:
- Navbar top con logo, search pill, favoritos, carrito, perfil
- [Describir contenido específico]
- Cards de producto/servicio con imagen grande, rating, precio visible
- [Filtros / booking / checkout / etc.]
- Footer morado oscuro #1E1238

Debe sentirse como una tienda de belleza premium, no como un panel 
administrativo. Imágenes protagonistas, mucho espacio, CTAs claros."
```
