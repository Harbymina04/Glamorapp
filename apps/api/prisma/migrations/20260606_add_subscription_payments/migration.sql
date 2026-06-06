-- Migration: add subscription_payments table
-- Created: 2026-06-06

CREATE TABLE subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  plan_id UUID NOT NULL REFERENCES plans(id),
  wompi_transaction_id VARCHAR(100),
  wompi_reference VARCHAR(100),
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'COP',
  billing_cycle VARCHAR(10) NOT NULL,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'pse',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  recorded_by UUID,
  notes TEXT,
  invoice_requested BOOLEAN NOT NULL DEFAULT FALSE,
  invoice_email VARCHAR(255),
  invoice_data JSONB NOT NULL DEFAULT '{}',
  invoice_status VARCHAR(20) NOT NULL DEFAULT 'none',
  invoice_number VARCHAR(50),
  invoice_pdf_url VARCHAR(500),
  invoice_issued_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscription_payments_tenant ON subscription_payments(tenant_id);
CREATE INDEX idx_subscription_payments_wompi ON subscription_payments(wompi_transaction_id);
CREATE INDEX idx_subscription_payments_status ON subscription_payments(status);
