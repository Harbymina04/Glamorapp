# Glamorapp — Arquitectura del Sistema

## 1. Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (SPA)                        │
│              Next.js 14+ / React 18 / TypeScript           │
│              Tailwind CSS + shadcn/ui + Recharts           │
├─────────────────────────────────────────────────────────────┤
│                      API GATEWAY                           │
│                   NestJS + Fastify                         │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│  Auth    │  Core    │  AI      │ Files    │ Notifications  │
│ Service  │ Modules  │ Service  │ Service  │ Service        │
├──────────┴──────────┴──────────┴──────────┴────────────────┤
│                    PostgreSQL 15+                          │
│                  (Multi-tenant DB)                         │
├─────────────────────────────────────────────────────────────┤
│           Redis (Cache + Sessions + Queues)                │
├─────────────────────────────────────────────────────────────┤
│         S3/MinIO (Imágenes productos, diseños, logos)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Stack Tecnológico

### Frontend
| Tecnología | Propósito |
|---|---|
| Next.js 14+ (App Router) | Framework React con SSR/SSG |
| TypeScript 5+ | Tipado estricto |
| Tailwind CSS 3.4+ | Estilos utility-first |
| shadcn/ui | Componentes base (Radix) |
| Lucide React | Iconografía |
| Recharts | Gráficas y visualizaciones |
| Zustand | Estado global ligero |
| TanStack Query v5 | Data fetching, cache, mutations |
| React Hook Form + Zod | Formularios y validación |
| date-fns | Manejo de fechas |
| next-intl | Internacionalización (es/en) |

### Backend
| Tecnología | Propósito |
|---|---|
| NestJS 10+ | Framework backend modular |
| Fastify adapter | HTTP server (más rápido que Express) |
| Prisma ORM | Acceso a datos + migraciones |
| PostgreSQL 15+ | Base de datos principal |
| Redis | Cache, sessions, job queues |
| BullMQ | Cola de trabajos (notificaciones, IA) |
| Passport.js | Autenticación (JWT) |
| Multer + S3 | Upload de archivos |
| class-validator | Validación de DTOs |
| Swagger/OpenAPI | Documentación de API |

### IA
| Tecnología | Propósito |
|---|---|
| Claude API (Anthropic) | Motor de IA para agentes |
| BullMQ | Procesamiento asíncrono de análisis |
| Cron jobs (NestJS Schedule) | Ejecución periódica de agentes |

### Infraestructura
| Tecnología | Propósito |
|---|---|
| Docker + Docker Compose | Contenedores |
| Vercel / Railway | Deploy frontend |
| Railway / Render / AWS | Deploy backend |
| Supabase / Neon | PostgreSQL managed |
| Upstash | Redis managed |
| Cloudflare R2 / AWS S3 | Object storage |
| GitHub Actions | CI/CD |

---

## 3. Estructura de Carpetas

