import { Injectable, LoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';

@Injectable({ scope: Scope.TRANSIENT })
export class WinstonLoggerService implements LoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor(private configService: ConfigService) {
    const env = this.configService.get<string>('NODE_ENV', 'development');
    const logLevel = this.configService.get<string>('LOG_LEVEL', 'info');

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
        const ctx = context ? `[${context}]` : '';
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `${timestamp} ${level} ${ctx} ${message} ${metaStr}`;
      }),
    );

    // Create transports based on environment
    const transports: winston.transport[] = [];

    if (env === 'production') {
      // Production: JSON logs to file and console
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: logFormat,
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: logFormat,
        }),
        new winston.transports.Console({
          format: logFormat,
        }),
      );
    } else {
      // Development: Colorized console output
      transports.push(
        new winston.transports.Console({
          format: consoleFormat,
        }),
      );
    }

    this.logger = winston.createLogger({
      level: logLevel,
      format: logFormat,
      transports,
      // Don't exit on errors
      exitOnError: false,
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string): void {
    const ctx = context || this.context;
    this.logger.info(message, { context: ctx });
  }

  error(message: any, trace?: string, context?: string): void {
    const ctx = context || this.context;
    this.logger.error(message, {
      context: ctx,
      trace,
    });
  }

  warn(message: any, context?: string): void {
    const ctx = context || this.context;
    this.logger.warn(message, { context: ctx });
  }

  debug(message: any, context?: string): void {
    const ctx = context || this.context;
    this.logger.debug(message, { context: ctx });
  }

  verbose(message: any, context?: string): void {
    const ctx = context || this.context;
    this.logger.verbose(message, { context: ctx });
  }

  // Additional utility methods

  /**
   * Log HTTP request
   */
  logRequest(req: any): void {
    this.logger.http('Incoming request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  /**
   * Log HTTP response
   */
  logResponse(req: any, res: any, responseTime: number): void {
    this.logger.http('Outgoing response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
    });
  }

  /**
   * Log database query
   */
  logQuery(query: string, duration: number): void {
    this.logger.debug('Database query', {
      query,
      duration: `${duration}ms`,
    });
  }

  /**
   * Log authentication events
   */
  logAuth(event: string, userId?: string, details?: any): void {
    this.logger.info('Auth event', {
      event,
      userId,
      ...details,
    });
  }

  /**
   * Log subscription changes
   */
  logSubscription(event: string, userId: string, tier: string, details?: any): void {
    this.logger.info('Subscription event', {
      event,
      userId,
      tier,
      ...details,
    });
  }

  /**
   * Log security events
   */
  logSecurity(event: string, severity: 'low' | 'medium' | 'high', details?: any): void {
    const level = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
    this.logger.log(level, 'Security event', {
      event,
      severity,
      ...details,
    });
  }
}
