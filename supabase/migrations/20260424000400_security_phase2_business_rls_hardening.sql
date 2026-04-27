-- Security phase 2b: harden business RLS policies for owner-scoped and participant-scoped tables

-- =============================
-- public.connections
-- =============================

DROP POLICY IF EXISTS "Users can create own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can update own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can view own connections" ON public.connections;

CREATE POLICY "connections: owner can select"
ON public.connections
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "connections: owner can insert"
ON public.connections
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "connections: owner can update"
ON public.connections
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =============================
-- public.dating_matches
-- =============================

DROP POLICY IF EXISTS "Users can create own matches" ON public.dating_matches;
DROP POLICY IF EXISTS "Users can update own matches" ON public.dating_matches;
DROP POLICY IF EXISTS "Users can view own matches" ON public.dating_matches;

CREATE POLICY "dating_matches: owner can select"
ON public.dating_matches
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "dating_matches: owner can insert"
ON public.dating_matches
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "dating_matches: owner can update"
ON public.dating_matches
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =============================
-- public.likes
-- =============================

DROP POLICY IF EXISTS "insert_likes_owner" ON public.likes;
DROP POLICY IF EXISTS "read_likes_incoming" ON public.likes;
DROP POLICY IF EXISTS "read_likes_owner" ON public.likes;

CREATE POLICY "likes: owner can insert"
ON public.likes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND user_id <> target_user_id
);

CREATE POLICY "likes: owner can read own"
ON public.likes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "likes: target can read incoming"
ON public.likes
FOR SELECT
TO authenticated
USING (target_user_id = auth.uid());

-- =============================
-- public.matches
-- =============================

DROP POLICY IF EXISTS "read_matches_participant" ON public.matches;

CREATE POLICY "matches: participant can read"
ON public.matches
FOR SELECT
TO authenticated
USING ((user_a = auth.uid()) OR (user_b = auth.uid()));

-- =============================
-- public.messages
-- =============================

DROP POLICY IF EXISTS "insert_messages_participant" ON public.messages;
DROP POLICY IF EXISTS "read_messages_participant" ON public.messages;

CREATE POLICY "messages: participant can read"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = messages.match_id
      AND ((m.user_a = auth.uid()) OR (m.user_b = auth.uid()))
  )
);

CREATE POLICY "messages: sender can insert for own match"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND recipient_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = messages.match_id
      AND (
        (m.user_a = auth.uid() AND m.user_b = recipient_id)
        OR
        (m.user_b = auth.uid() AND m.user_a = recipient_id)
      )
  )
);

-- =============================
-- public.subscriptions
-- =============================

DROP POLICY IF EXISTS "Service role full access" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions: service role full access" ON public.subscriptions;

CREATE POLICY "subscriptions: service role full access"
ON public.subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
