-- El schema declara professionalId String? (las reservas desde la tienda no
-- asignan profesional), pero la migración inicial creó la columna NOT NULL y
-- nunca se generó el ALTER. Sin esto, /appointments/public/book falla con P2011.
ALTER TABLE "appointments" ALTER COLUMN "professional_id" DROP NOT NULL;
