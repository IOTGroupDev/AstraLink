import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RateLimiterService } from '@/common/services/rate-limiter.service';
import { SensitiveProfileEncryptionService } from '@/common/services/sensitive-profile-encryption.service';
import type {
  ChartAspect,
  ChartData,
  SynastryData,
} from '@/dating/dating.types';
import { GeoService } from '@/modules/geo/geo.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AIService } from '@/services/ai.service';
import { EphemerisService } from '@/services/ephemeris.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { normalizeSubscriptionTier, SubscriptionTier } from '@/types';
import { CreateCompatibilityReportDto } from './dto/create-compatibility-report.dto';
import {
  COMPATIBILITY_WEEK_SECONDS,
  COMPATIBILITY_WEEKLY_LIMITS,
} from './guards/compatibility-rate-limit.guard';

type BirthLocation = {
  latitude: number;
  longitude: number;
  timezone: number;
};

type CompatibilityCategory = {
  score: number;
  title: string;
  description: string;
};

type CompatibilityResult = {
  score: number;
  summary: string;
  categories: {
    emotional: CompatibilityCategory;
    attraction: CompatibilityCategory;
    communication: CompatibilityCategory;
    stability: CompatibilityCategory;
  };
  keyAspects: ChartAspect[];
  synastrySummary?: string;
  aiNarrative?: string;
  aiStatus: 'generated' | 'unavailable' | 'skipped' | 'failed';
};

type CompatibilityQuotaStatus = {
  allowed: boolean;
  remaining: number;
  totalLimit: number;
  used: number;
  resetAt: Date;
};

