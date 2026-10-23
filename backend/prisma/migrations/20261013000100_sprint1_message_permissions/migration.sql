-- Resolve both directions of a block without exposing the user_blocks table.
-- The caller is always auth.uid(), never a supplied sender identifier.
CREATE OR REPLACE FUNCTION public.can_send_message_to(p_recipient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND p_recipient_id IS NOT NULL
    AND p_recipient_id <> auth.uid()
    AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = p_recipient_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks b
      WHERE (b.user_id = auth.uid() AND b.blocked_user_id = p_recipient_id)
         OR (b.user_id = p_recipient_id AND b.blocked_user_id = auth.uid())
    );
$function$;
REVOKE ALL ON FUNCTION public.can_send_message_to(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_send_message_to(uuid) TO authenticated;

DROP POLICY IF EXISTS "messages: sender can insert for own match" ON public.messages;
CREATE POLICY "messages: sender can insert for own match"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = (SELECT auth.uid())
  AND public.can_send_message_to(recipient_id)
  AND type IN ('text', 'image')
  AND read_at IS NULL
  AND (NULLIF(btrim(content), '') IS NOT NULL OR attachment_path IS NOT NULL)
  AND (
    attachment_path IS NULL
    OR (
      (attachment_path LIKE (SELECT auth.uid())::text || '/%'
       OR attachment_path LIKE 'chat-media:' || (SELECT auth.uid())::text || '/%')
      AND attachment_path !~ '(^|/)[.]{1,2}(/|$)'
      AND strpos(attachment_path, chr(92)) = 0
      AND strpos(attachment_path, '%') = 0
    )
  )
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = messages.match_id AND m.status = 'active'
      AND ((m.user_a = (SELECT auth.uid()) AND m.user_b = messages.recipient_id)
        OR (m.user_b = (SELECT auth.uid()) AND m.user_a = messages.recipient_id))
  )
);

