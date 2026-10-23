import { ChatVisibilityService } from './chat-visibility.service';
import { SupabaseService } from '../supabase/supabase.service';
import { RedisService } from '../redis/redis.service';

const owner = '11111111-1111-4111-8111-111111111111';
const target = '22222222-2222-4222-8222-222222222222';
function setup() {
  const rows = new Set<string>();
  const query = {
    upsert: jest.fn((values: unknown) => {
      for (const row of (Array.isArray(values) ? values : [values]) as Record<
        string,
        string
      >[])
        rows.add(row.message_id);
      return Promise.resolve({ error: null });
    }),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn(async () => ({
      data: [...rows].map((message_id) => ({ message_id })),
      error: null,
    })),
  };
  const redis = { get: jest.fn().mockResolvedValue(null), del: jest.fn() };
  const service = new ChatVisibilityService(
    {
      getAdminClient: () => ({ from: () => query }),
    } as unknown as SupabaseService,
    redis as unknown as RedisService,
  );
  return { service, query, redis };
}
describe('durable delete-for-me state', () => {
  it('retains a new hidden message when Redis contains no data', async () => {
    const { service, query } = setup();
    await service.hide(owner, 'messages', target);
    expect(await service.getHidden(owner, 'messages')).toEqual(
      new Set([target]),
    );
    expect(query.eq).toHaveBeenCalledWith('user_id', owner);
  });
  it('imports legacy cache before deleting it', async () => {
    const { service, query, redis } = setup();
    redis.get.mockResolvedValue([target, 'invalid', target]);
    expect(await service.getHidden(owner, 'messages')).toEqual(
      new Set([target]),
    );
    expect(query.upsert.mock.invocationCallOrder[0]).toBeLessThan(
      redis.del.mock.invocationCallOrder[0],
    );
  });
  it('does not discard the cache or report success if persistence fails', async () => {
    const { service, query, redis } = setup();
    redis.get.mockResolvedValue([target]);
    query.upsert.mockResolvedValue({
      error: { message: 'Unavailable' },
    } as never);
    await expect(service.getHidden(owner, 'messages')).rejects.toMatchObject({
      status: 503,
    });
    expect(redis.del).not.toHaveBeenCalled();
    await expect(service.hide(owner, 'messages', target)).rejects.toMatchObject(
      { status: 503 },
    );
  });
});
