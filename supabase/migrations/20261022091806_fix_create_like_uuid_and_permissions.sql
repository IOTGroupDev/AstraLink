-- Preserve the existing PostgREST signature; use UUIDs for all table operations.
CREATE OR REPLACE FUNCTION public.create_like(p_target_user_id text, p_action text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_me uuid := auth.uid();
  v_target uuid;
  v_user_a uuid;
  v_user_b uuid;
  v_match_id uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('like', 'super_like', 'pass') THEN
    RAISE EXCEPTION 'Invalid dating action' USING ERRCODE = '22023';
  END IF;
  v_target := p_target_user_id::uuid;
  IF v_target IS NULL OR v_target = v_me THEN
    RAISE EXCEPTION 'Invalid target user' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_me) THEN
    RAISE EXCEPTION 'Sender profile not found' USING ERRCODE = '28000';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_target) THEN
    RAISE EXCEPTION 'Target user not found' USING ERRCODE = 'P0002';
  END IF;

  v_user_a := LEAST(v_me, v_target);
  v_user_b := GREATEST(v_me, v_target);
  -- Serialize reciprocal likes, including simultaneous first likes. The second
  -- transaction must observe the first committed action before checking a match.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_a::text || ':' || v_user_b::text, 0)
  );

  IF EXISTS (
    SELECT 1 FROM public.user_blocks b
    WHERE (b.user_id = v_me AND b.blocked_user_id = v_target)
       OR (b.user_id = v_target AND b.blocked_user_id = v_me)
  ) THEN
    RAISE EXCEPTION 'Dating action is blocked' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.likes (user_id, target_user_id, action)
  VALUES (v_me, v_target, p_action)
  ON CONFLICT (user_id, target_user_id)
  DO UPDATE SET action = EXCLUDED.action, created_at = CURRENT_TIMESTAMP;

  IF p_action IN ('like', 'super_like') AND EXISTS (
    SELECT 1 FROM public.likes l
    WHERE l.user_id = v_target AND l.target_user_id = v_me
      AND l.action IN ('like', 'super_like')
  ) THEN
    INSERT INTO public.matches (user_a, user_b)
    VALUES (v_user_a, v_user_b)
    ON CONFLICT ((LEAST(user_a, user_b)), (GREATEST(user_a, user_b)))
    DO NOTHING;

    -- Repeated likes return the existing match, but never reactivate a match
    -- closed through unmatch/block.
    SELECT m.id INTO v_match_id
    FROM public.matches m
    WHERE LEAST(m.user_a, m.user_b) = v_user_a
      AND GREATEST(m.user_a, m.user_b) = v_user_b
      AND m.status = 'active';
  END IF;
  RETURN v_match_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_like(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_like(text, text) TO authenticated;
NOTIFY pgrst, 'reload schema';
