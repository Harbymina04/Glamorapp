# Glamorapp — Design System & UI Guidelines

## 1. Colores

### Paleta Principal
```css
:root {
  /* Core */
  --color-primary: #EF2D8F;           /* Fucsia principal - CTAs, highlights */
  --color-primary-hover: #D4267E;     /* Hover del primary */
  --color-primary-light: #FCE7F3;     /* Background suave rosa */
  --color-primary-50: #FFF1F8;        /* Background muy suave */

  /* Sidebar / Dark UI */
  --color-sidebar-bg: #1E1238;        /* Morado oscuro profundo */
  --color-sidebar-hover: #2A1B4E;     /* Hover items sidebar */
  --color-sidebar-active: #EF2D8F;    /* Item activo sidebar */
  --color-sidebar-text: #C4B5D8;      /* Texto secundario sidebar */
  --color-sidebar-text-active: #FFFFFF;

  /* Backgrounds */
  --color-bg-primary: #F8FAFC;        /* Fondo principal del app */
  --color-bg-card: #FFFFFF;           /* Fondo de tarjetas */
  --color-bg-hover: #F1F5F9;          /* Hover en filas de tabla */

  /* Text */
  --color-text-primary: #1E293B;      /* Títulos y texto principal */
  --color-text-secondary: #475569;    /* Texto secundario */
  --color-text-muted: #94A3B8;        /* Placeholder, labels sutiles */

  /* Borders */
  --color-border: #E2E8F0;            /* Bordes de tarjetas y tablas */
  --color-border-light: #F1F5F9;      /* Bordes sutiles */

  /* Status */
  --color-success: #22C55E;           /* Éxito, en stock, activo */
  --color-warning: #F97316;           /* Alerta, stock bajo */
  --color-error: #EF4444;             /* Error, sin stock, cancelado */
  --color-info: #3B82F6;              /* Información */

  /* Status badges específicos */
  --color-confirmed: #22C55E;         /* Cita confirmada */
  --color-pending: #F97316;           /* Cita pendiente */
  --color-in-progress: #3B82F6;       /* En proceso */
  --color-cancelled: #EF4444;         /* Cancelada */
  --color-completed: #22C55E;         /* Completada */
  --color-no-show: #94A3B8;           /* No asistió */

  /* Category colors (productos) */
  --color-cat-hair: #8B5CF6;          /* Cuidado del cabello */
  --color-cat-makeup: #EC4899;        /* Maquillaje */
  --color-cat-nails: #F43F5E;         /* Uñas */
  --color-cat-skin: #F97316;          /* Cuidado de la piel */
  --color-cat-accessories: #14B8A6;   /* Accesorios */
  --color-cat-tools: #6366F1;         /* Herramientas */

  /* Appointment calendar colors */
  --color-appt-manicure: #EC4899;     /* Rosa */
  --color-appt-hair: #22C55E;         /* Verde */
  --color-appt-nails: #8B5CF6;        /* Morado */
  --color-appt-lashes: #F97316;       /* Naranja */
  --color-appt-waxing: #3B82F6;       /* Azul */
  --color-appt-makeup: #EAB308;       /* Amarillo */

  /* Loyalty tiers */
  --color-tier-bronze: #CD7F32;
  --color-tier-silver: #94A3B8;
  --color-tier-gold: #EAB308;
  --color-tier-platinum: #6366F1;

  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #EF2D8F 0%, #8B5CF6 100%);
  --gradient-sidebar: linear-gradient(180deg, #2A1B4E 0%, #1E1238 100%);
  --gradient-card-accent: linear-gradient(135deg, #FCE7F3 0%, #EDE9FE 100%);
}
```

### Tailwind Config
```typescript
// tailwind.config.ts
const config = {
  theme: {
    extend: {
      colors: {
        glamor: {
          primary: '#EF2D8F',
          'primary-hover': '#D4267E',
          'primary-light': '#FCE7F3',
          sidebar: '#1E1238',
          'sidebar-hover': '#2A1B4E',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',  // 8px - tarjetas y botones
        lg: '0.75rem',      // 12px - modales y paneles
        xl: '1rem',         // 16px - tarjetas destacadas
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08)',
        sidebar: '4px 0 24px rgba(0, 0, 0, 0.15)',
      }
    }
  }
}
```

---

## 2. Tipografía

