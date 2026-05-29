-- CreateEnum
CREATE TYPE "CashRegisterSessionStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('in', 'out');

-- CreateTable
CREATE TABLE "cash_register_sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "opened_by" UUID NOT NULL,
    "closed_by" UUID,
    "opening_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "closing_balance" DECIMAL(12,2),
    "expected_balance" DECIMAL(12,2),
    "difference" DECIMAL(12,2),
    "status" "CashRegisterSessionStatus" NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_register_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" VARCHAR(255),
    "description" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_register_sessions_tenant_id_store_id_idx" ON "cash_register_sessions"("tenant_id", "store_id");

-- CreateIndex
CREATE INDEX "cash_register_sessions_tenant_id_store_id_status_idx" ON "cash_register_sessions"("tenant_id", "store_id", "status");

-- CreateIndex
CREATE INDEX "cash_movements_session_id_idx" ON "cash_movements"("session_id");

-- CreateIndex
CREATE INDEX "cash_movements_tenant_id_store_id_created_at_idx" ON "cash_movements"("tenant_id", "store_id", "created_at");

-- AddForeignKey
ALTER TABLE "cash_register_sessions" ADD CONSTRAINT "cash_register_sessions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "cash_register_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