@Injectable()
export class CompatibilityService {
  private readonly logger = new Logger(CompatibilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ephemerisService: EphemerisService,
    private readonly aiService: AIService,
    private readonly geoService: GeoService,
    private readonly sensitiveProfileEncryption: SensitiveProfileEncryptionService,
    private readonly rateLimiter: RateLimiterService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async createReport(userId: string, dto: CreateCompatibilityReportDto) {
    const userChart = await this.prisma.chart.findUnique({
      where: { userId },
      select: { data: true },
    });

    if (!userChart?.data) {
      throw new BadRequestException(
        'Сначала нужно создать натальную карту пользователя',
      );
    }

    const location = await this.resolveBirthLocation(dto);
    const duplicateReport = await this.findDuplicateReport(
      userId,
      dto,
      location,
    );

    if (duplicateReport) {
      return {
        ...this.formatReport(duplicateReport),
        isDuplicate: true,
      };
    }

    const shouldUseAi = await this.consumeAiQuotaIfAvailable(userId, dto.useAi);

    const partnerChart = (await this.ephemerisService.calculateNatalChart(
      dto.birthDate,
      dto.birthTime,
      location,
    )) as ChartData;
    const ownChart = userChart.data as ChartData;
    const synastry = (await this.ephemerisService.getSynastry(
      ownChart,
      partnerChart,
    )) as SynastryData;

    const result = this.buildCompatibilityResult(synastry);
    let aiProvider: string | null = null;
    let aiGeneratedAt: Date | null = null;

    if (shouldUseAi) {
      if (this.aiService.isAvailable()) {
        try {
          result.aiNarrative =
            await this.aiService.generateCompatibilityInterpretation({
              score: result.score,
              categories: result.categories,
              keyAspects: result.keyAspects,
              synastrySummary: result.synastrySummary,
              locale: 'ru',
            });
          result.aiStatus = 'generated';
          aiProvider = this.aiService.getProvider();
          aiGeneratedAt = new Date();
        } catch (error) {
          result.aiStatus = 'failed';
          this.logger.warn(
            `AI compatibility narrative failed for user ${userId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      } else {
        result.aiStatus = 'unavailable';
      }
    }

    const partnerBirthData =
      this.sensitiveProfileEncryption.prepareBirthDataForStorage({
        birth_date: dto.birthDate,
        birth_time: dto.birthTime,
        birth_place: dto.birthPlace,
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: location.timezone,
      });

    const report = await this.prisma.compatibilityReport.create({
      data: {
        userId,
        partnerBirthData: partnerBirthData as Prisma.InputJsonValue,
        partnerChartData: this.toJsonValue(
          this.sanitizePartnerChart(partnerChart),
        ),
        result: this.toJsonValue(result),
        score: result.score,
        aiProvider,
        aiGeneratedAt,
      },
    });

    return this.formatReport(report);
  }

  private async consumeAiQuotaIfAvailable(
    userId: string,
    requestedUseAi: boolean | undefined,
  ): Promise<boolean> {
    if (requestedUseAi !== true) {
      return false;
    }

    const subscription = await this.subscriptionService.getStatus(userId);
    const tier = normalizeSubscriptionTier(subscription.tier);
    const limit =
      subscription.isActive && tier === SubscriptionTier.PREMIUM
        ? COMPATIBILITY_WEEKLY_LIMITS[tier]
        : 0;

    if (limit <= 0) {
      return false;
    }

    const quotaKey = `compatibility:${userId}`;
    const rateLimitConfig = {
      points: limit,
      duration: COMPATIBILITY_WEEK_SECONDS,
    };
    const currentStatus = await this.rateLimiter.getStatus(
      quotaKey,
      rateLimitConfig,
    );

    if (!currentStatus.allowed) {
      return false;
    }

    const consumedStatus = await this.rateLimiter.consume(
      quotaKey,
      rateLimitConfig,
    );

    return consumedStatus.allowed;
  }

  async getQuotaStatus(userId: string): Promise<CompatibilityQuotaStatus> {
    const subscription = await this.subscriptionService.getStatus(userId);
    const tier = normalizeSubscriptionTier(subscription.tier);

    const limit =
      subscription.isActive && tier === SubscriptionTier.PREMIUM
        ? COMPATIBILITY_WEEKLY_LIMITS[tier]
        : 0;

    if (limit <= 0) {
      return {
        allowed: false,
        remaining: 0,
        totalLimit: 0,
        used: 0,
        resetAt: new Date(),
      };
    }

    const status = await this.rateLimiter.getStatus(`compatibility:${userId}`, {
      points: limit,
      duration: COMPATIBILITY_WEEK_SECONDS,
    });

    return {
      allowed: status.allowed,
      remaining: status.remaining,
      totalLimit: status.totalLimit,
      used: Math.max(0, status.totalLimit - status.remaining),
      resetAt: new Date(status.resetTime),
    };
  }

  async getReports(userId: string) {
    const reports = await this.prisma.compatibilityReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        score: true,
        result: true,
        aiProvider: true,
        aiGeneratedAt: true,
        createdAt: true,
      },
    });

    return reports.map((report) => this.formatReport(report));
  }

  async getReport(userId: string, reportId: string) {
    const report = await this.prisma.compatibilityReport.findFirst({
      where: { id: reportId, userId },
    });

    if (!report) {
      throw new NotFoundException('Отчет совместимости не найден');
    }

    return this.formatReport(report);
  }

  async deleteReport(userId: string, reportId: string) {
    const report = await this.prisma.compatibilityReport.findFirst({
      where: { id: reportId, userId },
      select: { id: true },
    });

    if (!report) {
      throw new NotFoundException('Отчет совместимости не найден');
    }

    await this.prisma.compatibilityReport.delete({
      where: { id: report.id },
    });

    return { success: true };
  }

  private buildCompatibilityResult(
    synastry: SynastryData,
  ): CompatibilityResult {
    const aspects = Array.isArray(synastry.aspects) ? synastry.aspects : [];
    const baseScore = Math.max(
      0,
      Math.min(100, Math.round(Number(synastry.compatibility ?? 0))),
    );

    const categories = {
      emotional: this.scoreCategory(
        aspects,
        ['moon'],
        'Эмоциональная совместимость',
        'Показывает, насколько легко совпадают реакции, потребности и бытовой ритм.',
      ),
      attraction: this.scoreCategory(
        aspects,
        ['venus', 'mars'],
        'Притяжение и романтика',
        'Оценивает химию, симпатию и телесно-эмоциональное притяжение.',
      ),
      communication: this.scoreCategory(
        aspects,
        ['mercury'],
        'Общение',
        'Показывает, насколько легко договариваться, слышать друг друга и обсуждать сложные темы.',
      ),
      stability: this.scoreCategory(
        aspects,
        ['saturn', 'jupiter'],
        'Долгосрочный потенциал',
        'Оценивает устойчивость, ответственность и способность строить общие планы.',
      ),
    };

    const categoryAverage = Math.round(
      (categories.emotional.score +
        categories.attraction.score +
        categories.communication.score +
        categories.stability.score) /
        4,
    );
    const score = Math.round(baseScore * 0.6 + categoryAverage * 0.4);

    return {
      score,
      summary: this.buildSummary(score),
      categories,
      keyAspects: aspects
        .slice()
        .sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0))
        .slice(0, 8),
      synastrySummary: synastry.summary,
      aiStatus: 'skipped',
    };
  }

  private scoreCategory(
    aspects: ChartAspect[],
    planets: string[],
    title: string,
    description: string,
  ): CompatibilityCategory {
    let score = 50;

    for (const aspect of aspects) {
      if (
        !planets.includes(aspect.planetA) &&
        !planets.includes(aspect.planetB)
      ) {
        continue;
      }

      const strength = aspect.strength ?? 1;
      if (['trine', 'sextile', 'conjunction'].includes(aspect.aspect)) {
        score += 10 * strength;
      }
      if (['square', 'opposition'].includes(aspect.aspect)) {
        score -= 8 * strength;
      }
    }

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      title,
      description,
    };
  }

  private buildSummary(score: number): string {
    if (score >= 80) {
      return 'Высокая совместимость: много естественных точек притяжения и поддержки.';
    }
    if (score >= 65) {
      return 'Хорошая совместимость: потенциал сильный, но важны честные договоренности.';
    }
    if (score >= 45) {
      return 'Смешанная совместимость: связь может быть ценной, если осознанно работать с напряжением.';
    }
    return 'Непростая совместимость: притяжение возможно, но различия требуют зрелости и ясных границ.';
  }

  private async resolveBirthLocation(
    dto: CreateCompatibilityReportDto,
  ): Promise<BirthLocation> {
    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      return {
        latitude: dto.latitude,
        longitude: dto.longitude,
        timezone: this.parseTimezoneOffset(
          dto.timezone,
          dto.birthDate,
          dto.birthTime,
        ),
      };
    }

    const [suggestion] = await this.geoService.suggestCities(
      dto.birthPlace,
      'ru',
    );
    if (suggestion) {
      return {
        latitude: suggestion.lat,
        longitude: suggestion.lon,
        timezone: this.parseTimezoneOffset(
          dto.timezone ?? suggestion.tzid,
          dto.birthDate,
          dto.birthTime,
        ),
      };
    }

    throw new BadRequestException(
      'Не удалось определить координаты места рождения партнера',
    );
  }

  private parseTimezoneOffset(
    timezone: string | undefined,
    birthDate: string,
    birthTime: string,
  ): number {
    if (!timezone) {
      return 0;
    }

    if (/^[+-]?\d+(\.\d+)?$/.test(timezone)) {
      const value = Number(timezone);
      if (Number.isFinite(value) && Math.abs(value) <= 14) {
        return value;
      }
    }

    const match = timezone.match(/UTC\s*([+-]\d{1,2})(?::(\d{2}))?/i);
    if (match) {
      const hours = Number(match[1]);
      const minutes = match[2] ? Number(match[2]) : 0;
      if (Number.isFinite(hours) && Number.isFinite(minutes)) {
        const sign = hours >= 0 ? 1 : -1;
        return hours + sign * (minutes / 60);
      }
    }

    if (timezone.includes('/')) {
      return this.resolveIanaOffset(timezone, birthDate, birthTime) ?? 0;
    }

    return 0;
  }

  private resolveIanaOffset(
    timezone: string,
    birthDate: string,
    birthTime: string,
  ): number | null {
    const utcDate = new Date(`${birthDate}T${birthTime}:00.000Z`);
    if (Number.isNaN(utcDate.getTime())) {
      return null;
    }

    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'shortOffset',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(utcDate);
      const tzName = parts.find((part) => part.type === 'timeZoneName')?.value;
      const match = tzName?.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
      if (!match) {
        return null;
      }

      const hours = Number(match[1]);
      const minutes = match[2] ? Number(match[2]) : 0;
      const sign = hours >= 0 ? 1 : -1;
      return hours + sign * (minutes / 60);
    } catch {
      return null;
    }
  }

  private async findDuplicateReport(
    userId: string,
    dto: CreateCompatibilityReportDto,
    location: BirthLocation,
  ) {
    const targetSignature = this.buildBirthDataSignature({
      birth_date: dto.birthDate,
      birth_time: dto.birthTime,
      birth_place: dto.birthPlace,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
    });

    const recentReports = await this.prisma.compatibilityReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        score: true,
        result: true,
        aiProvider: true,
        aiGeneratedAt: true,
        createdAt: true,
        partnerBirthData: true,
      },
    });

    return (
      recentReports.find((report) => {
        const hydratedBirthData =
          this.sensitiveProfileEncryption.hydrateBirthData(
            report.partnerBirthData as Record<string, unknown>,
          );
        const reportSignature = this.buildBirthDataSignature(hydratedBirthData);

        return reportSignature === targetSignature;
      }) ?? null
    );
  }

  private buildBirthDataSignature(payload: Record<string, unknown>): string {
    return JSON.stringify({
      birthDate: this.normalizeSignatureString(payload.birth_date),
      birthTime: this.normalizeSignatureString(payload.birth_time),
      birthPlace: this.normalizeSignatureString(payload.birth_place)
        .toLowerCase()
        .replace(/\s+/g, ' '),
      latitude: this.normalizeSignatureNumber(payload.latitude),
      longitude: this.normalizeSignatureNumber(payload.longitude),
      timezone: this.normalizeSignatureNumber(payload.timezone),
    });
  }

  private normalizeSignatureString(value: unknown): string {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? '' : value.toISOString();
    }

    return typeof value === 'string' ? value.trim() : '';
  }

  private normalizeSignatureNumber(value: unknown): number | null {
    const numericValue =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : null;

    if (numericValue === null || !Number.isFinite(numericValue)) {
      return null;
    }

    return Math.round(numericValue * 10000) / 10000;
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private sanitizePartnerChart(chart: ChartData) {
    return {
      type: chart.type,
      planets: chart.planets,
      houses: chart.houses,
      aspects: chart.aspects,
      ascendant: chart.ascendant,
      midheaven: chart.midheaven,
      calculatedAt: chart.calculatedAt,
    };
  }

  private formatReport(report: {
    id: string;
    score: number;
    result: Prisma.JsonValue;
    aiProvider: string | null;
    aiGeneratedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: report.id,
      score: report.score,
      result: this.normalizeStoredResult(report.result),
      aiProvider: report.aiProvider,
      aiGeneratedAt: report.aiGeneratedAt,
      createdAt: report.createdAt,
    };
  }

  private normalizeStoredResult(result: Prisma.JsonValue): Prisma.JsonValue {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      return result;
    }

    const record = result as Record<string, Prisma.JsonValue>;
    const aiNarrative = record.aiNarrative;
    if (typeof aiNarrative !== 'string') {
      return result;
    }

    return {
      ...record,
      aiNarrative: this.normalizeJsonText(aiNarrative),
    } as Prisma.JsonValue;
  }

  private normalizeJsonText(value: string): string {
    const text = value.trim();
    const fencedJson = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    const candidate = fencedJson?.trim() || text;

    if (!candidate.startsWith('{') && !candidate.startsWith('[')) {
      return text;
    }

    try {
      return this.formatJsonTextValue(JSON.parse(candidate) as unknown) || text;
    } catch {
      return text;
    }
  }

  private formatJsonTextValue(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => this.formatJsonTextValue(item))
        .filter(Boolean)
        .join('\n\n');
    }

    if (!value || typeof value !== 'object') {
      return '';
    }

    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => {
        const body = this.formatJsonTextValue(item);
        if (!body) {
          return '';
        }

        const title = key
          .replace(/_/g, ' ')
          .replace(/([a-zа-яё])([A-ZА-ЯЁ])/g, '$1 $2')
          .replace(/^./, (char) => char.toUpperCase());

        return `${title}\n${body}`;
      })
      .filter(Boolean)
      .join('\n\n');
  }
}
