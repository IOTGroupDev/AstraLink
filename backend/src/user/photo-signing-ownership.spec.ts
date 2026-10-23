import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bull';
import { ChartService } from '../chart/chart.service';
import { DatingService } from '../dating/dating.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { UserRepository } from '../repositories';
import { EphemerisService } from '../services/ephemeris.service';
import { SupabaseService } from '../supabase/supabase.service';
import { isOwnedPhotoPath } from './dto/photos.dto';
import { UserService } from './user.service';

const ownerId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const ownPath = `${ownerId}/photo.jpg`;
const otherPath = `${otherId}/photo.jpg`;

function photo(storagePath: string, userId = ownerId, isPrimary = true) {
  return {
    id: `${userId}-photo`,
    userId,
    storagePath,
    isPrimary,
    createdAt: new Date('2026-10-13T00:00:00Z'),
  };
}

function user(userId = ownerId, photos = [photo(ownPath)]) {
  return {
    id: userId,
    email: 'person@example.com',
    name: 'Person',
    onboarding_completed: true,
    birth_date: null,
    birth_time: null,
    birth_place: null,
    created_at: new Date('2026-10-13T00:00:00Z'),
    updated_at: new Date('2026-10-13T00:00:00Z'),
    profile: null,
    charts: [],
    photos,
  };
}

function createHarness() {
  const supabase = {
    normalizeUserProfileRecord: jest.fn((value: unknown) => value),
    createSignedUrl: jest.fn(
      async (_bucket: string, path: string) => `signed:${path}`,
    ),
    createSignedUrlsBatch: jest.fn(
      async (_bucket: string, paths: string[]) =>
        new Map(paths.map((path) => [path, `signed:${path}`])),
    ),
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'self-id' } } }),
    rpcWithToken: jest.fn().mockResolvedValue({ data: [], error: null }),
    getAdminClient: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
  };
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    userPhoto: { findFirst: jest.fn().mockResolvedValue(photo(ownPath)) },
    public_users: {
      findUnique: jest.fn().mockResolvedValue(user()),
      findMany: jest.fn().mockResolvedValue([]),
    },
    userBlock: { findMany: jest.fn().mockResolvedValue([]) },
    userProfile: { findUnique: jest.fn().mockResolvedValue(null) },
  };
  const repository = { findById: jest.fn().mockResolvedValue(user()) };
  const userService = new UserService(
    supabase as unknown as SupabaseService,
    {} as ChartService,
    repository as unknown as UserRepository,
    {} as EventEmitter2,
    prisma as unknown as PrismaService,
    {} as import('../redis/redis.service').RedisService,
  );
  const dating = new DatingService(
    prisma as unknown as PrismaService,
    {} as EphemerisService,
    supabase as unknown as SupabaseService,
    {} as RedisService,
    {} as Queue,
  );
  return { userService, dating, supabase, prisma };
}