| Elemento | Font | Size | Weight | Color |
|---|---|---|---|---|
| Page Title | Inter | 24px (1.5rem) | 700 (Bold) | text-primary |
| Page Subtitle | Inter | 14px (0.875rem) | 400 | text-secondary |
| Section Title | Inter | 16px (1rem) | 600 (Semibold) | text-primary |
| Card Title | Inter | 14px (0.875rem) | 600 | text-primary |
| Body text | Inter | 14px (0.875rem) | 400 | text-secondary |
| Small / Labels | Inter | 12px (0.75rem) | 500 | text-muted |
| Table header | Inter | 12px (0.75rem) | 600 | text-muted uppercase |
| Table cell | Inter | 14px (0.875rem) | 400 | text-primary |
| KPI number | Inter | 28px (1.75rem) | 700 | text-primary |
| KPI label | Inter | 12px (0.75rem) | 400 | text-muted |
| Button | Inter | 14px (0.875rem) | 500 | white / primary |
| Input | Inter | 14px (0.875rem) | 400 | text-primary |
| Sidebar item | Inter | 14px (0.875rem) | 500 | sidebar-text |

---

## 3. Componentes Clave

### Sidebar (Menú lateral)
- **Ancho:** 240px (colapsado: 64px en futuro)
- **Background:** gradient sidebar (morado profundo)
- **Logo:** arriba, con nombre "Glamorapp" + tagline
- **Items:** ícono + texto, padding 12px 16px
- **Item activo:** background fucsia (#EF2D8F), texto blanco, border-radius 8px
- **Item hover:** background sidebar-hover
- **Separadores:** línea sutil entre grupos (core, admin)
- **Footer:** badge "Plan Profesional" + "Ver mi plan"
- **Agrupación:**
  - Grupo 1 (core): Inicio, Inventario, Ventas POS, Agendamiento, Catálogo Productos, Catálogo Uñas
  - Grupo 2 (admin): Clientes, Proveedores, Reportes, Gastos, Usuarios, Agentes IA, Configuración

### Header
- **Altura:** 64px
- **Contenido:** Título de página, barra de búsqueda global (⌘K), notificaciones, calendario, ayuda, avatar usuario
- **Search:** ancho ~300px, placeholder "Buscar productos, citas, clientes..."
- **Notificaciones:** ícono campana con badge rojo (count)
- **User menu:** avatar + nombre + rol, dropdown con perfil/logout

### KPI Cards (Stat Cards)
- **Layout:** grid de 4-5 cards en fila
- **Cada card:** ícono circular con background suave + label + número grande + subtexto (variación vs periodo anterior)
- **Border:** 1px solid border-color
- **Border radius:** 12px
- **Padding:** 20px
- **Ícono:** 40x40px círculo con background category-color suave

### Data Table
- **Header:** uppercase, font-size 12px, color text-muted, border-bottom
- **Rows:** padding 12px 16px, hover background bg-hover
- **Checkbox:** primera columna (selección múltiple)
- **Imagen:** thumbnail 40x40 rounded
- **Status badges:** pills redondeados con color de fondo suave
- **Actions:** íconos editar + menú contextual (⋮)
- **Paginación:** "Mostrando 1 a 10 de X" + botones numéricos
- **Filas por página:** select 10/25/50

### Detail Panel (lado derecho)
Usado en Clientes, Proveedores al seleccionar una fila:
- **Ancho:** ~320px
- **Layout:** avatar/logo + nombre + ID + status badge
- **Tabs:** Resumen | Historial | Citas | Notas | Archivos (varía por módulo)
- **Cierre:** botón X arriba-derecha
- **Actions:** botones CTA al final (Agendar cita, Nueva venta)

### Buttons
| Variante | Background | Text | Border | Uso |
|---|---|---|---|---|
| Primary | #EF2D8F | white | none | CTA principal (Cobrar, Nuevo, Guardar) |
| Secondary | white | #EF2D8F | 1px #EF2D8F | CTA secundario (Guardar venta, Cancelar) |
| Outline | transparent | text-secondary | 1px border-color | Filtros, Exportar |
| Ghost | transparent | text-secondary | none | Acciones menores |
| Danger | #EF4444 | white | none | Eliminar, Cancelar cita |

- **Border radius:** 8px
- **Padding:** 8px 16px (sm), 10px 20px (md), 12px 24px (lg)
- **Íconos:** lucide-react, 16px, a la izquierda del texto

### Status Badges
```
Activo     → bg-green-50 text-green-700 border-green-200
Inactivo   → bg-gray-50 text-gray-600 border-gray-200
En stock   → bg-green-50 text-green-700
Stock bajo → bg-orange-50 text-orange-700
Sin stock  → bg-red-50 text-red-700
Confirmada → bg-green-50 text-green-700
Pendiente  → bg-orange-50 text-orange-700
En proceso → bg-blue-50 text-blue-700
Completada → bg-green-50 text-green-700
Cancelada  → bg-red-50 text-red-700
No asistió → bg-gray-50 text-gray-600
Oro        → bg-yellow-50 text-yellow-700
Plata      → bg-gray-100 text-gray-600
Bronce     → bg-amber-50 text-amber-700
```
- **Border radius:** 999px (full)
- **Padding:** 2px 10px
- **Font:** 12px, weight 500

### Modals
- **Overlay:** bg-black/50 backdrop-blur-sm
- **Card:** bg-white, border-radius 16px, shadow-lg
- **Header:** título + botón cerrar (X)
- **Footer:** botones Cancelar + Acción principal
- **Max-width:** 480px (form), 640px (detalle), 800px (complejo)

### Forms
- **Label:** 12px, weight 500, color text-secondary, margin-bottom 4px
- **Input:** height 40px, border 1px border-color, border-radius 8px, padding 8px 12px
- **Focus:** border-color primary, ring-2 primary/20
- **Error:** border-color error, message en rojo debajo
- **Spacing:** gap 16px entre campos

### Charts (Recharts)
- **Line chart:** stroke primary (#EF2D8F), área con gradient suave
- **Donut chart:** colores de categoría, label central con total
- **Bar chart:** colores primario + variaciones
- **Tooltip:** bg-white, shadow, border-radius 8px
- **Grid:** color #F1F5F9
- **Axis labels:** 12px, color text-muted

---

## 4. Layout por Página

### Dashboard (Inicio)
```
┌─────────────────────────────────────────────────────┐
│ ¡Hola, [Nombre]! 👋                                │
│ Resumen de tu negocio                                │
├────────┬────────┬────────┬────────┬────────────────┤
│ Ventas │ Citas  │ Stock  │ Client │                 │
│ hoy    │ hoy    │ total  │ frec.  │                 │
├────────┴────────┴────────┴────────┴────────────────┤
│ Inventario (donut) │ Ventas POS (cart)│ Agenda (list)│
│                    │                  │              │
├────────────────────┼──────────────────┼──────────────┤
│ Catálogo Productos │ Catálogo Uñas                   │
└────────────────────┴─────────────────────────────────┘
```
Grid: 3 columnas (1fr 1fr 1fr) para sección media, 2 columnas para catálogos.

### Inventario
```
┌──────────────────────────────────────────────┬──────────┐
│ KPI Cards (5)                                 │          │
├──────────────────────────────────────────────┤ Categorías│
│ Tabs: Productos | Movimientos | Ajustes | Transfer │ sidebar  │
├──────────────────────────────────────────────┤          │
│ Search + Filtros                              │ Alertas  │
├──────────────────────────────────────────────┤ inventario│
│ Data Table                                    │          │
│ (checkbox | img | nombre | SKU | cat | stock │          │
│  | precio costo | precio venta | estado | ⋮) │          │
├──────────────────────────────────────────────┤          │
│ Paginación                                    │          │
└──────────────────────────────────────────────┴──────────┘
```
Layout: main content (~75%) + sidebar derecho (~25%).

### Ventas POS
```
┌──────────────────────────────────────┬──────────────────┐
│ Tabs: Productos | Servicios | Paquetes│ Venta actual     │
├──────────────────────────────────────┤ #V-000124        │
│ Filtros + Vista (grid/list)           │                  │
├──────────────────────────────────────┤ Cliente: [nombre] │
│ Product Grid (4 cols)                 │                  │
│ ┌─────┐┌─────┐┌─────┐┌─────┐       │ Items del carrito │
│ │ img ││ img ││ img ││ img │       │ - Prod x1 $180   │
│ │name ││name ││name ││name │       │ - Prod x2 $240   │
│ │price││price││price││price│       │                  │
│ └─────┘└─────┘└─────┘└─────┘       │ Subtotal         │
│                                      │ Descuento        │
│ Category pills al fondo              │ Impuestos        │
│                                      │ TOTAL            │
│                                      ├──────────────────┤
│ Payment methods (icons)              │ [Guardar][Cobrar]│
└──────────────────────────────────────┴──────────────────┘
```
Layout: grid productos (~65%) + carrito sidebar (~35%).

### Agendamiento de Citas
```
┌──────────────────────────────────────────────┬──────────┐
│ Navegación: [Hoy] [<>] [Fecha] [Día|Sem|Mes]│+ Nueva   │
├──────────────────────────────────────────────┤          │
│ KPI Cards (5): Hoy | Confirmadas | Pendientes│ Detalle  │
│                | Completadas | Ingresos       │ de cita  │
├──────────────────────────────────────────────┤ (panel   │
│ Calendar Grid (semanal)                       │ derecho) │
│ Hora | Lun | Mar | Mie | Jue | Vie | Sab | Dom│         │
│ 8AM  │     │     │     │     │     │     │    │         │
│ 9AM  │ ███ │     │ ███ │     │ ███ │ ███ │    │         │
│ 10AM │     │ ███ │     │     │     │ ███ │    │         │
│ ...  │     │     │ ███ │ ███ │     │     │    │         │
├──────────────────────────────────────────────┤         │
│ Leyenda: 🟩 Manicure 🟢 Cabello 🟣 Uñas...    │         │
├──────────────────────────────────────────────┤         │
│ Próximas citas | Stats semana | Pendientes   │         │
└──────────────────────────────────────────────┴──────────┘
```
Calendar blocks color-coded por tipo de servicio.

### Reportes
```
┌──────────────────────────────────────────────┬──────────┐
│ Tabs: Resumen|Ventas|Citas|Productos|Inv|... │ Filtros  │
├──────────────────────────────────────────────┤ rápidos  │
│ KPI Cards (5)                                 │          │
├─────────────────────┬────────────────────────┤ Rango    │
│ Line chart          │ Donut chart            │ fechas   │
│ (Ingresos por día)  │ (Ventas por categoría) │          │
├──────────┬──────────┼────────────────────────┤ Comparar │
│ Donut    │ Donut    │ Top servicios ranking  │          │
│ (método  │ (citas   │                        │ Exportar │
│  pago)   │  estado) │                        │ PDF/XLS  │
├──────────┴──────────┴────────────────────────┤          │
│ Tabla comparativa (este mes vs anterior)      │ Top prod │
└──────────────────────────────────────────────┴──────────┘
```

### Centro de Agentes IA
```
┌──────────────────────────────────────────────┬──────────┐
│ KPI Cards (4): Activos | Acciones | Alertas  │ Recomend.│
│                        | Impacto             │ para ti  │
├──────────────────────────────────────────────┤          │
│ Tabs: Mis agentes | Explorar | Plantillas    │ Actividad│
├──────────────────────────────────────────────┤ reciente │
│ Agent Cards Grid (4 cols)                     │          │
│ ┌──────────┐┌──────────┐┌──────────┐┌──────┐│          │
│ │ icon     ││ icon     ││ icon     ││ icon ││ Config   │
│ │ Ventas   ││ Inventario││ Clientes ││Citas ││ general  │
│ │ [Activo] ││ [Activo]  ││ [Activo] ││[Act] ││          │
│ │ 8 acciones││ 12 acc.  ││ 15 acc.  ││ 6   ││          │
│ │ +$3,250  ││ +$2,180  ││ +$1,980  ││+$950││          │
│ └──────────┘└──────────┘└──────────┘└──────┘│          │
│ (segunda fila similar)                       │          │
├──────────────────────────────────────────────┤          │
│ [+ Crear nuevo agente]                       │          │
└──────────────────────────────────────────────┴──────────┘
```

---

## 5. Responsive Breakpoints

| Breakpoint | Width | Cambios |
|---|---|---|
| Desktop | ≥1280px | Layout completo con sidebar |
| Tablet | 768-1279px | Sidebar colapsable, grids 2 cols |
| Mobile | <768px | Sin sidebar, bottom nav, grids 1 col |

Para MVP, priorizar Desktop (1280px+) y Tablet. Mobile en fase futura.

---

## 6. Animaciones

- **Transiciones:** 150ms ease-in-out (hovers, focus)
- **Modales:** fade-in 200ms + scale de 95% a 100%
- **Sidebar:** slide-in 200ms
- **Notifications:** slide-down 300ms
- **Skeleton loading:** pulse animation en placeholders
- **Toast:** slide-in desde arriba-derecha, 3s auto-dismiss

---

## 7. Iconografía (Lucide React)

### Sidebar
```
Home, Package, ShoppingCart, Calendar, BookOpen, Palette,
Users, Truck, BarChart3, Wallet, UserCog, Bot, Settings
```

### KPI Cards
```
DollarSign, CalendarCheck, Package, UserCheck, TrendingUp,
ShoppingBag, AlertTriangle, Star
```

### Acciones
```
Plus, Pencil, Trash2, MoreVertical, Search, Filter,
Download, Upload, RefreshCw, Eye, EyeOff, Copy,
Check, X, ChevronLeft, ChevronRight, ArrowUpRight
```

### Status
```
CheckCircle (confirmada), Clock (pendiente), Play (en proceso),
XCircle (cancelada), AlertCircle (alerta), Ban (no asistió)
```
