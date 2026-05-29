-- Fase 0: Multi-sucursal — Roles, WhatsApp→Store, Permission storeId, PasswordReset, AiUsage

-- 1. Update UserRole enum: rename 'admin' → 'tenant_admin', add 'store_admin'
ALTER TYPE "UserRole" RENAME VALUE 'admin' TO 'tenant_admin';
ALTER TYPE "UserRole" ADD VALUE 'store_admin' AFTER 'superadmin';

-- 2. Mover WhatsApp de tenants → stores
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "whatsapp_number";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "whatsapp_session_id";
ALTER TABLE "stores" ADD COLUMN "whatsapp_number" VARCHAR(20);
ALTER TABLE "stores" ADD COLUMN "whatsapp_session_id" VARCHAR(100);

-- 3. Extender permissions con storeId
ALTER TABLE "permissions" ADD COLUMN "store_id" UUID;
ALTER TABLE "permissions" ADD CONSTRAINT "fk_permissions_store" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL;

-- 4. Password Reset
CREATE TABLE "password_resets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "token" VARCHAR(500) NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "used_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "pk_password_resets" PRIMARY KEY ("id"),
  CONSTRAINT "uq_password_resets_token" UNIQUE ("token"),
  CONSTRAINT "fk_password_resets_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "idx_password_resets_user_id" ON "password_resets"("user_id");
CREATE INDEX "idx_password_resets_token" ON "password_resets"("token");

-- 5. AI Usage Metrics
CREATE TABLE "ai_usage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "store_id" UUID,
  "agent_id" UUID,
  "action_type" VARCHAR(50) NOT NULL,
  "model_name" VARCHAR(100) NOT NULL,
  "tokens_in" INTEGER NOT NULL DEFAULT 0,
  "tokens_out" INTEGER NOT NULL DEFAULT 0,
  "cost_estimated" DECIMAL(10, 4) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "pk_ai_usage" PRIMARY KEY ("id"),
  CONSTRAINT "fk_ai_usage_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_ai_usage_store" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_ai_usage_agent" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE SET NULL
);
CREATE INDEX "idx_ai_usage_tenant_created" ON "ai_usage"("tenant_id", "created_at");
CREATE INDEX "idx_ai_usage_store_created" ON "ai_usage"("store_id", "created_at");
CREATE INDEX "idx_ai_usage_agent_created" ON "ai_usage"("agent_id", "created_at");
