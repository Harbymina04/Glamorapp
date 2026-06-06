-- Add IVA fields to purchases table for tax deductible tracking
ALTER TABLE "purchases"
  ADD COLUMN IF NOT EXISTS "subtotal"    DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "iva_percent" DECIMAL(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "iva_amount"  DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill subtotal = total for existing records (no IVA was tracked before)
UPDATE "purchases" SET "subtotal" = "total" WHERE "subtotal" = 0;