### Monorepo Structure
```
glamorapp/
├── apps/
│   ├── web/                          # Frontend Next.js
│   │   ├── app/
│   │   │   ├── (auth)/               # Login, register, forgot-password
│   │   │   │   ├── login/
│   │   │   │   └── layout.tsx
│   │   │   ├── (dashboard)/          # App principal (requiere auth)
│   │   │   │   ├── layout.tsx        # Sidebar + Header
│   │   │   │   ├── page.tsx          # Dashboard/Inicio
│   │   │   │   ├── inventory/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── pos/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── appointments/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── catalog/
│   │   │   │   │   ├── products/
│   │   │   │   │   └── nail-designs/
│   │   │   │   ├── customers/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── suppliers/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── reports/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── expenses/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── users/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── ai-agents/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── layout/
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── header.tsx
│   │   │   │   ├── mobile-nav.tsx
│   │   │   │   └── breadcrumb.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── kpi-cards.tsx
│   │   │   │   ├── sales-summary.tsx
│   │   │   │   ├── appointments-preview.tsx
│   │   │   │   └── inventory-chart.tsx
│   │   │   ├── inventory/
│   │   │   │   ├── product-table.tsx
│   │   │   │   ├── product-form.tsx
│   │   │   │   ├── movement-history.tsx
│   │   │   │   ├── stock-alerts.tsx
│   │   │   │   └── category-sidebar.tsx
│   │   │   ├── pos/
│   │   │   │   ├── product-grid.tsx
│   │   │   │   ├── cart.tsx
│   │   │   │   ├── payment-modal.tsx
│   │   │   │   └── receipt.tsx
│   │   │   ├── appointments/
│   │   │   │   ├── calendar.tsx
│   │   │   │   ├── appointment-form.tsx
│   │   │   │   ├── appointment-detail.tsx
│   │   │   │   └── stats-bar.tsx
│   │   │   ├── catalog/
│   │   │   │   ├── product-card.tsx
│   │   │   │   ├── nail-design-card.tsx
│   │   │   │   └── category-filter.tsx
│   │   │   ├── customers/
│   │   │   │   ├── customer-table.tsx
│   │   │   │   ├── customer-detail-panel.tsx
│   │   │   │   ├── customer-form.tsx
│   │   │   │   └── loyalty-badge.tsx
│   │   │   ├── suppliers/
│   │   │   │   ├── supplier-table.tsx
│   │   │   │   ├── supplier-detail-panel.tsx
│   │   │   │   └── supplier-form.tsx
│   │   │   ├── reports/
│   │   │   │   ├── kpi-summary.tsx
│   │   │   │   ├── revenue-chart.tsx
│   │   │   │   ├── category-donut.tsx
│   │   │   │   ├── comparison-table.tsx
│   │   │   │   └── filter-sidebar.tsx
│   │   │   ├── expenses/
│   │   │   │   ├── expense-table.tsx
│   │   │   │   ├── expense-form.tsx
│   │   │   │   └── expense-summary.tsx
│   │   │   ├── ai-agents/
│   │   │   │   ├── agent-card.tsx
│   │   │   │   ├── agent-detail.tsx
│   │   │   │   ├── recommendation-card.tsx
│   │   │   │   └── activity-feed.tsx
│   │   │   └── shared/
│   │   │       ├── data-table.tsx     # Tabla reutilizable con paginación
│   │   │       ├── search-input.tsx
│   │   │       ├── filter-bar.tsx
│   │   │       ├── status-badge.tsx
│   │   │       ├── stat-card.tsx      # KPI card reutilizable
│   │   │       ├── confirm-dialog.tsx
│   │   │       ├── empty-state.tsx
│   │   │       ├── loading-skeleton.tsx
│   │   │       └── image-upload.tsx
│   │   ├── hooks/
│   │   │   ├── use-auth.ts
│   │   │   ├── use-store.ts
│   │   │   ├── use-debounce.ts
│   │   │   ├── use-pagination.ts
│   │   │   └── use-media-query.ts
│   │   ├── lib/
│   │   │   ├── api-client.ts         # Axios/fetch wrapper
│   │   │   ├── auth.ts               # JWT helpers
│   │   │   ├── utils.ts              # cn(), formatCurrency(), etc.
│   │   │   ├── constants.ts
│   │   │   └── validations.ts        # Zod schemas compartidos
│   │   ├── stores/                   # Zustand stores
│   │   │   ├── auth-store.ts
│   │   │   ├── cart-store.ts         # POS cart state
│   │   │   └── ui-store.ts           # sidebar, modals, theme
│   │   ├── services/                 # TanStack Query hooks por módulo
│   │   │   ├── products.ts
│   │   │   ├── sales.ts
│   │   │   ├── appointments.ts
│   │   │   ├── customers.ts
│   │   │   ├── suppliers.ts
│   │   │   ├── expenses.ts
│   │   │   ├── reports.ts
│   │   │   └── ai-agents.ts
│   │   ├── types/
│   │   │   ├── index.ts              # Tipos compartidos
│   │   │   ├── product.ts
│   │   │   ├── sale.ts
│   │   │   ├── appointment.ts
│   │   │   ├── customer.ts
│   │   │   ├── supplier.ts
│   │   │   ├── expense.ts
│   │   │   ├── report.ts
│   │   │   └── ai-agent.ts
│   │   ├── public/
│   │   │   ├── logo.svg
│   │   │   └── images/
│   │   ├── tailwind.config.ts
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                          # Backend NestJS
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── common/
│       │   │   ├── decorators/
│       │   │   │   ├── tenant.decorator.ts
│       │   │   │   ├── current-user.decorator.ts
│       │   │   │   └── roles.decorator.ts
│       │   │   ├── guards/
│       │   │   │   ├── jwt-auth.guard.ts
│       │   │   │   ├── roles.guard.ts
│       │   │   │   └── tenant.guard.ts
│       │   │   ├── interceptors/
│       │   │   │   ├── audit.interceptor.ts
│       │   │   │   └── transform.interceptor.ts
│       │   │   ├── filters/
│       │   │   │   └── http-exception.filter.ts
│       │   │   ├── pipes/
│       │   │   │   └── validation.pipe.ts
│       │   │   ├── dto/
│       │   │   │   ├── pagination.dto.ts
│       │   │   │   └── response.dto.ts
│       │   │   └── utils/
│       │   │       ├── pagination.ts
│       │   │       └── slug.ts
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   │   ├── auth.module.ts
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── strategies/
│       │   │   │   │   └── jwt.strategy.ts
│       │   │   │   └── dto/
│       │   │   │       ├── login.dto.ts
│       │   │   │       └── register.dto.ts
│       │   │   ├── products/
│       │   │   │   ├── products.module.ts
│       │   │   │   ├── products.controller.ts
│       │   │   │   ├── products.service.ts
│       │   │   │   └── dto/
│       │   │   ├── inventory/
│       │   │   │   ├── inventory.module.ts
│       │   │   │   ├── inventory.controller.ts
│       │   │   │   ├── inventory.service.ts
│       │   │   │   └── dto/
│       │   │   ├── sales/
│       │   │   │   ├── sales.module.ts
│       │   │   │   ├── sales.controller.ts
│       │   │   │   ├── sales.service.ts
│       │   │   │   └── dto/
│       │   │   ├── appointments/
│       │   │   │   ├── appointments.module.ts
│       │   │   │   ├── appointments.controller.ts
│       │   │   │   ├── appointments.service.ts
│       │   │   │   └── dto/
│       │   │   ├── customers/
│       │   │   │   ├── customers.module.ts
│       │   │   │   ├── customers.controller.ts
│       │   │   │   ├── customers.service.ts
│       │   │   │   └── dto/
│       │   │   ├── suppliers/
│       │   │   ├── expenses/
│       │   │   ├── reports/
│       │   │   ├── catalog/
│       │   │   ├── nail-designs/
│       │   │   ├── services/
│       │   │   ├── users/
│       │   │   ├── notifications/
│       │   │   ├── ai-agents/
│       │   │   │   ├── ai-agents.module.ts
│       │   │   │   ├── ai-agents.controller.ts
│       │   │   │   ├── ai-agents.service.ts
│       │   │   │   ├── agents/              # Lógica por agente
│       │   │   │   │   ├── sales.agent.ts
│       │   │   │   │   ├── inventory.agent.ts
│       │   │   │   │   ├── customers.agent.ts
│       │   │   │   │   ├── appointments.agent.ts
│       │   │   │   │   ├── marketing.agent.ts
│       │   │   │   │   ├── financial.agent.ts
│       │   │   │   │   ├── suppliers.agent.ts
│       │   │   │   │   └── catalog.agent.ts
│       │   │   │   └── dto/
│       │   │   └── settings/
│       │   ├── prisma/
│       │   │   ├── prisma.module.ts
│       │   │   ├── prisma.service.ts
│       │   │   └── schema.prisma
│       │   ├── redis/
│       │   │   ├── redis.module.ts
│       │   │   └── redis.service.ts
│       │   ├── queue/
│       │   │   ├── queue.module.ts
│       │   │   └── processors/
│       │   │       ├── notification.processor.ts
│       │   │       └── ai-agent.processor.ts
│       │   └── storage/
│       │       ├── storage.module.ts
│       │       └── storage.service.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       ├── test/
│       ├── tsconfig.json
│       ├── nest-cli.json
│       └── package.json
│
├── packages/                         # Código compartido
│   └── shared/
│       ├── types/                    # Tipos compartidos front/back
│       ├── constants/
│       ├── validations/              # Zod schemas compartidos
│       └── utils/
│
├── docker-compose.yml
├── .env.example
├── turbo.json                        # Turborepo config
├── package.json                      # Workspace root
└── README.md
```

