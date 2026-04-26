# AstraLink Data Retention Policy

Last updated: `2026-04-26`

This is the operational retention baseline before live users. Shorten these windows before production if legal review requires stricter limits.

## Retention Windows

| Data class                         | Storage                                          | Retention                                                                                                 | Cleanup rule                                                                                                                                  |
| ---------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend application logs           | Docker/Dokploy host logs                         | 14 days                                                                                                   | Rotate logs; do not retain auth tokens, email bodies, raw birth data, chat content, or AI prompts in logs                                     |
| Redis subscription/status caches   | Redis                                            | 1 hour or existing service TTL                                                                            | Keep derived state only; no raw birth data, email, chat bodies, or tokens                                                                     |
| Redis signed URL cache             | Redis                                            | Less than source signed URL expiry, currently max 15 minutes for photos and `expiresInSec - 60` elsewhere | Expire automatically                                                                                                                          |
| Redis synastry/compatibility cache | Redis                                            | 7 days                                                                                                    | Store derived compatibility only; no copied user email or birth fields                                                                        |
| Bull compatibility jobs            | Redis                                            | Until processed, then queue history only                                                                  | Job payloads must contain chart ids only; run `npm run cleanup:compatibility-queue -- --confirm` after deploying the minimized payload format |
| Redis horoscope/AI cache           | Redis                                            | Existing service TTL, target max 24 hours unless product explicitly needs longer                          | Do not store raw prompts containing sensitive profile fields                                                                                  |
| AI artifacts in `charts.data`      | Postgres `public.charts`                         | Account lifetime, deleted on account deletion                                                             | Treat as sensitive natal/AI data                                                                                                              |
| Dating cache                       | Postgres `public.dating_matches`                 | 24 hours for generated candidate cache                                                                    | Regenerate on demand; `candidate_data` must contain only `partnerId`, `partnerName`, and `sign`                                               |
| Chat content and attachments       | Postgres `public.messages`, Storage `chat-media` | Account lifetime or until user deletion/moderation deletion                                               | Delete participant data during account deletion according to current backend flow                                                             |
| Backup archives                    | Server backup directory / external backup store  | 30 days for current stage                                                                                 | Encrypt at rest when moved off-host; never copy to preview/dev                                                                                |
| Local mobile auth session          | SecureStore                                      | Until logout/account deletion/session expiry                                                              | Clear on logout and account deletion                                                                                                          |
| Local mobile non-sensitive cache   | AsyncStorage / in-memory caches                  | 7 days max unless feature-specific TTL is shorter                                                         | Do not persist birth data, chart data, chat bodies, or tokens in AsyncStorage                                                                 |

## Current Cutover Rule

- `DATA_ENCRYPTION_KEY` must be set before birth data writes.
- `BIRTH_DATA_WRITE_PLAINTEXT=false` or unset means encrypted-only writes.
- `BIRTH_DATA_WRITE_PLAINTEXT=true` is a temporary rollback/dual-write mode only.
- Plaintext `public.users.birth_date`, `birth_time`, and `birth_place` may be cleared only after backfill verification.

## Checks

Run before release:

```bash
cd backend
npm run backfill:birth-encryption
npm run cleanup:birth-plaintext -- --dry-run
```

Run actual cleanup only after the dry run has zero blocked rows.
