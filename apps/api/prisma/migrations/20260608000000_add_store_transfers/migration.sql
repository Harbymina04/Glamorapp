-- CreateTable
CREATE TABLE "store_transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "transfer_number" VARCHAR(20) NOT NULL,
    "from_store_id" UUID NOT NULL,
    "to_store_id" UUID NOT NULL,
    "from_product_id" UUID NOT NULL,
    "to_product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_transfers_tenant_id_from_store_id_idx" ON "store_transfers"("tenant_id", "from_store_id");

-- CreateIndex
CREATE INDEX "store_transfers_tenant_id_to_store_id_idx" ON "store_transfers"("tenant_id", "to_store_id");

-- CreateIndex
CREATE INDEX "store_transfers_tenant_id_created_at_idx" ON "store_transfers"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "store_transfers" ADD CONSTRAINT "store_transfers_from_store_id_fkey"
    FOREIGN KEY ("from_store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_transfers" ADD CONSTRAINT "store_transfers_to_store_id_fkey"
    FOREIGN KEY ("to_store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_transfers" ADD CONSTRAINT "store_transfers_from_product_id_fkey"
    FOREIGN KEY ("from_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_transfers" ADD CONSTRAINT "store_transfers_to_product_id_fkey"
    FOREIGN KEY ("to_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
