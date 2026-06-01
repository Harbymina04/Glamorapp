# Glamorapp — Gestión de Tienda Digital desde el SaaS Admin

## 1. Principio Arquitectónico

```
┌─────────────────────────────────────────────────────────────────┐
│                    FUENTE ÚNICA DE VERDAD                       │
│                                                                 │
│   app.glamorapp.com (SaaS Admin)                               │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  El tenant gestiona TODO desde aquí:                    │   │
│   │                                                         │   │
│   │  Productos → precio, stock, categoría, imagen           │   │
│   │  Servicios → precio, duración, disponibilidad           │   │
│   │  Catálogo uñas → diseños, técnicas, precios            │   │
│   │  Clientes → se sincronizan con buyers                   │   │
│   │  Citas → aparecen en su agenda normal                   │   │
│   │  Pedidos → aparecen como ventas POS                     │   │
│   │  Inventario → se descuenta al confirmar pedido          │   │
│   │                                                         │   │
│   │  + NUEVO: Sección "Tienda Digital"                      │   │
│   │    → Activar/desactivar vitrina                         │   │
│   │    → Elegir qué productos/servicios mostrar             │   │
│   │    → Configurar perfil público                          │   │
│   │    → Gestionar pedidos online                           │   │
│   │    → Responder reseñas                                  │   │
│   │    → API Keys para agentes IA                           │   │
│   └─────────────────────────────────────────────────────────┘   │
│                         │                                       │
│                         │ Lee los mismos datos                  │
│                         ▼                                       │
│   tienda.glamorapp.com (Tienda Digital)                        │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  SOLO LECTURA + crear pedidos/citas                     │   │
│   │                                                         │   │
│   │  Lee: productos, servicios, diseños, precios, stock     │   │
│   │  Lee: sucursales, horarios, reseñas                     │   │
│   │  Escribe: pedidos, citas, reseñas (del buyer)           │   │
│   │                                                         │   │
│   │  NO tiene panel admin propio                            │   │
│   │  NO duplica datos                                       │   │
│   │  NO gestiona precios ni catálogo                        │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Regla:** La tienda digital NUNCA tiene su propia copia de productos, precios o inventario. Siempre lee de las tablas existentes del SaaS. Si el tenant cambia un precio en el admin, se refleja inmediatamente en la tienda.

---

## 2. Campos Adicionales en Tablas Existentes

En lugar de crear tablas paralelas, se agregan campos de visibilidad y configuración a las tablas que ya existen.

### products (agregar columnas)
```sql
-- Visibilidad en tienda digital
ALTER TABLE products ADD COLUMN is_store_visible BOOLEAN DEFAULT false;
-- ¿Se muestra en la tienda digital? Toggle desde el admin.
-- Por defecto FALSE: el tenant elige qué publicar.

ALTER TABLE products ADD COLUMN store_description TEXT;
-- Descripción extendida para la tienda (puede diferir de la interna).
-- Si es NULL, se usa la descripción normal.

ALTER TABLE products ADD COLUMN store_images JSONB DEFAULT '[]';
-- Galería de imágenes para la tienda (múltiples fotos).
-- Si vacío, se usa image_url principal.

ALTER TABLE products ADD COLUMN store_sort_order INTEGER DEFAULT 0;
-- Orden personalizado en la tienda.

ALTER TABLE products ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN total_reviews INTEGER DEFAULT 0;
-- Se actualizan automáticamente con las reseñas.
```

### services (agregar columnas)
```sql
ALTER TABLE services ADD COLUMN is_store_visible BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN store_description TEXT;
ALTER TABLE services ADD COLUMN store_image_url TEXT;
ALTER TABLE services ADD COLUMN allows_online_booking BOOLEAN DEFAULT false;
-- ¿Se puede agendar desde la tienda digital?
-- Diferente de is_store_visible: puede mostrarse pero no permitir booking online.

