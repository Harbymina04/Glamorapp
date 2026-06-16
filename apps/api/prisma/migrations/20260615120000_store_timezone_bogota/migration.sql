-- Zona horaria por defecto de las sucursales → Bogotá (Colombia)
ALTER TABLE "stores" ALTER COLUMN "timezone" SET DEFAULT 'America/Bogota';

-- Migrar sucursales que quedaron con el default antiguo de México
UPDATE "stores" SET "timezone" = 'America/Bogota' WHERE "timezone" = 'America/Mexico_City';
