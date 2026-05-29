# Glamorapp — Database Schema (PostgreSQL)

## Convenciones

- Todas las tablas incluyen: `id` (UUID, PK), `tenant_id` (UUID, FK), `created_at`, `updated_at`, `created_by`, `updated_by`.
- Soft delete con `deleted_at` (nullable timestamp).
- Timestamps en UTC.
- Montos monetarios: `DECIMAL(12,2)`.
- Enums definidos como tipos PostgreSQL.
- Índices compuestos `(tenant_id, ...)` en todas las queries frecuentes.
- Multi-tenancy por `tenant_id` + `store_id` en toda entidad operativa.

---

## Enums

```sql
CREATE TYPE user_role AS ENUM ('admin', 'cashier', 'professional', 'financial', 'readonly');
CREATE TYPE product_status AS ENUM ('active', 'inactive');
CREATE TYPE inventory_movement_type AS ENUM ('entry', 'exit', 'adjustment', 'transfer');
CREATE TYPE sale_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer', 'mixed', 'other');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE expense_status AS ENUM ('paid', 'pending', 'cancelled');
CREATE TYPE recurrence_type AS ENUM ('none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly');
CREATE TYPE customer_segment AS ENUM ('new', 'frequent', 'inactive', 'vip');
CREATE TYPE loyalty_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
CREATE TYPE supplier_status AS ENUM ('active', 'inactive');
CREATE TYPE agent_status AS ENUM ('active', 'paused', 'pending_config', 'error');
CREATE TYPE agent_autonomy AS ENUM ('recommend_only', 'recommend_and_draft', 'execute_with_approval', 'auto_execute');
CREATE TYPE recommendation_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'sale', 'void_sale', 'inventory_change', 'config_change', 'ai_action');
CREATE TYPE nail_design_category AS ENUM ('classic', 'decorated', 'artistic', 'modern', 'trending', 'minimalist', 'seasonal');
```

---

## Tablas Core (Multi-tenancy)

### tenants
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) DEFAULT 'free',
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### stores
```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  logo_url TEXT,
  slogan VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  zip_code VARCHAR(20),
  currency VARCHAR(10) DEFAULT 'MXN',
  timezone VARCHAR(50) DEFAULT 'America/Mexico_City',
  locale VARCHAR(10) DEFAULT 'es',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  time_format VARCHAR(20) DEFAULT '12h',
  unit_system VARCHAR(20) DEFAULT 'metric',
  primary_color VARCHAR(7) DEFAULT '#FF2D8E',
  theme VARCHAR(10) DEFAULT 'light',
  tax_inclusive BOOLEAN DEFAULT true,
  allow_discounts BOOLEAN DEFAULT true,
  auto_print_receipt BOOLEAN DEFAULT false,
  require_customer_on_sale BOOLEAN DEFAULT false,
  low_stock_alert BOOLEAN DEFAULT true,
  default_page VARCHAR(50) DEFAULT 'dashboard',
  session_duration_minutes INTEGER DEFAULT 60,
  initial_folio_number INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  business_hours JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, slug)
);
CREATE INDEX idx_stores_tenant ON stores(tenant_id);
```

---

## Usuarios y Autenticación

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID REFERENCES stores(id),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  avatar_url TEXT,
  role user_role DEFAULT 'cashier',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, email)
);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(tenant_id, email);
```

### permissions
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  module VARCHAR(50) NOT NULL, -- 'inventory', 'sales', 'appointments', etc.
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id, module)
);
```

### refresh_tokens
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
```

---

## Productos e Inventario

### product_categories
```sql
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, store_id, name)
);
```

### brands
```sql
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  name VARCHAR(100) NOT NULL,
  logo_url TEXT,
  product_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, store_id, name)
);
```

### products
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  category_id UUID REFERENCES product_categories(id),
  brand_id UUID REFERENCES brands(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(50),
  barcode VARCHAR(100),
  image_url TEXT,
  cost_price DECIMAL(12,2) DEFAULT 0,
  sale_price DECIMAL(12,2) NOT NULL,
  current_stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  unit_of_measure VARCHAR(20) DEFAULT 'unit', -- unit, ml, g, oz, etc.
  size VARCHAR(50), -- '500 ml', '30 ml', '1 par', etc.
  status product_status DEFAULT 'active',
  is_featured BOOLEAN DEFAULT false,
  is_catalog_visible BOOLEAN DEFAULT true,
  catalog_views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, store_id, sku)
);
CREATE INDEX idx_products_tenant_store ON products(tenant_id, store_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_sku ON products(tenant_id, store_id, sku);
CREATE INDEX idx_products_status ON products(tenant_id, store_id, status);
CREATE INDEX idx_products_stock ON products(tenant_id, store_id, current_stock) WHERE current_stock <= 0;
```