ALTER TABLE services ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE services ADD COLUMN total_reviews INTEGER DEFAULT 0;
```

### nail_designs (agregar columnas)
```sql
ALTER TABLE nail_designs ADD COLUMN is_store_visible BOOLEAN DEFAULT true;
-- Los diseños por defecto SÍ se muestran (son marketing).
```

### stores (agregar columnas para ubicación pública)
```sql
ALTER TABLE stores ADD COLUMN is_store_visible BOOLEAN DEFAULT false;
-- ¿Esta sucursal aparece en la tienda digital?

ALTER TABLE stores ADD COLUMN latitude DECIMAL(10,7);
ALTER TABLE stores ADD COLUMN longitude DECIMAL(10,7);
ALTER TABLE stores ADD COLUMN neighborhood VARCHAR(100);
ALTER TABLE stores ADD COLUMN accepts_pickup BOOLEAN DEFAULT true;
ALTER TABLE stores ADD COLUMN accepts_online_appointments BOOLEAN DEFAULT true;

ALTER TABLE stores ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE stores ADD COLUMN total_reviews INTEGER DEFAULT 0;
```

### product_categories (agregar)
```sql
ALTER TABLE product_categories ADD COLUMN is_store_visible BOOLEAN DEFAULT true;
-- ¿Se muestra esta categoría en la tienda?
```

### brands (agregar)
```sql
ALTER TABLE brands ADD COLUMN is_store_visible BOOLEAN DEFAULT true;
```

---

## 3. Tabla Nueva: Solo el Perfil Público (storefront)

La única tabla nueva significativa es `storefronts` — el perfil público del salón. Todo lo demás se lee de las tablas existentes.

```sql
-- Esta tabla contiene SOLO la info pública del negocio
-- que no existe en otras tablas (branding, redes sociales, config de tienda)

CREATE TABLE storefronts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Identidad pública (puede diferir del nombre interno)
  display_name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  tagline VARCHAR(300),
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  gallery_urls JSONB DEFAULT '[]',
  
  -- Tipo de negocio
  business_type VARCHAR(50),
  tags JSONB DEFAULT '[]',
  
  -- Redes sociales y contacto público
  public_email VARCHAR(255),
  public_phone VARCHAR(50),
  whatsapp VARCHAR(50),
  instagram VARCHAR(100),
  facebook VARCHAR(255),
  tiktok VARCHAR(100),
  website VARCHAR(255),
  
  -- Configuración de comercio
  accepts_orders BOOLEAN DEFAULT true,
  accepts_appointments BOOLEAN DEFAULT true,
  accepts_delivery BOOLEAN DEFAULT false,
  delivery_fee DECIMAL(12,2) DEFAULT 0,
  delivery_radius_km INTEGER DEFAULT 10,
  min_order_amount DECIMAL(12,2) DEFAULT 0,
  advance_payment_percent DECIMAL(5,2) DEFAULT 0,
  
  -- SEO (se auto-genera si el tenant no lo configura)
  meta_title VARCHAR(255),
  meta_description VARCHAR(500),
  
  -- Stats (calculados automáticamente)
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_orders_completed INTEGER DEFAULT 0,
  
  -- Estado
  is_active BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);
```

---

## 4. Flujo de Datos: SaaS → Tienda Digital

```
ADMIN (SaaS)                          TIENDA DIGITAL
─────────────                         ──────────────

Crea producto                    →    No aparece (is_store_visible = false)
  ↓
Toggle "Mostrar en tienda" ON    →    Aparece en la tienda con precio actual
  ↓
Cambia precio $25K → $30K       →    Se refleja inmediatamente
  ↓
Stock llega a 0                  →    Se muestra como "Agotado"
  ↓
Toggle OFF                       →    Desaparece de la tienda

Crea servicio                    →    No aparece
  ↓
Toggle "Visible en tienda" ON   →    Aparece en la tienda
Toggle "Booking online" ON      →    Botón "Agendar cita" visible
  ↓
Cambia horarios de la sucursal  →    Calendario actualizado

Buyer crea pedido                ←    Pedido llega al admin como venta POS
  ↓                                    (source: 'storefront')
Tenant confirma pedido           →    Buyer recibe notificación
  ↓
Se descuenta inventario          →    Stock actualizado en tienda
  ↓
Se genera factura (si aplica)

Buyer agenda cita                ←    Cita llega al admin en la agenda
  ↓                                    (source: 'storefront')
