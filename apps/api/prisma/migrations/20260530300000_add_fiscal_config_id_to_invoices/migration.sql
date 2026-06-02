-- Add fiscal_config_id column to invoices (missing from initial migration)
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "fiscal_config_id" UUID REFERENCES "fiscal_config"("id") ON DELETE SET NULL;