### inventory_movements
```sql
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  product_id UUID NOT NULL REFERENCES products(id),
  movement_type inventory_movement_type NOT NULL,
  quantity INTEGER NOT NULL, -- positive for entries, negative for exits
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reference_type VARCHAR(50), -- 'sale', 'purchase', 'adjustment', 'transfer'
  reference_id UUID, -- FK to the originating entity
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_inv_movements_product ON inventory_movements(tenant_id, product_id);
CREATE INDEX idx_inv_movements_date ON inventory_movements(tenant_id, store_id, created_at);
```

---

## Ventas POS

### sales
```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  customer_id UUID REFERENCES customers(id),
  user_id UUID NOT NULL REFERENCES users(id), -- cajero
  sale_number VARCHAR(20) NOT NULL, -- V-000001
  status sale_status DEFAULT 'pending',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 16,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, store_id, sale_number)
);
CREATE INDEX idx_sales_tenant_store ON sales(tenant_id, store_id);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_date ON sales(tenant_id, store_id, created_at);
CREATE INDEX idx_sales_status ON sales(tenant_id, store_id, status);
```

### sale_items
```sql
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  service_id UUID REFERENCES services(id),
  item_type VARCHAR(20) NOT NULL DEFAULT 'product', -- 'product', 'service', 'package'
  name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
```

### payments
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  sale_id UUID NOT NULL REFERENCES sales(id),
  payment_method payment_method NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reference VARCHAR(100), -- referencia de transacción
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_payments_sale ON payments(sale_id);
```

---

## Servicios y Citas

### services
```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'manicure', 'pedicure', 'hair', 'lashes', 'waxing', 'makeup'
  price DECIMAL(12,2) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  color VARCHAR(7) DEFAULT '#EF2D8F', -- para calendar color-coding
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_services_tenant_store ON services(tenant_id, store_id);
```

### appointments
```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  professional_id UUID NOT NULL REFERENCES users(id),
  service_id UUID NOT NULL REFERENCES services(id),
  nail_design_id UUID REFERENCES nail_designs(id),
  sale_id UUID REFERENCES sales(id), -- venta generada al completar
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status appointment_status DEFAULT 'pending',
  price DECIMAL(12,2) NOT NULL,
  notes TEXT,
  origin_channel VARCHAR(50) DEFAULT 'manual', -- 'manual', 'whatsapp', 'web', 'phone'
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_appointments_tenant_store ON appointments(tenant_id, store_id);
CREATE INDEX idx_appointments_date ON appointments(tenant_id, store_id, date);
CREATE INDEX idx_appointments_professional ON appointments(professional_id, date);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_status ON appointments(tenant_id, store_id, status);
-- Prevenir solapamiento de citas por profesional
CREATE UNIQUE INDEX idx_no_overlap ON appointments(professional_id, date, start_time)
  WHERE status NOT IN ('cancelled', 'no_show');
```

---

## Catálogo Diseño de Uñas

### nail_designs
```sql
CREATE TABLE nail_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  name VARCHAR(255) NOT NULL,
  image_url TEXT,
  category nail_design_category DEFAULT 'classic',
  technique VARCHAR(100), -- 'acrylic', 'gel', 'dip_powder', 'press_on', 'natural'
  colors JSONB DEFAULT '[]', -- ["#FF69B4", "#FFFFFF"]
  suggested_price DECIMAL(12,2),
  estimated_duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_favorite BOOLEAN DEFAULT false,
  popularity_score INTEGER DEFAULT 0, -- likes/selections count
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_nail_designs_tenant_store ON nail_designs(tenant_id, store_id);
CREATE INDEX idx_nail_designs_category ON nail_designs(tenant_id, store_id, category);
CREATE INDEX idx_nail_designs_popularity ON nail_designs(tenant_id, store_id, popularity_score DESC);
```

---

## Clientes

### customers
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  customer_number VARCHAR(20) NOT NULL, -- C001
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  date_of_birth DATE,
  avatar_url TEXT,
  segment customer_segment DEFAULT 'new',
  loyalty_tier loyalty_tier DEFAULT 'bronze',
  loyalty_points INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]', -- etiquetas personalizadas
  source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'whatsapp', 'web', 'referral'
  total_purchases INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  average_ticket DECIMAL(12,2) DEFAULT 0,
  total_appointments INTEGER DEFAULT 0,
  last_purchase_at TIMESTAMPTZ,
  last_appointment_at TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, store_id, phone)
);
CREATE INDEX idx_customers_tenant_store ON customers(tenant_id, store_id);
CREATE INDEX idx_customers_segment ON customers(tenant_id, store_id, segment);
CREATE INDEX idx_customers_loyalty ON customers(tenant_id, store_id, loyalty_tier);
CREATE INDEX idx_customers_phone ON customers(tenant_id, store_id, phone);
CREATE INDEX idx_customers_birthday ON customers(tenant_id, store_id, date_of_birth);
```

