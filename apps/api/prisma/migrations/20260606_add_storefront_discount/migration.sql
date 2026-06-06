-- Add applyToStorefront flag to discounts table
ALTER TABLE "discounts"
  ADD COLUMN IF NOT EXISTS "apply_to_storefront" BOOLEAN NOT NULL DEFAULT false;
