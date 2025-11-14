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

class Logger {
  private enabled: boolean;
  private prefix: string;

  constructor(options: LoggerOptions = {}) {
    // Only enable logging in development mode
    this.enabled = options.enabled ?? __DEV__;
    this.prefix = options.prefix ?? '';
  }

  /**
   * General log message
   */
  log(message: string, ...args: any[]): void {
    this.write('log', '📝', message, ...args);
  }

  /**
   * Info message (same as log but with blue color)
   */
  info(message: string, ...args: any[]): void {
    this.write('info', 'ℹ️', message, ...args);
  }

  /**
   * Warning message
   */
  warn(message: string, ...args: any[]): void {
    this.write('warn', '⚠️', message, ...args);
  }

  /**
   * Error message
   */
  error(message: string, ...args: any[]): void {
    this.write('error', '❌', message, ...args);
  }

  /**
   * Debug message (verbose)
   */
  debug(message: string, ...args: any[]): void {
    this.write('debug', '🐛', message, ...args);
  }

  /**
   * Internal write method
   */
  private write(level: LogLevel, emoji: string, message: string, ...args: any[]): void {
    if (!this.enabled) {
      return;
    }

    const prefix = this.prefix ? `[${this.prefix}] ` : '';
    const fullMessage = `${emoji} ${prefix}${message}`;

    // Use appropriate console method
    const consoleFn = console[level] || console.log;

    if (args.length > 0) {
      consoleFn(fullMessage, ...args);
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
