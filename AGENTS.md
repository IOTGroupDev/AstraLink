# AGENTS.md — AstraLink

## Project

AstraLink is a React Native Expo mobile astrology/social/dating app with NestJS backend, Prisma ORM, PostgreSQL/Supabase, Redis cache, and Swiss Ephemeris calculations.

## Main rule

Do not rewrite the whole project unless explicitly asked.
Make minimal, safe, incremental changes.

## Stack

- Frontend: React Native, Expo SDK 54, TypeScript
- Backend: NestJS, Prisma, PostgreSQL/Supabase
- Auth: Supabase Auth, JWT/Bearer token
- Cache: Redis
- Astrology: Swiss Ephemeris / ephe files
- Deployment: Docker / Dokploy / EAS Build

## Coding style

- Use TypeScript everywhere.
- Prefer small services/controllers/modules.
- Keep DTOs typed and Swagger-friendly.
- Do not use `any` unless unavoidable.
- Do not remove existing business logic without explaining why.
- Do not rename routes, env vars, DB columns, or modules unless required.

## Backend rules

- Respect existing NestJS module structure:
  - auth
  - user
  - chart
  - connections
  - dating
  - subscription
  - services
  - supabase
- Use guards for protected routes.
- Always check Authorization header behavior.
- Prisma with Supabase pooler may require PgBouncer-safe configuration.
- Avoid creating multiple PrismaClient instances.
- Be careful with UUID/text mismatches in Supabase tables.

## Frontend rules

- Respect existing navigation structure.
- Do not break onboarding flow.
- Keep token/session persistence compatible with AsyncStorage.
- Protected API calls must attach Bearer token.
- Avoid large UI rewrites unless asked.
- Keep screens mobile-first and safe-area aware.

## Astrology rules

- Do not fake astrology calculations.
- Swiss Ephemeris is the preferred source for precise natal/transit calculations.
- Check ephe file paths and availability before changing calculation code.
- If changing astrology logic, explain expected impact on natal chart, transits, or horoscope output.

## Auth rules

- Supabase Auth is the source of truth.
- Handle magic link / OTP / deep link flows carefully.
- Do not create a second unrelated auth system.
- Keep onboarding separate from authentication:
  - existing authenticated user should not repeat onboarding unless profile incomplete
  - account deletion must clear DB user data and local storage

## Docker / DevOps rules

- Prefer production-safe Dockerfiles.
- Do not assume local `/usr/games/stockfish` or host binaries.
- Node/native module compatibility matters.
- Redis/Postgres service names must match docker-compose.
- Do not expose secrets in generated files.

## EAS / iOS rules

- Do not change bundle identifier unless asked.
- Preserve EAS project configuration.
- Be careful with provisioning profiles and App Store Connect roles.
- Expo Go is not production; production builds use EAS.

## How to answer

When making changes:

1. Explain the problem briefly.
2. Show only changed files.
3. Provide complete copy-pasteable files when requested.
4. Include commands to run.
5. Mention risks or migrations.
6. Do not invent files that are not needed.

## Testing

Before finishing, suggest relevant checks:

- npm run build
- npm run lint
- npx prisma generate
- npx prisma migrate dev/deploy
- docker compose up --build
- eas build --platform ios

## Forbidden

- Do not delete large parts of the app.
- Do not silently change database schema.
- Do not hardcode secrets.
- Do not replace Supabase Auth with custom auth.
- Do not remove Redis/Prisma/Supabase integration unless asked.
- Do not give vague advice when exact code is possible.
