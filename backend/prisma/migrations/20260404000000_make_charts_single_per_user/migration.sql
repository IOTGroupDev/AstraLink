-- Ensure charts remain single-record-per-user.
-- The application already treats natal chart as a single source of truth and
-- always reads the latest row by user_id. Multiple rows are not intentional.

-- 1) Deduplicate existing data, keeping the newest row for each user.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY created_at DESC, updated_at DESC, id DESC
    ) AS row_num
  FROM "public"."charts"
)
DELETE FROM "public"."charts"
WHERE id IN (
  SELECT id
  FROM ranked
  WHERE row_num > 1
);

-- 2) Enforce one chart per user at the database level.
CREATE UNIQUE INDEX IF NOT EXISTS "charts_user_id_key"
ON "public"."charts"("user_id");
