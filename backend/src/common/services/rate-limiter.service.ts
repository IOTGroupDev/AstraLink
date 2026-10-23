import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from '@/redis/redis.service';

export interface RateLimitConfig {
  points: number;
  duration: number;
  blockDuration?: number;
}
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalLimit: number;
}

// Counter and expiry must change atomically, including after a lost connection.
const CONSUME = `
local current = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if current == 1 or ttl < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
if current == tonumber(ARGV[2]) + 1 and tonumber(ARGV[3]) > 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[3])
end
return {current, redis.call('PTTL', KEYS[1])}
`;
const STATUS = `
return {tonumber(redis.call('GET', KEYS[1]) or '0'), redis.call('PTTL', KEYS[1])}
`;

@Injectable()
export class RateLimiterService {
  constructor(private readonly redis: RedisService) {}

  private async evaluate(
    key: string,
    config: RateLimitConfig,
    consume: boolean,
  ): Promise<RateLimitResult> {
    if (
      !Number.isSafeInteger(config.points) ||
      config.points <= 0 ||
      !Number.isSafeInteger(config.duration) ||
      config.duration <= 0
    ) {
      throw new Error('Invalid rate limit configuration');
    }
    const client = this.redis.getClient();
    if (!client)
      throw new ServiceUnavailableException(
        'Rate limiting is temporarily unavailable',
      );
    try {
      const result: unknown = await client.eval(
        consume ? CONSUME : STATUS,
        1,
        `ratelimit:${key}`,
        config.duration * 1000,
        config.points,
        (config.blockDuration ?? 0) * 1000,
      );
      if (
        !Array.isArray(result) ||
        result.length !== 2 ||
        !result.every(
          (value) => typeof value === 'number' && Number.isFinite(value),
        )
      ) {
        throw new Error('Invalid Redis counter result');
      }
      const [current, ttl] = result as [number, number];
      return {
        allowed: consume ? current <= config.points : current < config.points,
        remaining: Math.max(0, config.points - current),
        resetTime: Date.now() + (ttl >= 0 ? ttl : config.duration * 1000),
        totalLimit: config.points,
      };
    } catch {
      // Never turn a limiter outage into unlimited Auth or paid AI requests.
      throw new ServiceUnavailableException(
        'Rate limiting is temporarily unavailable',
      );
    }
  }

  consume(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    return this.evaluate(key, config, true);
  }
  getStatus(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    return this.evaluate(key, config, false);
  }
  reset(key: string): Promise<boolean> {
    return this.redis.del(`ratelimit:${key}`);
  }
  resetPattern(pattern: string): Promise<number> {
    return this.redis.deleteByPattern(`ratelimit:${pattern}`);
  }
}