Aparece en el calendario normal
Mismos recordatorios y flujo
```

---

## 5. Nuevo Módulo en el Sidebar del SaaS

```
Sidebar del SaaS Admin:
├── Inicio
├── Inventario
├── Ventas POS
├── Agendamiento de Citas
├── Catálogo Productos
├── Catálogo Diseño de Uñas
├── Clientes
├── Proveedores
├── Reportes
├── Gastos
├── Contabilidad
├── ───────────────────
├── 🛍️ Tienda Digital          ← NUEVO GRUPO
│   ├── Mi Vitrina               (perfil público + activar/desactivar)
│   ├── Pedidos Online           (gestión de orders)
│   ├── Reseñas                  (ver y responder)
│   └── API & Agentes IA        (keys + MCP)
├── ───────────────────
├── Usuarios
├── Agentes IA
└── Configuración
```

---

## 6. Páginas del Admin para Tienda Digital

### 6.1 Mi Vitrina

Configuración del perfil público del salón.

```
┌─────────────────────────────────────────────────────────────┐
│ 🛍️ Mi Vitrina                                [Vista previa] │
│                                                             │
│ Estado: ● Activa    [Desactivar tienda]                    │
│ URL: tienda.glamorapp.com/glamour-studio     [Copiar link] │
│                                                             │
│ ┌─ Tabs ─────────────────────────────────────────────────┐  │
│ │ Perfil | Productos | Servicios | Sucursales | Comercio │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                             │
│ ─── Tab: Perfil ───                                         │
│ Nombre público:   [Glamour Studio                    ]      │
│ Slug:             [glamour-studio                    ]      │
│ Tagline:          [Tu belleza, nuestra pasión        ]      │
│ Descripción:      [____________________________      ]      │
│ Logo:             [📷 Subir] (preview)                      │
│ Banner:           [📷 Subir] (preview)                      │
│ Galería:          [📷 + Agregar fotos] (grid preview)       │
│                                                             │
│ Tipo de negocio:  [Salón de belleza ▼]                      │
│ Tags:             [uñas] [cabello] [maquillaje] [+]         │
│                                                             │
│ Redes sociales:                                             │
│ WhatsApp:  [300 123 4567    ]                               │
│ Instagram: [@glamourstudio  ]                               │
│ Facebook:  [/glamourstudio  ]                               │
│ TikTok:    [@glamourstudio  ]                               │
│                                                             │
│ [Guardar cambios]                                           │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Mi Vitrina > Tab Productos

Toggle masivo de visibilidad. No se duplica la gestión de productos — solo se controla qué se muestra.

