/**
 * Utility functions for parsing user preferences and interests
 */

export interface UserPreferences {
  interests?: string[];
  ageRange?: {
    min: number;
    max: number;
  };
  location?: string;
  gender?: string;
  [key: string]: unknown;
}

/**
 * Safely parses user preferences from various formats
 * Handles: JSON string, object, comma-separated string
 *
 * @param prefsRaw - Raw preferences data (string | object | null)
 * @returns Parsed interests array or undefined
 */
export function parseInterests(
  prefsRaw: string | object | null | undefined,
): string[] | undefined {
  if (!prefsRaw) return undefined;

  let prefsObj: UserPreferences | null = null;

  // 1. Try to parse as JSON string
  if (typeof prefsRaw === 'string') {
    try {
      prefsObj = JSON.parse(prefsRaw) as UserPreferences;
    } catch {
      // If JSON parse fails, try comma-separated string
      const splitted = prefsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (splitted.length > 0) {
        return splitted;
      }
    }
  } else if (typeof prefsRaw === 'object') {
    prefsObj = prefsRaw as UserPreferences;
  }

  // 2. Extract interests from parsed object
  if (prefsObj && typeof prefsObj === 'object') {
    const interests = prefsObj.interests;

    if (Array.isArray(interests)) {
      // Filter to only string values
      return interests.filter((x): x is string => typeof x === 'string');
    } else if (interests && typeof interests === 'string') {
      // Parse comma-separated string
      const splitted = (interests as string)
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      if (splitted.length > 0) {
        return splitted;
      }
    }
  }

  return undefined;
}

/**
 * Parses complete user preferences object
 *
 * @param prefsRaw - Raw preferences data
 * @returns Parsed preferences object
 */
export function parsePreferences(
  prefsRaw: string | object | null | undefined,
): UserPreferences {
  if (!prefsRaw) return {};

  if (typeof prefsRaw === 'string') {
    try {
      return JSON.parse(prefsRaw) as UserPreferences;
    } catch {
      return {};
    }
  }

  if (typeof prefsRaw === 'object') {
    return prefsRaw as UserPreferences;
  }

  return {};
}
