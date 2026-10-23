import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserPhoto as StoredUserPhoto } from '@prisma/client';
import { validateSync } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ConfirmPhotoDto, GetUploadUrlDto } from './dto/photos.dto';
import { UserPhotosService } from './user-photos.service';

const userId = '11111111-1111-4111-8111-111111111111';
const otherUserId = '22222222-2222-4222-8222-222222222222';
const path = `${userId}/photo.jpg`;
const photo: StoredUserPhoto = {
  id: '33333333-3333-4333-8333-333333333333',
  userId,
  storagePath: path,
  isPrimary: true,
  createdAt: new Date('2026-10-13T00:00:00.000Z'),
};

const invalidPaths = [
  '',
  `${otherUserId}/photo.jpg`,
  `${userId}-other/photo.jpg`,
  `/${path}`,
  `${userId}/../${otherUserId}/photo.jpg`,
  `${userId}/./photo.jpg`,
  `${userId}//photo.jpg`,
  `${userId}/%2e%2e/photo.jpg`,
  `${userId}/%2E%2E%2Fphoto.jpg`,
  `${userId}/%252e%252e%252fphoto.jpg`,
  `${userId}%2fphoto.jpg`,
  `${userId}/nested%2fphoto.jpg`,
  `${userId}/nested%5cphoto.jpg`,
  `${userId}\\photo.jpg`,
  `${userId}/nested\\photo.jpg`,
  `https://example.com/${path}`,
  `${userId}/photo.jpg?download=1`,
  `${userId}/photo.jpg#fragment`,
  `${userId}/photo.jpg\n`,
  `${userId}/photo.jpg\r`,
  `${userId}/pho\u0000to.jpg`,
  ` ${path}`,
  `${path} `,
  `${userId}/photo.html`,
  `${userId}/photo.svg`,
  `${userId}/${'a'.repeat(1024)}.jpg`,
];

