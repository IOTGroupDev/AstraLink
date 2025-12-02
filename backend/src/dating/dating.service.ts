import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { EphemerisService } from '../services/ephemeris.service';
import { SupabaseService } from '../supabase/supabase.service';
import { RedisService } from '../redis/redis.service';
import type { DatingMatchResponse } from '../types';
import { parseInterests } from '../utils/preferences.utils';
import type {
  CandidateBadge,
  CandidateRow,
  EnrichedCandidate,
  ChartData,
  ChartAspect,
  Element,
  ZodiacSign,
  UserData,
  UserProfile,
  UserChart,
  UserPhoto,
  SynastryData,
} from './dating.types';

@Injectable()
export class DatingService {
  private readonly logger = new Logger(DatingService.name);

  // Cache TTL for synastry: 7 days (doesn't change unless charts change)
  private readonly SYNASTRY_CACHE_TTL = 7 * 24 * 60 * 60;

  constructor(
    private prisma: PrismaService,
    private ephemerisService: EphemerisService,
    private supabaseService: SupabaseService,
    private redis: RedisService,
    @InjectQueue('compatibility-calculation')
    private compatibilityQueue: Queue,
  ) {}

  // Helpers for improved matching

  private getAgeFromBirthDate(birthDate?: string | Date | null): number | null {
    if (!birthDate) return null;
    const d = new Date(birthDate);
    if (isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  private getSunSign(chart: ChartData | null | undefined): ZodiacSign | null {
    try {
      return (
        chart?.data?.planets?.sun?.sign || chart?.planets?.sun?.sign || null
      );
    } catch {
      return null;
    }
  }

  private elementFromSign(sign?: ZodiacSign | string | null): Element | null {
    if (!sign) return null;
    const s = String(sign);
    const fire = new Set<string>(['Aries', 'Leo', 'Sagittarius']);
    const earth = new Set<string>(['Taurus', 'Virgo', 'Capricorn']);
    const air = new Set<string>(['Gemini', 'Libra', 'Aquarius']);
    const water = new Set<string>(['Cancer', 'Scorpio', 'Pisces']);
    if (fire.has(s)) return 'fire';
    if (earth.has(s)) return 'earth';
    if (air.has(s)) return 'air';
    if (water.has(s)) return 'water';
    return null;
  }

  private elementSynergyBonus(a: Element | null, b: Element | null): number {
    if (!a || !b) return 0;
    if (a === b) return 4; // одинаковая стихия
    // гармоничные пары
    if ((a === 'fire' && b === 'air') || (a === 'air' && b === 'fire'))
      return 6;
    if ((a === 'earth' && b === 'water') || (a === 'water' && b === 'earth'))
      return 6;
    // менее совместимые пары
    if ((a === 'fire' && b === 'water') || (a === 'water' && b === 'fire'))
      return -4;
    if ((a === 'air' && b === 'earth') || (a === 'earth' && b === 'air'))
      return -4;
    return 0;
  }

  private isHarmoniousAspect(type: string): boolean {
    return ['trine', 'sextile', 'conjunction'].includes(type);
  }

  private isChallengingAspect(type: string): boolean {
    return ['square', 'opposition'].includes(type);
  }

  private getHouseForLongitude(
    longitude: number,
    houses: Record<number, { cusp: number }> | null | undefined,
  ): number {
    if (!houses) return 1;
    for (let i = 1; i <= 12; i++) {
      const nextHouse = i === 12 ? 1 : i + 1;
      const cusp1 = houses[i]?.cusp ?? (i - 1) * 30;
      const cusp2 = houses[nextHouse]?.cusp ?? (i % 12) * 30;
      if (cusp1 <= cusp2) {
        if (longitude >= cusp1 && longitude < cusp2) return i;
      } else {
        if (longitude >= cusp1 || longitude < cusp2) return i;
      }
    }
    return 1;
  }

  private calcFinalCompatibility(
    base: number,
    synastry: SynastryData | null | undefined,
    chartA: ChartData | null | undefined,
    chartB: ChartData | null | undefined,
  ): number {
    let score = Number.isFinite(base) ? base : 0;

    // 1) Бонус по стихиям Солнца
    const sunA = this.getSunSign(chartA);
    const sunB = this.getSunSign(chartB);
    const elA = this.elementFromSign(sunA);
    const elB = this.elementFromSign(sunB);
    score += this.elementSynergyBonus(elA, elB);

    const aspects: ChartAspect[] = Array.isArray(synastry?.aspects)
      ? synastry.aspects
      : [];

    // 2) Венера—Марс
    const vm = aspects.find(
      (a) =>
        (a.planetA === 'venus' && a.planetB === 'mars') ||
        (a.planetA === 'mars' && a.planetB === 'venus'),
    );
    if (vm) {
      if (this.isHarmoniousAspect(vm.aspect)) score += 8 * (vm.strength ?? 1);
      if (this.isChallengingAspect(vm.aspect)) score -= 6 * (vm.strength ?? 1);
    }

    // 3) Луна—Луна
    const mm = aspects.find(
      (a) => a.planetA === 'moon' && a.planetB === 'moon',
    );
    if (mm) {
      if (this.isHarmoniousAspect(mm.aspect)) score += 6 * (mm.strength ?? 1);
      if (this.isChallengingAspect(mm.aspect)) score -= 6 * (mm.strength ?? 1);
    }

    // 4) Усиление по домам любви (5/7/8)
    const housesA = chartA?.data?.houses || chartA?.houses;
    const housesB = chartB?.data?.houses || chartB?.houses;
    const loveHouses = new Set([5, 7, 8]);

    const consider = (a?: {
      planetA: string;
      planetB: string;
      strength?: number;
    }) => {
      if (!a) return;
      const longA =
        chartA?.data?.planets?.[a.planetA]?.longitude ??
        chartA?.planets?.[a.planetA]?.longitude;
      const longB =
        chartB?.data?.planets?.[a.planetB]?.longitude ??
        chartB?.planets?.[a.planetB]?.longitude;
      if (typeof longA === 'number' && housesA) {
        const hA = this.getHouseForLongitude(longA, housesA);
        if (loveHouses.has(hA)) score += 2 * (a.strength ?? 1);
      }
      if (typeof longB === 'number' && housesB) {
        const hB = this.getHouseForLongitude(longB, housesB);
        if (loveHouses.has(hB)) score += 2 * (a.strength ?? 1);
      }
    };

    consider(vm);
    consider(mm);

    score = Math.max(0, Math.min(100, Math.round(score)));
    return score;
  }

  /**
   * Получить кандидатов через Supabase RPC get_candidates_for_me
   * Требуется user access token для корректного auth.uid() в RLS.
   */
  async getCandidatesViaSupabase(userAccessToken: string, limit = 20) {
    const safeLimit = Math.max(1, Math.min(50, limit));
    const { data, error } = await this.supabaseService.rpcWithToken<
      CandidateRow[]
    >('get_candidates_for_me', { p_limit: safeLimit }, userAccessToken);

    const rows: CandidateRow[] = Array.isArray(data) ? data : [];

    const admin = this.supabaseService.getAdminClient();

    // Итоговый список кандидатов (уже обогащённых)
    let result: EnrichedCandidate[] = [];

    // Основной путь: обогащаем данные RPC, если что-то вернулось
    if (!error && rows.length > 0) {
      const candidateIds = rows.map((r) => r.user_id);

      // ✅ PRISMA: Получаем данные пользователей с профилями и картами через include
      const users = await this.prisma.public_users.findMany({
        where: { id: { in: candidateIds } },
        include: {
          profile: true, // UserProfile relation
          charts: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      // Преобразуем в Map для быстрого доступа
      const usersMap = new Map<string, any>(
        users.map((u: any) => [
          u.id,
          {
            id: u.id,
            name: u.name,
            email: u.email,
            birth_date: u.birth_date,
            birth_place: u.birth_place,
          },
        ]),
      );

      const profilesMap = new Map<string, any>(
        users
          .filter((u: any) => u.profile)
          .map((u: any) => [
            u.id,
            {
              user_id: u.id,
              bio: u.profile!.bio,
              preferences: u.profile!.interests, // interests is the new field
              city: u.profile!.city,
              gender: undefined, // not in current schema
              display_name: undefined, // not in current schema
              zodiac_sign: u.profile!.zodiacSign,
            },
          ]),
      );

      const chartsMap = new Map<string, UserChart>();
      for (const u of users) {
        if (u.charts && u.charts.length > 0) {
          const ch = u.charts[0]; // First chart (already sorted by createdAt desc)
          chartsMap.set(u.id, {
            user_id: u.id,
            data: ch.data as ChartData,
            created_at: ch.createdAt.toISOString(),
          } as UserChart);
        }
      }

      // ✅ ОПТИМИЗАЦИЯ: Batch create signed URLs for all photos
      // Используем createSignedUrlsBatch вместо множества отдельных запросов
      const photoPaths = rows
        .filter((r) => r.primary_photo_path)
        .map((r) => r.primary_photo_path!);

      const photoUrlsBatch = await this.supabaseService.createSignedUrlsBatch(
        'user-photos',
        photoPaths,
        900,
      );

      // Create userId -> URL map from path -> URL map
      const photoUrlMap = new Map<string, string | null>();
      for (const r of rows) {
        if (r.primary_photo_path) {
          photoUrlMap.set(
            r.user_id,
            photoUrlsBatch.get(r.primary_photo_path) ?? null,
          );
        }
      }

      // Build candidate list without additional async calls
      result = rows.map((r) => {
        const u = usersMap.get(r.user_id);
        const p = profilesMap.get(r.user_id);
        const ch = chartsMap.get(r.user_id);
        const sunSign =
          p?.zodiac_sign ??
          ch?.data?.planets?.sun?.sign ??
          ch?.data?.data?.planets?.sun?.sign ??
          null;

        const age = this.getAgeFromBirthDate(u?.birth_date);

        const emailPrefix = u?.email ? String(u.email).split('@')[0] : null;
        const displayName = p?.display_name ?? u?.name ?? emailPrefix ?? null;

        // Parse interests using utility function
        const interests = parseInterests(p?.preferences);

        return {
          userId: r.user_id,
          badge: r.badge,
          photoUrl: photoUrlMap.get(r.user_id) ?? null,
          name: displayName,
          age: age ?? null,
          zodiacSign: sunSign,
          bio: p?.bio ?? null,
          interests,
          city: p?.city ?? u?.birth_place ?? null,
        };
      });
    }

    // Фолбэк: если RPC ничего не вернул ИЛИ вернуло меньше лимита — добираем свежими пользователями
    try {
      const needMore = safeLimit - result.length;
      if (needMore > 0) {
        const { data: selfRes } =
          await this.supabaseService.getUser(userAccessToken);
        const selfId = selfRes?.user?.id;

        const existingIds = new Set<string>(result.map((r) => r.userId));

        // ✅ PRISMA: Получаем дополнительных пользователей
        const moreUsers = await this.prisma.public_users.findMany({
          orderBy: { created_at: 'desc' },
          take: Math.max(needMore * 3, 10),
          select: {
            id: true,
            name: true,
            email: true,
            birth_date: true,
            birth_place: true,
            created_at: true,
          },
        });

        const extraIds = moreUsers
          .map((u: any) => u.id)
          .filter((id: string) => id !== selfId && !existingIds.has(id));

        if (extraIds.length) {
          // ✅ PRISMA: Получаем профили, карты и фото через include
          const extraUsersData = await this.prisma.public_users.findMany({
            where: { id: { in: extraIds } },
            include: {
              profile: true,
              charts: {
                orderBy: { createdAt: 'desc' },
              },
              photos: {
                where: { isPrimary: true },
              },
            },
          });

          const usersById = new Map<string, UserData>(
            moreUsers.map((u: any) => [u.id, u as UserData]),
          );

          const profilesById = new Map<string, UserProfile>();
          const chartsById = new Map<string, UserChart>();
          const photosById = new Map<string, string | null>();

          for (const u of extraUsersData) {
            // Profile
            if (u.profile) {
              profilesById.set(u.id, {
                user_id: u.id,
                bio: u.profile.bio ?? null,
                preferences: u.profile.interests ?? {},
                city: u.profile.city ?? null,
                gender: undefined,
                display_name: undefined,
                zodiac_sign: u.profile.zodiacSign ?? null,
              } as UserProfile);
            }

            // Chart (first one)
            if (u.charts && u.charts.length > 0) {
              const ch = u.charts[0];
              chartsById.set(u.id, {
                user_id: u.id,
                data: ch.data as ChartData,
                created_at: ch.createdAt.toISOString(),
              } as UserChart);
            }

            // Photo (primary)
            if (u.photos && u.photos.length > 0) {
              photosById.set(u.id, u.photos[0].storagePath);
            }
          }

          // ✅ ОПТИМИЗАЦИЯ: Batch create signed URLs for fallback candidates
          const fallbackUserIds = extraIds.slice(0, needMore);
          const fallbackPhotoPaths = fallbackUserIds
            .map((uid: string) => photosById.get(uid))
            .filter((path: string | undefined): path is string => !!path && typeof path === 'string');

          const fallbackPhotoUrlsBatch =
            await this.supabaseService.createSignedUrlsBatch(
              'user-photos',
              fallbackPhotoPaths,
              900,
            );

          // Create userId -> URL map
          const fallbackPhotoUrlMap = new Map<string, string | null>();
          for (const uid of fallbackUserIds) {
            const storagePath = photosById.get(uid);
            if (storagePath) {
              fallbackPhotoUrlMap.set(
                uid,
                fallbackPhotoUrlsBatch.get(storagePath) ?? null,
              );
            } else {
              fallbackPhotoUrlMap.set(uid, null);
            }
          }

          const extraEnriched: EnrichedCandidate[] = [];
          for (const uid of extraIds) {
            if (extraEnriched.length >= needMore) break;
            if (result.find((r) => r.userId === uid)) continue;

            const u = usersById.get(uid);
            const p = profilesById.get(uid);
            const ch = chartsById.get(uid);

            const emailPrefix = u?.email ? String(u.email).split('@')[0] : null;
            const displayName =
              p?.display_name ?? u?.name ?? emailPrefix ?? null;

            const age = this.getAgeFromBirthDate(u?.birth_date);
            const sunSign =
              p?.zodiac_sign ??
              ch?.data?.planets?.sun?.sign ??
              ch?.data?.data?.planets?.sun?.sign ??
              null;

            // Parse interests using utility function
            const interests = parseInterests(p?.preferences);

            extraEnriched.push({
              userId: uid,
              badge: 'low',
              photoUrl: fallbackPhotoUrlMap.get(uid) ?? null,
              name: displayName,
              age: age ?? null,
              zodiacSign: sunSign ?? null,
              bio: p?.bio ?? null,
              interests,
              city: p?.city ?? u?.birth_place ?? null,
            });
          }

          if (extraEnriched.length) {
            result = [...result, ...extraEnriched].slice(0, safeLimit);
          }
        }
      }
    } catch {
      // ignore
    }

    return result;
  }

  /**
   * Отправить лайк/действие через Supabase RPC create_like
   * Возвращает matchId (uuid) при взаимности, иначе null
   */
  async likeUserViaSupabase(
    userAccessToken: string,
    targetUserId: string,
    action: 'like' | 'super_like' | 'pass' = 'like',
  ) {
    const { data, error } = await this.supabaseService.rpcWithToken<
      string | null
    >(
      'create_like',
      { p_target_user_id: targetUserId, p_action: action },
      userAccessToken,
    );
    if (error) {
      return { success: false, matchId: null, message: 'Like failed' };
    }
    return {
      success: true,
      matchId: data ?? null,
      message: data ? 'Mutual match' : 'Action recorded',
    };
  }

  /**
   * Триггернуть ночной ранк кандидатов вручную (админ RPC).
   * Возвращает success:true, если RPC отработал без ошибки.
   */
  async runRankCandidatesNightly(): Promise<{ success: boolean }> {
    const { error } = await this.supabaseService.rpcAdmin(
      'rank_candidates_nightly',
      {},
    );
    if (error) {
      return { success: false };
    }
    return { success: true };
  }

  /**
   * ✅ ОПТИМИЗАЦИЯ: Get synastry with Redis caching
   * Checks cache first, calculates and caches if not found
   *
   * Performance improvement: ~50-100ms per cached synastry
   * For 200 candidates: 10-20s → <1s
   */
  private async getCachedSynastry(
    userChartId: string,
    candidateChartId: string,
    userChartData: any,
    candidateChartData: any,
  ): Promise<SynastryData> {
    // Generate cache key (sorted to ensure consistency)
    const cacheKey = this.getSynastryCacheKey(userChartId, candidateChartId);

    // Check cache first
    const cached = await this.redis.get<SynastryData>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - calculate synastry
    const synastry = await this.ephemerisService.getSynastry(
      userChartData,
      candidateChartData,
    );

    // Cache for 7 days
    await this.redis.set(cacheKey, synastry, this.SYNASTRY_CACHE_TTL);

    // Queue background job to pre-calculate for related candidates
    // (fire and forget - don't await)
    this.compatibilityQueue
      .add('calculate-synastry', {
        userChartId,
        candidateChartId,
        userChartData,
        candidateChartData,
      })
      .catch((err) =>
        this.logger.warn(
          `Failed to queue synastry calculation: ${err.message}`,
        ),
      );

    return synastry;
  }

  /**
   * Generate cache key for synastry (sorted for consistency)
   */
  private getSynastryCacheKey(chartId1: string, chartId2: string): string {
    const [id1, id2] = [chartId1, chartId2].sort();
    return `synastry:${id1}:${id2}`;
  }

  async getMatches(
    userId: string,
    filters?: {
      ageMin?: number;
      ageMax?: number;
      city?: string;
      limit?: number;
    },
  ): Promise<DatingMatchResponse[]> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const hasFilters = !!(
      filters?.ageMin ||
      filters?.ageMax ||
      (filters?.city && filters.city.trim().length > 0)
    );

    const mapToResponse = (m: any): DatingMatchResponse => ({
      id: m.id,
      partnerId: m.candidateData?.partnerId ?? 'unknown',
      partnerName:
        m.candidateData?.partnerName ?? m.candidateData?.name ?? 'Кандидат',
      compatibility: m.compatibility ?? 0,
      status: m.rejected ? 'rejected' : m.liked ? 'accepted' : 'pending',
      details: m.candidateData ?? {},
      createdAt:
        typeof m.createdAt === 'string'
          ? m.createdAt
          : (m.createdAt as Date).toISOString(),
    });

    // 1) Кэш — только если нет фильтров
    if (!hasFilters) {
      const cached = await this.prisma.datingMatch.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { compatibility: 'desc' },
        take: Math.max(1, Math.min(50, filters?.limit ?? 20)),
      });
      if (cached.length > 0) {
        return cached.map(mapToResponse);
      }
    }

    // 2) Генерация on-demand
    const selfChart = await this.prisma.chart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!selfChart) {
      return [];
    }

    const candidates = await this.prisma.chart.findMany({
      where: { NOT: { userId } },
      include: {
        users: true,
      },
      take: 200,
    });

    // ✅ ОПТИМИЗАЦИЯ: Фильтрация ПЕРЕД расчётом совместимости
    const filteredCandidates = candidates.filter((c: any) => {
      // Фильтр по городу
      if (filters?.city) {
        const city = filters.city.trim().toLowerCase();
        const birthPlace = c.users?.birth_place
          ? String(c.users.birth_place).trim().toLowerCase()
          : '';
        if (!birthPlace || birthPlace !== city) return false;
      }

      // Фильтр по возрасту
      if (filters?.ageMin != null || filters?.ageMax != null) {
        const age = this.getAgeFromBirthDate(c.users?.birth_date);
        if (age != null) {
          if (filters?.ageMin != null && age < filters.ageMin) return false;
          if (filters?.ageMax != null && age > filters.ageMax) return false;
        }
      }

      return true;
    });

    // ✅ КРИТИЧНОЕ ИСПРАВЛЕНИЕ: Batch processing вместо N+1 queries
    // Обрабатываем по 20 кандидатов параллельно для оптимизации
    const BATCH_SIZE = 20;
    const rows: {
      userId: string;
      candidateData: any;
      compatibility: number;
      liked: boolean;
      rejected: boolean;
    }[] = [];

    for (let i = 0; i < filteredCandidates.length; i += BATCH_SIZE) {
      const batch = filteredCandidates.slice(i, i + BATCH_SIZE);

      // Параллельная обработка батча с Promise.all()
      const batchResults = await Promise.allSettled(
        batch.map(async (c: any) => {
          // ✅ ОПТИМИЗАЦИЯ: Use cached synastry instead of calculating every time
          const syn = await this.getCachedSynastry(
            selfChart.id,
            c.id,
            selfChart.data as ChartData,
            c.data,
          );

          const baseCompatibility = Math.max(
            0,
            Math.min(100, Math.round(Number(syn?.compatibility ?? 0))),
          );

          // Усиленная формула: стихии + Венера/Марс + Луна/Луна + дома 5/7/8
          const finalCompatibility = this.calcFinalCompatibility(
            baseCompatibility,
            syn,
            selfChart.data as unknown as ChartData,
            c.data as unknown as ChartData,
          );

          const partnerName =
            c.users?.name || c.users?.email?.split('@')?.[0] || 'Кандидат';
          const sunSign = c.data?.planets?.sun?.sign ?? undefined;

          const candidateData = {
            partnerId: c.userId,
            partnerName,
            email: c.users?.email,
            birthDate: c.users?.birth_date ?? null,
            birthTime: c.users?.birth_time ?? null,
            birthPlace: c.users?.birth_place ?? null,
            sign: sunSign,
          };

          return {
            userId,
            candidateData,
            compatibility: finalCompatibility,
            liked: false,
            rejected: false,
          };
        }),
      );

      // Собираем успешные результаты
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          rows.push(result.value);
        }
        // Если status === 'rejected' - просто пропускаем проблемного кандидата
      }
    }

