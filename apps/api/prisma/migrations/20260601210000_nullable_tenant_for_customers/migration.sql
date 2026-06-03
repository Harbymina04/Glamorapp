-- Make tenantId nullable on users table to support platform-level customer accounts
ALTER TABLE "users" ALTER COLUMN "tenant_id" DROP NOT NULL;

-- Partial unique index: enforce unique email for platform customers (tenantId IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS "users_platform_customer_email_unique"
  ON "users" ("email")
  WHERE "tenant_id" IS NULL;
