# Glamorapp Multi-Sucursal — Plan de Implementación

> **Para Hermes:** Usar subagent-driven-development para implementar fase por fase.
> Cada fase tiene dependencias — respetar el orden.

**Goal:** Refactorizar Glamorapp para soporte multi-sucursal real: un tenant puede tener N sucursales con datos aislados, roles con scopes por módulo, panel de tenant independiente, y WhatsApp por sucursal.

**Architecture:**
```
Platform (superadmin) → /admin        → planes, tenants, AI metrics globales, bridge status
Tenant (tenant_admin) → /tenant       → sucursales, usuarios, reportes consolidados, AI metrics
Store  (store_admin)   → /dashboard   → operación diaria de UNA sucursal
```

**Tech Stack:** NestJS + Next.js 14 + Prisma + PostgreSQL + JWT + Baileys (WhatsApp)

---

## Aclaraciones del Usuario

1. **superadmin** solo accede a `/admin` (panel de plataforma), NO a tenants/sucursales directamente
2. **Planes**: gestionados por superadmin. Cada plan define features + límites (maxBranches, maxUsers, AI tokens, etc.)
3. **Métricas de consumo IA**: 
   - superadmin: consumo por tenant (dashboard global)
   - tenant_admin: consumo por tenant + desglose por sucursal
4. **Módulo de contabilidad**: dejar arquitectura abierta para agregarlo después (módulo `accounting`)
5. **WhatsApp**: manejo por sucursal (no por tenant)
6. **Roles**: cada módulo tiene scopes asignados por rol. Usuario sin scope = no ve el módulo.
7. **Usuarios**: pertenecen a UNA sucursal. No pueden acceder a otra a menos que sean creados ahí.
8. **tenant_admin**: ve todas las sucursales, crea store_admins, gestiona contraseñas.
9. **store_admin**: administra su sucursal, crea usuarios (cajeros, profesionales) dentro de ella.
10. **Password recovery**: tenant_admin/superadmin vía email. Usuarios de sucursal vía panel de admin.

---

## Fase 0: Preparación — Schema y Enums Base

### 0.1 Actualizar Enum de Roles

```prisma
enum UserRole {
  superadmin
  tenant_admin
  store_admin
  cashier
  professional
  financial
  readonly
}
```

**Archivo:** `apps/api/prisma/schema.prisma`

**Migración:** `20260528_0001_update_roles`

### 0.2 Extender Modelo Permission (Scopes)

El modelo actual tiene `canView, canCreate, canEdit, canDelete, canExport`. Agregar:

```prisma
model Permission {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  module    String   @db.VarChar(50)
  canView   Boolean  @default(false) @map("can_view")
  canCreate Boolean  @default(false) @map("can_create")
  canEdit   Boolean  @default(false) @map("can_edit")
  canDelete Boolean  @default(false) @map("can_delete")
  canExport Boolean  @default(false) @map("can_export")

  // NUEVOS:
  storeId   String?  @map("store_id") @db.Uuid   // null = aplica a todas las stores del tenant

  user      User     @relation(fields: [userId], references: [id])
  store     Store?   @relation(fields: [storeId], references: [id])

  @@unique([tenantId, userId, module])
  @@map("permissions")
}
```

### 0.3 Mover WhatsApp de Tenant a Store

Quitar de Tenant, agregar a Store:

```prisma
model Tenant {
  // REMOVER: whatsappNumber, whatsappSessionId
  ...
}

model Store {
  // AGREGAR:
  whatsappNumber      String?  @map("whatsapp_number") @db.VarChar(20)
  whatsappSessionId   String?  @map("whatsapp_session_id") @db.VarChar(100)
  ...
}
```

**Migración:** `20260528_0002_whatsapp_to_store`

### 0.4 Agregar Modelo PasswordReset

