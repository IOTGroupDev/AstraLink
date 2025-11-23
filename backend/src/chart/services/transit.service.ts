/**
 * Transit Service
 * Microservice for calculating planetary transits
 */

import { Injectable, Logger } from '@nestjs/common';
import { EphemerisService } from '../../services/ephemeris.service';
import { AIService } from '../../services/ai.service';
import { calculateAspect } from '../../shared/astro-calculations';
import { SubscriptionTier, hasAIAccess } from '../../types/subscription';
import type { TransitAspect } from '../../services/horoscope.types';
import { RedisService } from '../../redis/redis.service';
import {
  LIMITS,
  secondsUntilEndOfUTCDate,
  utcDayKey,
} from '../../config/limits.config';

@Injectable()
export class TransitService {
  private readonly logger = new Logger(TransitService.name);

  constructor(
    private ephemerisService: EphemerisService,
    private aiService: AIService,
    private redis: RedisService,
  ) {}

  /**
   * Get transits for a date range
   */
  async getTransits(userId: string, natalChart: any, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const transits = await this.ephemerisService.getTransits(
      userId,
      fromDate,
      toDate,
    );

    return {
      from,
      to,
      transits,
      natalChart: natalChart.data,
      message: 'Transits calculated based on natal chart',
    };
  }

  /**
   * Get current planetary positions
   */
  async getCurrentPlanets(_userId: string) {
    const now = new Date();
    const julianDay = this.ephemerisService.dateToJulianDay(now);
    const currentPlanets =
      await this.ephemerisService.calculatePlanets(julianDay);

    return {
      date: now.toISOString(),
      planets: currentPlanets,
    };
  }

  /**
   * Get detailed transit interpretation with AI (PREMIUM/MAX only)
   */
  async getTransitInterpretation(
    userId: string,
    natalChart: any,
    date: Date,
    subscriptionTier: SubscriptionTier,
  ) {
    const julianDay = this.ephemerisService.dateToJulianDay(date);
    const transitPlanets =
      await this.ephemerisService.calculatePlanets(julianDay);
    const natalPlanets = natalChart?.data?.planets || natalChart?.planets || {};

    // Calculate transit aspects
    const transitAspects = this.calculateTransitAspects(
      transitPlanets,
      natalPlanets,
    );

    // Sort by strength (strongest first)
    const sortedAspects = transitAspects.sort(
      (a, b) => b.strength - a.strength,
    );

    // Get top 10 most significant transits
    const significantTransits = sortedAspects.slice(0, 10);

    // Check if user has AI access by subscription
    const canUseAI = hasAIAccess(subscriptionTier);

    // Daily per-user limit for Time Machine AI usage (Premium / MAX)
    let allowAI = canUseAI;
    if (canUseAI) {
      try {
        const dayKey = utcDayKey(); // UTC day (now)
        const quotaKey = `ai:time_machine:quota:${userId}:${dayKey}`;
        const limit =
          subscriptionTier === SubscriptionTier.PREMIUM
            ? LIMITS.TIME_MACHINE.PREMIUM_DAILY
            : LIMITS.TIME_MACHINE.MAX_DAILY;

        const used = await this.redis.incr(quotaKey);
        if (used != null) {
          if (used === 1) {
            await this.redis.expire(quotaKey, secondsUntilEndOfUTCDate());
          }
          if (used > limit) {
            this.logger.warn(
              `Time Machine daily limit reached user=${userId} used=${used}/${limit} tier=${subscriptionTier}`,
            );
            allowAI = false; // fallback to rule-based
          }
        }
      } catch (e) {
        this.logger.warn(
          `Time Machine limiter failed (fallback to best-effort): ${(e as Error)?.message || String(e)}`,
        );
      }
    }

    let aiInterpretation = null;
    if (allowAI && significantTransits.length > 0) {
      try {
        // Generate AI interpretation for top 5 transits
        aiInterpretation = await this.generateAITransitInterpretation(
          significantTransits.slice(0, 5),
          natalChart,
          date,
        );
      } catch (error) {
        this.logger.error('Failed to generate AI interpretation:', error);
        // Continue without AI interpretation (fallback to rule-based)
      }
    }

    return {
      date: date.toISOString(),
      transitPlanets,
      natalPlanets,
      aspects: significantTransits,
      aiInterpretation:
        aiInterpretation ||
        this.getRuleBasedInterpretation(significantTransits),
      subscriptionTier,
      hasAIAccess: canUseAI,
      message: allowAI
        ? 'AI-enhanced transit interpretation (PREMIUM/MAX)'
        : 'Basic transit interpretation (FREE or daily AI limit reached)',
    };
  }