    rows.sort((a, b) => b.compatibility - a.compatibility);
    const limit = Math.max(1, Math.min(50, filters?.limit ?? 20));
    const topRows = rows.slice(0, limit);

    if (!hasFilters) {
      await this.prisma.datingMatch.deleteMany({ where: { userId } });
      if (topRows.length > 0) {
        await this.prisma.datingMatch.createMany({ data: topRows });
      }
      const fresh = await this.prisma.datingMatch.findMany({
        where: { userId },
        orderBy: { compatibility: 'desc' },
        take: limit,
      });
      return fresh.map(mapToResponse);
    }

    // С фильтрами — ephemeral ответ (без записи в кэш)
    return topRows.map((r) => ({
      id: r.candidateData.partnerId,
      partnerId: r.candidateData.partnerId,
      partnerName: r.candidateData.partnerName,
      compatibility: r.compatibility,
      status: 'pending',
      details: r.candidateData,
      createdAt: new Date().toISOString(),
    }));
  }

  async likeMatch(userId: string, matchId: string) {
    await this.prisma.datingMatch.updateMany({
      where: { id: matchId, userId },
      data: { liked: true, rejected: false },
    });
    return {
      success: true,
      message: 'Лайк поставлен',
      matchId,
    };
  }

  async rejectMatch(userId: string, matchId: string) {
    await this.prisma.datingMatch.updateMany({
      where: { id: matchId, userId },
      data: { rejected: true, liked: false },
    });
    return {
      success: true,
      message: 'Кандидат отклонен',
      matchId,
    };
  }

  /**
   * Публичные данные профиля пользователя для карточки Dating.
   * Возвращает: имя, возраст, знак, био, интересы, город и основное фото (подписанный URL).
   */
  async getPublicProfileForCard(targetUserId: string): Promise<{
    userId: string;
    name: string | null;
    age: number | null;
    zodiacSign: string | null;
    bio: string | null;
    interests: string[] | null;
    city: string | null;
    primaryPhotoUrl: string | null;
    photos?: string[] | null;
  }> {
    // ✅ PRISMA: Получаем данные пользователя с профилем, картами и фото
    const userData = await this.prisma.public_users.findUnique({
      where: { id: targetUserId },
      include: {
        profile: true,
        charts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        photos: true, // Все фото
      },
    });

    if (!userData) {
      // Пользователь не найден - возвращаем пустой профиль
      return {
        userId: targetUserId,
        name: null,
        age: null,
        zodiacSign: null,
        bio: null,
        interests: null,
        city: null,
        primaryPhotoUrl: null,
        photos: null,
      };
    }

    const user = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      birth_date: userData.birth_date,
      birth_place: userData.birth_place,
    };

    const profile = userData.profile
      ? {
          user_id: userData.id,
          bio: userData.profile.bio,
          preferences: userData.profile.interests,
          city: userData.profile.city,
          zodiac_sign: userData.profile.zodiacSign,
          display_name: null, // не в схеме
        }
      : null;

    const chart =
      userData.charts && userData.charts.length > 0
        ? {
            user_id: userData.id,
            data: userData.charts[0].data as ChartData,
            created_at: userData.charts[0].createdAt.toISOString(),
          }
        : null;

    const primaryPhotoRow = userData.photos.find((p: any) => p.isPrimary);
    const allPhotos = userData.photos;

    // Возраст
    const getAge = (birthDate?: string | Date | null): number | null => {
      if (!birthDate) return null;
      const d = new Date(birthDate);
      if (Number.isNaN(d.getTime())) return null;
      const diff = Date.now() - d.getTime();
      const ageDate = new Date(diff);
      return Math.abs(ageDate.getUTCFullYear() - 1970);
    };
    const age = getAge(user?.birth_date ?? null);

    // Имя: приоритет display_name из профиля, затем users.name, затем email prefix
    const emailPrefix = user?.email ? String(user.email).split('@')[0] : null;
    const displayName =
      profile?.display_name ?? user?.name ?? emailPrefix ?? null;

    // Знак: приоритет профиля, затем карты
    const chartData = chart?.data;
    const sunSign =
      profile?.zodiac_sign ??
      chartData?.planets?.sun?.sign ??
      chartData?.data?.planets?.sun?.sign ??
      null;

    // Интересы - в новой схеме это уже массив strings
    let interests: string[] | null = null;
    try {
      const prefsRaw = profile?.preferences as unknown;
      // Если это уже массив (из interests поля)
      if (Array.isArray(prefsRaw)) {
        interests = prefsRaw.filter((x: unknown) => typeof x === 'string');
      } else if (typeof prefsRaw === 'string') {
        // Если это строка - пробуем разобрать
        try {
          const parsed = JSON.parse(prefsRaw);
          if (Array.isArray(parsed)) {
            interests = parsed.filter((x: any) => typeof x === 'string');
          } else if (
            parsed &&
            typeof parsed === 'object' &&
            Array.isArray(parsed.interests)
          ) {
            interests = parsed.interests.filter(
              (x: any) => typeof x === 'string',
            );
          }
        } catch {
          // Не JSON - разделяем по запятым
          const splitted = prefsRaw
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
          if (splitted.length) interests = splitted;
        }
      } else if (prefsRaw && typeof prefsRaw === 'object') {
        // Если это объект с полем interests
        const intr = (prefsRaw as Record<string, any>)?.interests;
        if (Array.isArray(intr)) {
          interests = intr.filter((x: any) => typeof x === 'string');
        } else if (typeof intr === 'string') {
          const splitted = intr
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
          if (splitted.length) interests = splitted;
        }
      }
    } catch {
      interests = null;
    }

    // Фото (Storage operations remain on Supabase)
    let primaryPhotoUrl: string | null = null;
    try {
      const storagePath = primaryPhotoRow?.storagePath ?? null;

      if (typeof storagePath === 'string' && storagePath.trim()) {
        if (/^https?:\/\//i.test(storagePath)) {
          // уже абсолютный URL
          primaryPhotoUrl = storagePath;
        } else {
          primaryPhotoUrl =
            (await this.supabaseService.createSignedUrl(
              'user-photos',
              storagePath,
              900,
            )) ?? null;
        }
      }
    } catch {
      // ignore
    }

    let photos: string[] | null = null;
    try {
      if (allPhotos && allPhotos.length) {
        const photoItems = allPhotos.slice(0, 8);

        // Separate absolute URLs from paths that need signed URLs
        const absoluteUrls: Array<{ index: number; url: string }> = [];
        const pathsToSign: string[] = [];
        const pathIndexes: number[] = [];

        photoItems.forEach((p: any, index: number) => {
          const path = p?.storagePath;
          if (!path || typeof path !== 'string') return;

          if (/^https?:\/\//i.test(path)) {
            absoluteUrls.push({ index, url: path });
          } else {
            pathsToSign.push(path);
            pathIndexes.push(index);
          }
        });

        // Batch generate signed URLs
        const signedUrlsMap =
          pathsToSign.length > 0
            ? await this.supabaseService.createSignedUrlsBatch(
                'user-photos',
                pathsToSign,
                900,
              )
            : new Map<string, string | null>();

        // Reconstruct URLs in original order
        const urls: Array<string | null> = new Array(photoItems.length).fill(
          null,
        );
        absoluteUrls.forEach(({ index, url }) => {
          urls[index] = url;
        });
        pathIndexes.forEach((index, i) => {
          const path = pathsToSign[i];
          urls[index] = signedUrlsMap.get(path) ?? null;
        });

        photos = urls.filter((u) => !!u) as string[];
      }
    } catch {
      photos = null;
    }
    // Фолбэк: если primary отсутствует, но есть любое фото — возьмём первое
    if (!primaryPhotoUrl && Array.isArray(photos) && photos?.length > 0) {
      primaryPhotoUrl = photos[0];
    }

    return {
      userId: targetUserId,
      name: displayName,
      age,
      zodiacSign: sunSign ?? null,
      bio: profile?.bio ?? null,
      interests,
      city: profile?.city ?? user?.birth_place ?? null,
      primaryPhotoUrl,
      photos,
    };
  }
}
