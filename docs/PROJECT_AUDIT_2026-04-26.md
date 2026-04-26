# AstraLink Audit - 2026-04-26

## Scope

Static audit of the React Native Expo frontend, NestJS backend, Prisma/Supabase/Postgres data layer, Redis cache, AI astrology flows, Docker/EAS configuration, and App Store readiness. This audit does not replace runtime penetration testing, App Store Connect metadata review, or legal review.

## Executive Summary

AstraLink has a solid baseline: Supabase Auth is the source of truth, protected backend routes generally use guards, DTO validation is enabled globally, Helmet/CORS are configured, account deletion exists, birth-data encryption work is in progress, and recent AI caching changes reduce repeated AI calls.

The largest remaining risks are:

1. Subscription upgrades still support `mock` payment in the production API path.
2. App Store subscription compliance is not ready until Apple IAP receipt/transaction validation is implemented.
3. Sensitive birth/profile data is still logged in some auth/onboarding flows.
4. Public proxy endpoints and Swagger need production hardening.
5. The iOS app config still uses test naming/bundle identifiers.
6. Privacy/App Store metadata must explicitly disclose astrology birth data, location, photos, chat, dating profile data, AI processing, push tokens, and third-party providers.

## Critical / High Findings

### AUD-001 - Mock Subscription Upgrade Is Reachable

- Severity: Critical
- Location: `backend/src/subscription/subscription.controller.ts:180`, `backend/src/subscription/subscription.controller.ts:197`
- Evidence: `/subscription/upgrade` accepts `paymentMethod: 'mock'` and defaults invalid/missing payment method to `mock`.
- Impact: Any authenticated user can potentially activate paid tiers without App Store purchase validation.
- Fix: Disable `mock` in production. Implement Apple StoreKit transaction validation, server-side entitlement state, and webhook/polling reconciliation.

### AUD-002 - App Store IAP Compliance Gap

- Severity: Critical for App Store release
- Location: `backend/src/subscription/subscription.service.ts` payment flow
- Evidence: `apple` and `google` methods currently throw unsupported errors; `mock` is the implemented payment path.
- Impact: Digital premium features must use Apple IAP unless a specific App Store exception applies. Current production monetization would likely be rejected.
- Fix: Implement StoreKit 2 purchase flow on iOS, backend transaction verification with Apple App Store Server API, subscription renewal/cancellation handling, restore purchases, and entitlement sync.

### AUD-003 - Sensitive Birth Data Logged During Signup Completion

- Severity: High
- Location: `backend/src/auth/supabase-auth.service.ts:411`
- Evidence: logs `JSON.stringify(dto)`, which can include name, birth date, birth time, and birth place.
- Impact: Birth data is sensitive personal data. Logs can become a long-lived secondary data store and violate privacy commitments.
- Fix: Remove payload logging or redact fields. Keep only event id/user id and validation status.

### AUD-004 - OAuth URL Logged

- Severity: High
- Location: `backend/src/auth/supabase-auth.service.ts:56`
- Evidence: generated OAuth URL is logged.
- Impact: OAuth URLs may contain state/redirect information and should not be logged in production.
- Fix: Log only provider and success status.

### AUD-005 - Public Geo Proxy Has No Visible Rate Limit

- Severity: High
- Location: `backend/src/modules/geo/geo.controller.ts:12`, `backend/src/modules/geo/geo.service.ts:115`
- Evidence: public `/geo/cities` calls Nominatim directly; no route-specific rate limit is visible.
- Impact: Abuse can burn external quota, degrade onboarding, and cause Nominatim blocking.
- Fix: Add Redis-backed IP/device rate limiting, minimum query length, response caching, debounce expectations, and provider timeout/backoff.

### AUD-006 - Public Test Endpoint Exists

- Severity: High
- Location: `backend/src/chart/chart.controller.ts:399`
- Evidence: `@Public()` test endpoint for chart calculations.
- Impact: Public diagnostic endpoints can reveal behavior, increase attack surface, and consume CPU-heavy astrology calculations.
- Fix: Remove or protect with `DevOnlyGuard`.

## Medium Findings

### AUD-007 - Swagger Is Enabled Unconditionally

