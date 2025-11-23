import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/redis/redis.service';

export interface RateLimitConfig {
  points: number; // Number of requests allowed
  duration: number; // Duration in seconds
  blockDuration?: number; // Optional block duration in seconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number; // Unix timestamp when limit resets
  totalLimit: number;
}

/**
 * Rate limiting service using Redis
 * Implements token bucket / fixed window algorithm
 */
@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Check if request is allowed under rate limit
   * Returns rate limit information
   */
  async consume(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const redisKey = `ratelimit:${key}`;

    try {
      // Increment counter
      const current = await this.redis.incr(redisKey);

      if (current === null) {
        // Redis not available - allow request but log warning
        this.logger.warn(
          'Redis not available for rate limiting, allowing request',
        );
        return {
          allowed: true,
          remaining: config.points - 1,
          resetTime: Date.now() + config.duration * 1000,
          totalLimit: config.points,
        };
      }

      // Set expiry on first request
      if (current === 1) {
        await this.redis.expire(redisKey, config.duration);
      }

      const ttl = await this.redis.ttl(redisKey);
      const resetTime = Date.now() + (ttl || config.duration) * 1000;

      const allowed = current <= config.points;
      const remaining = Math.max(0, config.points - current);

      if (!allowed) {
        this.logger.warn(`Rate limit exceeded for key: ${key}`, {
          current,
          limit: config.points,
          duration: config.duration,
        });

        // If blockDuration is set, extend the TTL
        if (config.blockDuration && current === config.points + 1) {
          await this.redis.expire(redisKey, config.blockDuration);
        }
      }

      return {
        allowed,
        remaining,
        resetTime,
        totalLimit: config.points,
      };
    } catch (error) {
      this.logger.error(`Rate limit check failed for ${key}:`, error);
      // On error, allow the request (fail open)
      return {
        allowed: true,
        remaining: config.points - 1,
        resetTime: Date.now() + config.duration * 1000,
        totalLimit: config.points,
      };
    }
  }

  /**
   * Get current rate limit status without consuming a point
   */
  async getStatus(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const redisKey = `ratelimit:${key}`;

    try {
      const exists = await this.redis.exists(redisKey);

      if (!exists) {
        return {
          allowed: true,
          remaining: config.points,
          resetTime: Date.now() + config.duration * 1000,
          totalLimit: config.points,
        };
      }

      const currentStr = await this.redis.get<string>(redisKey);
      const current = currentStr ? parseInt(currentStr, 10) : 0;
      const ttl = await this.redis.ttl(redisKey);
      const resetTime = Date.now() + (ttl || config.duration) * 1000;

      return {
        allowed: current < config.points,
        remaining: Math.max(0, config.points - current),
        resetTime,
        totalLimit: config.points,
      };
    } catch (error) {
      this.logger.error(`Get rate limit status failed for ${key}:`, error);
      return {
        allowed: true,
        remaining: config.points,
        resetTime: Date.now() + config.duration * 1000,
        totalLimit: config.points,
      };
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  async reset(key: string): Promise<boolean> {
    const redisKey = `ratelimit:${key}`;
    return await this.redis.del(redisKey);
  }

  /**
   * Delete all rate limit keys matching a pattern
   */
  async resetPattern(pattern: string): Promise<number> {
    return await this.redis.deleteByPattern(`ratelimit:${pattern}`);
  }
}
