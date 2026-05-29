-- CreateTable
CREATE TABLE "supplier_contacts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "position" VARCHAR(100),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_product_prices" (
    "id" UUID NOT NULL,
    "supplier_product_id" UUID NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "previous_price" DECIMAL(12,2),
    "effective_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by_user_id" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_documents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "doc_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "file_url" TEXT,
    "expiry_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_contacts_tenant_id_store_id_supplier_id_idx" ON "supplier_contacts"("tenant_id", "store_id", "supplier_id");

-- CreateIndex
CREATE INDEX "supplier_product_prices_supplier_product_id_idx" ON "supplier_product_prices"("supplier_product_id");

-- CreateIndex
CREATE INDEX "supplier_product_prices_supplier_product_id_effective_date_idx" ON "supplier_product_prices"("supplier_product_id", "effective_date");

-- CreateIndex
CREATE INDEX "supplier_documents_tenant_id_store_id_supplier_id_idx" ON "supplier_documents"("tenant_id", "store_id", "supplier_id");

-- AddForeignKey
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_product_prices" ADD CONSTRAINT "supplier_product_prices_supplier_product_id_fkey" FOREIGN KEY ("supplier_product_id") REFERENCES "supplier_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
