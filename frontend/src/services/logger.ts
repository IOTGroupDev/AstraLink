/**
 * Logger Service for React Native
 *
 * Usage:
 *   import { logger } from '@/services/logger';
 *
 *   logger.log('Message', data);
 *   logger.warn('Warning', error);
 *   logger.error('Error occurred', error);
 *   logger.debug('Debug info', details);
 *
 * Features:
 * - Automatically disabled in production (unless __DEV__ === true)
 * - Color-coded console output with emojis
 * - Context prefixes for easier debugging
 * - Error stack traces
 * - Type-safe
 */

type LogLevel = 'log' | 'warn' | 'error' | 'debug' | 'info';

interface LoggerOptions {
  enabled?: boolean;
  prefix?: string;
}

const SENSITIVE_KEYS = new Set([
  'access_token',
  'accesstoken',
  'authorization',
  'birthdate',
  'birthplace',
  'birthtime',
  'code',
  'email',
  'idtoken',
  'identitytoken',
  'latitude',
  'longitude',
  'password',
  'refresh_token',
  'refreshtoken',
  'session',
  'token',
  'userid',
]);

function redactString(value: string): string {
  return value
    .replace(/(Bearer\s+)[^\s,]+/gi, '$1[REDACTED]')
    .replace(
      /([?&#](?:access_token|refresh_token|token|code|id_token)=)[^&#\s]+/gi,
      '$1[REDACTED]'
    )
    .replace(
      /("(?:access_token|refresh_token|token|code|idToken|identityToken|email|birthDate|birthTime|birthPlace|userId)"\s*:\s*")[^"]*(")/gi,
      '$1[REDACTED]$2'
    );
}

function sanitizeLogValue(
  value: unknown,
  seen = new WeakSet<object>()
): unknown {
  if (typeof value === 'string') {
    return redactString(value);
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
    };
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEYS.has(key.toLowerCase())
        ? '[REDACTED]'
        : sanitizeLogValue(item, seen),
    ])
  );
}

class Logger {
  private enabled: boolean;
  private prefix: string;

  constructor(options: LoggerOptions = {}) {
    // Logging disabled globally for performance
    // To re-enable: logger.setEnabled(true) or use __enableConsole()
    this.enabled = options.enabled ?? false;
    this.prefix = options.prefix ?? '';
  }

  /**
   * General log message
   */
  log(message: string, ...args: unknown[]): void {
    this.write('log', '📝', message, ...args);
  }

  /**
   * Info message (same as log but with blue color)
   */
  info(message: string, ...args: unknown[]): void {
    this.write('info', 'ℹ️', message, ...args);
  }

  /**
   * Warning message
   */
  warn(message: string, ...args: unknown[]): void {
    this.write('warn', '⚠️', message, ...args);
  }

  /**
   * Error message
   */
  error(message: string, ...args: unknown[]): void {
    this.write('error', '❌', message, ...args);
  }

  /**
   * Debug message (verbose)
   */
  debug(message: string, ...args: unknown[]): void {
    this.write('debug', '🐛', message, ...args);
  }

  /**
   * Internal write method
   */
  private write(
    level: LogLevel,
    emoji: string,
    message: string,
    ...args: unknown[]
  ): void {
    if (!this.enabled) {
      return;
    }

    const prefix = this.prefix ? `[${this.prefix}] ` : '';
    const fullMessage = redactString(`${emoji} ${prefix}${message}`);
    const safeArgs = args.map((arg) => sanitizeLogValue(arg));

    // Use appropriate console method
    const consoleFn = console[level] || console.log;

    if (safeArgs.length > 0) {
      consoleFn(fullMessage, ...safeArgs);
    } else {
      consoleFn(fullMessage);
    }
  }

  /**
   * Create a child logger with a specific prefix/context
   */
  createContext(contextName: string): Logger {
    return new Logger({
      enabled: this.enabled,
      prefix: this.prefix ? `${this.prefix}:${contextName}` : contextName,
    });
  }

  /**
   * Enable/disable logging at runtime
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for creating custom loggers
export { Logger };

// Convenience exports for specific contexts
export const authLogger = logger.createContext('Auth');
export const apiLogger = logger.createContext('API');
export const chartLogger = logger.createContext('Chart');
export const supabaseLogger = logger.createContext('Supabase');
export const navigationLogger = logger.createContext('Navigation');
export const storageLogger = logger.createContext('Storage');
