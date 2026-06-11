-- Migration: add per-product IVA fields (Colombia 19% default)
-- Affected tables: products, sale_items

-- Add IVA configuration fields to products
ALTER TABLE "products"
  ADD COLUMN "iva_rate"       DECIMAL(5,2)  NOT NULL DEFAULT 19,
  ADD COLUMN "is_iva_excluded" BOOLEAN      NOT NULL DEFAULT false;

-- Add IVA snapshot fields to sale_items (captures rate at time of sale)
ALTER TABLE "sale_items"
  ADD COLUMN "iva_rate"   DECIMAL(5,2)  NOT NULL DEFAULT 19,
  ADD COLUMN "iva_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill existing sale_items: sync iva_rate from the linked product
UPDATE "sale_items" si
SET iva_rate = COALESCE(p.iva_rate, 19)
FROM "products" p
WHERE si.product_id = p.id;

-- Services (no product_id) stay at 19% by default
-- Adjust to 0 if your business has service IVA exemptions; change manually if needed.
