import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EphemerisService } from '../services/ephemeris.service';
import { SupabaseService } from '../supabase/supabase.service';
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
  constructor(
    private prisma: PrismaService,
    private ephemerisService: EphemerisService,
    private supabaseService: SupabaseService,
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

      const [{ data: users }, { data: profiles }, { data: charts }] =
        await Promise.all([
          admin
            .from('users')
            .select('id,name,email,birth_date,birth_place')
            .in('id', candidateIds),
          admin
            .from('user_profiles')
            .select(
              'user_id,bio,preferences,city,gender,display_name,zodiac_sign',
            )
            .in('user_id', candidateIds),
          admin
            .from('charts')
            .select('user_id,data,created_at')
            .in('user_id', candidateIds)
            .order('created_at', { ascending: false }),
        ]);

      const usersMap = new Map<string, UserData>(
        Array.isArray(users) ? users.map((u: UserData) => [u.id, u]) : [],
      );
      const profilesMap = new Map<string, UserProfile>(
        Array.isArray(profiles)
          ? profiles.map((p: UserProfile) => [p.user_id, p])
          : [],
      );

      const chartsMap = new Map<string, UserChart>();
      if (Array.isArray(charts)) {
        for (const ch of charts as UserChart[]) {
          const uid = ch.user_id;
          if (!chartsMap.has(uid)) chartsMap.set(uid, ch);
        }
      }

      // Batch create signed URLs for all photos (performance optimization)
      const photoUrlPromises = rows
        .filter((r) => r.primary_photo_path)
        .map((r) =>
          this.supabaseService
            .createSignedUrl('user-photos', r.primary_photo_path!, 900)
            .then((url) => ({ userId: r.user_id, url })),
        );

      const photoUrls = await Promise.all(photoUrlPromises);
      const photoUrlMap = new Map(photoUrls.map((p) => [p.userId, p.url]));

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

        const { data: moreUsers } = await admin
          .from('users')
          .select('id,name,email,birth_date,birth_place,created_at')
          .order('created_at', { ascending: false })
          .limit(Math.max(needMore * 3, 10));

        const extraIds = (Array.isArray(moreUsers) ? moreUsers : [])
          .map((u: UserData) => u?.id)
          .filter(
            (id): id is string =>
              typeof id === 'string' && id !== selfId && !existingIds.has(id),
          );

        if (extraIds.length) {
          const [
            { data: moreProfiles },
            { data: moreCharts },
            { data: morePhotos },
          ] = await Promise.all([
            admin
              .from('user_profiles')
              .select(
                'user_id,bio,preferences,city,gender,display_name,zodiac_sign',
              )
              .in('user_id', extraIds),
            admin
              .from('charts')
              .select('user_id,data,created_at')
              .in('user_id', extraIds)
              .order('created_at', { ascending: false }),
            admin
              .from('user_photos')
              .select('user_id,storage_path')
              .eq('is_primary', true)
              .in('user_id', extraIds),
          ]);

          const usersById = new Map<string, UserData>(
            (moreUsers || []).map((u: UserData) => [u.id, u]),
          );
          const profilesById = new Map<string, UserProfile>(
            Array.isArray(moreProfiles)
              ? (moreProfiles as UserProfile[]).map((p) => [p.user_id, p])
              : [],
          );
          const chartsById = new Map<string, UserChart>();
          if (Array.isArray(moreCharts)) {
            for (const ch of moreCharts as UserChart[]) {
              const uid = ch.user_id;
              if (!chartsById.has(uid)) chartsById.set(uid, ch);
            }
          }
          const photosById = new Map<string, string | null>();
          if (Array.isArray(morePhotos)) {
            for (const ph of morePhotos as UserPhoto[]) {
              if (ph?.user_id)
                photosById.set(ph.user_id, ph.storage_path ?? null);
            }
          }

          // Batch create signed URLs for fallback candidates (performance optimization)
          const fallbackPhotoPromises = extraIds
            .slice(0, needMore) // Only process what we need
            .filter((uid) => photosById.get(uid))
            .map((uid) => {
              const storagePath = photosById.get(uid);
              return storagePath
                ? this.supabaseService
                    .createSignedUrl('user-photos', storagePath, 900)
                    .then((url) => ({ userId: uid, url: url ?? null }))
                : Promise.resolve({ userId: uid, url: null });
            });

          const fallbackPhotoUrls = await Promise.all(fallbackPhotoPromises);
          const fallbackPhotoUrlMap = new Map(
            fallbackPhotoUrls.map((p) => [p.userId, p.url]),
          );

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

    const rows: {
      userId: string;
      candidateData: any;
      compatibility: number;
      liked: boolean;
      rejected: boolean;
    }[] = [];

    for (const c of candidates) {
      try {
        // Фильтры
        if (filters?.city) {
          const city = filters.city.trim().toLowerCase();
          const birthPlace = (c as any).users?.birth_place
            ? String((c as any).users.birth_place)
                .trim()
                .toLowerCase()
            : '';
          if (!birthPlace || birthPlace !== city) continue;
        }
        if (filters?.ageMin != null || filters?.ageMax != null) {
          const age = this.getAgeFromBirthDate((c as any).users?.birth_date);
          if (age != null) {
            if (filters?.ageMin != null && age < filters.ageMin) continue;
            if (filters?.ageMax != null && age > filters.ageMax) continue;
          }
        }

        const syn = await this.ephemerisService.getSynastry(
          selfChart.data as any,
          c.data as any,
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
          (c as any).users?.name ||
          (c as any).users?.email?.split('@')?.[0] ||
          'Кандидат';
        const sunSign = (c.data as any)?.planets?.sun?.sign ?? undefined;

        const candidateData = {
          partnerId: c.userId,
          partnerName,
          email: (c as any).users?.email,
          birthDate: (c as any).users?.birth_date ?? null,
          birthTime: (c as any).users?.birth_time ?? null,
          birthPlace: (c as any).users?.birth_place ?? null,
          sign: sunSign,
        };

        rows.push({
          userId,
          candidateData,
          compatibility: finalCompatibility,
          liked: false,
          rejected: false,
        });
      } catch {
        // пропускаем проблемного кандидата
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
    // Попробуем admin-клиент (обходит RLS), если нет — обычный клиент
    let adminAvailable = true;
    let admin: any = null;
    try {
      admin = this.supabaseService.getAdminClient();
    } catch {
      adminAvailable = false;
    }
    const client = adminAvailable ? admin : this.supabaseService.getClient();

    // 1) users / user_profiles / charts (последняя)
    const [
      { data: userRow },
      { data: profileRow },
      { data: chartRows },
      { data: primaryPhotoRow },
      { data: allPhotos },
    ] = await Promise.all([
      client
        .from('users')
        .select('id,name,email,birth_date,birth_place')
        .eq('id', targetUserId)
        .maybeSingle(),
      client
        .from('user_profiles')
        .select('user_id,bio,preferences,city,zodiac_sign,display_name')
        .eq('user_id', targetUserId)
        .maybeSingle(),
      client
        .from('charts')
        .select('user_id,data,created_at')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(1),
      client
        .from('user_photos')
        .select('storage_path,path')
        .eq('user_id', targetUserId)
        .eq('is_primary', true)
        .maybeSingle(),
      client
        .from('user_photos')
        .select('storage_path,path')
        .eq('user_id', targetUserId),
    ]);

    const user = userRow || {};
    const profile = profileRow || {};
    const chart =
      Array.isArray(chartRows) && chartRows.length ? chartRows[0] : null;

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
    const sunSign =
      profile?.zodiac_sign ??
      chart?.data?.planets?.sun?.sign ??
      chart?.data?.data?.planets?.sun?.sign ??
      null;

    // Интересы — поддержка разных форматов (JSON, строка, массив)
    let interests: string[] | null = null;
    try {
      const prefsRaw = profile?.preferences;
      let prefsObj: any = prefsRaw;
      if (typeof prefsRaw === 'string') {
        try {
          prefsObj = JSON.parse(prefsRaw);
        } catch {
          // строка без JSON — пробуем разделить по запятым
          const splitted = prefsRaw
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
          if (splitted.length) interests = splitted;
        }
      }
      if (!interests && prefsObj && typeof prefsObj === 'object') {
        const intr = prefsObj?.interests;
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
      interests = interests ?? null;
    }

    // Фото
    let primaryPhotoUrl: string | null = null;
    try {
      const storagePath =
        primaryPhotoRow?.storage_path ?? primaryPhotoRow?.path ?? null;

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
      if (Array.isArray(allPhotos) && allPhotos.length) {
        const urls = await Promise.all(
          allPhotos.slice(0, 8).map(async (p) => {
            const path = p?.storage_path ?? p?.path;
            if (!path || typeof path !== 'string') return null;
            if (/^https?:\/\//i.test(path)) {
              return path;
            }
            return (
              (await this.supabaseService.createSignedUrl(
                'user-photos',
                path,
                900,
              )) ?? null
            );
          }),
        );
        photos = urls.filter((u) => !!u) as string[];
      }
    } catch {
      photos = null;
    }
    // Фолбэк: если primary отсутствует, но есть любое фото — возьмём первое
    if (!primaryPhotoUrl && Array.isArray(photos) && photos?.length > 0) {
      primaryPhotoUrl = photos[0];
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