- Severity: Medium
- Location: `backend/src/main.ts:150`
- Evidence: `SwaggerModule.setup('api/docs', app, document)` always runs.
- Impact: Public API docs help attackers enumerate routes and payload shapes.
- Fix: Enable only outside production or behind admin/basic auth/IP allowlist.

### AUD-008 - HSTS Preload Is Enabled In App Code

- Severity: Medium
- Location: `backend/src/main.ts:106`
- Evidence: Helmet enables HSTS with `preload: true`.
- Impact: HSTS preload is operationally risky if all subdomains and TLS posture are not permanently ready.
- Fix: Move HSTS policy to edge/proxy after domain validation; disable `preload` until intentionally submitted to preload list.

### AUD-009 - Token Storage Falls Back To AsyncStorage On Web

- Severity: Medium
- Location: `frontend/src/services/tokenService.ts:176`
- Evidence: web stores token in AsyncStorage.
- Impact: Acceptable for Expo web fallback only if web is not production auth surface; vulnerable to XSS/local compromise.
- Fix: If web is supported, prefer httpOnly cookie session/BFF or disable web auth build.

### AUD-010 - Frontend Logs Request URLs And Auth Flow Details

- Severity: Medium
- Location: `frontend/src/services/api/client.ts:69`, `frontend/src/services/api/client.ts:168`
- Evidence: logs API base URL, protected request URL, token attachment event.
- Impact: Logs can expose route usage and user behavior; less severe than token logging, but should be reduced in production.
- Fix: Ensure logger strips output in production or logs only high-level event names.

### AUD-011 - AI Content Cache Needs Deletion Coverage

- Severity: Medium
- Location: `backend/src/user/user.service.ts:734`
- Evidence: account deletion deletes many tables, but newly added `ai_content_cache` should be included.
- Impact: Deleted users could leave AI horoscope/main-transit artifacts in DB.
- Fix: Add `aiContentCache.deleteMany({ where: { userId } })` to delete transaction and update data inventory.

### AUD-012 - App Config Still Uses Test Branding/Bundle ID

- Severity: Medium for release
- Location: `frontend/app.json:3`, `frontend/app.json:17`
- Evidence: `name: AstraLinkTest`, `bundleIdentifier: astralink.test`.
- Impact: App Store submission should use final app name and stable bundle id.
- Fix: Set production bundle id, display name, SKU, support URLs, privacy policy URL, and App Store metadata consistently.

## Data Correctness Findings

### AUD-013 - Astrology/AI Data Layer Is Improving But Needs Clear Source Labels

- Severity: Medium
- Evidence: system mixes interpreter, AI, Redis cache, and persistent AI cache.
- Impact: Users and support need to know whether a text is AI-generated, cached, or rule-based.
- Fix: Standardize `generatedBy`, `source`, `promptVersion`, `chartFingerprint`, and `locale` across natal interpretation, horoscope, main transit, advisor, personal code.

### AUD-014 - AI Cache Invalidation Should Include Account Deletion And Birth Data Changes

- Severity: Medium
- Evidence: horoscope Redis invalidation exists; persistent AI cache was added and must be covered in user deletion and chart recalculation flows.
- Impact: stale AI content may survive after profile changes or deletion.
- Fix: Delete `ai_content_cache` by `userId` on account deletion; optionally delete by old `chartFingerprint` on birth data change.

### AUD-015 - Monthly Horoscope Semantics Need Product Decision

- Severity: Low/Medium
- Evidence: monthly was optimized as rolling cache.
- Impact: UX copy must match behavior: "на ближайший месяц" vs "на календарный месяц".
- Fix: Update UI copy and API metadata.

## Architecture Findings

### Strengths

- NestJS module boundaries are mostly clear.
- Supabase Auth is consistently used.
- Prisma is centralized through `PrismaService`.
- Redis is used for hot cache and rate limiting.
- Account deletion exists and uses a transaction for DB records.
- Birth-data encryption work is present.

### Weaknesses

