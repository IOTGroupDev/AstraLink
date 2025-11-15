import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis, { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {
    const url =
      this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    try {
      this.client = new IORedis(url, {
        maxRetriesPerRequest: 3,
        enableAutoPipelining: true,
        lazyConnect: false,
      });

      this.client.on('error', (err: any) => {
        this.logger.error(
          `Redis error: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
      this.client.on('connect', () => this.logger.log('Redis connected'));
      this.client.on('ready', () => this.logger.log('Redis ready'));
      this.client.on('end', () => this.logger.warn('Redis connection closed'));
    } catch (e) {
      this.logger.error('Failed to initialize Redis client', e as any);
      this.client = null;
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (e) {
      this.logger.warn(
        `Redis GET failed for key=${key}: ${(e as Error).message}`,
      );
      return null;
    }
  }

  async set<T = any>(
    key: string,
    value: T,
    ttlSeconds?: number,
  ): Promise<boolean> {
    if (!this.client) return false;
    try {
      const payload = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, payload, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, payload);
      }
      return true;
    } catch (e) {
      this.logger.warn(
        `Redis SET failed for key=${key}: ${(e as Error).message}`,
      );
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (e) {
      this.logger.warn(
        `Redis DEL failed for key=${key}: ${(e as Error).message}`,
      );
      return false;
    }
  }

  async ping(): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.ping();
    } catch (e) {
      this.logger.warn(`Redis PING failed: ${(e as Error).message}`);
      return null;
    }
  }

  async deleteByPattern(pattern: string): Promise<number> {
    if (!this.client) return 0;
    try {
      let cursor = '0';
      let total = 0;
      do {
        const res = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = res[0];
        const keys = res[1];
        if (keys.length) {
          total += await this.client.del(...keys);
        }
      } while (cursor !== '0');
      return total;
    } catch (e) {
      this.logger.warn(
        `Redis deleteByPattern failed for pattern=${pattern}: ${(e as Error).message}`,
      );
      return 0;
    }
  }

  /**
   * Increment a key's value by 1
   * Used for rate limiting and counters
   */
  async incr(key: string): Promise<number | null> {
    if (!this.client) return null;
    try {
      return await this.client.incr(key);
    } catch (e) {
      this.logger.warn(
        `Redis INCR failed for key=${key}: ${(e as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Increment a key's value by a specific amount
   */
  async incrBy(key: string, amount: number): Promise<number | null> {
    if (!this.client) return null;
    try {
      return await this.client.incrby(key, amount);
    } catch (e) {
      this.logger.warn(
        `Redis INCRBY failed for key=${key}: ${(e as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Set expiration time on a key (in seconds)
   * Returns true if timeout was set, false otherwise
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (e) {
      this.logger.warn(
        `Redis EXPIRE failed for key=${key}: ${(e as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Get time to live for a key (in seconds)
   * Returns -1 if key exists but has no expiry, -2 if key doesn't exist
   */
  async ttl(key: string): Promise<number | null> {
    if (!this.client) return null;
    try {
      return await this.client.ttl(key);
    } catch (e) {
      this.logger.warn(
        `Redis TTL failed for key=${key}: ${(e as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (e) {
      this.logger.warn(
        `Redis EXISTS failed for key=${key}: ${(e as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    if (!this.client || keys.length === 0) return [];
    try {
      const values = await this.client.mget(...keys);
      return values.map(val => {
        if (!val) return null;
        try {
          return JSON.parse(val) as T;
        } catch {
          return null;
        }
      });
    } catch (e) {
      this.logger.warn(`Redis MGET failed: ${(e as Error).message}`);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs at once
   */
  async mset(entries: Record<string, any>): Promise<boolean> {
    if (!this.client) return false;
    try {
      const pairs: string[] = [];
      for (const [key, value] of Object.entries(entries)) {
        pairs.push(key, JSON.stringify(value));
      }
      if (pairs.length === 0) return true;
      await this.client.mset(...pairs);
      return true;
    } catch (e) {
      this.logger.warn(`Redis MSET failed: ${(e as Error).message}`);
      return false;
    }
  }
}
