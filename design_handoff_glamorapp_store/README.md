# Handoff: Glamorapp — Tienda Digital (Marketplace de belleza)

## Overview
Glamorapp Store (`tienda.glamorapp.com`) es un **marketplace de belleza orientado al consumidor** donde las clientas descubren salones, compran productos, agendan servicios y exploran diseños de uñas. Estética **Sephora + Booksy + Rappi** adaptada al mercado colombiano: visual, aspiracional, centrada en imágenes, mobile-first. Moneda **COP**, ciudad de referencia **Bogotá**, idioma **español**.

Este paquete cubre el **flujo de compra completo** en 6 pantallas conectadas:
**Home → Catálogo → Perfil del salón → Detalle de producto → Carrito → Checkout → Confirmación**, con carrito y favoritos persistentes entre páginas.

> Nota: este marketplace es **distinto** del producto SaaS administrativo de Glamorapp (panel para dueñas de salón). No mezclar ambos. El SaaS tiene fondo gris, tipografía compacta 14px y densidad alta; la tienda es aireada, clara y con tipografía más grande.

---

## About the Design Files
Los archivos de este bundle son **referencias de diseño construidas en HTML/CSS/JS vanilla** — prototipos que muestran el aspecto y comportamiento deseado, **no código de producción para copiar tal cual**. La tarea es **recrear estos diseños en el entorno del codebase destino** (React, Next.js, Vue, etc.) usando sus patrones, componentes y librerías establecidas. Si no existe un entorno todavía, elegir el framework más apropiado (recomendado: **React + Next.js**, dado que es un e-commerce con rutas por página y SEO relevante) e implementarlo allí.

La lógica de datos en `store.js` (catálogo, carrito, favoritos, filtros) es **mock client-side con `localStorage`**. En producción esto debe reemplazarse por el backend / API real y un store de estado adecuado (Context, Zustand, Redux, React Query, etc.).

---

## Fidelity
**Alta fidelidad (hi-fi).** Colores, tipografía, espaciado, radios, sombras e interacciones son finales. Recrear la UI pixel-perfect usando las librerías y el design system del codebase. Todos los tokens exactos están abajo.

---

## Tech / estructura actual del prototipo
- **HTML** por pantalla (una página = una vista navegable).
- **`store.css`** — hoja de estilos compartida por las 5 páginas. Contiene todos los tokens (`:root`), componentes (cards, botones, navbar, drawer) y estilos por pantalla.
- **`store.js`** — datos mock + render + interactividad compartidos. Cada página llama a su `render*()` al final (`renderAll`, `renderCatalog`, `renderSalon`, `renderProductDetail`, `renderCheckout`).
- Íconos: **SVG inline** estilo *Lucide / Feather* (stroke, `stroke-width` 1.4–2). En producción usar `lucide-react` o equivalente.
- Tipografía: **Inter** (Google Fonts), pesos 400–800.
- Imágenes de producto/salón: **placeholders** = gradiente por categoría + ícono de silueta. En producción reemplazar por fotos reales (ver sección Assets).

---

## Design Tokens

### Colores (de `:root` en store.css)
```
--primary:        #EF2D8F   /* fucsia de marca — CTAs, acentos, precios */
--primary-hover:  #D4267E
--primary-light:  #FFF1F8   /* fondos de chip/hover suaves */
--primary-soft:   #FCE7F3
--bg:             #FFFFFF
--bg-section:     #FAFAFA   /* secciones alternas */
--bg-accent:      #FFF1F8   /* secciones tintadas en rosa muy claro */
--bg-dark:        #1E1238   /* footer, banners oscuros, navbar del SaaS */
--text:           #111827   /* texto principal */
--text-2:         #6B7280   /* texto secundario */
--text-3:         #9CA3AF   /* texto terciario / placeholders */
--line:           #E5E7EB   /* bordes y divisores */
--star:           #FBBF24   /* estrellas llenas */
--star-empty:     #E5E7EB
--wishlist:       #EF4444   /* corazón favorito activo, badges de descuento */
--grad-hero:      linear-gradient(135deg, #EF2D8F 0%, #8B5CF6 100%)
--shadow-md:      0 12px 28px -12px rgba(17,24,39,.18)
--shadow-lg:      0 24px 48px -20px rgba(17,24,39,.22)
```

