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
 * Rate Limiting Guard for Signup Endpoint
 *
 * Prevents mass account creation and abuse
 *
 * Limits:
 * - 5 signups per day per IP address
 * - 3 signups per day per email address
 *
 * This prevents:
 * - Mass account creation
 * - Bot attacks
 * - Spam registrations
 * - API abuse
 */
@Injectable()
export class SignupRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(SignupRateLimitGuard.name);

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

    // Rate limit by IP (5 signups per day)
    const ipKey = `signup:ip:${ip}`;
    const ipResult = await this.rateLimiter.consume(ipKey, {
      points: 5,
      duration: 86400, // 24 hours
    });

    if (!ipResult.allowed) {
      this.logger.warn(
        `Signup rate limit exceeded for IP ${ip}. Blocked until ${new Date(ipResult.resetTime).toISOString()}`,
      );

      throw new ForbiddenException({
        message:
          'Too many signup attempts from this IP address. Please try again tomorrow.',
        retryAfter: ipResult.resetTime,
        remaining: 0,
      });
    }

    // Rate limit by email if provided (3 per day)
    // This prevents the same email from being used in spam registrations
    if (email) {
      const emailKey = `signup:email:${email.toLowerCase()}`;
      const emailResult = await this.rateLimiter.consume(emailKey, {
        points: 3,
        duration: 86400, // 24 hours
      });

      if (!emailResult.allowed) {
        this.logger.warn(
          `Signup rate limit exceeded for email ${email}. Blocked until ${new Date(emailResult.resetTime).toISOString()}`,
        );

        throw new ForbiddenException({
          message:
            'Too many signup attempts with this email. Please check your inbox for the verification email or try again tomorrow.',
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
      `Signup request allowed for IP ${ip} (${ipResult.remaining}/${ipResult.totalLimit} remaining)`,
    );

    return true;
  }
}
