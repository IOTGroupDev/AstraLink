import sanitizeHtml from 'sanitize-html';

/**
 * Sanitization options for different input types
 */
export const SANITIZE_OPTIONS = {
  /**
   * Strict: No HTML allowed, only plain text
   * Use for: names, titles, short text fields
   */
  strict: {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'escape',
  },

  /**
   * Basic: Very limited HTML for formatting
   * Use for: bio, descriptions
   */
  basic: {
    allowedTags: ['b', 'i', 'em', 'strong', 'br', 'p'],
    allowedAttributes: {},
    disallowedTagsMode: 'escape',
  },

  /**
   * None: Remove all HTML completely
   * Use for: URLs, email addresses
   */
  none: {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'recursiveEscape',
  },
} as const;

/**
 * Sanitize HTML input
 * @param dirty - Input that may contain malicious HTML
 * @param options - Sanitization options (default: strict)
 * @returns Sanitized string
 */
export function sanitizeInput(
  dirty: string | null | undefined,
  options: keyof typeof SANITIZE_OPTIONS = 'strict',
): string {
  if (!dirty) return '';

  const config = SANITIZE_OPTIONS[options];
  return sanitizeHtml(dirty.trim(), config);
}

/**
 * Sanitize multiple inputs
 */
export function sanitizeInputs<T extends Record<string, any>>(
  inputs: T,
  config: Partial<Record<keyof T, keyof typeof SANITIZE_OPTIONS>> = {},
): T {
  const result: any = { ...inputs };

  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value === 'string') {
      const optionKey = config[key as keyof T] || 'strict';
      result[key] = sanitizeInput(value, optionKey);
    }
  }

  return result;
}
