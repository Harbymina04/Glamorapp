-- ── Commissions Module ────────────────────────────────────────────────────────

-- 1. Default commission rate per user (collaborator)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- 2. Commission rate per service (overrides user default when set)
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- 3. Track who performed each sale item + commission calculated
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "performed_by"       UUID REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "commission_rate"     DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "commission_amount"   DECIMAL(12,2) NOT NULL DEFAULT 0;

-- 4. Commissions table — one record per service item performed
CREATE TABLE IF NOT EXISTS "commissions" (
  "id"              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"       UUID         NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "store_id"        UUID         NOT NULL REFERENCES "stores"("id")  ON DELETE CASCADE,
  "user_id"         UUID         NOT NULL REFERENCES "users"("id")   ON DELETE CASCADE,
  "sale_id"         UUID         REFERENCES "sales"("id")            ON DELETE SET NULL,
  "sale_item_id"    UUID         REFERENCES "sale_items"("id")       ON DELETE SET NULL,
  "service_name"    VARCHAR(255) NOT NULL,
  "base_amount"     DECIMAL(12,2) NOT NULL DEFAULT 0,
  "commission_rate" DECIMAL(5,2)  NOT NULL DEFAULT 0,
  "amount"          DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status"          VARCHAR(20)   NOT NULL DEFAULT 'pending',  -- pending | paid
  "period_start"    DATE,
  "period_end"      DATE,
  "paid_at"         TIMESTAMP,
  "paid_by"         UUID         REFERENCES "users"("id") ON DELETE SET NULL,
  "payment_notes"   TEXT,
  "created_at"      TIMESTAMP    NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "commissions_tenant_id_idx"   ON "commissions"("tenant_id");
CREATE INDEX IF NOT EXISTS "commissions_user_id_idx"     ON "commissions"("user_id");
CREATE INDEX IF NOT EXISTS "commissions_store_id_idx"    ON "commissions"("store_id");
CREATE INDEX IF NOT EXISTS "commissions_status_idx"      ON "commissions"("status");
CREATE INDEX IF NOT EXISTS "commissions_sale_id_idx"     ON "commissions"("sale_id");