```prisma
model PasswordReset {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  token     String   @unique @db.VarChar(500)
  expiresAt DateTime @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime @default(now()) @map("created_at")

  user      User     @relation(fields: [userId], references: [id])

  @@map("password_resets")
}
```

**Migración:** `20260528_0003_password_reset`

### 0.5 Agregar Modelo AiUsage (métricas de consumo)

```prisma
model AiUsage {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @map("tenant_id") @db.Uuid
  storeId     String?  @map("store_id") @db.Uuid
  agentId     String?  @map("agent_id") @db.Uuid
  actionType  String   @map("action_type") @db.VarChar(50)
  modelName   String   @map("model_name") @db.VarChar(100)
  tokensIn    Int      @default(0) @map("tokens_in")
  tokensOut   Int      @default(0) @map("tokens_out")
  costEstimated Decimal @default(0) @map("cost_estimated") @db.Decimal(10, 4)
  createdAt   DateTime @default(now()) @map("created_at")

  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  store       Store?   @relation(fields: [storeId], references: [id])
  agent       AiAgent? @relation(fields: [agentId], references: [id])

  @@index([tenantId, createdAt])
  @@index([storeId, createdAt])
  @@map("ai_usage")
}
```

**Migración:** `20260528_0004_ai_usage`

### 0.6 Actualizar Plan.features — Agregar límites

El JSON `features` de Plan se extiende:

```json
{
  "modules": {
    "pos": true,
    "inventory": true,
    "appointments": true,
    "catalog": true,
    "customers": true,
    "suppliers": true,
    "purchases": true,
    "expenses": true,
    "reports": true,
    "users": true,
    "ai_agents": true,
    "accounting": false
  },
  "limits": {
    "maxBranches": 3,
    "maxUsers": 10,
    "aiTokensMonthly": 50000,
    "storageGB": 5
  }
}
```

---

## Fase 1: Sistema de Roles y Scopes

### 1.1 Roles por Defecto con Scopes

Definir en código (seed + constante) los scopes por defecto para cada rol:

```typescript
// apps/api/src/common/constants/role-scopes.ts
export const DEFAULT_SCOPES: Record<UserRole, Record<string, string[]>> = {
  tenant_admin: {
    stores:     ['view', 'create', 'edit', 'delete'],
    users:      ['view', 'create', 'edit', 'delete'],
    roles:      ['view', 'edit'],
    dashboard:  ['view'],
    reports:    ['view', 'export'],
    ai_agents:  ['view', 'create', 'edit', 'delete'],
    billing:    ['view', 'edit'],
    settings:   ['view', 'edit'],
    // Acceso consolidado a todos los módulos de negocio
    pos:        ['view', 'create', 'edit', 'delete', 'export'],
    inventory:  ['view', 'create', 'edit', 'delete', 'export'],
    // ... etc
  },
  store_admin: {
    dashboard:  ['view'],
    pos:        ['view', 'create', 'edit', 'delete'],
    inventory:  ['view', 'create', 'edit', 'delete'],
    appointments: ['view', 'create', 'edit', 'delete'],
    customers:  ['view', 'create', 'edit', 'delete'],
    suppliers:  ['view', 'create', 'edit'],
    purchases:  ['view', 'create', 'edit'],
    expenses:   ['view', 'create', 'edit'],
    reports:    ['view', 'export'],
    users:      ['view', 'create', 'edit', 'delete'], // solo su store
    catalog:    ['view', 'create', 'edit', 'delete'],
    settings:   ['view', 'edit'],
    whatsapp:   ['view', 'edit'],
  },
  cashier: {
    pos:        ['view', 'create'],
    customers:  ['view', 'create'],
    appointments: ['view'],
    catalog:    ['view'],
  },
  professional: {
    appointments: ['view', 'create', 'edit'],
    customers:  ['view'],
    catalog:    ['view'],
  },
  financial: {
    reports:    ['view', 'export'],
    expenses:   ['view', 'create', 'edit'],
    dashboard:  ['view'],
  },
  readonly: {
    // solo view en todos los módulos de negocio
    pos:        ['view'],
    inventory:  ['view'],
    appointments: ['view'],
    customers:  ['view'],
    reports:    ['view'],
    dashboard:  ['view'],
  },
};
```