  /**
   * Calculate aspects between transit and natal planets
   */
  private calculateTransitAspects(
    transitPlanets: Record<string, any>,
    natalPlanets: Record<string, any>,
  ): TransitAspect[] {
    const aspects: TransitAspect[] = [];

    Object.entries(transitPlanets).forEach(([transitKey, transitPlanet]) => {
      Object.entries(natalPlanets).forEach(([natalKey, natalPlanet]) => {
        const aspectResult = calculateAspect(
          transitPlanet.longitude,
          natalPlanet.longitude,
        );

        // calculateAspect returns null if no aspect is found
        if (aspectResult && aspectResult.type) {
          aspects.push({
            transitPlanet: transitKey,
            natalPlanet: natalKey,
            aspect: aspectResult.type as TransitAspect['aspect'],
            orb: aspectResult.orb,
            strength: aspectResult.strength,
            transitSign: transitPlanet.sign,
            isRetrograde: transitPlanet.isRetrograde || false,
          });
        }
      });
    });

    return aspects;
  }

  /**
   * Generate AI interpretation for transits
   */
  private async generateAITransitInterpretation(
    transits: TransitAspect[],
    natalChart: any,
    date: Date,
  ): Promise<string> {
    const transitDescriptions = transits
      .map(
        (t, i) =>
          `${i + 1}. Транзитный ${this.translatePlanet(t.transitPlanet)} ${this.translateAspect(t.aspect)} натальный ${this.translatePlanet(t.natalPlanet)} (орб: ${t.orb.toFixed(1)}°, сила: ${Math.round(t.strength * 100)}%)`,
      )
      .join('\n');

    const prompt = `Вы профессиональный астролог. Проанализируйте следующие транзиты на дату ${date.toLocaleDateString('ru-RU')} и дайте краткую интерпретацию (150-200 слов):

ТРАНЗИТЫ:
${transitDescriptions}

НАТАЛЬНАЯ КАРТА:
- Солнце: ${natalChart.data?.planets?.sun?.sign || 'неизвестно'}
- Луна: ${natalChart.data?.planets?.moon?.sign || 'неизвестно'}
- Асцендент: ${natalChart.data?.houses?.[0]?.sign || 'неизвестно'}

Дайте интерпретацию, которая:
1. Объясняет влияние самых сильных транзитов
2. Даёт практические рекомендации
3. Указывает на возможности и вызовы дня
4. Написана простым, понятным языком`;

    try {
      const response = await this.aiService.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 500,
      });
      return response.trim();
    } catch (error) {
      this.logger.error('AI generation failed:', error);
      throw error;
    }
  }

  /**
   * Rule-based interpretation (FREE users)
   */
  private getRuleBasedInterpretation(transits: TransitAspect[]): string {
    if (transits.length === 0) {
      return 'Сегодня нет значительных транзитов. Хорошее время для спокойной работы и отдыха.';
    }

    const strongest = transits[0];
    const planetName = this.translatePlanet(strongest.transitPlanet);
    const aspectName = this.translateAspect(strongest.aspect);
    const targetName = this.translatePlanet(strongest.natalPlanet);

    const isHarmonious = ['trine', 'sextile'].includes(strongest.aspect);

    if (isHarmonious) {
      return `Сегодня активен гармоничный аспект: ${planetName} ${aspectName} ${targetName}. Это благоприятное время для действий в соответствующих сферах жизни. Используйте эту энергию для достижения целей.`;
    } else {
      return `Сегодня активен напряжённый аспект: ${planetName} ${aspectName} ${targetName}. Будьте внимательны в соответствующих сферах жизни. Это время для преодоления вызовов и роста.`;
    }
  }

  /**
   * Translate planet names to Russian
   */
  private translatePlanet(planet: string): string {
    const translations: Record<string, string> = {
      sun: 'Солнце',
      moon: 'Луна',
      mercury: 'Меркурий',
      venus: 'Венера',
      mars: 'Марс',
      jupiter: 'Юпитер',
      saturn: 'Сатурн',
      uranus: 'Уран',
      neptune: 'Нептун',
      pluto: 'Плутон',
    };
    return translations[planet.toLowerCase()] || planet;
  }

  /**
   * Translate aspect names to Russian
   */
  private translateAspect(aspect: string): string {
    const translations: Record<string, string> = {
      conjunction: 'в соединении с',
      opposition: 'в оппозиции к',
      trine: 'в трине к',
      square: 'в квадрате к',
      sextile: 'в секстиле к',
      quincunx: 'в квинконсе к',
      'semi-sextile': 'в полусекстиле к',
      'semi-square': 'в полуквадрате к',
      sesquiquadrate: 'в полутораквадрате к',
      quintile: 'в квинтиле к',
      biquintile: 'в биквинтиле к',
    };
    return translations[aspect.toLowerCase()] || aspect;
  }
}