```
┌─────────────────────────────────────────────────────────────┐
│ Productos en la Tienda Digital                              │
│                                                             │
│ Mostrando 45 de 234 productos    [Publicar todos] [Ocultar]│
│                                                             │
│ ┌─ Filtros ────────────────────────────────────────────┐    │
│ │ [Buscar...] [Categoría ▼] [Marca ▼] [Estado ▼]      │    │
│ │ Estado: ● Todos ○ Visibles ○ Ocultos                 │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                             │
│ ┌─────┬──────────────────┬──────────┬────────┬──────────┐  │
│ │ ☑   │ Producto         │ Precio   │ Stock  │ Tienda   │  │
│ ├─────┼──────────────────┼──────────┼────────┼──────────┤  │
│ │ ☑   │ 📷 Esmalte OPI   │ $25,000  │ 15     │ 🟢 ON    │  │
│ │ ☑   │ 📷 Acrílico CND  │ $18,500  │ 8      │ 🟢 ON    │  │
│ │ ☐   │ 📷 Lima 100/180  │ $6,800   │ 42     │ ⚪ OFF   │  │
│ │ ☐   │ 📷 Acetona pura  │ $12,000  │ 0      │ ⚪ OFF   │  │
│ │     │                  │          │ ⚠️ Sin  │ (no pub.)│  │
│ │ ☑   │ 📷 Gel Base Coat │ $32,000  │ 5      │ 🟢 ON    │  │
│ └─────┴──────────────────┴──────────┴────────┴──────────┘  │
│                                                             │
│ ℹ️ Los precios y stock se toman del módulo de Inventario.    │
│   Para cambiar un precio, ve a Inventario > Productos.      │
│                                                             │
│ ⚠️ Los productos sin stock se muestran como "Agotado"       │
│   automáticamente. No necesitas ocultarlos.                  │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Mi Vitrina > Tab Servicios

```
┌─────────────────────────────────────────────────────────────┐
│ Servicios en la Tienda Digital                              │
│                                                             │
│ ┌─────┬──────────────────┬────────┬────────┬───────┬─────┐ │
│ │     │ Servicio         │ Precio │ Durac. │Visible│Book.│ │
│ ├─────┼──────────────────┼────────┼────────┼───────┼─────┤ │
│ │     │ Manicure Clásico │$35,000 │ 60min  │ 🟢 ON │🟢 ON│ │
│ │     │ Pedicure Spa     │$40,000 │ 75min  │ 🟢 ON │🟢 ON│ │
│ │     │ Uñas Acrílicas   │$60,000 │ 90min  │ 🟢 ON │🟢 ON│ │
│ │     │ Coloración       │$120K   │ 120min │ 🟢 ON │⚪OFF│ │
│ │     │                  │        │        │(muestra│(no  │ │
│ │     │                  │        │        │ info)  │book)│ │
│ │     │ Maquillaje Social│$70,000 │ 60min  │ ⚪ OFF│⚪OFF│ │
│ └─────┴──────────────────┴────────┴────────┴───────┴─────┘ │
│                                                             │
│ Visible = se muestra en la tienda                           │
│ Booking = permite agendar cita online (requiere Visible ON) │
│                                                             │
│ ℹ️ Los precios y duración se gestionan en                    │
│   Agendamiento de Citas > Servicios.                        │
└─────────────────────────────────────────────────────────────┘
```

### 6.4 Mi Vitrina > Tab Sucursales

```
┌─────────────────────────────────────────────────────────────┐
│ Sucursales en la Tienda Digital                             │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 📍 Sede Centro                              🟢 Activa │   │
│ │ Cra 43 # 10-50, Medellín                             │   │
│ │ Lat: 6.2442  Lng: -75.5812  [📍 Ajustar en mapa]     │   │
│ │ Barrio: [Centro           ]                           │   │
│ │                                                       │   │
│ │ ☑ Visible en tienda                                   │   │
│ │ ☑ Acepta recogida de pedidos                          │   │
│ │ ☑ Acepta citas online                                 │   │
│ │                                                       │   │
│ │ Horarios: (se toman de Configuración)                 │   │
│ │ Lun-Vie: 8:00 - 18:00                                │   │
│ │ Sáb: 9:00 - 14:00                                    │   │
│ │ Dom: Cerrado                                          │   │
│ │ ℹ️ Para cambiar horarios, ve a Configuración > Tienda  │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 📍 Sede Laureles                            🟢 Activa │   │
│ │ Cra 76 # 33-12, Medellín                             │   │
│ │ ...                                                   │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ℹ️ Las sucursales se crean en Configuración > Sucursales.    │
│   Aquí solo configuras su visibilidad y ubicación GPS.      │
└─────────────────────────────────────────────────────────────┘
```

### 6.5 Mi Vitrina > Tab Comercio

```
┌─────────────────────────────────────────────────────────────┐
│ Configuración de Comercio                                   │
│                                                             │
│ Pedidos                                                     │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ☑ Aceptar pedidos de productos online                 │   │
│ │ ☑ Permitir pago en tienda                             │   │
│ │ ☑ Permitir pago online (Wompi)                        │   │
│ │ Pedido mínimo: [$        0 ] COP                      │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ Envío a domicilio                                           │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ☐ Habilitar envío a domicilio                         │   │
│ │ Costo de envío: [$    8,000 ] COP                     │   │
│ │ Radio máximo:   [     10    ] km                      │   │
│ │ Envío gratis desde: [$  100,000 ] COP                 │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ Citas Online                                                │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ☑ Aceptar citas desde la tienda digital               │   │
│ │ Anticipo requerido: [    0   ] %                      │   │
│ │ (0% = no requiere pago anticipado)                    │   │
│ │                                                       │   │
│ │ Cancelación:                                          │   │
│ │ ☑ Permitir cancelación online                         │   │
│ │ Cancelar hasta [  24  ] horas antes                   │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ [Guardar configuración]                                     │
└─────────────────────────────────────────────────────────────┘
```

### 6.6 Pedidos Online

Página separada en la sección "Tienda Digital" del sidebar. Los pedidos online llegan aquí y también se reflejan en Ventas POS.

```
┌─────────────────────────────────────────────────────────────┐
│ 🛒 Pedidos Online                                           │
│                                                             │
│ KPIs:                                                       │
│ ┌────────┬─────────┬──────────┬──────────┬────────────┐    │
│ │Hoy: 5  │Pendient.│Preparando│ Listos   │ Ingreso mes│    │
│ │pedidos  │   3     │    1     │    1     │ $1,250,000 │    │
│ └────────┴─────────┴──────────┴──────────┴────────────┘    │
│                                                             │
│ Tabs: Todos | Pendientes | En preparación | Listos | Histor.│
│                                                             │
│ ┌──────┬──────────────┬────────────┬─────────┬──────────┐  │
│ │ #    │ Cliente      │ Items      │ Total   │ Estado   │  │
│ ├──────┼──────────────┼────────────┼─────────┼──────────┤  │
│ │PED-42│ Ana García   │ 3 productos│ $68,500 │🟡Pendien.│  │
│ │      │ 300 123 4567 │ Sucursal:  │ Pickup  │          │  │
│ │      │              │ Centro     │         │[Confirmar│  │
│ │      │              │            │         │Rechazar] │  │
│ ├──────┼──────────────┼────────────┼─────────┼──────────┤  │
│ │PED-41│ Luis Pérez   │ 1 producto │ $25,000 │🔵Prepar. │  │
│ │      │              │ Sucursal:  │ Pickup  │          │  │
│ │      │              │ Laureles   │         │[Listo]   │  │
│ └──────┴──────────────┴────────────┴─────────┴──────────┘  │
│                                                             │
│ Al confirmar pedido:                                        │
│  → Se descuenta inventario automáticamente                  │
│  → Se crea venta interna en Ventas POS (source: storefront)│
│  → Se notifica al buyer por email                           │
│  → Se puede generar factura electrónica                     │
└─────────────────────────────────────────────────────────────┘
```

### 6.7 Reseñas

```
┌─────────────────────────────────────────────────────────────┐
│ ⭐ Reseñas de Clientes                                      │
│                                                             │
│ Rating promedio: ⭐ 4.8 (234 reseñas)                       │
│ ⭐⭐⭐⭐⭐ ████████████████ 178 (76%)                         │
│ ⭐⭐⭐⭐   ████ 38 (16%)                                      │
│ ⭐⭐⭐     █ 12 (5%)                                          │
│ ⭐⭐       ▏ 4 (2%)                                          │
│ ⭐         ▏ 2 (1%)                                          │
│                                                             │
│ Tabs: Todas | Sin responder (12) | Respondidas              │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ⭐⭐⭐⭐⭐  Ana García          15 May 2024             │   │
│ │ "Excelente servicio"          ✓ Compra verificada     │   │
│ │ El manicure quedó perfecto, María es muy profesional. │   │
│ │                                                       │   │
│ │ [Responder]                                           │   │
│ └───────────────────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ ⭐⭐⭐⭐   Luis Pérez           12 May 2024             │   │
│ │ "Buen producto, envío lento"                          │   │
│ │ El esmalte es de muy buena calidad pero tardó...      │   │
│ │                                                       │   │
│ │ 💬 Respuesta de Glamour Studio:                       │   │
│ │ "Gracias Luis, estamos mejorando nuestros tiempos..." │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Integración con Módulos Existentes

