-- Add missing security fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failed_login_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP(3);

-- Add missing marketing_config field to tenants table
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "marketing_config" JSONB NOT NULL DEFAULT '{}';

-- Add missing ai_provider column to ai_agents table
ALTER TABLE "ai_agents" ADD COLUMN IF NOT EXISTS "ai_provider" VARCHAR(30) NOT NULL DEFAULT 'deepseek';

-- Add missing tenant_id FK index on ai_agents
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_agents_tenant_id_fkey'
  ) THEN
    ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

-- Create missing ai_agent_executions table
CREATE TABLE IF NOT EXISTS "ai_agent_executions" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "agent_id"    UUID NOT NULL,
  "tenant_id"   UUID NOT NULL,
  "store_id"    UUID NOT NULL,
  "status"      VARCHAR(20) NOT NULL DEFAULT 'running',
  "iterations"  INTEGER NOT NULL DEFAULT 0,
  "summary"     TEXT,
  "result"      JSONB NOT NULL DEFAULT '{}',
  "logs"        JSONB NOT NULL DEFAULT '[]',
  "duration_ms" INTEGER NOT NULL DEFAULT 0,
  "started_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  CONSTRAINT "ai_agent_executions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_agent_executions_agent_id_fkey"
    FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ai_agent_executions_agent_id_idx" ON "ai_agent_executions"("agent_id");
CREATE INDEX IF NOT EXISTS "ai_agent_executions_tenant_store_idx" ON "ai_agent_executions"("tenant_id", "store_id");
