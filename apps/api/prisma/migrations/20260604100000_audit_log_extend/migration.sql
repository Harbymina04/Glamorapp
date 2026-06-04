-- Extend audit_logs: add module, description, userName, userEmail fields + new indexes

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS module       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS description  VARCHAR(500),
  ADD COLUMN IF NOT EXISTS user_email   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS user_name    VARCHAR(255);

-- Backfill module from entity_type for existing rows
UPDATE audit_logs SET module = entity_type WHERE module IS NULL;

-- Make module NOT NULL after backfill
ALTER TABLE audit_logs ALTER COLUMN module SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN module SET DEFAULT '';

-- New indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_store_created ON audit_logs(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);

-- entity_id: extend to varchar(100) to support non-UUID references
ALTER TABLE audit_logs ALTER COLUMN entity_id TYPE VARCHAR(100);