### 7.1 Pedido Online → Venta POS

Cuando un pedido se confirma, se crea automáticamente una venta interna:

```typescript
// apps/api/src/modules/storefront/orders.service.ts

async confirmOrder(orderId: string): Promise<void> {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  // 1. Crear venta interna en el sistema POS
  const sale = await this.salesService.create({
    tenantId: order.tenantId,
    storeId: order.storeId,
    customerId: await this.findOrCreateCustomer(order), // Vincula buyer ↔ customer
    source: 'storefront',
    items: order.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    paymentMethod: order.paymentMethod === 'online' ? 'transfer' : 'pending',
  });

  // 2. Descontar inventario (lo hace salesService.complete automáticamente)
  if (order.paymentStatus === 'paid') {
    await this.salesService.complete(sale.id);
  }

  // 3. Vincular pedido con venta
  await this.prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'confirmed',
      saleId: sale.id,
      confirmedAt: new Date(),
    },
  });

  // 4. Notificar al buyer
  await this.notificationsService.notifyBuyer(order.buyerId, {
    type: 'order_confirmed',
    orderId: order.id,
    orderNumber: order.orderNumber,
  });
}
```

### 7.2 Cita Online → Agenda Normal

Las citas agendadas desde la tienda aparecen directamente en el calendario del SaaS:

