import { SupabaseService } from './supabase.service';

describe('account storage cleanup', () => {
  function harness() {
    const storage = {
      list: jest.fn(),
      remove: jest.fn().mockResolvedValue({ error: null }),
    };
    const service = Object.assign(Object.create(SupabaseService.prototype), {
      adminSupabase: { storage: { from: () => storage } },
      redis: { deleteByPattern: jest.fn().mockResolvedValue(0) },
    }) as SupabaseService;
    return { service, storage };
  }
  it('walks nested user folders instead of trying to remove directory placeholders', async () => {
    const { service, storage } = harness();
    storage.list
      .mockResolvedValueOnce({
        data: [
          { id: '1', name: 'a.jpg' },
          { id: null, name: 'album' },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ id: '2', name: 'b.jpg' }],
        error: null,
      });
    await expect(
      service.removeStorageObjectsByPrefix('user-photos', 'owner'),
    ).resolves.toEqual({ removed: 2, error: null });
    expect(storage.remove.mock.calls).toEqual([
      [['owner/a.jpg']],
      [['owner/album/b.jpg']],
    ]);
  });
  it('lists beyond 1000 entries before deleting the paged folder', async () => {
    const { service, storage } = harness();
    storage.list
      .mockResolvedValueOnce({
        data: Array.from({ length: 1000 }, (_, index) => ({
          id: String(index),
          name: `${index}.jpg`,
        })),
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ id: 'last', name: 'last.jpg' }],
        error: null,
      });
    const result = await service.removeStorageObjectsByPrefix(
      'chat-media',
      'owner',
    );
    expect(result).toEqual({ removed: 1001, error: null });
    expect(storage.list).toHaveBeenNthCalledWith(2, 'owner', {
      limit: 1000,
      offset: 1000,
    });
  });
  it('refuses a prefix that could cross a user namespace', async () => {
    const { service, storage } = harness();
    expect(
      (await service.removeStorageObjectsByPrefix('user-photos', '../other'))
        .error,
    ).toBeInstanceOf(Error);
    expect(storage.list).not.toHaveBeenCalled();
  });
});
