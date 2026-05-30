-- ============================================================
-- Accounting Module Migration
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE "InvoiceType" AS ENUM ('invoice','credit_note','debit_note','support_document','pos_invoice');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InvoiceStatus" AS ENUM ('draft','pending_dian','approved','rejected','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TaxType" AS ENUM ('iva','ica','retefuente','reteiva','reteica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PersonType" AS ENUM ('natural','juridica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TaxRegime" AS ENUM ('responsable_iva','no_responsable','gran_contribuyente','regimen_simple');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "IdType" AS ENUM ('cc','nit','ce','pasaporte','ti','pep');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AccountingTransactionType" AS ENUM ('income','expense','transfer','tax_payment','adjustment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AccountingTransactionStatus" AS ENUM ('confirmed','pending','voided');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Fiscal Config ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "fiscal_config" (
  "id"                        UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"                 UUID        NOT NULL REFERENCES "tenants"("id"),
  "store_id"                  UUID        NOT NULL REFERENCES "stores"("id"),

  -- Datos empresa
  "business_name"             VARCHAR(255) NOT NULL,
  "trade_name"                VARCHAR(255),
  "id_type"                   "IdType"    NOT NULL DEFAULT 'nit',
  "id_number"                 VARCHAR(20) NOT NULL,
  "dv"                        CHAR(1),
  "person_type"               "PersonType" DEFAULT 'juridica',
  "tax_regime"                "TaxRegime"  DEFAULT 'responsable_iva',

  -- Dirección fiscal
  "fiscal_address"            TEXT        NOT NULL DEFAULT '',
  "city_code"                 VARCHAR(10),
  "department_code"           VARCHAR(10),
  "country_code"              VARCHAR(3)  DEFAULT 'CO',
  "postal_code"               VARCHAR(10),

  -- Contacto fiscal
  "fiscal_email"              VARCHAR(255) NOT NULL DEFAULT '',
  "fiscal_phone"              VARCHAR(50),

  -- Responsabilidades tributarias
  "tax_responsibilities"      JSONB       NOT NULL DEFAULT '[]',

  -- Actividad económica
  "economic_activity_code"    VARCHAR(10),
  "economic_activity_desc"    VARCHAR(255),

  -- Proveedor tecnológico FE
  "fe_provider"               VARCHAR(50) NOT NULL DEFAULT 'none',
  "fe_provider_api_key"       VARCHAR(500),
  "fe_provider_api_secret"    VARCHAR(500),
  "fe_environment"            VARCHAR(20) NOT NULL DEFAULT 'sandbox',
  "fe_provider_config"        JSONB       NOT NULL DEFAULT '{}',

  -- Resolución DIAN
  "resolution_number"         VARCHAR(50),
  "resolution_date"           DATE,
  "resolution_prefix"         VARCHAR(10),
  "resolution_from"           INTEGER,
  "resolution_to"             INTEGER,
  "resolution_valid_from"     DATE,
  "resolution_valid_to"       DATE,
  "current_invoice_number"    INTEGER     NOT NULL DEFAULT 0,

  -- Notas crédito / débito
  "cn_prefix"                 VARCHAR(10),
  "cn_current_number"         INTEGER     NOT NULL DEFAULT 0,
  "dn_prefix"                 VARCHAR(10),
  "dn_current_number"         INTEGER     NOT NULL DEFAULT 0,

  "is_active"                 BOOLEAN     NOT NULL DEFAULT true,
  "created_at"                TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "fiscal_config_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fiscal_config_tenant_store_unique" UNIQUE ("tenant_id","store_id")
);
CREATE INDEX IF NOT EXISTS "fiscal_config_tenant_idx" ON "fiscal_config"("tenant_id","store_id");

-- ── Tax Rates ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "tax_rates" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID        NOT NULL REFERENCES "tenants"("id"),
  "name"            VARCHAR(100) NOT NULL,
  "tax_type"        "TaxType"   NOT NULL,
  "rate"            DECIMAL(5,2) NOT NULL,
  "is_default"      BOOLEAN     NOT NULL DEFAULT false,
  "is_active"       BOOLEAN     NOT NULL DEFAULT true,
  "applies_to"      VARCHAR(20) NOT NULL DEFAULT 'all',
  "min_base_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "dian_tax_code"   VARCHAR(10),
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "tax_rates_tenant_idx" ON "tax_rates"("tenant_id");

-- ── Invoices ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "invoices" (
  "id"                        UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"                 UUID        NOT NULL REFERENCES "tenants"("id"),
  "store_id"                  UUID        NOT NULL REFERENCES "stores"("id"),

  "sale_id"                   UUID        REFERENCES "sales"("id"),
  "purchase_id"               UUID        REFERENCES "purchases"("id"),

  "invoice_type"              "InvoiceType" NOT NULL DEFAULT 'invoice',
  "invoice_number"            VARCHAR(30) NOT NULL,
  "prefix"                    VARCHAR(10),
  "consecutive"               INTEGER     NOT NULL,

  "referenced_invoice_id"     UUID        REFERENCES "invoices"("id"),
  "correction_reason"         TEXT,

  "customer_id"               UUID        REFERENCES "customers"("id"),
  "supplier_id"               UUID        REFERENCES "suppliers"("id"),

  -- Receptor
  "receiver_name"             VARCHAR(255) NOT NULL,
  "receiver_id_type"          "IdType",
  "receiver_id_number"        VARCHAR(20),
  "receiver_email"            VARCHAR(255),
  "receiver_phone"            VARCHAR(50),
  "receiver_address"          TEXT,
  "receiver_city_code"        VARCHAR(10),
  "receiver_tax_regime"       "TaxRegime",
  "receiver_tax_resp"         JSONB       NOT NULL DEFAULT '[]',

  -- Montos
  "subtotal"                  DECIMAL(12,2) NOT NULL DEFAULT 0,
  "discount_amount"           DECIMAL(12,2) NOT NULL DEFAULT 0,
  "tax_base"                  DECIMAL(12,2) NOT NULL DEFAULT 0,
  "iva_amount"                DECIMAL(12,2) NOT NULL DEFAULT 0,
  "ica_amount"                DECIMAL(12,2) NOT NULL DEFAULT 0,
  "retefuente_amount"         DECIMAL(12,2) NOT NULL DEFAULT 0,
  "reteiva_amount"            DECIMAL(12,2) NOT NULL DEFAULT 0,
  "reteica_amount"            DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total_tax"                 DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total"                     DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Pago
  "payment_method_code"       VARCHAR(5),
  "payment_means_code"        VARCHAR(5)  NOT NULL DEFAULT '1',
  "due_date"                  DATE,

  -- Estado DIAN
  "status"                    "InvoiceStatus" NOT NULL DEFAULT 'draft',
  "cufe"                      VARCHAR(255),
  "qr_code"                   TEXT,
  "dian_response"             JSONB       NOT NULL DEFAULT '{}',
  "dian_validated_at"         TIMESTAMPTZ,
  "dian_rejection_reason"     TEXT,

  -- Archivos
  "xml_url"                   TEXT,
  "pdf_url"                   TEXT,

  -- Envío
  "sent_to_email"             BOOLEAN     NOT NULL DEFAULT false,
  "sent_at"                   TIMESTAMPTZ,

  "notes"                     TEXT,
  "internal_notes"            TEXT,
  "created_by"                UUID        REFERENCES "users"("id"),
  "created_at"                TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoices_number_unique" UNIQUE ("tenant_id","store_id","invoice_number")
);
CREATE INDEX IF NOT EXISTS "invoices_tenant_store_idx" ON "invoices"("tenant_id","store_id");
CREATE INDEX IF NOT EXISTS "invoices_sale_idx"          ON "invoices"("sale_id");
CREATE INDEX IF NOT EXISTS "invoices_customer_idx"      ON "invoices"("customer_id");
CREATE INDEX IF NOT EXISTS "invoices_status_idx"        ON "invoices"("tenant_id","store_id","status");
CREATE INDEX IF NOT EXISTS "invoices_date_idx"          ON "invoices"("tenant_id","store_id","created_at");
CREATE INDEX IF NOT EXISTS "invoices_cufe_idx"          ON "invoices"("cufe");

-- ── Invoice Items ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "invoice_items" (
  "id"                    UUID        NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id"            UUID        NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "product_id"            UUID        REFERENCES "products"("id"),
  "service_id"            UUID        REFERENCES "services"("id"),
  "item_type"             VARCHAR(20) NOT NULL DEFAULT 'product',
  "code"                  VARCHAR(50),
  "description"           VARCHAR(500) NOT NULL,
  "quantity"              DECIMAL(10,2) NOT NULL DEFAULT 1,
  "unit_measure"          VARCHAR(10) NOT NULL DEFAULT 'UN',
  "unit_price"            DECIMAL(12,2) NOT NULL,
  "discount_rate"         DECIMAL(5,2) NOT NULL DEFAULT 0,
  "discount_amount"       DECIMAL(12,2) NOT NULL DEFAULT 0,
  "subtotal"              DECIMAL(12,2) NOT NULL,
  "iva_rate"              DECIMAL(5,2) NOT NULL DEFAULT 19,
  "iva_amount"            DECIMAL(12,2) NOT NULL DEFAULT 0,
  "is_iva_excluded"       BOOLEAN     NOT NULL DEFAULT false,
  "is_iva_exempt"         BOOLEAN     NOT NULL DEFAULT false,
  "retefuente_rate"       DECIMAL(5,2) NOT NULL DEFAULT 0,
  "retefuente_amount"     DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total"                 DECIMAL(12,2) NOT NULL,
  "standard_code"         VARCHAR(20),
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "invoice_items_invoice_idx" ON "invoice_items"("invoice_id");

-- ── Accounting Transactions ──────────────────────────────────
CREATE TABLE IF NOT EXISTS "accounting_transactions" (
  "id"                    UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"             UUID        NOT NULL REFERENCES "tenants"("id"),
  "store_id"              UUID        NOT NULL REFERENCES "stores"("id"),

  "transaction_type"      "AccountingTransactionType" NOT NULL,
  "category"              VARCHAR(100) NOT NULL,
  "subcategory"           VARCHAR(100),

  "sale_id"               UUID        REFERENCES "sales"("id"),
  "expense_id"            UUID        REFERENCES "expenses"("id"),
  "purchase_id"           UUID        REFERENCES "purchases"("id"),
  "invoice_id"            UUID        REFERENCES "invoices"("id"),

  "description"           VARCHAR(500) NOT NULL,
  "reference_number"      VARCHAR(50),

  "gross_amount"          DECIMAL(12,2) NOT NULL,
  "tax_amount"            DECIMAL(12,2) NOT NULL DEFAULT 0,
  "retention_amount"      DECIMAL(12,2) NOT NULL DEFAULT 0,
  "net_amount"            DECIMAL(12,2) NOT NULL,

  "iva_amount"            DECIMAL(12,2) NOT NULL DEFAULT 0,
  "retefuente_amount"     DECIMAL(12,2) NOT NULL DEFAULT 0,
  "reteiva_amount"        DECIMAL(12,2) NOT NULL DEFAULT 0,
  "reteica_amount"        DECIMAL(12,2) NOT NULL DEFAULT 0,
  "ica_amount"            DECIMAL(12,2) NOT NULL DEFAULT 0,

  "payment_method"        VARCHAR(30),
  "status"                "AccountingTransactionStatus" NOT NULL DEFAULT 'confirmed',
  "transaction_date"      DATE        NOT NULL,

  "is_reconciled"         BOOLEAN     NOT NULL DEFAULT false,
  "reconciled_at"         TIMESTAMPTZ,
  "reconciled_by"         UUID        REFERENCES "users"("id"),

  "created_by"            UUID        REFERENCES "users"("id"),
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "accounting_transactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "acct_tx_tenant_store_idx" ON "accounting_transactions"("tenant_id","store_id");
CREATE INDEX IF NOT EXISTS "acct_tx_type_idx"         ON "accounting_transactions"("tenant_id","store_id","transaction_type");
CREATE INDEX IF NOT EXISTS "acct_tx_date_idx"         ON "accounting_transactions"("tenant_id","store_id","transaction_date");
CREATE INDEX IF NOT EXISTS "acct_tx_category_idx"     ON "accounting_transactions"("tenant_id","store_id","category");
CREATE INDEX IF NOT EXISTS "acct_tx_sale_idx"         ON "accounting_transactions"("sale_id");
CREATE INDEX IF NOT EXISTS "acct_tx_invoice_idx"      ON "accounting_transactions"("invoice_id");

-- ── Tax Declarations ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "tax_declarations" (
  "id"                UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         UUID        NOT NULL REFERENCES "tenants"("id"),
  "tax_type"          "TaxType"   NOT NULL,
  "period_type"       VARCHAR(20) NOT NULL,
  "period_year"       INTEGER     NOT NULL,
  "period_month"      INTEGER,
  "tax_base"          DECIMAL(12,2) NOT NULL DEFAULT 0,
  "tax_amount"        DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status"            VARCHAR(20) NOT NULL DEFAULT 'pending',
  "due_date"          DATE,
  "filed_at"          TIMESTAMPTZ,
  "paid_at"           TIMESTAMPTZ,
  "payment_reference" VARCHAR(100),
  "notes"             TEXT,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "tax_declarations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tax_declarations_unique" UNIQUE ("tenant_id","tax_type","period_year","period_month")
);

-- ── Fiscal fields on customers ───────────────────────────────
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "id_type"                "IdType";
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "id_number"              VARCHAR(20);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "dv"                     CHAR(1);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "person_type"            "PersonType" DEFAULT 'natural';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "tax_regime"             "TaxRegime"  DEFAULT 'no_responsable';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "fiscal_address"         TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "city_code"              VARCHAR(10);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "department_code"        VARCHAR(10);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "tax_responsibilities"   JSONB        DEFAULT '[]';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "fiscal_email"           VARCHAR(255);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "economic_activity_code" VARCHAR(10);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "requires_invoice"       BOOLEAN      DEFAULT false;

-- ── Invoice fields on sales ──────────────────────────────────
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "requires_invoice" BOOLEAN DEFAULT false;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "invoice_id"       UUID REFERENCES "invoices"("id");
