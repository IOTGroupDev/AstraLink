import { HealthController } from './health.controller';
import { EphemerisService } from '../services/ephemeris.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('readiness distinguishes real ephemeris files from fallback', () => {
  it.each([true, false])('files available = %s', async (filesAvailable) => {
    const controller = new HealthController(
      {
        getReadiness: () => ({
          initialized: true,
          mode: filesAvailable ? 'swisseph+files' : 'swisseph+moshier',
          filesAvailable,
        }),
      } as unknown as EphemerisService,
      { healthCheck: async () => true } as unknown as PrismaService,
      { getClient: () => ({ status: 'ready' }) } as unknown as RedisService,
    );
    if (filesAvailable)
      expect(await controller.ready()).toMatchObject({ ok: true });
    else
      await expect(controller.ready()).rejects.toMatchObject({ status: 503 });
    expect(controller.ping().ok).toBe(true);
  });
});
