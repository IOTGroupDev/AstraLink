-- Durable per-user visibility, owned by the backend. No message content is copied.
CREATE TABLE IF NOT EXISTS public.chat_hidden_messages (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, message_id)
);
CREATE TABLE IF NOT EXISTS public.chat_hidden_conversations (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  other_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, other_user_id),
  CHECK (user_id <> other_user_id)
);
ALTER TABLE public.chat_hidden_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_hidden_conversations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_hidden_messages, public.chat_hidden_conversations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_hidden_messages, public.chat_hidden_conversations TO service_role;
COMMENT ON TABLE public.chat_hidden_messages IS 'Backend-only durable delete-for-me state; owner deleted by auth.users cascade';
COMMENT ON TABLE public.chat_hidden_conversations IS 'Backend-only durable hidden conversations; owner deleted by auth.users cascade';
