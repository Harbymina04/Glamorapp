-- Descuento anual del plan; el precio anual se deriva del mensual + descuento.
ALTER TABLE "plans" ADD COLUMN "annual_discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- Backfill: deducir el descuento de los planes existentes a partir de su precio
-- mensual y anual actuales, para no perder la rebaja ya configurada.
UPDATE "plans"
SET "annual_discount_percent" = ROUND((1 - ("yearly_price" / ("monthly_price" * 12))) * 100)
WHERE "monthly_price" > 0 AND "yearly_price" > 0;
