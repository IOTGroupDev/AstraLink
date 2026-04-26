CREATE TABLE IF NOT EXISTS "public"."ai_content_cache" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "subject_key" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "chart_fingerprint" TEXT NOT NULL,
  "prompt_version" TEXT NOT NULL,
  "provider" TEXT,
  "content_json" JSONB NOT NULL,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3),

  CONSTRAINT "ai_content_cache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_content_cache_user_id_content_type_subject_key_locale_chart_fingerprint_prompt_version_key"
  ON "public"."ai_content_cache"("user_id", "content_type", "subject_key", "locale", "chart_fingerprint", "prompt_version");

CREATE INDEX IF NOT EXISTS "ai_content_cache_user_id_idx"
  ON "public"."ai_content_cache"("user_id");

CREATE INDEX IF NOT EXISTS "ai_content_cache_content_type_idx"
  ON "public"."ai_content_cache"("content_type");

CREATE INDEX IF NOT EXISTS "ai_content_cache_expires_at_idx"
  ON "public"."ai_content_cache"("expires_at");

CREATE INDEX IF NOT EXISTS "ai_content_cache_user_id_content_type_locale_idx"
  ON "public"."ai_content_cache"("user_id", "content_type", "locale");