function createHarness() {
  const storage = {
    info: jest.fn().mockResolvedValue({
      data: { contentType: 'image/jpeg', size: 256 },
      error: null,
    }),
    remove: jest.fn().mockResolvedValue({ error: null }),
    createSignedUrl: jest.fn().mockResolvedValue({
      data: { signedUrl: 'https://storage.test/photo?token=test' },
      error: null,
    }),
  };
  const admin = { storage: { from: jest.fn().mockReturnValue(storage) } };
  const supabase = {
    createSignedUploadUrl: jest.fn().mockResolvedValue({
      signedUrl: 'signed-upload-url',
      token: 'upload-token',
    }),
    createSignedUrl: jest.fn().mockResolvedValue('signed-photo-url'),
    createSignedUrlsBatch: jest
      .fn()
      .mockResolvedValue(new Map([[path, 'signed-photo-url']])),
    getAdminClient: jest.fn().mockReturnValue(admin),
  };
  const prisma = {
    userPhoto: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue(photo),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([photo]),
      findUnique: jest.fn().mockResolvedValue(photo),
      delete: jest.fn().mockResolvedValue(photo),
      update: jest.fn().mockResolvedValue(photo),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const service = new UserPhotosService(
    supabase as unknown as SupabaseService,
    prisma as unknown as PrismaService,
  );
  return { service, supabase, prisma, admin, storage };
}

describe('UserPhotosService storage ownership', () => {
  let harness: ReturnType<typeof createHarness>;

  beforeEach(() => {
    harness = createHarness();
  });

  afterEach(() => jest.restoreAllMocks());

  it.each(invalidPaths)(
    'rejects unsafe path %p before admin or database operations',
    async (unsafePath) => {
      const { service, supabase, prisma, storage } = harness;

      await expect(
        service.getSignedUploadUrl(userId, unsafePath),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.confirmPhoto(userId, unsafePath),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(supabase.createSignedUploadUrl).not.toHaveBeenCalled();
      expect(supabase.createSignedUrl).not.toHaveBeenCalled();
      expect(supabase.getAdminClient).not.toHaveBeenCalled();
      expect(storage.info).not.toHaveBeenCalled();
      expect(storage.createSignedUrl).not.toHaveBeenCalled();
      expect(prisma.userPhoto.findFirst).not.toHaveBeenCalled();
      expect(prisma.userPhoto.count).not.toHaveBeenCalled();
      expect(prisma.userPhoto.create).not.toHaveBeenCalled();
    },
  );

  it.each([null, undefined, 42, {}])(
    'rejects non-string confirm paths %p even without DTO validation',
    async (unsafePath) => {
      await expect(
        harness.service.confirmPhoto(userId, unsafePath as unknown as string),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(harness.supabase.getAdminClient).not.toHaveBeenCalled();
      expect(harness.prisma.userPhoto.create).not.toHaveBeenCalled();
    },
  );

  it.each(['html', 'svg', '../jpg', '.jpg', 'JPG', '', null])(
    'rejects unsupported extension %p even without DTO validation',
    async (extension) => {
      await expect(
        harness.service.getSignedUploadUrl(
          userId,
          undefined,
          extension as unknown as string,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(harness.supabase.createSignedUploadUrl).not.toHaveBeenCalled();
    },
  );

  it.each(['jpg', 'jpeg', 'png', 'webp'])(
    'generates an own UUID upload path with extension %s',
    async (extension) => {
      const result = await harness.service.getSignedUploadUrl(
        userId,
        undefined,
        extension,
      );
      expect(result.path).toMatch(
        new RegExp(`^${userId}/[a-f0-9-]{36}\\.${extension}$`),
      );
      expect(result).toMatchObject({
        signedUrl: 'signed-upload-url',
        token: 'upload-token',
      });
      expect(harness.supabase.createSignedUploadUrl).toHaveBeenCalledWith(
        'user-photos',
        result.path,
      );
    },
  );

  it.each([path, `${userId}/album_1/photo-2.png`])(
    'preserves a valid own native path %p',
    async (ownPath) => {
      const result = await harness.service.getSignedUploadUrl(userId, ownPath);
      expect(result.path).toBe(ownPath);
      expect(harness.supabase.createSignedUploadUrl).toHaveBeenCalledWith(
        'user-photos',
        ownPath,
      );
    },
  );

  it('confirms an uploaded image and preserves the frontend response', async () => {
    const result = await harness.service.confirmPhoto(userId, path);

    expect(harness.storage.info).toHaveBeenCalledWith(path);
    expect(harness.prisma.userPhoto.create).toHaveBeenCalledWith({
      data: { userId, storagePath: path, isPrimary: true },
    });
    expect(result).toEqual({
      id: photo.id,
      userId,
      path,
      isPrimary: true,
      url: 'signed-photo-url',
      createdAt: photo.createdAt.toISOString(),
    });
  });

  it('keeps later uploads non-primary', async () => {
    harness.prisma.userPhoto.count.mockResolvedValue(2);
    await harness.service.confirmPhoto(userId, path);
    expect(harness.prisma.userPhoto.create).toHaveBeenCalledWith({
      data: { userId, storagePath: path, isPrimary: false },
    });
  });

  it('accepts metadata from the Storage metadata field', async () => {
    harness.storage.info.mockResolvedValue({
      data: { metadata: { mimetype: 'image/png', size: 512 } },
      error: null,
    });
    await expect(
      harness.service.confirmPhoto(userId, path),
    ).resolves.toMatchObject({ id: photo.id });
  });

  describe('Expo uploads stored as application/octet-stream', () => {
    beforeEach(() => {
      harness.storage.info.mockResolvedValue({
        data: { contentType: 'application/octet-stream', size: 256 },
        error: null,
      });
    });

    it.each([
      { format: 'JPEG', bytes: [0xff, 0xd8, 0xff, 0xe0] },
      {
        format: 'PNG',
        bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      },
      {
        format: 'WebP',
        bytes: [0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
      },
    ])(
      'confirms $format after reading the file signature',
      async ({ bytes }) => {
        const download = jest
          .spyOn(global, 'fetch')
          .mockResolvedValueOnce(
            new Response(new Uint8Array(bytes), { status: 206 }),
          );

        await expect(
          harness.service.confirmPhoto(userId, path),
        ).resolves.toMatchObject({ id: photo.id });

        expect(harness.storage.createSignedUrl).toHaveBeenCalledWith(path, 30);
        expect(download).toHaveBeenCalledWith(
          'https://storage.test/photo?token=test',
          {
            headers: { Range: 'bytes=0-11' },
            signal: expect.any(AbortSignal),
          },
        );
        expect(harness.prisma.userPhoto.create).toHaveBeenCalledTimes(1);
      },
    );

    it('bounds the read and cancels the body if Storage ignores Range', async () => {
      const cancel = jest.fn();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([0xff]));
          controller.enqueue(new Uint8Array([0xd8, 0xff]));
          controller.enqueue(new Uint8Array(64 * 1024));
        },
        cancel,
      });
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(body));

      await harness.service.confirmPhoto(userId, path);

      expect(cancel).toHaveBeenCalledTimes(1);
    });

    it.each([
      { format: 'empty', bytes: [] },
      { format: 'HTML', bytes: [60, 104, 116, 109, 108, 62] },
      { format: 'truncated PNG', bytes: [0x89, 0x50, 0x4e, 0x47] },
      {
        format: 'RIFF without WebP',
        bytes: [0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x41, 0x56, 0x49, 0x20],
      },
    ])(
      'rejects $format without creating a gallery entry',
      async ({ bytes }) => {
        jest
          .spyOn(global, 'fetch')
          .mockResolvedValueOnce(
            new Response(new Uint8Array(bytes), { status: 206 }),
          );

        await expect(
          harness.service.confirmPhoto(userId, path),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(harness.prisma.userPhoto.create).not.toHaveBeenCalled();
      },
    );

    it('rejects a failed signature request even when its body resembles JPEG', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(
          new Response(new Uint8Array([0xff, 0xd8, 0xff]), { status: 403 }),
        );
      await expect(
        harness.service.confirmPhoto(userId, path),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(harness.prisma.userPhoto.create).not.toHaveBeenCalled();
    });

    it('rejects a signature download failure without leaking the signed URL', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('Network error'));
      await expect(harness.service.confirmPhoto(userId, path)).rejects.toThrow(
        'Uploaded file is not a valid photo',
      );
      expect(harness.prisma.userPhoto.create).not.toHaveBeenCalled();
    });

    it('does not download when signing the object fails', async () => {
      harness.storage.createSignedUrl.mockResolvedValueOnce({
        data: null,
        error: { message: 'Storage unavailable' },
      });
      const download = jest.spyOn(global, 'fetch');

      await expect(
        harness.service.confirmPhoto(userId, path),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(download).not.toHaveBeenCalled();
      expect(harness.prisma.userPhoto.create).not.toHaveBeenCalled();
    });
  });

  it.each([
    { data: null, error: { message: 'Object not found' } },
    { data: null, error: null },
    { data: { contentType: 'text/html', size: 256 }, error: null },
    { data: { contentType: 'image/svg+xml', size: 256 }, error: null },
    { data: { contentType: 'image/jpeg', size: 0 }, error: null },
    { data: { contentType: 'image/jpeg', size: -1 }, error: null },
    { data: { contentType: 'image/jpeg', size: NaN }, error: null },
    { data: { contentType: 'image/jpeg', size: Infinity }, error: null },
    { data: { contentType: 'image/jpeg', size: '256' }, error: null },
    { data: { size: 256 }, error: null },
  ])('rejects missing or invalid uploaded object %p', async (response) => {
    harness.storage.info.mockResolvedValue(response);

    await expect(
      harness.service.confirmPhoto(userId, path),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(harness.prisma.userPhoto.findFirst).not.toHaveBeenCalled();
    expect(harness.prisma.userPhoto.count).not.toHaveBeenCalled();
    expect(harness.prisma.userPhoto.create).not.toHaveBeenCalled();
    expect(harness.supabase.createSignedUrl).not.toHaveBeenCalled();
  });

  it('returns the same photo on a sequential confirm retry', async () => {
    harness.prisma.userPhoto.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(photo);
    const first = await harness.service.confirmPhoto(userId, path);
    const retry = await harness.service.confirmPhoto(userId, path);

    expect(retry).toEqual(first);
    expect(harness.prisma.userPhoto.create).toHaveBeenCalledTimes(1);
    expect(harness.prisma.userPhoto.count).toHaveBeenCalledTimes(1);
  });

  it('does not sign a corrupt row returned by confirm lookup', async () => {
    harness.prisma.userPhoto.findFirst.mockResolvedValue({
      ...photo,
      storagePath: `${otherUserId}/photo.jpg`,
    });

    await expect(
      harness.service.confirmPhoto(userId, path),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(harness.supabase.createSignedUrl).not.toHaveBeenCalled();
    expect(harness.prisma.userPhoto.create).not.toHaveBeenCalled();
  });

  it('signs only own valid rows when the gallery contains corrupt legacy paths', async () => {
    harness.prisma.userPhoto.findMany.mockResolvedValue([
      photo,
      { ...photo, id: 'foreign-path', storagePath: `${otherUserId}/photo.jpg` },
      { ...photo, id: 'traversal', storagePath: `${userId}/../photo.jpg` },
      { ...photo, id: 'foreign-row', userId: otherUserId },
    ]);

    const result = await harness.service.listPhotos(userId);

    expect(harness.supabase.createSignedUrlsBatch).toHaveBeenCalledWith(
      'user-photos',
      [path],
      900,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: photo.id, url: 'signed-photo-url' });
  });

  it('does not call signing at all if every stored path is unsafe', async () => {
    harness.prisma.userPhoto.findMany.mockResolvedValue([
      { ...photo, storagePath: `${otherUserId}/photo.jpg` },
    ]);
    await expect(harness.service.listPhotos(userId)).resolves.toEqual([]);
    expect(harness.supabase.createSignedUrlsBatch).not.toHaveBeenCalled();
  });

  it.each(invalidPaths)(
    'does not admin-delete or remove the DB row for unsafe stored path %p',
    async (unsafePath) => {
      harness.prisma.userPhoto.findUnique.mockResolvedValue({
        ...photo,
        storagePath: unsafePath,
      });

      await expect(
        harness.service.deletePhoto(userId, photo.id),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(harness.supabase.getAdminClient).not.toHaveBeenCalled();
      expect(harness.storage.remove).not.toHaveBeenCalled();
      expect(harness.prisma.userPhoto.delete).not.toHaveBeenCalled();
    },
  );

  it("rejects deletion of another user's row before Storage access", async () => {
    harness.prisma.userPhoto.findUnique.mockResolvedValue({
      ...photo,
      userId: otherUserId,
    });
    await expect(
      harness.service.deletePhoto(userId, photo.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(harness.supabase.getAdminClient).not.toHaveBeenCalled();
    expect(harness.prisma.userPhoto.delete).not.toHaveBeenCalled();
  });

  it('deletes an own valid photo from Storage and the gallery', async () => {
    await expect(
      harness.service.deletePhoto(userId, photo.id),
    ).resolves.toEqual({
      success: true,
    });
    expect(harness.storage.remove).toHaveBeenCalledWith([path]);
    expect(harness.prisma.userPhoto.delete).toHaveBeenCalledWith({
      where: { id: photo.id },
    });
  });

  it('preserves best-effort gallery deletion when own Storage removal fails', async () => {
    harness.storage.remove.mockResolvedValue({
      error: { message: 'Storage temporarily unavailable' },
    });
    await expect(
      harness.service.deletePhoto(userId, photo.id),
    ).resolves.toEqual({
      success: true,
    });
    expect(harness.prisma.userPhoto.delete).toHaveBeenCalledTimes(1);
  });

  it('does not promote a corrupt legacy path to primary', async () => {
    harness.prisma.userPhoto.findUnique.mockResolvedValue({
      ...photo,
      storagePath: `${otherUserId}/photo.jpg`,
    });
    await expect(
      harness.service.setPrimaryDirect(userId, photo.id),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(harness.prisma.userPhoto.updateMany).not.toHaveBeenCalled();
    expect(harness.prisma.userPhoto.update).not.toHaveBeenCalled();
    expect(harness.prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('photo DTO validation', () => {
  it.each(
    invalidPaths.filter(
      (value) =>
        !value.startsWith(otherUserId) && !value.startsWith(`${userId}-other/`),
    ),
  )('rejects malformed path syntax %p', (unsafePath) => {
    expect(
      validateSync(Object.assign(new ConfirmPhotoDto(), { path: unsafePath })),
    ).not.toHaveLength(0);
    expect(
      validateSync(Object.assign(new GetUploadUrlDto(), { path: unsafePath })),
    ).not.toHaveLength(0);
  });

  it('accepts a generated upload request with no explicit path', () => {
    expect(validateSync(new GetUploadUrlDto())).toHaveLength(0);
    expect(
      validateSync(Object.assign(new ConfirmPhotoDto(), { path })),
    ).toHaveLength(0);
  });
});