---

## 4. API REST — Endpoints

### Convenciones
- Base: `/api/v1`
- Autenticación: Bearer token JWT en header `Authorization`
- Tenant automático: extraído del token JWT
- Paginación: `?page=1&limit=10`
- Ordenamiento: `?sort=created_at&order=desc`
- Búsqueda: `?search=keyword`
- Filtros: `?status=active&category_id=uuid`
- Respuesta estándar:
```json
{
  "data": {},
  "meta": { "page": 1, "limit": 10, "total": 100, "totalPages": 10 },
  "message": "OK"
}
```

### Auth
```
POST   /api/v1/auth/login
POST   /api/v1/auth/register
POST   /api/v1/auth/refresh
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/me
```

### Products
```
GET    /api/v1/products                    ?search&category_id&brand_id&status&page&limit
GET    /api/v1/products/:id
POST   /api/v1/products
PUT    /api/v1/products/:id
DELETE /api/v1/products/:id                (soft delete)
POST   /api/v1/products/import             (CSV/Excel)
GET    /api/v1/products/export             (CSV/Excel)
```

### Product Categories
```
GET    /api/v1/product-categories
POST   /api/v1/product-categories
PUT    /api/v1/product-categories/:id
DELETE /api/v1/product-categories/:id
```

### Brands
```
GET    /api/v1/brands
POST   /api/v1/brands
PUT    /api/v1/brands/:id
DELETE /api/v1/brands/:id
```

