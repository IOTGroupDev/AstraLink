# AstraLink Release Security Checklist

Use this before a release that touches auth, profile, birth data, chat, dating, storage, RLS, or Supabase migrations.

## Pre-Release

- Create a database backup with `./scripts/backup.sh`.
- Export Storage buckets `user-photos` and `chat-media` if media preservation matters.
- Confirm `DATA_ENCRYPTION_KEY` is set in backend production env.
- Confirm `BIRTH_DATA_WRITE_PLAINTEXT=false` or unset for cutover mode.
- Run birth encryption backfill.
- Run plaintext cleanup dry run and confirm no blocked rows.
- Review Supabase RLS policies for `users`, `user_profiles`, `charts`, `messages`, `dating_matches`, `likes`, `matches`, `user_photos`, `user_blocks`, and `user_reports`.
- Check Supabase advisor warnings and resolve security-definer/search-path/RLS warnings before shipping.
- Check env/secrets: no service-role key in frontend, no secrets committed, CORS points to production domains only.
- Confirm dating/chat payloads do not expose `email`, `birth_*`, encrypted birth shadows, auth tokens, or private Storage paths.
- Run `cd backend && npm run cleanup:compatibility-queue` and use `-- --confirm` during maintenance if legacy jobs remain.

## Deploy

```bash
npm run build
npm run lint
cd backend && npx prisma generate
docker compose up --build
```

Use `npx prisma migrate deploy` only when the target environment is ready for the included migrations.

## Rollback Plan

- Keep the previous backend image/tag available.
- For code-only rollback, redeploy the previous image and keep database state.
- For birth-data write rollback, set `BIRTH_DATA_WRITE_PLAINTEXT=true` only temporarily, then redeploy backend.
- For destructive data cleanup rollback, restore to a separate Supabase project first and inspect before replacing production.
- Storage rollback is separate from database rollback; restore `user-photos` and `chat-media` objects from the matching backup.

## Post-Deploy

- Smoke-test OTP/magic link auth with Bearer-token API calls.
- Update profile birth data and verify natal chart recalculation still works.
- Open dating and chat screens and inspect API payloads for sensitive fields.
- Check backend logs for decrypt warnings and auth/header failures.
- Check Redis key samples for sensitive plaintext values.
