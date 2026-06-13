-- Vincular pedidos del storefront a la cuenta del cliente cuando compró autenticado.
ALTER TABLE "storefront_orders" ADD COLUMN "user_id" UUID;

ALTER TABLE "storefront_orders"
  ADD CONSTRAINT "storefront_orders_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "storefront_orders_user_id_idx" ON "storefront_orders" ("user_id");
