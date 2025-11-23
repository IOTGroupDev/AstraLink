/**
 * Utility functions for flexible database column mapping
 * Handles schema drift and naming convention variations
 */

/**
 * Picks the first existing key from a list of candidates
 *
 * @param obj - Object to search in
 * @param keys - Array of candidate key names
 * @returns First matching key or undefined
 */
export function pickKey<T extends Record<string, unknown>>(
  obj: T,
  keys: string[],
): string | undefined {
  return keys.find((k) => obj && Object.prototype.hasOwnProperty.call(obj, k));
}

/**
 * Gets value from object using first matching key from candidates
 *
 * @param obj - Object to get value from
 * @param keys - Array of candidate key names
 * @param defaultValue - Default value if no key matches
 * @returns Value from first matching key or default
 */
export function getValue<T extends Record<string, unknown>, V = unknown>(
  obj: T,
  keys: string[],
  defaultValue: V | null = null,
): V | null {
  const key = pickKey(obj, keys);
  return key !== undefined ? (obj[key] as V) : defaultValue;
}

/**
 * Filters list of keys to only those that exist in a Set
 *
 * @param candidates - Array of candidate key names
 * @param existing - Set of existing column names
 * @returns Filtered array or original if no matches
 */
export function preferExisting(
  candidates: string[],
  existing: Set<string>,
): string[] {
  const present = candidates.filter((c) => existing.has(c));
  return present.length > 0 ? present : candidates;
}

/**
 * Normalizes a date value to ISO string
 *
 * @param value - Date value (string, Date, or unknown)
 * @param fallback - Fallback date if conversion fails
 * @returns ISO date string
 */
export function normalizeDate(
  value: unknown,
  fallback: Date = new Date(),
): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value) {
    try {
      return new Date(value as string | number).toISOString();
    } catch {
      return fallback.toISOString();
    }
  }
  return fallback.toISOString();
}

/**
 * Checks if a string is an absolute URL
 *
 * @param value - String to check
 * @returns True if value is an absolute HTTP(S) URL
 */
export function isAbsoluteUrl(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  return /^https?:\/\//i.test(value);
}
