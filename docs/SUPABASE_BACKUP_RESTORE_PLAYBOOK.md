# AstraLink Supabase Backup & Restore Playbook

Last updated: `2026-04-24`

Project:

- Supabase project ref: `ayoucajwdyinyhamousz`
- Environment: test / pre-production data
- Current Storage buckets: `user-photos`, `chat-media`
- Current Edge Functions: none

## Purpose

This playbook defines the minimal safe backup and restore flow for the current AstraLink stage:

- data is not yet production-critical;
- the project still contains sensitive user data;
- we need a repeatable rollback path before risky changes.

## What Exists Today

Current project-specific assets that matter for backup:

- Postgres database with user, natal chart, chat, dating, and subscription data
- Supabase Auth users in the `auth` schema
- private Supabase Storage buckets:
  - `user-photos`
  - `chat-media`
- Redis cache on the application host

Installed database extensions to verify after restore:

- `pg_graphql`
- `pgcrypto`
- `pg_stat_statements`
- `plpgsql`
- `pg_cron`
- `uuid-ossp`
- `supabase_vault`

## Important Limits

From current Supabase documentation:

- database backups do not include Storage objects:
  `https://supabase.com/docs/guides/platform/backups`
- if you use physical backups or PITR, restoring to a new project is database-only and still requires manual reconfiguration of Storage objects/settings, Edge Functions, Auth settings/API keys, Realtime, and some database settings:
  `https://supabase.com/docs/guides/platform/clone-project`
- the recommended logical backup flow is `supabase db dump` for `roles`, `schema`, and `data`:
  `https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore`

Practical consequence for AstraLink:

- database rollback and storage rollback are two different operations;
- a database restore alone does not bring back deleted photos or chat attachments;
- storage must be copied separately.

## Recommended Backup Policy For Current Stage

Use this lightweight policy until production data becomes valuable:

- before every risky schema/security migration: create a logical database backup
- before releases that touch auth/storage/chat/dating: create a logical database backup
- keep Redis backups for operational convenience
- treat Storage copy as required when there are media changes you care about
- defer PITR until the environment becomes production-critical

## Prerequisites

To create a manual logical database backup:

- Docker available locally or on the server
- Supabase CLI installed, or `npx` available
- database connection string from Supabase `Connect`
- database password for the project

Supabase currently recommends the Session Pooler connection string by default for backup/restore tasks:
`https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore`

Example:

```bash
export SUPABASE_DB_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres"
./scripts/backup.sh
```

## What `scripts/backup.sh` Now Does

The script now:

- backs up Redis
- attempts a logical Supabase database dump if `SUPABASE_DB_URL` is provided
- exports Supabase Storage objects from `user-photos` and `chat-media` when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided
- stores `roles.sql`, `schema.sql`, and `data.sql`
- stores Storage bucket metadata and raw object files
- writes a manifest with backup status
- reminds explicitly that Storage objects are not included

The script does not:

- clone Auth settings or API keys
- restore anything automatically

## Manual Database Backup

If you need to run the database dump yourself, use the documented Supabase flow:

```bash
supabase db dump --db-url "$SUPABASE_DB_URL" -f roles.sql --role-only
supabase db dump --db-url "$SUPABASE_DB_URL" -f schema.sql
supabase db dump --db-url "$SUPABASE_DB_URL" -f data.sql --use-copy --data-only
```

Reference:
`https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore`

## Manual Restore To A New Project

For a safe rollback rehearsal or test restore:

1. Create a new Supabase project.
2. Enable any required extensions.
3. Restore the SQL files:

```bash
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file roles.sql \
  --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname "$NEW_SUPABASE_DB_URL"
```

4. Verify:

- critical tables exist
- `auth.users` row count looks sane
- RLS policies are present
- installed extensions match the list above

Reference:
`https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore`

## Dashboard Restore Options

If the project is on a paid plan with eligible backups:

- daily backups and PITR are managed in the Supabase dashboard:
  `https://supabase.com/docs/guides/platform/backups`
- restore-to-new-project is the safest way to inspect an older snapshot without overwriting the current project:
  `https://supabase.com/docs/guides/platform/clone-project`

Use in-place restore only when you explicitly accept downtime and database-level data loss between the restore point and now.

## Storage Backup

For AstraLink, database backup is not enough because private user media is stored in:

- `user-photos`
- `chat-media`

These files are now exported separately by `backend/src/scripts/backup.storage.ts`, which:

- reads bucket metadata from `storage.buckets`
- reads object metadata from `storage.objects`
- downloads raw files into a local backup directory
- writes bucket manifests for later restore

Example output structure:

```text
backups/
  storage/
    storage_20260424_123456/
      buckets.json
      manifest.json
      user-photos/
        _objects.json
        <files...>
      chat-media/
        _objects.json
        <files...>
```

At the current stage the minimal rule is:

- if a release touches media flows or you care about preserving current test media, export both buckets before the change
- if data is disposable, document that the backup is database-only and storage can be re-uploaded

When production usage starts, add a dedicated storage export job for both buckets.

## Delete-Account Coverage

Current backend delete flow removes:

- charts
- connections
- dating matches
- subscriptions
- messages
- likes
- matches
- user devices
- compatibility cache
- user profiles
- user photos metadata
- payments
- feature usage
- user blocks
- user reports
- public profile rows
- `public.users`
- Supabase Storage objects in both `user-photos` and `chat-media`
- Supabase Auth user

Source of truth:

- [user.service.ts](/home/andreiya/WebstormProjects/AstraLink/backend/src/user/user.service.ts:728)

## Recommended Next Upgrade

When AstraLink starts holding production-value data:

1. enable `PITR`
2. verify restore in a separate project
3. automate Storage export for `user-photos` and `chat-media`
4. add a pre-release backup checklist
5. decide retention for backups and account deletion evidence
