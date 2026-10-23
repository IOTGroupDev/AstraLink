import { ChatVisibilityService } from './chat-visibility.service';
import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SupabaseService } from '@/supabase/supabase.service';
import { RedisService } from '@/redis/redis.service';
import { ChatNotificationsService } from './chat-notifications.service';

const sender = '00000000-0000-0000-0000-000000000001';
const recipient = '00000000-0000-0000-0000-000000000002';

describe('Chat send authorization', () => {
  const originalRpcSetting = process.env.CHAT_PREFER_RPC;
  let service: ChatService;
  let queryBlocks: jest.Mock;
  let findMatch: jest.Mock;
  let rpc: jest.Mock;
  let adminFrom: jest.Mock;
  let clientFrom: jest.Mock;

  beforeEach(() => {
    process.env.CHAT_PREFER_RPC = 'true';
    queryBlocks = jest.fn().mockResolvedValue({ data: [], error: null });
    const blocks = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      limit: queryBlocks,
    };
    adminFrom = jest.fn().mockReturnValue(blocks);
    findMatch = jest.fn().mockResolvedValue({
      data: { id: 'match-1', status: 'active' },
      error: null,
    });
    const matches = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: findMatch,
    };
    clientFrom = jest.fn().mockImplementation((table: string) => {
      if (table !== 'matches') throw new Error('Unexpected table operation');
      return matches;
    });
    rpc = jest.fn().mockResolvedValue({ data: 'message-1', error: null });
    service = new ChatService(
      {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: sender } },
          error: null,
        }),
        getAdminClient: jest.fn().mockReturnValue({ from: adminFrom }),
        getClientForToken: jest.fn().mockReturnValue({ from: clientFrom }),
        rpcWithToken: rpc,
      } as unknown as SupabaseService,
      {} as RedisService,
      {
        notifyIncomingMessage: jest.fn().mockResolvedValue(undefined),
      } as unknown as ChatNotificationsService,
      {} as ChatVisibilityService,
    );
  });

  afterAll(() => {
    if (originalRpcSetting === undefined) delete process.env.CHAT_PREFER_RPC;
    else process.env.CHAT_PREFER_RPC = originalRpcSetting;
  });

  it.each([sender, 'invalid-id', `${recipient},user_id.neq.${sender}`])(
    'rejects self or invalid recipients before querying or writing: %s',
    async (target) => {
      await expect(
        service.sendMessageWithToken('verified-token', target, 'Hello'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(adminFrom).not.toHaveBeenCalled();
      expect(clientFrom).not.toHaveBeenCalled();
      expect(rpc).not.toHaveBeenCalled();
    },
  );

  it('does not send or create a match when either user has blocked the other', async () => {
    queryBlocks.mockResolvedValue({ data: [{ id: 'block-1' }], error: null });
    await expect(
      service.sendMessageWithToken('verified-token', recipient, 'Hello'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(clientFrom).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails closed if the block lookup fails', async () => {
    queryBlocks.mockResolvedValue({
      data: null,
      error: { code: 'unavailable' },
    });
    await expect(
      service.sendMessageWithToken('verified-token', recipient, 'Hello'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each(['blocked', 'unmatched'])(
    'does not send for a %s conversation',
    async (status) => {
      findMatch.mockResolvedValue({
        data: { id: 'match-1', status },
        error: null,
      });
      await expect(
        service.sendMessageWithToken('verified-token', recipient, 'Hello'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(rpc).not.toHaveBeenCalled();
    },
  );

  it('allows an active unblocked conversation through the existing RPC path', async () => {
    await expect(
      service.sendMessageWithToken('verified-token', recipient, 'Hello'),
    ).resolves.toEqual({ id: 'message-1' });
    expect(rpc).toHaveBeenCalledWith(
      'send_message',
      { p_recipient_id: recipient, p_text: 'Hello', p_media_path: null },
      'verified-token',
    );
  });

  it.each([
    `chat-media:${recipient}/image.jpg`,
    `chat-media:${sender}/../${recipient}/image.jpg`,
    `chat-media:${sender}/%2e%2e/image.jpg`,
    `chat-media:${sender}/im\nage.jpg`,
    `chat-media:${sender}/folder\\image.jpg`,
  ])('does not pass unsafe media to the RPC: %s', async (mediaPath) => {
    await expect(
      service.sendMessageWithToken('verified-token', recipient, '', mediaPath),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(adminFrom).not.toHaveBeenCalled();
    expect(clientFrom).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