### 1.2 ScopesGuard (reemplaza RolesGuard)

```typescript
// apps/api/src/common/guards/scopes.guard.ts
@Injectable()
export class ScopesGuard implements CanActivate {
  // 1. Si el usuario es superadmin → acceso total a /admin/*
  // 2. Si el usuario es tenant_admin → acceso a /tenant/* + store consolidation
  // 3. Para otros roles → verifica que user tenga el scope requerido en el módulo
  // 4. Usa el decorator @RequireScope('module', 'action')
}
```

### 1.3 Decorator @RequireScope

```typescript
// apps/api/src/common/decorators/require-scope.decorator.ts
export const SCOPE_KEY = 'scope';
export const RequireScope = (module: string, action: string) =>
  SetMetadata(SCOPE_KEY, { module, action });
```

---

## Fase 2: Aislamiento por Sucursal

### 2.1 Verificar Store Isolation en todos los Servicios

Cada servicio debe filtrar por `storeId` (no solo `tenantId`). Revisar:

- `SalesService`, `AppointmentsService`, `CustomersService`
- `InventoryService`, `ProductsService`, `ServicesService`
- `PurchasesService`, `SuppliersService`, `ExpensesService`
- `CashRegisterService`, `CatalogService`

**Para tenant_admin:** queries que aceptan `storeId = undefined` devuelven datos consolidados de todas las stores del tenant.

### 2.2 User ↔ Store: Relación Obligatoria

- `User.storeId` pasa de opcional a **requerido** para roles `store_admin`, `cashier`, `professional`, `financial`, `readonly`
- Para `tenant_admin` y `superadmin`, `storeId` es `null`
- Al crear usuario desde store_admin, el `storeId` se fuerza automáticamente

### 2.3 WhatsApp por Sucursal

Ajustar `WhatsAppService` para resolver `storeId → sessionId` en lugar de `tenantId`:

```typescript
async resolveSessionId(storeId: string): Promise<string> {
  const store = await this.prisma.store.findUnique({
    where: { id: storeId },
    select: { whatsappSessionId: true },
  });
  return store?.whatsappSessionId || `store_${storeId}`;
}
```

Ajustar bridge endpoints y `WhatsAppBridgeController` de `tenantId` a `storeId`.

---

## Fase 3: Autenticación y Login Flows

### 3.1 JWT Payload Extendido

```typescript
interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string;
  storeId: string | null;  // null para tenant_admin y superadmin
  scopes?: Record<string, string[]>;  // opcional: incluir scopes en JWT
}
```

### 3.2 Login Redirect por Rol

```typescript
// auth.service.ts → método getRedirectPath(user)
getRedirectPath(user: User): string {
  switch (user.role) {
    case 'superadmin':   return '/admin';
    case 'tenant_admin': return '/tenant';
    default:             return `/dashboard/${user.store.slug}`;
  }
}
```

Frontend: `useAuthStore.login()` recibe `redirectPath` del backend y navega.

### 3.3 Endpoint `/auth/me` Enriquecido

Agregar al perfil:
- `scopes`: scopes del usuario (resueltos de Permission o defaults por rol)
- `stores`: lista de stores del tenant (para tenant_admin)
- `store`: datos de la store actual
- `redirectPath`: ruta post-login

---

## Fase 4: Panel de Tenant (`/tenant`)

### 4.1 Layout y Navegación

