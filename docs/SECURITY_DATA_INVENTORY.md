# AstraLink Security Data Inventory

## Scope

This document tracks where AstraLink stores user data, how sensitive each data set is, and which storage layers need hardening first.

Project:

- Supabase project ref: `ayoucajwdyinyhamousz`
- Primary app layers: `backend`, `frontend`, `Supabase Postgres`, `Supabase Storage`, `Redis`, local mobile storage

## Data Classes

- `public`: safe to expose to authenticated users
- `confidential`: account and app data that should stay limited to the owner or backend services
- `sensitive`: intimate profile, dating, natal, AI, chat, device, or media data

## Storage Map

| Entity              | Storage                                             | Key Fields                                                                       | Classification            | Owner            | Notes                                                         |
| ------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------- | ---------------- | ------------------------------------------------------------- |
| User account        | `public.users`                                      | `email`, `birth_date`, `birth_time`, `birth_place`, `role`                       | `sensitive`               | `id`             | Contains direct identifiers and intimate birth data           |
| Public profile      | `public.public_profiles`                            | `name`, `zodiac_sign`, `city`, `primary_photo_path`                              | `public` / `confidential` | `user_id`        | Visible profile surface                                       |
| Extended profile    | `public.user_profiles`                              | `bio`, `gender`, `city`, `latitude`, `longitude`, `preferences`, `looking_for*`  | `confidential`            | `user_id`        | Includes dating preferences and geo data                      |
| Natal chart         | `public.charts`                                     | `data`, `ai_generated_at`                                                        | `sensitive`               | `user_id`        | Holds natal JSON and AI narrative data                        |
| Subscription        | `public.subscriptions`                              | `tier`, `expires_at`, `trial_ends_at`, `is_cancelled`                            | `confidential`            | `user_id`        | Backend-owned billing state                                   |
| User photos         | `public.user_photos` + Storage bucket `user-photos` | `storage_path`, `is_primary`                                                     | `sensitive`               | `user_id`        | Profile photos and chat media currently share the same bucket |
| Connections         | `public.connections`                                | `target_name`, `target_data`                                                     | `sensitive`               | `user_id`        | Stores user-created relationship/natal data                   |
| Dating cache        | `public.dating_matches`                             | `candidate_data`, `compatibility`, `liked`, `rejected`                           | `sensitive`               | `user_id`        | Derived but still intimate user data                          |
| Likes               | `public.likes`                                      | `user_id`, `target_user_id`, `action`                                            | `sensitive`               | `user_id`        | Dating actions                                                |
| Matches             | `public.matches`                                    | `user_a`, `user_b`, `status`                                                     | `sensitive`               | participants     | Match graph between users                                     |
| Messages            | `public.messages`                                   | `match_id`, `sender_id`, `recipient_id`, `content`, `attachment_path`, `read_at` | `sensitive`               | participants     | Private chat content and media pointers                       |
| Blocks              | `public.user_blocks`                                | `user_id`, `blocked_user_id`                                                     | `confidential`            | `user_id`        | Safety state                                                  |
| Reports             | `public.user_reports`                               | `reporter_id`, `reported_user_id`, `reason`                                      | `confidential`            | `reporter_id`    | Moderation input                                              |
| Devices             | `public.user_devices`                               | `push_token`, `platform`                                                         | `sensitive`               | `user_id`        | Mobile notification tokens                                    |
| Compatibility cache | `public.compatibility_scores`                       | `person_a`, `person_b`, `score`, `summary`, `breakdown`                          | `sensitive`               | participant pair | Derived dating compatibility data                             |

## Non-Database Storage

| Layer              | Current Use                                                                                   | Risk                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `Supabase Storage` | Bucket `user-photos` stores profile photos and chat attachments                               | Shared bucket increases blast radius if policies are wrong                                           |
| `Redis`            | Subscription cache, horoscope cache, signed URL cache, compatibility and chat hiding state    | Must not become long-lived PII storage                                                               |
| `SecureStore`      | Mobile token cache, native Supabase auth session storage, and native onboarding draft storage | Correct direction for auth/session data on native                                                    |
| `AsyncStorage`     | Local app settings, web auth storage fallback, lightweight non-sensitive state                | Sensitive chart persistence was removed; remaining user-scoped caches still need review case by case |
| Backend logs       | Auth, SQL debug, service logs                                                                 | Current risk for token, email, and birth-data leakage                                                |

## Code Entry Points

Primary backend readers/writers:

- `backend/src/supabase/supabase.service.ts`
- `backend/src/user/user.service.ts`
- `backend/src/chat/chat.service.ts`
- `backend/src/dating/dating.service.ts`
- `backend/src/user/user-photos.service.ts`

Primary frontend storage/auth points:

- `frontend/src/services/tokenService.ts`
- `frontend/src/services/supabase.ts`
- `frontend/src/services/horoscope-cache.ts`

## Current Security Findings

1. `public.user_photos` no longer uses an unconditional bypass policy; service-role access is now explicitly scoped to the `service_role` role.
2. Postgres functions flagged by Supabase advisors now use a fixed `search_path`.
3. Legacy broad `messages` policies were removed; only match-aware select/insert policies remain.
4. Native auth storage and onboarding draft storage are now on `SecureStore`.
5. Sensitive chart store persistence was removed, and horoscope screen cache no longer persists on native devices.
6. Delete-account flow now removes chat, dating, device, compatibility, and storage remnants in addition to core profile data.
7. Sensitive data still exists in plain relational storage today:
   `birth_date`, `birth_time`, `birth_place`, `charts.data`, chat content, dating cache, and device push tokens.

## Priority Order

1. Tighten `RLS` and function security in Supabase
2. Remove sensitive data from logs and debug output
3. Move mobile auth/session storage fully to secure storage
4. Review delete-account coverage for chat, dating, photos, and caches
5. Add simple backup and restore playbook for database plus storage

## Out of Scope for Phase 1

- PITR enablement
- App-level encryption for sensitive columns
- Formal retention policy
- Production-grade disaster recovery drills
