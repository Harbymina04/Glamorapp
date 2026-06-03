-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled', 'proposed');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('promotional', 'loyalty', 'reactivation', 'birthday', 'seasonal', 'awareness');

-- CreateEnum
CREATE TYPE "CampaignChannel" AS ENUM ('whatsapp', 'email', 'instagram', 'facebook', 'sms');

-- CreateTable
CREATE TABLE "marketing_campaigns" (
    "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"        UUID NOT NULL,
    "store_id"         UUID NOT NULL,
    "name"             VARCHAR(255) NOT NULL,
    "description"      TEXT,
    "type"             "CampaignType" NOT NULL DEFAULT 'promotional',
    "status"           "CampaignStatus" NOT NULL DEFAULT 'draft',
    "channels"         JSONB NOT NULL DEFAULT '[]',
    "target_segment"   VARCHAR(50),
    "target_tier"      VARCHAR(50),
    "subject"          VARCHAR(255),
    "message"          TEXT NOT NULL,
    "image_url"        TEXT,
    "cta_text"         VARCHAR(100),
    "cta_url"          VARCHAR(500),
    "scheduled_at"     TIMESTAMP(3),
    "started_at"       TIMESTAMP(3),
    "completed_at"     TIMESTAMP(3),
    "target_count"     INTEGER NOT NULL DEFAULT 0,
    "sent_count"       INTEGER NOT NULL DEFAULT 0,
    "open_count"       INTEGER NOT NULL DEFAULT 0,
    "click_count"      INTEGER NOT NULL DEFAULT 0,
    "conversion_count" INTEGER NOT NULL DEFAULT 0,
    "is_ai_proposed"   BOOLEAN NOT NULL DEFAULT false,
    "ai_reason"        TEXT,
    "reviewed_by"      UUID,
    "reviewed_at"      TIMESTAMP(3),
    "review_notes"     TEXT,
    "created_by"       UUID NOT NULL,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at"       TIMESTAMP(3),

    CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_campaigns_tenant_id_store_id_idx"        ON "marketing_campaigns"("tenant_id", "store_id");
CREATE INDEX "marketing_campaigns_tenant_id_store_id_status_idx" ON "marketing_campaigns"("tenant_id", "store_id", "status");

-- AddForeignKey
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_store_id_fkey"  FOREIGN KEY ("store_id")  REFERENCES "stores"("id")  ON DELETE RESTRICT ON UPDATE CASCADE;
