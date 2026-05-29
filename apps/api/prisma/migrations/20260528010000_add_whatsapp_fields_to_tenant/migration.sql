-- AlterTable
ALTER TABLE "tenants" 
  ADD COLUMN "whatsapp_number" VARCHAR(20),
  ADD COLUMN "whatsapp_session_id" VARCHAR(100);
