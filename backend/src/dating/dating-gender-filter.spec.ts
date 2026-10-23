import { Queue } from 'bull';
import { DatingService } from './dating.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { EphemerisService } from '../services/ephemeris.service';
import { RedisService } from '../redis/redis.service';

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const seekerId = id(1);

function candidate(
  n: number,
  gender: string | null,
  wantedGender: string | null,
) {
  const userId = id(n);
  return {
    id: userId,
    name: `Person ${n}`,
    email: `person${n}@example.com`,
    birth_date: null,
    birth_time: null,
    birth_place: null,
    onboarding_completed: true,
    charts: [],
    profile: {
      userId,
      gender,
      lookingForGender: wantedGender,
      preferences: {},
      isOnboarded: true,
    },
    photos: [{ userId, storagePath: `${userId}/photo.jpg` }],
  };
}

function harness() {
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    userBlock: { findMany: jest.fn().mockResolvedValue([]) },
    userProfile: {
      findUnique: jest.fn().mockResolvedValue({
        gender: 'male',
        lookingForGender: 'female',
        preferences: {},
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    public_users: { findMany: jest.fn().mockResolvedValue([]) },
    datingMatch: { findMany: jest.fn().mockResolvedValue([]) },
    chart: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const supabase = {
    rpcWithToken: jest.fn().mockResolvedValue({ data: [], error: null }),
    getUser: jest
      .fn()
      .mockResolvedValue({ data: { user: { id: seekerId } }, error: null }),
    normalizeUserProfileRecord: jest.fn((value: unknown) => value),
    createSignedUrlsBatch: jest.fn(
      async (_bucket: string, paths: string[]) =>
        new Map(paths.map((path) => [path, `signed:${path}`])),
    ),
    getAdminClient: () => ({
      from: () => ({
        select: () => ({ or: async () => ({ data: [], error: null }) }),
      }),
    }),
  };
  const service = new DatingService(
    prisma as unknown as PrismaService,
    {} as EphemerisService,
    supabase as unknown as SupabaseService,
    {} as RedisService,
    {} as Queue,
  );
  return { service, prisma, supabase };
}

describe('Dating gender preferences across feed paths', () => {
  it.each(['ranked', 'fallback'])(
    'replays passed and liked profiles in the %s feed while preserving gender and both-way blocks',
    async (path) => {
      for (const includeReviewed of [false, true]) {
        const { service, prisma, supabase } = harness();
        const people = [
          candidate(2, 'female', 'male'),
          candidate(3, 'female', 'male'),
          candidate(4, 'female', 'male'),
          candidate(5, 'female', 'male'),
          candidate(6, 'female', 'male'),
          candidate(7, 'male', 'male'),
          candidate(8, 'female', 'female'),
        ];
        prisma.$queryRaw.mockResolvedValue([
          { target_user_id: id(2), action: 'pass' },
          { target_user_id: id(3), action: 'like' },
          { target_user_id: id(4), action: 'super_like' },
        ]);
        prisma.userBlock.findMany.mockResolvedValue([
          { userId: seekerId, blockedUserId: id(5) },
          { userId: id(6), blockedUserId: seekerId },
        ]);
        if (path === 'ranked') {
          supabase.rpcWithToken.mockResolvedValueOnce({
            data: people.map((person) => ({
              user_id: person.id,
              badge: 'high',
              primary_photo_path: person.photos[0].storagePath,
            })),
            error: null,
          });
          prisma.public_users.findMany.mockResolvedValueOnce(people);
        } else {
          prisma.public_users.findMany
            .mockResolvedValueOnce(people)
            .mockResolvedValueOnce(people);
        }

        const result = await service.getCandidatesViaSupabase(
          'caller-token',
          20,
          includeReviewed,
        );

        expect(result.map((person) => person.userId)).toEqual(
          includeReviewed ? [id(2), id(3), id(4)] : [],
        );
      }
    },
  );

  it.each(['ranked', 'fallback'])(
    'returns no profiles instead of incompatible genders when the %s pool has no women',
    async (path) => {
      const { service, prisma, supabase } = harness();
      const people = [candidate(2, 'male', null), candidate(4, null, null)];
      if (path === 'ranked') {
        supabase.rpcWithToken.mockResolvedValueOnce({
          data: people.map((person) => ({
            user_id: person.id,
            badge: 'high',
            primary_photo_path: person.photos[0].storagePath,
          })),
          error: null,
        });
        prisma.public_users.findMany.mockResolvedValueOnce(people);
      } else {
        prisma.public_users.findMany
          .mockResolvedValueOnce(people)
          .mockResolvedValueOnce(people);
      }

      await expect(
        service.getCandidatesViaSupabase('caller-token', 1),
      ).resolves.toEqual([]);
    },
  );

  it.each(['ranked', 'fallback'])(
    'only returns mutually interested women from the %s discovery feed',
    async (path) => {
      const { service, prisma, supabase } = harness();
      const people = [
        candidate(2, 'male', 'male'),
        candidate(3, 'female', 'male'),
        candidate(4, null, null),
        candidate(5, 'other', null),
        candidate(6, 'female', 'female'),
      ];
      if (path === 'ranked') {
        supabase.rpcWithToken.mockResolvedValueOnce({
          data: people.map((person) => ({
            user_id: person.id,
            badge: 'high',
            primary_photo_path: person.photos[0].storagePath,
          })),
          error: null,
        });
        prisma.public_users.findMany.mockResolvedValueOnce(people);
      } else {
        prisma.public_users.findMany
          .mockResolvedValueOnce(people)
          .mockResolvedValueOnce(people);
      }

      const result = await service.getCandidatesViaSupabase('caller-token', 1);

      expect(result.map((person) => person.userId)).toEqual([id(3)]);
      expect(
        supabase.createSignedUrlsBatch.mock.calls.every(([, paths]) =>
          paths.every((photoPath) => photoPath.startsWith(id(3))),
        ),
      ).toBe(true);
    },
  );

  it('does not return an unfiltered feed if the requester cannot be resolved', async () => {
    const { service, supabase } = harness();
    supabase.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Temporary failure' },
    } as never);
    await expect(
      service.getCandidatesViaSupabase('caller-token'),
    ).rejects.toMatchObject({ status: 503 });
  });

  it('rechecks current profile preferences before returning cached legacy recommendations', async () => {
    const { service, prisma } = harness();
    const people = [
      candidate(2, 'male', 'male'),
      candidate(3, 'female', 'male'),
    ];
    prisma.datingMatch.findMany.mockResolvedValueOnce(
      people.map((person) => ({
        id: `cache-${person.id}`,
        userId: seekerId,
        candidateData: { partnerId: person.id, partnerName: person.name },
        createdAt: new Date(),
        compatibility: 90,
      })),
    );
    prisma.userProfile.findMany.mockResolvedValueOnce(
      people.map((person) => person.profile),
    );

    const result = await service.getMatches(seekerId);

    expect(result.map((person) => person.partnerId)).toEqual([id(3)]);
  });

  it('uses a nonempty legacy preference when the canonical value is blank', () => {
    const { service } = harness();
    const checker = service as unknown as {
      passesGenderPreferences: (seeker: unknown, candidate: unknown) => boolean;
    };
    const seeker = {
      gender: 'male',
      lookingForGender: ' ',
      preferences: { looking_for_gender: 'female' },
    };
    expect(checker.passesGenderPreferences(seeker, { gender: 'male' })).toBe(
      false,
    );
    expect(checker.passesGenderPreferences(seeker, { gender: 'female' })).toBe(
      true,
    );
  });

  it('does not let legacy preferences override an explicit current selection', () => {
    const { service } = harness();
    const checker = service as unknown as {
      passesGenderPreferences: (seeker: unknown, candidate: unknown) => boolean;
    };
    const seeker = {
      gender: 'male',
      lookingForGender: 'female',
      preferences: { looking_for_gender: 'male' },
    };
    expect(checker.passesGenderPreferences(seeker, { gender: 'male' })).toBe(
      false,
    );
    expect(checker.passesGenderPreferences(seeker, { gender: 'female' })).toBe(
      true,
    );
  });
});
