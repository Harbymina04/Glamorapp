-- Migration: add per-item IVA to purchase_items and IVA fields to expenses

ALTER TABLE "purchase_items"
  ADD COLUMN "iva_rate"   DECIMAL(5,2)  NOT NULL DEFAULT 19,
  ADD COLUMN "iva_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill iva_rate from the linked product
UPDATE "purchase_items" pi
SET iva_rate = COALESCE(p.iva_rate, 19)
FROM "products" p
WHERE pi.product_id = p.id;

-- Backfill iva_amount based on rate * (quantity * unit_price)
UPDATE "purchase_items"
SET iva_amount = ROUND((quantity * unit_price) * (iva_rate / 100), 2);

ALTER TABLE "expenses"
  ADD COLUMN "iva_rate"        DECIMAL(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN "iva_amount"      DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "is_iva_excluded" BOOLEAN       NOT NULL DEFAULT false;
