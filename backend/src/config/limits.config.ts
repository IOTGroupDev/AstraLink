/**
 * Centralized feature limits and TTL helpers
 * All per-day limits are UTC-based.
 */

export const LIMITS = {
  HOROSCOPE: {
    // Max AI horoscope generations per user per UTC day
    AI_DAILY_PER_USER: 1,
  },
  ADVISOR: {
    // Daily per user request limits
    PREMIUM_DAILY: 30,
    MAX_DAILY: 50,
  },
  TIME_MACHINE: {
    // Daily per user request limits (transit interpretation with AI)
    PREMIUM_DAILY: 30,
    MAX_DAILY: 50,
  },
} as const;

/**
 * Seconds until end of provided UTC date (default: now)
 * End means the next day's 00:00:00.000Z
 */
export function secondsUntilEndOfUTCDate(from: Date = new Date()): number {
  const end = new Date(
    Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate() + 1,
      0,
      0,
      0,
    ),
  );
  return Math.max(60, Math.floor((end.getTime() - from.getTime()) / 1000));
}

/**
 * YYYY-MM-DD in UTC for a given date (default: now)
 */
export function utcDayKey(from: Date = new Date()): string {
  return new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  )
    .toISOString()
    .split('T')[0];
}
