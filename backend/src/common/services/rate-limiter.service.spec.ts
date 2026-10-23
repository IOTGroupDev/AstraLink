import { RateLimiterService } from './rate-limiter.service';
import { RedisService } from '@/redis/redis.service';

describe('distributed rate limiting', () => {
  const client = { eval: jest.fn() };
  const redis = { getClient: jest.fn(() => client) };
  const service = new RateLimiterService(redis as unknown as RedisService);
  const config = { points: 2, duration: 60 };
  beforeEach(() => {
    jest.clearAllMocks();
    redis.getClient.mockReturnValue(client);
  });

  it('uses a single atomic counter/expiry operation and rejects excess requests', async () => {
    client.eval
      .mockResolvedValueOnce([1, 60000])
      .mockResolvedValueOnce([2, 59000])
      .mockResolvedValueOnce([3, 58000]);
    expect((await service.consume('user', config)).allowed).toBe(true);
    expect((await service.consume('user', config)).allowed).toBe(true);
    expect((await service.consume('user', config)).allowed).toBe(false);
    expect(client.eval).toHaveBeenCalledWith(
      expect.stringContaining('PEXPIRE'),
      1,
      'ratelimit:user',
      60000,
      2,
      0,
    );
  });
  it('does not spend a point when reading current status', async () => {
    client.eval.mockResolvedValueOnce([1, 30000]);
    expect((await service.getStatus('user', config)).remaining).toBe(1);
    expect(client.eval.mock.calls[0][0]).not.toContain('INCR');
  });
  it('fails closed if Redis is unavailable', async () => {
    redis.getClient.mockReturnValue(null as unknown as typeof client);
    await expect(service.consume('user', config)).rejects.toMatchObject({
      status: 503,
    });
    await expect(service.getStatus('user', config)).rejects.toMatchObject({
      status: 503,
    });
  });
  it('fails closed on a disconnected or malformed counter result', async () => {
    client.eval
      .mockRejectedValueOnce(new Error('Disconnected'))
      .mockResolvedValueOnce(null);
    await expect(service.consume('user', config)).rejects.toMatchObject({
      status: 503,
    });
    await expect(service.consume('user', config)).rejects.toMatchObject({
      status: 503,
    });
  });
});