### Colores por categoría (objeto `CATS` en store.js)
Cada categoría tiene un color sólido y un gradiente (para placeholders de imagen):
```
nails  (Uñas)        color #F43F5E   grad [#FFE4E6 → #FECDD3]
hair   (Cabello)     color #8B5CF6   grad [#EDE9FE → #DDD6FE]
makeup (Maquillaje)  color #EC4899   grad [#FCE7F3 → #FBCFE8]
skin   (Piel)        color #F97316   grad [#FFEDD5 → #FED7AA]
spa    (Spa)         color #14B8A6   grad [#CCFBF1 → #99F6E4]
```

### Tipografía
- Familia: **Inter**, `system-ui` fallback. (`https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800`)
- Base body: `16px`, `line-height: 1.5`, color `--text`.
- Escala usada:
  - H1 hero: `clamp(34px, 4.4vw, 50px)`, weight 800, `letter-spacing: -0.025em`
  - H1 de página (catálogo/checkout): `28–30px` / 800
  - Títulos de sección (`h2.sec-head`): `clamp(22px, 2.6vw, 28px)` / 800 / `-0.02em`
  - Nombre de producto: `15px` / 600 / `line-height 1.32` (truncado a 2 líneas con `-webkit-line-clamp`)
  - Precio: `18px` / 800 (detalle: `34px` / 800)
  - Texto secundario: `13–14.5px` / weight 500–600
  - Labels/eyebrows: `12–13px`, `text-transform: uppercase`, `letter-spacing: .06–.12em`

### Espaciado, radios, sombras
- Contenedor máx: **1320px**, padding lateral `28px` (16px en móvil).
- Radios: cards `16px`; banners/secciones grandes `18–28px`; botones pill `999px`; inputs/botones `10–14px`; chips `999px`.
- Gaps de grid: productos `20px` (14px móvil).
- Sombras: hover de card usa `--shadow-md`; drawer `-16px 0 48px -12px rgba(17,24,39,.25)`.
- Transiciones estándar: `0.15s` (hover de color/fondo), `0.2s ease` (lift de cards `translateY(-3px)`), `0.3s cubic-bezier(.4,0,.2,1)` (drawer).

---

## Modelo de datos (mock en store.js → reemplazar por API real)

```
Categoría (CATS): { key, label, color, gradient[2] }

Salón (SHOPS): {
  id, name, type, city, zone, dist, rating, reviews,
  tags: [categoryKey...], gradient[2]
}

Producto (PRODUCTS): {
  id, name, brand, cat: categoryKey, icon: siluetaKey,
  price (COP, entero), old? (precio tachado), rating, reviews, shop (name)
}

Servicio (SERVICES): {
  id, name, cat, icon, min (duración), from (precio desde), rating, reviews, shops (# disponibles)
}

Diseño de uñas (DESIGNS): {
  id, name, tech, price, shop, likes, h (altura masonry px), gradient[2]
}
```
- Precios en **COP enteros**, formateados con `toLocaleString('es-CO')` → `$25.000` (punto como separador de miles).
- `icon` mapea a siluetas SVG en el objeto `ICONS` (bottle, jar, polish, brush, spray, drop, scissors, sparkle, hand).

---

## Screens / Views

### 1. Home — `Tienda.html`
**Propósito:** Descubrimiento. Punto de entrada al marketplace.