```typescript
// apps/api/src/modules/storefront/store-appointments.service.ts

async createFromStorefront(data: CreateStoreAppointmentDto): Promise<Appointment> {
  // 1. Buscar o crear customer a partir del buyer
  const customer = await this.findOrCreateCustomer(data.buyerInfo, data.tenantId, data.storeId);

  // 2. Crear cita normal (misma tabla appointments)
  const appointment = await this.appointmentsService.create({
    tenantId: data.tenantId,
    storeId: data.storeId,
    customerId: customer.id,
    professionalId: data.professionalId,
    serviceId: data.serviceId,
    nailDesignId: data.nailDesignId,
    date: data.date,
    startTime: data.startTime,
    notes: data.notes,
    originChannel: 'storefront',  // Diferenciador vs 'manual'
    buyerId: data.buyerId,        // Referencia al buyer
  });

  // 3. Notificar al tenant (aparece en su agenda)
  await this.notificationsService.notifyTenant(data.tenantId, {
    type: 'new_online_appointment',
    appointmentId: appointment.id,
  });

  // 4. Notificar al buyer
  await this.notificationsService.notifyBuyer(data.buyerId, {
    type: 'appointment_created',
    appointmentId: appointment.id,
  });

  return appointment;
}
```

### 7.3 Buyer ↔ Customer (sincronización)

Un buyer de la tienda se vincula con un customer del tenant:

```sql
-- Tabla de vinculación
CREATE TABLE buyer_customer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES buyers(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(buyer_id, tenant_id)
);
```

```typescript
// Cuando un buyer hace su primera compra/cita en un tenant:
async findOrCreateCustomer(buyerInfo, tenantId, storeId): Promise<Customer> {
  // 1. Buscar vínculo existente
  const link = await this.prisma.buyerCustomerLink.findUnique({
    where: { buyerId_tenantId: { buyerId: buyerInfo.buyerId, tenantId } },
  });
  
  if (link) {
    return this.prisma.customer.findUnique({ where: { id: link.customerId } });
  }

  // 2. Buscar customer por teléfono o email
  let customer = await this.prisma.customer.findFirst({
    where: {
      tenantId,
      OR: [
        { phone: buyerInfo.phone },
        { email: buyerInfo.email },
      ],
    },
  });

  // 3. Si no existe, crear customer nuevo
  if (!customer) {
    customer = await this.prisma.customer.create({
      data: {
        tenantId,
        storeId,
        firstName: buyerInfo.firstName,
        lastName: buyerInfo.lastName,
        email: buyerInfo.email,
        phone: buyerInfo.phone,
        source: 'storefront',
        customerNumber: await this.generateCustomerNumber(tenantId, storeId),
      },
    });
  }

  // 4. Crear vínculo
  await this.prisma.buyerCustomerLink.create({
    data: { buyerId: buyerInfo.buyerId, customerId: customer.id, tenantId },
  });

  return customer;
}
```

### 7.4 Inventario — Descuento Automático

