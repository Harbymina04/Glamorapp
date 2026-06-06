-- CreateEnum
CREATE TYPE "DiscountScope" AS ENUM ('all', 'category', 'products', 'services');

-- CreateTable
CREATE TABLE "discounts" (
    "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"        UUID         NOT NULL,
    "store_id"         UUID         NOT NULL,
    "name"             VARCHAR(255) NOT NULL,
    "description"      TEXT,
    "discount_percent" DECIMAL(5,2) NOT NULL,
    "scope"            "DiscountScope" NOT NULL DEFAULT 'all',
    "target_ids"       JSONB        NOT NULL DEFAULT '[]',
    "start_date"       DATE,
    "end_date"         DATE,
    "is_active"        BOOLEAN      NOT NULL DEFAULT true,
    "created_by"       UUID,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discounts_tenant_id_store_id_idx"          ON "discounts"("tenant_id", "store_id");
CREATE INDEX "discounts_tenant_id_store_id_is_active_idx" ON "discounts"("tenant_id", "store_id", "is_active");

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "discounts" ADD CONSTRAINT "discounts_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
