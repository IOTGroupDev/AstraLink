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
}