- `ChartService` and `NatalChartService` remain large facades; AI caching, locale handling, persistence, and interpretation orchestration are concentrated there.
- Subscription/payment is not a real entitlement system yet.
- AI artifacts now live in two places: chart JSON for natal and `ai_content_cache` for dynamic content. This is reasonable, but needs repository/service abstraction.
- Several legacy/parallel controllers exist (`chart`, `natal`, `swiss`, `ai`) and should be reviewed for duplication and guard consistency.

## Recommended Technical Roadmap

### P0 Before Any App Store Release

1. Remove/disable production mock subscriptions.
2. Implement Apple IAP validation and restore purchases.
3. Remove sensitive DTO/OAuth URL logs.
4. Protect/remove public test endpoint and production Swagger.
5. Add `ai_content_cache` deletion to account deletion.
6. Finalize `frontend/app.json` production app name, bundle id, privacy strings, permissions, and review metadata.

### P1 Security And Data Reliability

1. Add route-specific Redis rate limits for public endpoints: geo, auth, OTP, OAuth URL generation.
2. Add production log redaction middleware/helper for email, token, birth date/time/place, URLs with query params.
3. Add retention cleanup job for expired `ai_content_cache` rows.
4. Add tests for account deletion coverage across new cache tables.
5. Add audit trail for subscription entitlement changes.

### P2 Architecture

1. Introduce `AiContentCacheService` instead of direct Prisma calls in horoscope/transit.
2. Split `NatalChartService` into `NatalCalculationService`, `NatalInterpretationCacheService`, and `NatalAiNarrativeService`.
3. Standardize DTOs for all query params instead of ad hoc parsing.
4. Add OpenAPI auth to Swagger only in non-prod/staging protected mode.
5. Add background queue for AI prewarm rather than fire-and-forget promises.

## Feature Suggestions

1. Explainability panel: show "based on natal chart + transits + lunar context", without exposing raw internals.
2. Restore purchases and subscription management entry points.
3. Privacy dashboard: export data, delete data, revoke AI personalization, clear local cache.
4. AI personalization controls: "use birth place/time for deeper personalization" toggle if legal/product wants explicit consent.
5. Safety disclaimer: astrology is entertainment/self-reflection, not medical/financial/legal advice.
6. Content report/block flows already exist; add moderation queue/admin tooling.
7. Data export endpoint for GDPR/CCPA readiness.
8. Push notification preference center with granular categories.

## App Store Readiness

Based on Apple official guidance reviewed on 2026-04-26:

- Apps with account creation must let users initiate account deletion in-app. AstraLink has an account deletion flow, but backend deletion must include the new AI cache table.
- App privacy details are required in App Store Connect and must include data collected by the app and third-party partners.
- Privacy policy URL is required for iOS apps.
- Apps using third-party/social login for a primary account must offer an equivalent login option with privacy-friendly properties; AstraLink has Apple Sign-In enabled, which is good.
- In-app purchases must be complete, reviewable, and functional during App Review. Current mock subscription is not acceptable for production.
- If login is required, App Review needs demo account info or an approved demo mode.

### Likely App Privacy Labels

Likely collected and linked to user:

- Contact info: email, name.
- Sensitive/user profile data: birth date, birth time, birth place, gender, preferences, bio.
- Location/coarse location: birth place coordinates/timezone, city.
- User content: profile photos, chat messages, reports.
- Identifiers: Supabase user id, push token/device id.
- Purchases: subscription tier/payment records once IAP is implemented.
- Usage data: feature usage, advisor limits, analytics.
- Diagnostics: logs/errors if Sentry or equivalent is enabled.

Declare AI/third-party subprocessors if birth/profile/chat/advisor data is sent to OpenAI/Anthropic/DeepSeek or any AI provider.

## Verification Commands

```bash
cd backend
npm run build
npm test -- --runTestsByPath src/chart/services/natal-chart.service.spec.ts src/common/utils/user-local-date.util.spec.ts src/common/utils/daily-astro-context.util.spec.ts
npx prisma generate
npx prisma migrate deploy
```

## Known Test Gap

`src/chart/chart.service.spec.ts` currently fails at compile time due to existing typed Prisma mocks using `mockResolvedValue`/`mockRejectedValue` directly on typed Prisma methods. This should be fixed separately so broader service tests can run reliably.
