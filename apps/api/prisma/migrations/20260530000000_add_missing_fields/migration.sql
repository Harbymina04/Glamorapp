-- Add missing security fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failed_login_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP(3);

-- Add missing marketing_config field to tenants table
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "marketing_config" JSONB NOT NULL DEFAULT '{}';
