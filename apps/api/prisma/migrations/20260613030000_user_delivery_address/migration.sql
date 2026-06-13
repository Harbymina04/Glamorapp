-- Dirección de entrega del cliente de plataforma (perfil del storefront).
ALTER TABLE "users" ADD COLUMN "address" VARCHAR(500);
ALTER TABLE "users" ADD COLUMN "city" VARCHAR(100);
