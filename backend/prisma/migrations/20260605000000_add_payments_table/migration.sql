-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripe_session_id" TEXT,
    "tier" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_user_id_idx" ON "public"."payments"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "public"."payments"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_created_at_idx" ON "public"."payments"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_stripe_session_id_idx" ON "public"."payments"("stripe_session_id") WHERE "stripe_session_id" IS NOT NULL;
