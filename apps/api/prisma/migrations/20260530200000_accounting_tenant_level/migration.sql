-- ============================================================
-- Refactor: Accounting & Customers to tenant level
-- ============================================================

-- ── fiscal_config: tenant-level (store_id becomes nullable) ──
-- Drop old unique (tenant_id, store_id)
ALTER TABLE "fiscal_config" DROP CONSTRAINT IF EXISTS "fiscal_config_tenant_store_unique";

-- Make store_id nullable (config belongs to tenant, not store)
ALTER TABLE "fiscal_config" ALTER COLUMN "store_id" DROP NOT NULL;

-- New unique: one fiscal config per tenant
ALTER TABLE "fiscal_config" ADD CONSTRAINT "fiscal_config_tenant_unique" UNIQUE ("tenant_id");

-- ── invoices: consecutive is tenant-wide (DIAN requirement) ──
-- Drop old unique (tenant_id, store_id, invoice_number)
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_number_unique";

-- New unique: invoice_number unique per tenant
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_number_tenant_unique" UNIQUE ("tenant_id", "invoice_number");

-- ── customers: unique by tenant + phone (not per store) ──
-- Drop old unique (tenant_id, store_id, phone)
ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "customers_tenant_id_store_id_phone_key";

-- store_id stays but now means "origin store" — add new unique
-- Note: phone can be null so only enforce when not null via partial index
CREATE UNIQUE INDEX IF NOT EXISTS "customers_tenant_phone_unique"
  ON "customers"("tenant_id", "phone")
  WHERE "phone" IS NOT NULL;

-- Add origin_store label (storeId already exists, just clarifying semantics via index rename)
-- No structural change needed for store_id on customers

-- ── Update indexes ────────────────────────────────────────────
DROP INDEX IF EXISTS "fiscal_config_tenant_idx";
CREATE INDEX IF NOT EXISTS "fiscal_config_tenant_idx" ON "fiscal_config"("tenant_id");