### Inventory
```
GET    /api/v1/inventory/movements         ?product_id&type&date_from&date_to&page&limit
POST   /api/v1/inventory/movements         (entry, exit, adjustment)
GET    /api/v1/inventory/alerts            (stock bajo y sin stock)
GET    /api/v1/inventory/summary           (KPIs: total, valor, stock bajo, sin stock)
```

### Sales (POS)
```
GET    /api/v1/sales                       ?status&customer_id&user_id&date_from&date_to&page&limit
GET    /api/v1/sales/:id
POST   /api/v1/sales                       (crear venta)
PUT    /api/v1/sales/:id                   (actualizar venta pendiente)
POST   /api/v1/sales/:id/complete          (finalizar venta + descontar stock)
POST   /api/v1/sales/:id/cancel            (cancelar venta + devolver stock)
GET    /api/v1/sales/:id/receipt           (generar recibo)
GET    /api/v1/sales/summary/today         (KPIs del día)
```

### Services
```
GET    /api/v1/services                    ?category&is_active
GET    /api/v1/services/:id
POST   /api/v1/services
PUT    /api/v1/services/:id
DELETE /api/v1/services/:id
```

### Appointments
```
GET    /api/v1/appointments                ?date_from&date_to&professional_id&status&customer_id
GET    /api/v1/appointments/:id
POST   /api/v1/appointments
PUT    /api/v1/appointments/:id
POST   /api/v1/appointments/:id/confirm
POST   /api/v1/appointments/:id/start
POST   /api/v1/appointments/:id/complete
POST   /api/v1/appointments/:id/cancel
POST   /api/v1/appointments/:id/no-show
GET    /api/v1/appointments/available-slots ?date&professional_id&duration
GET    /api/v1/appointments/summary/week   (estadísticas de la semana)
```

### Catalog - Products
```
GET    /api/v1/catalog/products            ?category_id&brand_id&is_featured&page&limit
PUT    /api/v1/catalog/products/:id/toggle-visibility
PUT    /api/v1/catalog/products/:id/toggle-featured
GET    /api/v1/catalog/products/stats      (vistas, categorías)
```