### customer_notes
```sql
CREATE TABLE customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_customer_notes ON customer_notes(customer_id);
```

---

## Proveedores

### suppliers
```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  supplier_number VARCHAR(20) NOT NULL, -- PROV-001
  business_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(200),
  contact_title VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(255),
  tax_id VARCHAR(50), -- RFC
  address TEXT,
  category VARCHAR(100),
  payment_terms VARCHAR(100), -- '30 dias', 'contado'
  preferred_payment_method payment_method DEFAULT 'transfer',
  credit_limit DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0, -- saldo pendiente
  total_purchases DECIMAL(12,2) DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  average_ticket DECIMAL(12,2) DEFAULT 0,
  last_purchase_at TIMESTAMPTZ,
  status supplier_status DEFAULT 'active',
  logo_url TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, store_id, supplier_number)
);
CREATE INDEX idx_suppliers_tenant_store ON suppliers(tenant_id, store_id);
```

### supplier_products
```sql
CREATE TABLE supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  supplier_sku VARCHAR(50),
  supplier_price DECIMAL(12,2),
  is_preferred BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(supplier_id, product_id)
);
```

### purchases
```sql
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  purchase_number VARCHAR(20) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'received', 'partial', 'cancelled'
  payment_status expense_status DEFAULT 'pending',
  due_date DATE,
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, store_id, purchase_number)
);
```

### purchase_items
```sql
CREATE TABLE purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Gastos

### expense_categories
```sql
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);
```

### expenses
```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  category_id UUID REFERENCES expense_categories(id),
  supplier_id UUID REFERENCES suppliers(id),
  concept VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method payment_method DEFAULT 'cash',
  status expense_status DEFAULT 'paid',
  expense_date DATE NOT NULL,
  due_date DATE,
  recurrence recurrence_type DEFAULT 'none',
  receipt_url TEXT, -- comprobante
  notes TEXT,
  is_voided BOOLEAN DEFAULT false,
  voided_at TIMESTAMPTZ,
  voided_reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_expenses_tenant_store ON expenses(tenant_id, store_id);
CREATE INDEX idx_expenses_date ON expenses(tenant_id, store_id, expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
```

---

## Agentes IA

### ai_agents
```sql
CREATE TABLE ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL, -- 'sales', 'inventory', 'customers', etc.
  description TEXT,
  icon VARCHAR(50),
  status agent_status DEFAULT 'pending_config',
  autonomy_level agent_autonomy DEFAULT 'recommend_only',
  objective TEXT,
  analysis_frequency VARCHAR(50) DEFAULT 'daily', -- 'realtime', 'hourly', 'daily', 'weekly'
  config JSONB DEFAULT '{}', -- umbrales, preferencias
  is_custom BOOLEAN DEFAULT false, -- agente personalizado vs predefinido
  actions_today INTEGER DEFAULT 0,
  total_actions INTEGER DEFAULT 0,
  alerts_generated INTEGER DEFAULT 0,
  estimated_impact DECIMAL(12,2) DEFAULT 0, -- impacto económico estimado del mes
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, store_id, slug)
);
CREATE INDEX idx_ai_agents_tenant_store ON ai_agents(tenant_id, store_id);
```

### ai_agent_permissions
```sql
CREATE TABLE ai_agent_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL, -- 'sales', 'inventory', 'customers', etc.
  can_read BOOLEAN DEFAULT true,
  can_recommend BOOLEAN DEFAULT true,
  can_draft BOOLEAN DEFAULT false,
  can_execute BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, module)
);
```

### ai_agent_actions
```sql
CREATE TABLE ai_agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  agent_id UUID NOT NULL REFERENCES ai_agents(id),
  action_type VARCHAR(100) NOT NULL, -- 'stock_alert', 'reorder_suggestion', 'promo_suggestion', etc.
  title VARCHAR(255) NOT NULL,
  description TEXT,
  data_used JSONB DEFAULT '{}', -- datos que usó para la recomendación
  result JSONB DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT true, -- toggle por acción específica
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ai_actions_agent ON ai_agent_actions(agent_id);
```

### ai_recommendations
```sql
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  agent_id UUID NOT NULL REFERENCES ai_agents(id),
  action_id UUID REFERENCES ai_agent_actions(id),
  type VARCHAR(100) NOT NULL, -- 'restock', 'promotion', 'contact_customer', 'confirm_appointment', etc.
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  reason TEXT, -- por qué recomienda esto
  data JSONB DEFAULT '{}', -- datos de contexto
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status recommendation_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  estimated_impact DECIMAL(12,2),
  actual_impact DECIMAL(12,2),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_recommendations_agent ON ai_recommendations(agent_id);