**Layout (top→bottom):**
1. **Navbar sticky** (ver Componentes compartidos) + barra de categorías filtrable debajo.
2. **Hero**: tarjeta full-width con gradiente `--grad-hero`, radio 28px, padding `88px 64px`. Contiene: pill de ciudad ("Bogotá ▾"), H1 "Tu belleza, a un click de distancia.", subtítulo, 2 CTAs ("Explorar productos" sólido blanco, "Agendar cita" ghost). Círculos decorativos translúcidos a la derecha.
3. **⭐ Salones destacados**: carrusel horizontal (scroll-snap) de shop cards, con flechas prev/next.
4. **🔥 Productos populares**: sección con fondo `--bg-section`. Grid de 5 columnas (4→3→2 responsive). Filtra al hacer clic en la barra de categorías superior. Link "Ver todos" → `Catalogo.html`.
5. **💅 Servicios más buscados**: grid de 3 columnas de service cards.
6. **💫 Diseños tendencia**: fondo `--bg-accent`. **Masonry** (CSS `columns: 4`) de nail-design cards de alturas variables.
7. **Banner CTA** "¿Tienes un salón?": tarjeta oscura `--bg-dark`, radio 24px.
8. **Footer** (compartido).

**Responsive:** 5→4 col @1120px, →3 @900px, →2 @640px. Search se oculta <900px. Hero padding se reduce.

---

### 2. Catálogo — `Catalogo.html`
**Propósito:** Buscar, filtrar y ordenar todo el catálogo; gestionar favoritos.

**Layout:** Header (H1 + subtítulo) → barra de búsqueda dedicada → toolbar (contador de resultados + botón Filtros en móvil + dropdown Ordenar) → chips de filtros activos → **grid de 2 columnas: sidebar 256px + grid de productos 4-col**.

**Sidebar de filtros** (sticky `top:88px`; en móvil es drawer lateral con overlay):
- **Categoría**: lista con swatch de color + label (Todas + 5). Selección única, resalta en `--primary-light`.
- **Precio**: doble `input[range]` (min/max, 0–150.000, step 1000) + label de rango en vivo. El mín nunca supera al máx.
- **Calificación**: opciones 4.5 / 4.0 / 3.5 "y más" (estrellas), toggle on/off.
- **Marca**: checkboxes de las 16 marcas únicas (lista con scroll, máx-height 184px).
- **Toggles** (switches): "En oferta" (solo productos con `old`), "Solo favoritos".

**Comportamiento de filtros:**
- Todos los filtros son **client-side, aditivos**, y re-renderizan el grid en vivo.
- **Búsqueda**: filtra por `name + brand + categoría` (case-insensitive). Input dedicado en la página; el search del navbar en otras páginas navega a `Catalogo.html?q=...`.
- **Ordenar**: Relevancia (orden original), Precio ↑, Precio ↓, Mejor calificados, Mayor descuento.
- **Chips de filtros activos**: uno por filtro aplicado, cada uno con "×" que lo remueve; chip "Limpiar todo" resetea.
- **Contador**: "<n> resultados" en vivo.
- **Empty state**: "Sin resultados" con ícono cuando ningún producto pasa los filtros.
- **URL params**: `?q=`, `?cat=`, `?fav=1`, `?sale=1` pre-aplican filtros al cargar.

---

### 3. Perfil del salón — `Salon.html`
**Propósito:** Vitrina de un salón: sus productos, servicios, diseños, reseñas y sedes.