### Catalog - Nail Designs
```
GET    /api/v1/nail-designs                ?category&technique&is_favorite&sort_by&page&limit
GET    /api/v1/nail-designs/:id
POST   /api/v1/nail-designs
PUT    /api/v1/nail-designs/:id
DELETE /api/v1/nail-designs/:id
POST   /api/v1/nail-designs/:id/favorite
GET    /api/v1/nail-designs/ranking        (top populares)
```

### Customers
```
GET    /api/v1/customers                   ?search&segment&loyalty_tier&tag&is_active&page&limit
GET    /api/v1/customers/:id
POST   /api/v1/customers
PUT    /api/v1/customers/:id
DELETE /api/v1/customers/:id               (soft delete)
GET    /api/v1/customers/:id/history       (compras + citas)
GET    /api/v1/customers/:id/notes
POST   /api/v1/customers/:id/notes
GET    /api/v1/customers/birthdays/month   (cumpleaños del mes)
GET    /api/v1/customers/segments/summary
GET    /api/v1/customers/export
```

### Suppliers
```
GET    /api/v1/suppliers                   ?search&category&status&page&limit
GET    /api/v1/suppliers/:id
POST   /api/v1/suppliers
PUT    /api/v1/suppliers/:id
DELETE /api/v1/suppliers/:id               (soft delete)
GET    /api/v1/suppliers/:id/purchases
GET    /api/v1/suppliers/:id/products
GET    /api/v1/suppliers/:id/payments
GET    /api/v1/suppliers/upcoming-payments (próximos pagos)
```

### Purchases
```
GET    /api/v1/purchases                   ?supplier_id&status&date_from&date_to&page&limit
GET    /api/v1/purchases/:id
POST   /api/v1/purchases
PUT    /api/v1/purchases/:id
POST   /api/v1/purchases/:id/receive       (recibir mercancía + actualizar stock)
```

### Expenses
```
GET    /api/v1/expenses                    ?category_id&supplier_id&status&date_from&date_to&page&limit
GET    /api/v1/expenses/:id
POST   /api/v1/expenses
PUT    /api/v1/expenses/:id
DELETE /api/v1/expenses/:id                (void, no delete)
GET    /api/v1/expenses/summary            ?period=month
GET    /api/v1/expense-categories
POST   /api/v1/expense-categories
```

### Reports
```
GET    /api/v1/reports/overview            ?date_from&date_to&compare_with
GET    /api/v1/reports/sales               ?date_from&date_to&group_by=day|week|month
GET    /api/v1/reports/appointments         ?date_from&date_to
GET    /api/v1/reports/products             ?date_from&date_to&sort_by=revenue|quantity
GET    /api/v1/reports/inventory
GET    /api/v1/reports/customers            ?date_from&date_to
GET    /api/v1/reports/expenses             ?date_from&date_to
GET    /api/v1/reports/commissions          ?date_from&date_to&professional_id
GET    /api/v1/reports/export/pdf           ?report_type&date_from&date_to
GET    /api/v1/reports/export/excel         ?report_type&date_from&date_to
```

### Users
```
GET    /api/v1/users                       ?role&is_active
GET    /api/v1/users/:id
POST   /api/v1/users
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id
PUT    /api/v1/users/:id/permissions
GET    /api/v1/users/:id/permissions
```

### Settings
```
GET    /api/v1/settings                    (configuración completa de la tienda)
PUT    /api/v1/settings/general
PUT    /api/v1/settings/sales
PUT    /api/v1/settings/notifications
PUT    /api/v1/settings/security
POST   /api/v1/settings/logo               (upload logo)
```

