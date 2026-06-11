-- Add max_stock to products for over-stock alerts.
-- Default 0 = sin límite definido (no genera alerta de sobre-stock).
ALTER TABLE "products" ADD COLUMN "max_stock" INTEGER NOT NULL DEFAULT 0;
