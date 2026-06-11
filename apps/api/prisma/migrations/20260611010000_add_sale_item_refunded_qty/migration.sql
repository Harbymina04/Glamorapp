-- Track refunded quantity per sale item to prevent double refunds.
ALTER TABLE "sale_items" ADD COLUMN "refunded_quantity" INTEGER NOT NULL DEFAULT 0;
