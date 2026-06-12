-- Envío gratis a partir de un monto de subtotal (0 = nunca aplica)
ALTER TABLE "storefronts" ADD COLUMN "free_delivery_threshold" DECIMAL(12,2) NOT NULL DEFAULT 0;
