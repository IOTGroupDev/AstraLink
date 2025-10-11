import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EphemerisService } from '../services/ephemeris.service';
import type { DatingMatchResponse } from '../types';

@Injectable()
export class DatingService {
  constructor(
    private prisma: PrismaService,
    private ephemerisService: EphemerisService,
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

  private getSunSign(chart: any): string | null {
    try {
      return (
        chart?.data?.planets?.sun?.sign || chart?.planets?.sun?.sign || null
      );
    } catch {
      return null;
    }
  }

  private elementFromSign(
    sign?: string | null,
  ): 'fire' | 'earth' | 'air' | 'water' | null {
    if (!sign) return null;
    const s = String(sign);
    const fire = new Set(['Aries', 'Leo', 'Sagittarius']);
    const earth = new Set(['Taurus', 'Virgo', 'Capricorn']);
    const air = new Set(['Gemini', 'Libra', 'Aquarius']);
    const water = new Set(['Cancer', 'Scorpio', 'Pisces']);
    if (fire.has(s)) return 'fire';
    if (earth.has(s)) return 'earth';
    if (air.has(s)) return 'air';
    if (water.has(s)) return 'water';
    return null;
  }

  private elementSynergyBonus(
    a: 'fire' | 'earth' | 'air' | 'water' | null,
    b: 'fire' | 'earth' | 'air' | 'water' | null,
  ): number {
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

  private getHouseForLongitude(longitude: number, houses: any): number {
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
    synastry: any,
    chartA: any,
    chartB: any,
  ): number {
    let score = Number.isFinite(base) ? base : 0;

    // 1) Бонус по стихиям Солнца
    const sunA = this.getSunSign(chartA);
    const sunB = this.getSunSign(chartB);
    const elA = this.elementFromSign(sunA);
    const elB = this.elementFromSign(sunB);
    score += this.elementSynergyBonus(elA, elB);

    const aspects: Array<{
      planetA: string;
      planetB: string;
      aspect: string;
      orb?: number;
      strength?: number;
    }> = Array.isArray(synastry?.aspects) ? synastry.aspects : [];

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
          selfChart,
          c,
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
}
