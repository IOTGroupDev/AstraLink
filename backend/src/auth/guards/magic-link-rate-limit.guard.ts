import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { RateLimiterService } from '@/common/services/rate-limiter.service';

/**
 * Rate Limiting Guard for Magic Link Endpoint
 *
 * Prevents spam and abuse of the passwordless login system
 *
 * Limits:
 * - 3 magic link requests per hour per IP address
 * - 10 requests per hour per email address
 *
 * This prevents:
 * - Email bombing attacks
 * - API abuse
 * - Brute force attempts
 */
@Injectable()
export class MagicLinkRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(MagicLinkRateLimitGuard.name);

  constructor(private readonly rateLimiter: RateLimiterService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    // Get IP address
    const ip =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      request.ip ||
      'unknown';

    // Get email from request body
    const email = request.body?.email;

    // Rate limit by IP (3 per hour)
    const ipKey = `magic-link:ip:${ip}`;
    const ipResult = await this.rateLimiter.consume(ipKey, {
      points: 3,
      duration: 3600, // 1 hour
    });

    if (!ipResult.allowed) {
      this.logger.warn(
        `Magic link rate limit exceeded for IP ${ip}. Blocked until ${new Date(ipResult.resetTime).toISOString()}`,
      );

      throw new ForbiddenException({
        message:
          'Too many magic link requests from this IP. Please try again later.',
        retryAfter: ipResult.resetTime,
        remaining: 0,
      });
    }

    // Rate limit by email if provided (10 per hour)
    if (email) {
      const emailKey = `magic-link:email:${email.toLowerCase()}`;
      const emailResult = await this.rateLimiter.consume(emailKey, {
        points: 10,
        duration: 3600, // 1 hour
      });

      if (!emailResult.allowed) {
        this.logger.warn(
          `Magic link rate limit exceeded for email ${email}. Blocked until ${new Date(emailResult.resetTime).toISOString()}`,
        );

        throw new ForbiddenException({
          message:
            'Too many magic link requests for this email. Please check your inbox or try again later.',
          retryAfter: emailResult.resetTime,
          remaining: 0,
        });
      }

      // Add email rate limit headers
      response.setHeader(
        'X-RateLimit-Limit-Email',
        emailResult.totalLimit.toString(),
      );
      response.setHeader(
        'X-RateLimit-Remaining-Email',
        emailResult.remaining.toString(),
      );
    }

    // Add IP rate limit headers
    response.setHeader('X-RateLimit-Limit-IP', ipResult.totalLimit.toString());
    response.setHeader(
      'X-RateLimit-Remaining-IP',
      ipResult.remaining.toString(),
    );
    response.setHeader(
      'X-RateLimit-Reset',
      new Date(ipResult.resetTime).toISOString(),
    );

    this.logger.debug(
      `Magic link request allowed for IP ${ip} (${ipResult.remaining}/${ipResult.totalLimit} remaining)`,
    );

    return true;
  }
}
