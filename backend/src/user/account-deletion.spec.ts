import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { SupabaseService } from '../supabase/supabase.service';
import { ChartService } from '../chart/chart.service';
import { UserRepository } from '../repositories';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SubscriptionService } from '../subscription/subscription.service';

describe('account deletion external-stage retries', () => {
  function setup() {
    const storage = jest.fn().mockResolvedValue({ removed: 0, error: null });
    const deleteUser = jest.fn().mockResolvedValue({ error: null });
    const clear = jest.fn().mockResolvedValue(0);
    const service = new UserService(
      {
        removeStorageObjectsByPrefix: storage,
        deleteUser,
      } as unknown as SupabaseService,
      {} as ChartService,
      { findById: async () => null } as unknown as UserRepository,
      {} as EventEmitter2,
      {} as PrismaService,
      { deleteByPattern: clear } as unknown as RedisService,
    );
    return { service, storage, deleteUser, clear };
  }
  it('retries Storage and Auth cleanup after the database profile is already absent', async () => {
    const { service, storage, deleteUser, clear } = setup();
    await service.deleteAccount('user-id');
    expect(storage).toHaveBeenCalledWith('chat-media', 'user-id');
    expect(deleteUser).toHaveBeenCalledWith('user-id');
    expect(clear).toHaveBeenCalledWith('chat:hidden:*:user-id', true);
  });
  it('does not report success after a Storage failure', async () => {
    const { service, storage, deleteUser } = setup();
    storage.mockResolvedValue({ error: new Error('Unavailable') });
    await expect(service.deleteAccount('user-id')).rejects.toMatchObject({
      status: 500,
    });
    expect(deleteUser).not.toHaveBeenCalled();
  });
  it('does not report success after an Auth failure and permits a retry', async () => {
    const { service, deleteUser } = setup();
    deleteUser.mockResolvedValueOnce({ error: { status: 503 } });
    await expect(service.deleteAccount('user-id')).rejects.toMatchObject({
      status: 500,
    });
    await expect(service.deleteAccount('user-id')).resolves.toBeUndefined();
  });
  it('does not delete database data when stopping recurring payment fails', async () => {
    const deletion = jest.fn();
    const controller = new UserController(
      { deleteAccount: deletion } as unknown as UserService,
      {
        cancel: async () => {
          throw new Error('Stripe unavailable');
        },
      } as unknown as SubscriptionService,
      {} as SupabaseService,
    );
    await expect(
      controller.deleteAccount({
        user: { id: 'user-id' },
      } as unknown as Parameters<UserController['deleteAccount']>[0]),
    ).rejects.toThrow('Stripe unavailable');
    expect(deletion).not.toHaveBeenCalled();
  });
});
