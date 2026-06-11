-- Migration: add IVA fields to services table (Colombia 19% default)
ALTER TABLE "services"
  ADD COLUMN "iva_rate"        DECIMAL(5,2) NOT NULL DEFAULT 19,
  ADD COLUMN "is_iva_excluded" BOOLEAN      NOT NULL DEFAULT false;
