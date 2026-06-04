-- ── StorefrontOrder: payment tracking + commission fields ──────────
ALTER TABLE storefront_orders
  ADD COLUMN IF NOT EXISTS payment_transaction_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_status         VARCHAR(30),
  ADD COLUMN IF NOT EXISTS platform_fee           DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tenant_payout          DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_id              UUID REFERENCES platform_payouts(id) ON DELETE SET NULL;

-- Index for quick lookup by Wompi transaction ID
CREATE INDEX IF NOT EXISTS idx_storefront_orders_tx_id
  ON storefront_orders(payment_transaction_id)
  WHERE payment_transaction_id IS NOT NULL;

-- ── Platform config (single row) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_rate   DECIMAL(5,4) NOT NULL DEFAULT 0.03,  -- 3%
  min_payout_amount DECIMAL(12,2) NOT NULL DEFAULT 50000, -- COP 50.000
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by        UUID
);

-- Seed default config row
INSERT INTO platform_config (id, commission_rate, min_payout_amount)
VALUES ('00000000-0000-0000-0000-000000000001', 0.03, 50000)
ON CONFLICT (id) DO NOTHING;

-- ── Platform payouts ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_payouts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  gross_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,  -- total de ventas del período
  platform_fee  DECIMAL(12,2) NOT NULL DEFAULT 0,  -- comisión de la plataforma
  net_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,  -- lo que se le paga al tenant
  currency      VARCHAR(10)   NOT NULL DEFAULT 'COP',
  order_count   INT           NOT NULL DEFAULT 0,
  period_from   TIMESTAMPTZ   NOT NULL,
  period_to     TIMESTAMPTZ   NOT NULL,
  status        VARCHAR(20)   NOT NULL DEFAULT 'pending',  -- pending | paid
  paid_at       TIMESTAMPTZ,
  paid_by       UUID,         -- superadmin user id
  reference     VARCHAR(100), -- referencia de transferencia bancaria
  notes         TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_payouts_tenant ON platform_payouts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_payouts_status ON platform_payouts(status);
