-- Security phase 2: canonicalize duplicated owner/service policies
-- Focus tables: public.user_photos, public.user_blocks, public.user_reports

-- =============================
-- public.user_photos
-- =============================

DROP POLICY IF EXISTS "Users can delete own photos" ON public.user_photos;
DROP POLICY IF EXISTS "Users can insert own photos" ON public.user_photos;
DROP POLICY IF EXISTS "Users can update own photos" ON public.user_photos;
DROP POLICY IF EXISTS "Users can view own photos" ON public.user_photos;
DROP POLICY IF EXISTS "read_user_photos_owner" ON public.user_photos;
DROP POLICY IF EXISTS "write_user_photos_owner" ON public.user_photos;
DROP POLICY IF EXISTS "user_photos: owner can select" ON public.user_photos;
DROP POLICY IF EXISTS "user_photos: owner can insert" ON public.user_photos;
DROP POLICY IF EXISTS "user_photos: owner can update" ON public.user_photos;
DROP POLICY IF EXISTS "user_photos: owner can delete" ON public.user_photos;

CREATE POLICY "user_photos: owner can select"
ON public.user_photos
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "user_photos: owner can insert"
ON public.user_photos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_photos: owner can update"
ON public.user_photos
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_photos: owner can delete"
ON public.user_photos
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- =============================
-- public.user_blocks
-- =============================

DROP POLICY IF EXISTS "all_user_blocks_owner" ON public.user_blocks;
DROP POLICY IF EXISTS "blocks: owner can delete" ON public.user_blocks;
DROP POLICY IF EXISTS "blocks: owner can insert" ON public.user_blocks;
DROP POLICY IF EXISTS "blocks: owner can select" ON public.user_blocks;
DROP POLICY IF EXISTS "blocks: service role full access" ON public.user_blocks;
DROP POLICY IF EXISTS "user_blocks: owner can select" ON public.user_blocks;
DROP POLICY IF EXISTS "user_blocks: owner can insert" ON public.user_blocks;
DROP POLICY IF EXISTS "user_blocks: owner can delete" ON public.user_blocks;
DROP POLICY IF EXISTS "user_blocks: service role full access" ON public.user_blocks;

CREATE POLICY "user_blocks: owner can select"
ON public.user_blocks
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_blocks: owner can insert"
ON public.user_blocks
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_blocks: owner can delete"
ON public.user_blocks
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_blocks: service role full access"
ON public.user_blocks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================
-- public.user_reports
-- =============================

DROP POLICY IF EXISTS "insert_user_reports_owner" ON public.user_reports;
DROP POLICY IF EXISTS "read_user_reports_owner" ON public.user_reports;
DROP POLICY IF EXISTS "reports: reporter can insert" ON public.user_reports;
DROP POLICY IF EXISTS "reports: reporter can select own" ON public.user_reports;
DROP POLICY IF EXISTS "reports: service role full access" ON public.user_reports;
DROP POLICY IF EXISTS "user_reports: reporter can insert" ON public.user_reports;
DROP POLICY IF EXISTS "user_reports: reporter can select own" ON public.user_reports;
DROP POLICY IF EXISTS "user_reports: service role full access" ON public.user_reports;

CREATE POLICY "user_reports: reporter can insert"
ON public.user_reports
FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "user_reports: reporter can select own"
ON public.user_reports
FOR SELECT
TO authenticated
USING (reporter_id = auth.uid());

CREATE POLICY "user_reports: service role full access"
ON public.user_reports
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
