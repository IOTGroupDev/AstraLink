/**
 * Logger Service for NestJS Backend
 *
 * Wrapper around NestJS Logger with production-safe defaults
 *
 * Usage:
 *   import { AppLogger } from '@/common/logger.service';
 *
 *   const logger = new AppLogger('ContextName');
 *   logger.log('Message', data);
 *   logger.warn('Warning', error);
 *   logger.error('Error occurred', error);
 *   logger.debug('Debug info', details);
 *
 * Features:
 * - Uses NestJS Logger under the hood
 * - Production-safe (debug logs only in development)
 * - Context support
 * - Automatic stack traces for errors
 */

import { Logger, LogLevel } from '@nestjs/common';

export class AppLogger extends Logger {
  constructor(context: string = 'App') {
    super(context);
  }

  /**
   * Production-safe debug logging
   * Only logs in development environment
   */
  override debug(message: any, ...optionalParams: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      super.debug(message, ...optionalParams);
    }
  }

  /**
   * Production-safe verbose logging
   * Only logs in development environment
   */
  override verbose(message: any, ...optionalParams: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      super.verbose(message, ...optionalParams);
    }
  }

  /**
   * Log method (always logs)
   */
  override log(message: any, ...optionalParams: any[]): void {
    super.log(message, ...optionalParams);
  }

  /**
   * Warning method (always logs)
   */
  override warn(message: any, ...optionalParams: any[]): void {
    super.warn(message, ...optionalParams);
  }

  /**
   * Error method (always logs)
   */
  override error(message: any, stack?: string, context?: string): void {
    super.error(message, stack, context);
  }
}

// Convenience exports for common contexts
export const authLogger = new AppLogger('Auth');
export const userLogger = new AppLogger('User');
export const chartLogger = new AppLogger('Chart');
export const supabaseLogger = new AppLogger('Supabase');
export const chatLogger = new AppLogger('Chat');
export const cacheLogger = new AppLogger('Cache');
