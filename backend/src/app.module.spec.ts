import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';
import { SupabaseService } from './supabase/supabase.service';
import { ConnectionsController } from './connections/connections.controller';
import { HealthController } from './health/health.controller';

describe('complete application dependency graph', () => {
  it('resolves guards and services across modules without external connections', async () => {
    const originalKey = process.env.DATA_ENCRYPTION_KEY;
    const originalPreviousKeys = process.env.DATA_ENCRYPTION_PREVIOUS_KEYS;
    process.env.DATA_ENCRYPTION_KEY =
      'isolated-module-test-encryption-key-1234567890';
    process.env.DATA_ENCRYPTION_PREVIOUS_KEYS = '[]';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue({ get: (_key: string, fallback?: unknown) => fallback })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(RedisService)
      .useValue({ getClient: () => null })
      .overrideProvider(SupabaseService)
      .useValue({})
      .overrideProvider(getQueueToken('compatibility-calculation'))
      .useValue({ add: jest.fn(), close: jest.fn() })
      .compile();
    try {
      expect(module.get(ConnectionsController)).toBeInstanceOf(
        ConnectionsController,
      );
      expect(module.get(HealthController)).toBeInstanceOf(HealthController);
    } finally {
      await module.close();
      if (originalKey === undefined) delete process.env.DATA_ENCRYPTION_KEY;
      else process.env.DATA_ENCRYPTION_KEY = originalKey;
      if (originalPreviousKeys === undefined)
        delete process.env.DATA_ENCRYPTION_PREVIOUS_KEYS;
      else process.env.DATA_ENCRYPTION_PREVIOUS_KEYS = originalPreviousKeys;
    }
  });
});
