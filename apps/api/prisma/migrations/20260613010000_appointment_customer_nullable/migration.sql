-- Alinear con el schema: appointments.customerId es String? (nullable) pero la
-- base lo tenía NOT NULL (mismo patrón de deriva que professional_id/tenant_id).
-- Preventivo: evita un P2011 si algún flujo crea una cita sin cliente.
ALTER TABLE "appointments" ALTER COLUMN "customer_id" DROP NOT NULL;
