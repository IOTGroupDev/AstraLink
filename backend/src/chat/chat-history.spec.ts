import { ChatVisibilityService } from './chat-visibility.service';
import { ChatService } from './chat.service';
import { SupabaseService } from '@/supabase/supabase.service';
import { RedisService } from '@/redis/redis.service';
import { ChatNotificationsService } from './chat-notifications.service';
import { decodeDialogCursor, messageTimestamp } from './dialog-cursor';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { DialogQueryDto, SendMessageDto } from './dto/chat.dto';

const me = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const id = '33333333-3333-4333-8333-333333333333';
function harness() {
  const query = {
    select: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
  };
  const from = jest.fn(() => query);
  const supabase = {
    getClientForToken: () => ({ from }),
    getUser: async () => ({ data: { user: { id: me } } }),
    getAdminClient: () => {
      throw new Error('Receipts not required for history');
    },
  };
  const service = new ChatService(
    supabase as unknown as SupabaseService,
    { get: async () => [] } as unknown as RedisService,
    {} as ChatNotificationsService,
    {
      getHidden: async () => new Set<string>(),
    } as unknown as ChatVisibilityService,
  );
  return { service, query, from };
}
describe('dialog filtering and cursor pagination', () => {
  it('reads the current primary photo on every conversation refresh', async () => {
    let currentPath: string | null = `${other}/old.jpg`;
    const photos = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn(async () => ({
        data: currentPath
          ? [{ user_id: other, storage_path: currentPath }]
          : [],
        error: null,
      })),
    };
    const messages = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [
          {
            id,
            sender_id: other,
            recipient_id: me,
            content: 'Hello',
            created_at: '2026-10-23T10:00:00Z',
          },
        ],
        error: null,
      }),
    };
    const supabase = {
      getUser: async () => ({ data: { user: { id: me } } }),
      getClientForToken: () => ({ from: () => messages }),
      getAdminClient: () => ({
        from: (table: string) => {
          if (table === 'user_photos') return photos;
          throw new Error('Names are optional for this test');
        },
      }),
      createSignedUrlsBatch: async (_bucket: string, paths: string[]) =>
        new Map(paths.map((path) => [path, `https://example.com/${path}`])),
    };
    const service = new ChatService(
      supabase as unknown as SupabaseService,
      {} as RedisService,
      {} as ChatNotificationsService,
      {
        getHidden: async () => new Set<string>(),
      } as unknown as ChatVisibilityService,
    );
    expect(
      (await service.listConversationsWithToken('token'))[0].primaryPhotoUrl,
    ).toContain('/old.jpg');
    currentPath = `${other}/new.jpg`;
    expect(
      (await service.listConversationsWithToken('token'))[0].primaryPhotoUrl,
    ).toContain('/new.jpg');
    currentPath = null;
    expect(
      (await service.listConversationsWithToken('token'))[0].primaryPhotoUrl,
    ).toBeNull();
    expect(photos.eq).toHaveBeenCalledWith('is_primary', true);
    expect(photos.in).toHaveBeenCalledWith('user_id', [other]);
  });

  it('applies the participant filter and newest-first order before LIMIT', async () => {
    const { service, query } = harness();
    await service.listDialogMessages('token', other, 20);
    expect(query.or).toHaveBeenCalledWith(
      `and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`,
    );
    expect(query.order.mock.calls).toEqual([
      ['created_at', { ascending: false }],
      ['id', { ascending: false }],
    ]);
    expect(query.or.mock.invocationCallOrder[0]).toBeLessThan(
      query.limit.mock.invocationCallOrder[0],
    );
    expect(query.limit).toHaveBeenCalledWith(20);
  });
  it('uses timestamp and id together when fetching the preceding page', async () => {
    const { service, query } = harness();
    await service.listDialogMessages(
      'token',
      other,
      20,
      `2026-10-22T10:00:00.123456Z~${id}`,
    );
    expect(query.or).toHaveBeenLastCalledWith(
      `created_at.lt.2026-10-22T10:00:00.123456Z,and(created_at.eq.2026-10-22T10:00:00.123456Z,id.lt.${id})`,
    );
  });
  it('preserves submillisecond ordering and cursor precision in returned messages', async () => {
    const { service, query } = harness();
    query.limit.mockResolvedValueOnce({
      data: [
        {
          id,
          sender_id: other,
          recipient_id: me,
          created_at: '2026-10-22T10:00:00.123456',
          content: 'newer',
        },
        {
          id: me,
          sender_id: other,
          recipient_id: me,
          created_at: '2026-10-22T10:00:00.123455',
          content: 'older',
        },
      ] as never,
      error: null,
    });
    const result = await service.listDialogMessages('token', other, 20);
    expect(result.map((message) => message.text)).toEqual(['older', 'newer']);
    expect(result[0].createdAt).toBe('2026-10-22T10:00:00.123455Z');
  });
  it('reports a database failure instead of pretending the conversation is empty', async () => {
    const { service, query } = harness();
    query.limit.mockResolvedValueOnce({
      data: null as never,
      error: { message: 'Unavailable' } as never,
    });
    await expect(
      service.listDialogMessages('token', other),
    ).rejects.toMatchObject({ status: 503 });
  });
  it.each(['invalid', `2026-10-22T00:00:00Z~${id},id.neq.x`])(
    'rejects malformed cursors %s',
    (cursor) => {
      expect(() => decodeDialogCursor(cursor)).toThrow();
    },
  );
  it('normalizes UTC timestamps without losing stored fractional seconds', () => {
    expect(messageTimestamp('2026-10-22T10:00:00.1')).toBe(
      '2026-10-22T10:00:00.100000Z',
    );
  });
  it.each(['NaN', 'Infinity', '0', '101'])(
    'rejects invalid query limit %s',
    (limit) => {
      expect(
        validateSync(plainToInstance(DialogQueryDto, { userId: other, limit })),
      ).not.toHaveLength(0);
    },
  );
  it('rejects oversized messages and invalid recipients at the DTO boundary', () => {
    expect(
      validateSync(
        plainToInstance(SendMessageDto, {
          recipientId: 'invalid',
          text: 'x'.repeat(4001),
        }),
      ),
    ).toHaveLength(2);
  });
});