```
Pedido confirmado con pago
  ↓
Se crea Sale interna (source: 'storefront')
  ↓
Sale.complete() ejecuta:
  → inventory_movement (type: 'exit', reference_type: 'sale')
  → product.current_stock -= quantity
  ↓
Si current_stock <= min_stock:
  → Notificación de stock bajo
  → Agente IA de Inventario puede sugerir reposición
  ↓
En la tienda digital:
  → Si stock = 0: muestra "Agotado"
  → Si stock > 0: muestra disponible
```

### 7.5 Reportes — Incluir Ventas Online

Los reportes existentes ya muestran las ventas online porque se crean como ventas POS normales. Solo se agrega un filtro de canal:

```
GET /api/v1/reports/sales?source=all|manual|storefront|mcp_agent

// Nuevo widget en el dashboard de reportes:
"Ventas por canal"
├── POS Manual:     65% ($81,530)
├── Tienda Digital: 28% ($35,120)
└── Agentes IA:      7% ($8,780)
```

---

## 8. Endpoints Actualizados en el SaaS Admin

### Gestión de Storefront (desde el admin)
```
GET    /api/v1/storefront                        (mi perfil público)
PUT    /api/v1/storefront                        (actualizar perfil)
POST   /api/v1/storefront/activate
POST   /api/v1/storefront/deactivate
PUT    /api/v1/storefront/commerce-config         (config de comercio)
GET    /api/v1/storefront/stats                   (KPIs de tienda online)
```

### Visibilidad de Productos/Servicios (toggle rápido)
```
PUT    /api/v1/products/:id/store-visibility      { is_store_visible: true/false }
PUT    /api/v1/products/bulk-store-visibility      { ids: [...], is_store_visible: true }
PUT    /api/v1/services/:id/store-visibility       { is_store_visible: true, allows_online_booking: true }
PUT    /api/v1/services/bulk-store-visibility       { ids: [...], ... }
PUT    /api/v1/stores/:id/store-visibility          { is_store_visible: true }
```

### Pedidos Online (gestión desde admin)
```
GET    /api/v1/storefront/orders                  ?status&date_from&date_to&page&limit
GET    /api/v1/storefront/orders/:id
POST   /api/v1/storefront/orders/:id/confirm       → crea sale + descuenta stock
POST   /api/v1/storefront/orders/:id/preparing
POST   /api/v1/storefront/orders/:id/ready
POST   /api/v1/storefront/orders/:id/deliver
POST   /api/v1/storefront/orders/:id/cancel         (+ reason)
```

### Reseñas (gestión desde admin)
```
GET    /api/v1/storefront/reviews                  ?rating&responded&page&limit
POST   /api/v1/storefront/reviews/:id/reply         { reply: "Gracias..." }
POST   /api/v1/storefront/reviews/:id/report        (reportar reseña inapropiada)
```

---

## 9. Resumen: Qué se Gestiona Dónde

| Dato | Se gestiona en | La tienda... |
|---|---|---|
| Productos (crear, editar, precio) | Inventario | Lee directamente |
| Servicios (crear, editar, precio) | Agendamiento / Servicios | Lee directamente |
| Diseños de uñas | Catálogo Uñas | Lee directamente |
| Stock | Inventario (auto-descuenta) | Muestra disponibilidad |
| Categorías | Catálogo Productos | Lee para filtros |
| Marcas | Catálogo Productos | Lee para filtros |
| Horarios | Configuración > Tienda | Lee para disponibilidad |
| Sucursales | Configuración > Sucursales | Lee + muestra en mapa |
| Visibilidad en tienda | Tienda Digital > Mi Vitrina | Filtra qué mostrar |
| Perfil público | Tienda Digital > Mi Vitrina | Muestra perfil del salón |
| Config comercio | Tienda Digital > Mi Vitrina | Aplica reglas de pedido |
| Pedidos online | Tienda Digital > Pedidos | Crea, tenant gestiona |
| Citas online | Agendamiento (agenda normal) | Crea, tenant gestiona |
| Reseñas | Tienda Digital > Reseñas | Buyer escribe, tenant responde |
| API Keys | Tienda Digital > API & Agentes | Tenant crea/revoca |
| Facturación | Contabilidad | Auto-genera si aplica |
| Clientes | Clientes (se vincula buyer) | Buyer se convierte en customer |
