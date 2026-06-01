-- storefronts: public profile of a tenant
CREATE TABLE IF NOT EXISTS "storefronts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "display_name" VARCHAR(255) NOT NULL DEFAULT '',
  "slug" VARCHAR(100) UNIQUE,
  "tagline" VARCHAR(300),
  "description" TEXT,
  "logo_url" TEXT,
  "banner_url" TEXT,
  "gallery_urls" JSONB DEFAULT '[]',
  "business_type" VARCHAR(50),
  "tags" JSONB DEFAULT '[]',
  "public_email" VARCHAR(255),
  "public_phone" VARCHAR(50),
  "whatsapp" VARCHAR(50),
  "instagram" VARCHAR(100),
  "facebook" VARCHAR(255),
  "tiktok" VARCHAR(100),
  "website" VARCHAR(255),
  "accepts_orders" BOOLEAN DEFAULT true,
  "accepts_appointments" BOOLEAN DEFAULT true,
  "accepts_delivery" BOOLEAN DEFAULT false,
  "delivery_fee" DECIMAL(12,2) DEFAULT 0,
  "delivery_radius_km" INTEGER DEFAULT 10,
  "min_order_amount" DECIMAL(12,2) DEFAULT 0,
  "advance_payment_percent" DECIMAL(5,2) DEFAULT 0,
  "average_rating" DECIMAL(3,2) DEFAULT 0,
  "total_reviews" INTEGER DEFAULT 0,
  "total_orders_completed" INTEGER DEFAULT 0,
  "is_active" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  UNIQUE("tenant_id")
);

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_store_visible" BOOLEAN DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "store_description" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "store_sort_order" INTEGER DEFAULT 0;

ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "is_store_visible" BOOLEAN DEFAULT false;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "store_description" TEXT;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "allows_online_booking" BOOLEAN DEFAULT false;

ALTER TABLE "nail_designs" ADD COLUMN IF NOT EXISTS "is_store_visible" BOOLEAN DEFAULT true;

ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "is_store_visible" BOOLEAN DEFAULT false;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10,7);
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(10,7);
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "neighborhood" VARCHAR(100);
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "accepts_pickup" BOOLEAN DEFAULT true;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "accepts_online_appointments" BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS "storefront_reviews" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "store_id" UUID REFERENCES "stores"("id") ON DELETE SET NULL,
  "reviewer_name" VARCHAR(255) NOT NULL,
  "reviewer_email" VARCHAR(255),
  "rating" INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  "comment" TEXT,
  "reply" TEXT,
  "replied_at" TIMESTAMPTZ,
  "is_verified" BOOLEAN DEFAULT false,
  "product_id" UUID REFERENCES "products"("id") ON DELETE SET NULL,
  "service_id" UUID REFERENCES "services"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "storefront_orders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "store_id" UUID REFERENCES "stores"("id") ON DELETE SET NULL,
  "order_number" VARCHAR(20) NOT NULL,
  "buyer_name" VARCHAR(255) NOT NULL,
  "buyer_email" VARCHAR(255),
  "buyer_phone" VARCHAR(50),
  "buyer_notes" TEXT,
  "items" JSONB NOT NULL DEFAULT '[]',
  "subtotal" DECIMAL(12,2) DEFAULT 0,
  "delivery_fee" DECIMAL(12,2) DEFAULT 0,
  "total" DECIMAL(12,2) DEFAULT 0,
  "payment_method" VARCHAR(50) DEFAULT 'store',
  "status" VARCHAR(30) DEFAULT 'pending',
  "sale_id" UUID REFERENCES "sales"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "storefront_orders_tenant_idx" ON "storefront_orders"("tenant_id");
CREATE INDEX IF NOT EXISTS "storefront_reviews_tenant_idx" ON "storefront_reviews"("tenant_id");