describe('stored photo ownership in profile and dating signers', () => {
  let harness: ReturnType<typeof createHarness>;

  beforeEach(() => {
    harness = createHarness();
  });

  it.each([
    otherPath,
    `${ownerId}/../photo.jpg`,
    `${ownerId}/%2e%2e/photo.jpg`,
    `${ownPath}\n`,
    'https://example.com/photo.jpg',
  ])('does not sign an unsafe primary profile path %p', async (unsafePath) => {
    harness.prisma.userPhoto.findFirst.mockResolvedValue(photo(unsafePath));

    const profile = await harness.userService.getProfile(ownerId);

    expect(profile).toMatchObject({
      primaryPhotoUrl: null,
      primaryPhotoPath: null,
      primaryPhotoExpiresAt: null,
    });
    expect(harness.supabase.createSignedUrl).not.toHaveBeenCalled();
  });

  it('does not sign a photo row belonging to a different profile', async () => {
    harness.prisma.userPhoto.findFirst.mockResolvedValue(
      photo(otherPath, otherId),
    );
    const profile = await harness.userService.getProfile(ownerId);
    expect(profile.primaryPhotoUrl).toBeNull();
    expect(harness.supabase.createSignedUrl).not.toHaveBeenCalled();
  });

  it('preserves valid primary profile signing and its expiration', async () => {
    const profile = await harness.userService.getProfile(ownerId);

    expect(profile.primaryPhotoPath).toBe(ownPath);
    expect(profile.primaryPhotoUrl).toBe(`signed:${ownPath}`);
    expect(profile.primaryPhotoExpiresAt).toBeTruthy();
    expect(harness.supabase.createSignedUrl).toHaveBeenCalledWith(
      'user-photos',
      ownPath,
      86400,
    );
  });

  it('public card signs only photos owned by its target and uses a safe fallback', async () => {
    harness.prisma.public_users.findUnique.mockResolvedValue(
      user(ownerId, [
        photo(otherPath),
        photo(`${ownerId}/../photo.jpg`, ownerId, false),
        photo('https://example.com/photo.jpg', ownerId, false),
        photo(otherPath, otherId, false),
        photo(ownPath, ownerId, false),
      ]),
    );

    const card = await harness.dating.getPublicProfileForCard(ownerId);

    expect(card.primaryPhotoUrl).toBe(`signed:${ownPath}`);
    expect(card.photos).toEqual([`signed:${ownPath}`]);
    expect(harness.supabase.createSignedUrl).not.toHaveBeenCalled();
    expect(harness.supabase.createSignedUrlsBatch).toHaveBeenCalledWith(
      'user-photos',
      [ownPath],
      900,
    );
  });

  it('public card never signs when every stored photo is unsafe', async () => {
    harness.prisma.public_users.findUnique.mockResolvedValue(
      user(ownerId, [photo(otherPath), photo(`${ownerId}/%2fphoto.jpg`)]),
    );
    const card = await harness.dating.getPublicProfileForCard(ownerId);
    expect(card.primaryPhotoUrl).toBeNull();
    expect(harness.supabase.createSignedUrl).not.toHaveBeenCalled();
    expect(harness.supabase.createSignedUrlsBatch).not.toHaveBeenCalled();
  });

  it("ranked feed cannot reuse another candidate's signed map entry as its primary", async () => {
    harness.supabase.rpcWithToken.mockResolvedValue({
      data: [
        { user_id: ownerId, badge: 'high', primary_photo_path: otherPath },
        { user_id: otherId, badge: 'high', primary_photo_path: otherPath },
      ],
      error: null,
    });
    harness.prisma.public_users.findMany.mockResolvedValue([
      user(ownerId, [photo(otherPath), photo(ownPath)]),
      user(otherId, [photo(otherPath, otherId)]),
    ]);

    const candidates = await harness.dating.getCandidatesViaSupabase(
      'user-token',
      2,
    );

    expect(candidates[0]).toMatchObject({
      userId: ownerId,
      photoUrl: `signed:${ownPath}`,
      photos: [`signed:${ownPath}`],
    });
    expect(candidates[1]).toMatchObject({
      userId: otherId,
      photoUrl: `signed:${otherPath}`,
    });
    expect(harness.supabase.createSignedUrlsBatch).toHaveBeenCalledWith(
      'user-photos',
      [ownPath, otherPath],
      900,
    );
  });

  it('fallback candidate feed excludes foreign photo paths before batch signing', async () => {
    const candidate = user(ownerId, [photo(otherPath), photo(ownPath)]);
    harness.prisma.public_users.findMany
      .mockResolvedValueOnce([candidate])
      .mockResolvedValueOnce([candidate]);

    const candidates = await harness.dating.getCandidatesViaSupabase(
      'user-token',
      1,
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      userId: ownerId,
      photoUrl: `signed:${ownPath}`,
      photos: [`signed:${ownPath}`],
    });
    expect(harness.supabase.createSignedUrlsBatch).toHaveBeenCalledWith(
      'user-photos',
      [ownPath],
      900,
    );
  });
});

describe('shared photo owner path helper', () => {
  it.each([null, undefined, '', `${ownerId}/`, `${ownerId}\n`, '../owner'])(
    'rejects invalid owner id %p',
    (invalidOwner) => {
      expect(isOwnedPhotoPath(invalidOwner, ownPath)).toBe(false);
    },
  );

  it('allows safe native paths and keeps the owner boundary exact', () => {
    expect(isOwnedPhotoPath(ownerId, `${ownerId}/album_1/photo-2.webp`)).toBe(
      true,
    );
    expect(isOwnedPhotoPath(ownerId, `${ownerId}-suffix/photo.jpg`)).toBe(
      false,
    );
    expect(isOwnedPhotoPath(ownerId, otherPath)).toBe(false);
  });
});
