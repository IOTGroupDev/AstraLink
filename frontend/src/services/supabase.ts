// Frontend Supabase client is intentionally disabled.
// Per AstraLink rules, the mobile/web app must call our NestJS backend only.
// If this module gets imported accidentally, it will throw at runtime to prevent misuse.

const DISABLED_MSG =
  'Supabase client is disabled on the frontend. Use backend REST API wrappers in src/services/api.ts';

type AnyRecord = Record<string, unknown>;

export const supabase = new Proxy<AnyRecord>({} as AnyRecord, {
  get() {
    throw new Error(DISABLED_MSG);
  },
  apply() {
    throw new Error(DISABLED_MSG);
  },
}) as any;

// Note:
// - Keep this file present so legacy imports compile, but guard all access.
// - All authentication and data access must go through our backend endpoints
//   implemented in the NestJS service.