**Layout:** Navbar → breadcrumb → **banner** (300px, gradiente del salón + overlay oscuro + logo monograma 92px + nombre + badge "verificado" + botones Seguir/Compartir) → **info bar** (rating · # sucursales · tags · estado Abierto/Cerrado) → **tabs sticky** → panel del tab → footer.

**Tabs** (5): Productos · Servicios · Diseños · Reseñas · Ubicaciones.
- **Productos/Servicios/Diseños**: grids poblados desde la data del salón (productos propios + relleno por categorías del salón).
- **Reseñas**: bloque resumen (nota 4.8 grande + distribución de estrellas en barras) + grid 2-col de reseñas (avatar monograma, nombre, fecha/servicio, estrellas, texto, fotos adjuntas placeholder).
- **Ubicaciones**: grid 3-col de tarjetas de sede (mini "mapa" con pin, dirección, horario con estado, botón "Cómo llegar").

**Interacción:** Tabs cambian el panel visible (clase `.show`, fade-in 0.3s). Solo un panel visible a la vez.

---

### 4. Detalle de producto — `Producto.html`
**Propósito:** Ver y comprar un producto.

**URL:** `Producto.html?id=<productId>` (default `p1`). El nombre, marca, precio, rating, stock, galería y similares se renderizan según el `id`.

**Layout:** Navbar → breadcrumb dinámico (Inicio › Categoría › Producto) → **2 columnas**:
- **Izquierda (sticky):** galería = imagen principal (radio 22px) + fila de 4 miniaturas; clic en miniatura cambia el color/vista de la principal.
- **Derecha:** marca (pill) · H1 nombre · rating · precio (34px) con precio tachado + badge `-N%` si hay descuento · estado de stock ("En stock · N disponibles", punto verde) · **stepper de cantidad** [− n +] · selector de **sucursal de recogida** (3 radios, una agotada/deshabilitada) · CTAs ("Agregar al carrito" sólido — respeta la cantidad y abre el carrito; botón corazón favorito) · perks (envío gratis, original, devolución).

**Abajo:** tabs **Descripción** (texto por categoría + tabla de especificaciones) · **Reseñas** (lista) · **Productos similares** (grid de la misma categoría).

---

### 5. Checkout — `Checkout.html`
**Propósito:** Cerrar la compra.

**Layout:** **Navbar simplificado** = logo + **indicador de 4 pasos** (Carrito ✓ → Datos → Pago → Confirmación) + "Seguir comprando". Luego **2 columnas**:
- **Izquierda:** Pedidos **agrupados por salón** (cada uno: cabecera con nombre + "Pedido N", selector de **sucursal de recogida** por pedido, items editables con stepper + eliminar) → tarjeta **Tus datos** (nombre, WhatsApp, email, notas) → tarjeta **Método de pago**: 4 opciones radio en tarjetas — **Tarjeta** (muestra campos de tarjeta), **PSE**, **Nequi**, **Pagar en tienda**.
- **Derecha (sticky):** Resumen (# productos, # tiendas, subtotal, envío "Gratis", total) + botón "Pagar $<total>" + sello de pago seguro.

**Confirmación:** al pagar, oculta el formulario y muestra pantalla de éxito (check verde animado `scale(0)→1` re-disparado al revelar, número de pedido `GA-NNNNNN`, método, recogida, total) + acciones "Volver al inicio" / "Seguir comprando". **Limpia el carrito.**

> El prototipo **siembra un pedido de muestra** si el carrito está vacío al entrar, para que la página no se vea vacía. En producción, redirigir a estado vacío real o al catálogo.

---

## Componentes compartidos (recrear como componentes reutilizables)

### Navbar (sticky, `--bg` con blur)
Logo (izq, 40px) · search pill central (flex, máx 540px; borde se vuelve `--primary` al focus) · acciones (der): ícono **Favoritos** (badge contador; navega a `Catalogo.html?fav=1`), ícono **Carrito** (badge contador; abre drawer; ícono hace *bounce* al agregar), botón **Ingresar** (pill fucsia). Sombra aparece al hacer scroll (`.scrolled`). En checkout, variante simplificada con stepper de pasos.

### Product card
Media cuadrada (placeholder gradiente + ícono + chip de marca) · badge `-N%` (si descuento) · botón corazón (top-right, toggle favorito con animación `favpop`) · rating (estrellas + nota + #reseñas) · nombre (2 líneas máx) · salón (pin + nombre) · fila de precio (tachado + actual + "COP") · botón "Agregar". Hover: `translateY(-3px)` + sombra. **Clic en la card (fuera de botones) navega a `Producto.html?id=`.**

### Shop card
Banner con gradiente del salón + overlay + logo monograma + nombre · rating · tipo · zona/distancia · tags · botón "Ver salón" → `Salon.html`.

### Service card
Horizontal: media + cuerpo (pill de categoría, nombre, rating, "min · Desde $precio", "# salones", botón "Agendar cita").

### Nail-design card (masonry)
Media de altura variable (gradiente + ícono mano) + corazón favorito · nombre · técnica · precio · salón · likes.

### Cart drawer (off-canvas derecha, 420px)
Header "Tu carrito (n)" + cerrar · items **agrupados por salón** (media, nombre, precio, stepper, eliminar) · footer (subtotal, envío "Gratis", total, botón "Ir al checkout" → `Checkout.html`). Overlay oscuro detrás; cierra con ✕, overlay o `Esc`. Estado vacío con ícono. Apertura: `translateX(100%→0)` 0.3s.

### Footer (`--bg-dark`)
4 columnas: marca + redes (Instagram/Facebook/TikTok), Descubre, Para tu salón, Soporte. Barra inferior con copyright.

---

## Interactions & Behavior (resumen)
- **Carrito**: agregar (bounce + badge++), stepper de cantidad, eliminar, agrupado por salón, subtotal/total en COP. Persistente.
- **Favoritos**: toggle corazón con animación `favpop` (`scale 1→1.25→1`, 0.3s), badge en navbar. Persistente.
- **Filtros/búsqueda/orden**: ver pantalla Catálogo. Re-render en vivo.
- **Tabs** (salón y producto): un panel visible, fade-in 0.3s.
- **Galería de producto**: miniaturas cambian la principal.
- **Hover de cards**: lift 2–3px + sombra (0.2s ease).
- **Drawers** (carrito, filtros móvil): slide 0.3s con overlay.
- **Checkout**: selección de sucursal y método de pago (radios estilizados), campos de tarjeta condicionales, pago → confirmación + limpieza de carrito.
- **Responsive (mobile-first, 70% del tráfico):** breakpoints clave 1120 / 900 / 640px. <900px: search del navbar oculto, sidebar de catálogo → drawer, grids reducen columnas. <640px: grids a 2 col, paddings a 16px, drawers full-width.

## State Management
Estado a modelar en producción:
- **cart**: `{ productId: qty }` → derivar conteo, subtotal, agrupación por salón.
- **favorites**: `Set<productId>`.
- **catalog filters**: `{ q, cat, brands:Set, priceMin, priceMax, rating, sale, fav, sort }`.
- **product detail**: `id` (de la ruta), `qty`, sucursal seleccionada.
- **checkout**: pedidos agrupados por salón, sucursal por pedido, datos del cliente, método de pago, número de pedido generado.

En el prototipo, cart y favorites viven en `localStorage` (`ga_cart`, `ga_favs`). En producción: estado global + persistencia/API. Los datos de catálogo/salones/servicios deben venir de la API real, no de los arrays en `store.js`.

---

## Assets
- **`assets/logo.png`** — logo de Glamorapp (incluido). En el footer se invierte a blanco con `filter: brightness(0) invert(1)`.
- **Imágenes de producto/salón/diseño**: en el prototipo son **placeholders** (gradiente por categoría + ícono de silueta). En producción reemplazar por **fotos reales en alta calidad** (las imágenes son protagonistas según el brief: productos, manos/uñas, ambientes de salón). Mantener proporción 1:1 para productos, banner ~16:9 para salones, alturas variables para la galería de diseños (masonry).
- **Íconos**: SVG inline estilo Lucide/Feather → usar `lucide-react` u equivalente.
- **Fuente**: Inter (Google Fonts).

---

## Files (en este bundle)
| Archivo | Pantalla |
|---|---|
| `Tienda.html` | Home |
| `Catalogo.html` | Catálogo (filtros, búsqueda, favoritos) |
| `Salon.html` | Perfil del salón |
| `Producto.html` | Detalle de producto |
| `Checkout.html` | Checkout + confirmación |
| `store.css` | Estilos compartidos (tokens + componentes + por pantalla) |
| `store.js` | Datos mock + render + interactividad |
| `assets/logo.png` | Logo |

Para previsualizar: abrir cualquier `.html` en un navegador. Empezar por `Tienda.html` y navegar el flujo.