CREATE INDEX idx_recommendations_store ON ai_recommendations(tenant_id, store_id);
CREATE INDEX idx_recommendations_status ON ai_recommendations(tenant_id, store_id, status);
CREATE INDEX idx_recommendations_date ON ai_recommendations(tenant_id, store_id, created_at);
```

---

## Notificaciones y Auditoría

### notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES users(id), -- null = broadcast
  type notification_type DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500), -- deep link al módulo relevante
  source VARCHAR(50), -- 'system', 'ai_agent', 'user'
  source_id UUID, -- ID del agente o entidad que generó la notificación
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id, created_at);
```

### audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID REFERENCES stores(id),
  user_id UUID REFERENCES users(id),
  agent_id UUID REFERENCES ai_agents(id), -- si la acción fue de un agente
  action audit_action NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- 'product', 'sale', 'appointment', etc.
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id, created_at);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
```

---

## Paquetes Promocionales

### packages
```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  regular_price DECIMAL(12,2) NOT NULL,
  package_price DECIMAL(12,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### package_items
```sql
CREATE TABLE package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  service_id UUID REFERENCES services(id),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Funciones y Triggers Sugeridos

```sql
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas con updated_at
CREATE TRIGGER trg_update_timestamp BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
-- (repetir para cada tabla)

-- Auto-calcular estadísticas del cliente después de una venta
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.customer_id IS NOT NULL THEN
    UPDATE customers SET
      total_purchases = total_purchases + 1,
      total_spent = total_spent + NEW.total,
      average_ticket = (total_spent + NEW.total) / (total_purchases + 1),
      last_purchase_at = NEW.completed_at
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_customer_stats AFTER UPDATE ON sales
  FOR EACH ROW WHEN (OLD.status != 'completed' AND NEW.status = 'completed')
  EXECUTE FUNCTION update_customer_stats();

-- Auto-generar número consecutivo de venta
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(sale_number FROM 3) AS INTEGER)), 0) + 1
  INTO next_num
  FROM sales
  WHERE tenant_id = NEW.tenant_id AND store_id = NEW.store_id;
  
  NEW.sale_number = 'V-' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sale_number BEFORE INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION generate_sale_number();
```

---

## Datos Semilla (Seed) Sugeridos

### Categorías de productos por defecto
- Cuidado del cabello
- Maquillaje
- Uñas
- Cuidado de la piel
- Accesorios
- Herramientas
- Otros

### Categorías de gastos por defecto
- Alquiler
- Sueldos
- Productos/Insumos
- Servicios (luz, agua, internet)
- Marketing
- Transporte
- Herramientas/Equipo
- Otros

### Servicios por defecto
- Manicure Clásico — $350 — 60min
- Pedicure Spa — $400 — 75min
- Uñas Acrílicas — $600 — 90min
- Uñas en Gel — $500 — 75min
- Extensiones de Uñas — $800 — 120min
- Diseño de Uñas — $450 — 60min
- Coloración — $1,200 — 120min
- Corte y Peinado — $450 — 60min
- Mechas/Balayage — $1,400 — 150min
- Lifting de Pestañas — $600 — 60min
- Pestañas 3D — $550 — 90min
- Depilación Facial — $300 — 30min
- Depilación Láser — $900 — 45min
- Maquillaje Social — $700 — 60min

### Agentes IA por defecto
- Agente de Ventas (slug: sales)
- Agente de Inventario (slug: inventory)
- Agente de Clientes (slug: customers)
- Agente de Citas (slug: appointments)
- Agente de Marketing (slug: marketing)
- Agente Financiero (slug: financial)
- Agente de Proveedores (slug: suppliers)
- Agente de Catálogo (slug: catalog)