```
/tenant
├── page.tsx              → Dashboard KPIs consolidadas
├── stores/
│   ├── page.tsx          → Lista de sucursales
│   ├── [id]/page.tsx     → Detalle/edición de sucursal
│   └── new/page.tsx      → Crear sucursal
├── users/
│   ├── page.tsx          → Lista de store_admins
│   └── [id]/page.tsx     → Editar/reset password
├── reports/
│   └── page.tsx          → Reportes consolidados
├── ai-usage/
│   └── page.tsx          → Métricas de consumo IA
├── billing/
│   └── page.tsx          → Plan actual, upgrade
└── settings/
    └── page.tsx          → Configuración del tenant
```

### 4.2 Backend: TenantController

```typescript
@Controller('tenant')
@UseGuards(JwtAuthGuard, ScopesGuard)
@Roles('tenant_admin')
export class TenantController {
  // GET  /tenant/stores              → lista stores
  // POST /tenant/stores              → crear store
  // GET  /tenant/stores/:id          → detalle store
  // PUT  /tenant/stores/:id          → editar store
  // DELETE /tenant/stores/:id        → soft-delete store
  // GET  /tenant/stores/:id/users    → usuarios de una store
  // POST /tenant/users               → crear store_admin
  // POST /tenant/users/:id/reset-password
  // GET  /tenant/reports/consolidated
  // GET  /tenant/ai-usage            → consumo IA
  // GET  /tenant/ai-usage/stores/:id → consumo IA por store
}
```

### 4.3 Store Selector (para tenant_admin)

Cuando tenant_admin quiere ver una sucursal específica, selecciona del dropdown y se navega a `/dashboard/{storeSlug}` con un token temporal que incluye ese `storeId`.

```typescript
// POST /tenant/stores/:id/impersonate
// Devuelve un JWT temporal con storeId = :id, válido por la sesión
```

---

## Fase 5: Panel de Sucursal Ajustado

### 5.1 Sidebar Dinámico por Scopes

El sidebar actual filtra por `plan.features`. Ahora debe filtrar por ambas cosas: plan.features + user.scopes.

```typescript
// Hook: useVisibleModules()
// 1. Carga plan.features (qué módulos permite el plan)
// 2. Carga user.scopes (qué puede hacer el usuario)
// 3. Intersección: módulo visible solo si plan lo permite Y user tiene al menos 'view'
```

### 5.2 Rutas con Store en URL

```
/dashboard/{storeSlug}/pos
/dashboard/{storeSlug}/inventory
...
```

O alternativamente mantener `/dashboard/*` pero usando el `storeId` del JWT. El tenant_admin puede tener un middleware que detecta `storeId: null` y redirige a `/tenant`.

### 5.3 Permisos Granulares en UI

Botones/acciones condicionados por scope:
```tsx
{hasScope('pos', 'create') && <Button>Nueva Venta</Button>}
{hasScope('inventory', 'edit') && <EditButton />}
```

---

## Fase 6: Gestión de Contraseñas

### 6.1 Forgot Password (tenant_admin + superadmin)

```
POST /auth/forgot-password
Body: { email }
→ Busca user por email
→ Si es tenant_admin o superadmin, genera token, guarda en PasswordReset
→ Envía email con link: {FRONTEND_URL}/auth/reset-password?token=xxx

POST /auth/reset-password
Body: { token, newPassword }
→ Valida token (no expirado, no usado)
→ Actualiza passwordHash
→ Marca token como usado
```

### 6.2 Reset Password para usuarios de sucursal

```
POST /tenant/users/:id/reset-password     (tenant_admin)
POST /dashboard/users/:id/reset-password   (store_admin, solo usuarios de su store)
Body: { newPassword }
→ Solo tenant_admin o store_admin pueden ejecutar
→ store_admin solo puede resetear usuarios de su store
```

---

## Fase 7: Métricas de Consumo IA

### 7.1 Registro de Consumo

Cada vez que un AI Agent ejecuta una acción, se registra en `AiUsage`:

```typescript
// En AiAgentService o en un interceptor
await this.prisma.aiUsage.create({
  data: {
    tenantId,
    storeId,
    agentId,
    actionType,
    modelName,
    tokensIn,
    tokensOut,
    costEstimated: calculateCost(modelName, tokensIn, tokensOut),
  },
});
```

### 7.2 Endpoints de Métricas

```
Superadmin:
  GET /admin/ai-usage                    → consumo global por tenant (últimos 30 días)
  GET /admin/ai-usage/tenants/:id        → detalle por tenant

Tenant Admin:
  GET /tenant/ai-usage                   → consumo del tenant (total + gráfico diario)
  GET /tenant/ai-usage/stores            → desglose por sucursal
  GET /tenant/ai-usage/stores/:id        → detalle por sucursal
```

### 7.3 Vista en Frontend

- **Superadmin** (`/admin/ai-usage`): tabla de tenants con tokens usados, costo estimado, agentes activos. Gráfico de barras comparativo.
- **Tenant Admin** (`/tenant/ai-usage`): gráfico de consumo diario, tabla por sucursal, breakdown por agente.

---

## Fase 8: Planes y Features

### 8.1 Plan Management (Superadmin)

El superadmin en `/admin/plans` ya puede crear/editar planes. Actualizar para manejar el nuevo `features` JSON con límites:

```
Plan "Free":
  modules: { pos, inventory: true, catalog: true, appointments: false, ... }
  limits:  { maxBranches: 1, maxUsers: 2, aiTokensMonthly: 5000 }

Plan "Pro":
  modules: { todo excepto accounting y ai_agents }
  limits:  { maxBranches: 3, maxUsers: 10, aiTokensMonthly: 50000 }

Plan "Enterprise":
  modules: { todo incluido accounting y ai_agents }
  limits:  { maxBranches: 20, maxUsers: 50, aiTokensMonthly: 200000 }
```

### 8.2 Validación de Límites

Al crear sucursal: verificar `tenant.stores.length < plan.limits.maxBranches`
Al crear usuario: verificar `tenant.users.length < plan.limits.maxUsers`

### 8.3 Feature Gating en Frontend

El sidebar y las rutas se filtran por `plan.features.modules`. Ya existe parcialmente — extender.

---

## Fase 9: Módulo de Contabilidad (Preparación)

Dejar la arquitectura lista para agregar sin refactor:

1. Agregar `accounting` al enum de módulos en Permission y DEFAULT_SCOPES
2. Crear directorio `apps/api/src/modules/accounting/` con estructura vacía (module + controller + service stubs)
3. Agregar modelos base en schema (comentados o como migración futura):
   - `Account`, `JournalEntry`, `Transaction`, `TaxConfig`
4. Agregar `accounting` a Plan.features (false por defecto para todos los planes)

No se implementa lógica — solo el esqueleto.

---

## Orden de Ejecución

```
Fase 0 (schema) → Fase 1 (roles/scopes) → Fase 2 (aislamiento) → Fase 3 (auth)
→ Fase 4 (tenant panel) → Fase 5 (dashboard ajustado) → Fase 6 (passwords)
→ Fase 7 (AI metrics) → Fase 8 (planes) → Fase 9 (contabilidad skeleton)
```

Cada fase depende de la anterior. No avanzar sin verificar que la fase actual compila y los tests pasan.

---

## Notas Técnicas

- **Migraciones**: Siempre `--create-only` primero en WSL. Aplicar con `prisma db execute` o `docker exec postgres psql`.
- **Compilación**: `npx tsc --outDir dist --project tsconfig.json --noEmit` para verificar. La compilación completa usa `npx tsc --outDir dist`.
- **Seed**: Actualizar `prisma/seed.ts` con los nuevos roles, scopes por defecto, y plan features actualizado.
- **Convención**: `@Roles()` sigue existiendo para endpoints que solo requieren rol (no scope granular). `@RequireScope()` para endpoints que necesitan scope específico.