### AI Agents
```
GET    /api/v1/ai-agents                   ?status&category
GET    /api/v1/ai-agents/:id
POST   /api/v1/ai-agents                   (crear agente personalizado)
PUT    /api/v1/ai-agents/:id
POST   /api/v1/ai-agents/:id/activate
POST   /api/v1/ai-agents/:id/pause
PUT    /api/v1/ai-agents/:id/config
GET    /api/v1/ai-agents/:id/permissions
PUT    /api/v1/ai-agents/:id/permissions
GET    /api/v1/ai-agents/:id/actions
PUT    /api/v1/ai-agents/:id/actions/:actionId/toggle
GET    /api/v1/ai-agents/:id/recommendations  ?status&type&page&limit
GET    /api/v1/ai-agents/:id/history       ?page&limit
GET    /api/v1/ai-agents/:id/performance
POST   /api/v1/ai-agents/recommendations/:id/accept
POST   /api/v1/ai-agents/recommendations/:id/reject
GET    /api/v1/ai-agents/recommendations/for-me   (recomendaciones globales)
GET    /api/v1/ai-agents/activity/recent
```

### Notifications
```
GET    /api/v1/notifications               ?is_read&page&limit
PUT    /api/v1/notifications/:id/read
PUT    /api/v1/notifications/read-all
GET    /api/v1/notifications/unread-count
```

### File Upload
```
POST   /api/v1/upload/image               (single image)
POST   /api/v1/upload/images              (multiple images)
DELETE /api/v1/upload/:key                 (delete file)
```

---

## 5. Autenticación y Seguridad

### Flujo JWT
```
1. POST /auth/login → { access_token (15min), refresh_token (7d) }
2. Cada request: Authorization: Bearer <access_token>
3. Token expirado → POST /auth/refresh con refresh_token → nuevo access_token
4. Logout → invalidar refresh_token en DB
```

### Payload del JWT
```json
{
  "sub": "user-uuid",
  "email": "user@email.com",
  "role": "admin",
  "tenantId": "tenant-uuid",
  "storeId": "store-uuid",
  "iat": 1234567890,
  "exp": 1234568790
}
```

### Middleware de Multi-tenancy
Cada request autenticado extrae `tenantId` y `storeId` del JWT y los inyecta en el contexto. Todas las queries de Prisma deben filtrar por `tenantId`.

```typescript
// Decorator @TenantId() extrae del JWT
// Guard TenantGuard valida que el recurso pertenezca al tenant
// Interceptor agrega tenantId a toda creación
```

### Permisos por Módulo
```typescript
@Roles('admin', 'cashier')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController { ... }
```

---

## 6. Patrones de Diseño

### Repository Pattern (vía Prisma)
Cada módulo tiene un service que encapsula las queries de Prisma con filtro de tenant obligatorio.

### Event-Driven
Eventos internos para desacoplar lógica:
- `sale.completed` → actualizar stock, stats del cliente, notificación
- `appointment.confirmed` → notificación
- `inventory.low_stock` → alerta, trigger agente IA
- `ai.recommendation.created` → notificación

### CQRS Ligero
- Comandos (POST/PUT/DELETE) → validación estricta, efectos secundarios
- Queries (GET) → optimizadas para lectura, con cache Redis

### Cache Strategy
```
Redis keys:
  tenant:{id}:dashboard → 5min TTL
  tenant:{id}:products:list → 2min TTL
  tenant:{id}:reports:{type}:{dateRange} → 10min TTL
  
Invalidación por evento:
  sale.completed → invalidar dashboard + reports
  product.updated → invalidar products:list
```

---

## 7. Variables de Entorno

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/glamorapp
REDIS_URL=redis://host:6379

# Auth
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Storage
S3_ENDPOINT=https://your-bucket.r2.cloudflarestorage.com
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx
S3_BUCKET=glamorapp
S3_PUBLIC_URL=https://cdn.glamorapp.com

# AI
ANTHROPIC_API_KEY=sk-ant-xxx
AI_MODEL=claude-sonnet-4-20250514

# App
APP_URL=https://app.glamorapp.com
API_URL=https://api.glamorapp.com
PORT=3001
NODE_ENV=production

# Email (futuro)
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASS=xxx
```

---

## 8. Docker Compose (Desarrollo)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: glamorapp
      POSTGRES_USER: glamorapp
      POSTGRES_PASSWORD: glamorapp_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  pgdata:
  minio_data:
```
