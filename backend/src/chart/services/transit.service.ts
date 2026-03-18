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
    locale: 'ru' | 'en' | 'es' = 'ru',
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
          locale,
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
        this.getRuleBasedInterpretation(significantTransits, locale),
      subscriptionTier,
      hasAIAccess: canUseAI,
      message: allowAI
        ? locale === 'en'
          ? 'AI-enhanced transit interpretation (PREMIUM/MAX)'
          : locale === 'es'
            ? 'Interpretación de tránsitos con IA (PREMIUM/MAX)'
            : 'AI-расширенная интерпретация транзитов (PREMIUM/MAX)'
        : locale === 'en'
          ? 'Basic transit interpretation (FREE or daily AI limit reached)'
          : locale === 'es'
            ? 'Interpretación básica de tránsitos (FREE o límite diario alcanzado)'
            : 'Базовая интерпретация транзитов (FREE или дневной лимит AI)',
    };
  }

  /**
   * Get AI interpretation for the strongest transit (PREMIUM/MAX only)
   */
  async getMainTransitInterpretation(
    userId: string,
    natalChart: any,
    date: Date,
    subscriptionTier: SubscriptionTier,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ) {
    this.logger.log(
      `Main transit AI: user=${userId} tier=${subscriptionTier} date=${date.toISOString()} locale=${locale}`,
    );
    const julianDay = this.ephemerisService.dateToJulianDay(date);
    const transitPlanets =
      await this.ephemerisService.calculatePlanets(julianDay);
    const natalPlanets = natalChart?.data?.planets || natalChart?.planets || {};

    const transitAspects = this.calculateTransitAspects(
      transitPlanets,
      natalPlanets,
    );
    const sortedAspects = transitAspects.sort(
      (a, b) => b.strength - a.strength,
    );
    const mainAspect = sortedAspects[0] || null;

    if (!mainAspect) {
      this.logger.warn(
        `Main transit AI: no aspects found user=${userId} date=${date.toISOString()}`,
      );
      return {
        date: date.toISOString(),
        aspect: null,
        interpretation:
          locale === 'en'
            ? 'No significant transits found for this date.'
            : locale === 'es'
              ? 'No se encontraron tránsitos significativos para esta fecha.'
              : 'Значимые транзиты на эту дату не найдены.',
        subscriptionTier,
        hasAIAccess: hasAIAccess(subscriptionTier),
      };
    }

    let allowAI = hasAIAccess(subscriptionTier);
    if (allowAI) {
      try {
        const dayKey = utcDayKey();
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
            allowAI = false;
          }
        }
      } catch (e) {
        this.logger.warn(
          `Time Machine limiter failed (fallback to best-effort): ${(e as Error)?.message || String(e)}`,
        );
      }
    }

    let interpretation = '';
    if (allowAI) {
      try {
        interpretation = await this.generateAITransitInterpretation(
          [mainAspect],
          natalChart,
          date,
          locale,
        );
      } catch (error) {
        this.logger.error('Failed to generate main transit AI:', error);
      }
    }

    if (!interpretation) {
      this.logger.warn(
        `Main transit AI: fallback to rule-based user=${userId} allowAI=${allowAI}`,
      );
      interpretation = this.getRuleBasedInterpretation([mainAspect], locale);
    }

    return {
      date: date.toISOString(),
      aspect: mainAspect,
      interpretation,
      subscriptionTier,
      hasAIAccess: hasAIAccess(subscriptionTier),
      message: allowAI
        ? locale === 'en'
          ? 'AI main transit interpretation (PREMIUM/MAX)'
          : locale === 'es'
            ? 'Interpretación principal con IA (PREMIUM/MAX)'
            : 'AI-интерпретация главного транзита (PREMIUM/MAX)'
        : locale === 'en'
          ? 'Basic main transit interpretation (limit reached)'
          : locale === 'es'
            ? 'Interpretación básica del tránsito principal (límite alcanzado)'
            : 'Базовая интерпретация главного транзита (лимит достигнут)',
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
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): Promise<string> {
    const transitDescriptions = transits
      .map((t, i) => {
        const planet = this.translatePlanet(t.transitPlanet, locale);
        const aspect = this.translateAspect(t.aspect, locale);
        const target = this.translatePlanet(t.natalPlanet, locale);
        const orb = t.orb.toFixed(1);
        const strength = Math.round(t.strength * 100);
        if (locale === 'en') {
          return `${i + 1}. Transit ${planet} ${aspect} natal ${target} (orb: ${orb}°, strength: ${strength}%)`;
        }
        if (locale === 'es') {
          return `${i + 1}. Tránsito ${planet} ${aspect} natal ${target} (orbe: ${orb}°, fuerza: ${strength}%)`;
        }
        return `${i + 1}. Транзитный ${planet} ${aspect} натальный ${target} (орб: ${orb}°, сила: ${strength}%)`;
      })
      .join('\n');

    const sunSign = natalChart.data?.planets?.sun?.sign || 'неизвестно';
    const moonSign = natalChart.data?.planets?.moon?.sign || 'неизвестно';
    const ascendant = natalChart.data?.houses?.[0]?.sign || 'неизвестно';

    const prompt =
      locale === 'en'
        ? `You are a professional astrologer. Analyze the following transits for ${date.toLocaleDateString('en-US')} and provide a concise interpretation (150-200 words):

TRANSITS:
${transitDescriptions}

NATAL CHART:
- Sun: ${sunSign}
- Moon: ${moonSign}
- Ascendant: ${ascendant}

Your interpretation should:
1. Explain the influence of the strongest transits
2. Provide practical recommendations
3. Highlight opportunities and challenges of the day
4. Be written in clear, simple language

IMPORTANT: Return only the interpretation text, NO JSON, NO structure, plain text paragraphs only.`
        : locale === 'es'
          ? `Eres un astrólogo profesional. Analiza los siguientes tránsitos para la fecha ${date.toLocaleDateString('es-ES')} y ofrece una interpretación concisa (150-200 palabras):

TRÁNSITOS:
${transitDescriptions}

CARTA NATAL:
- Sol: ${sunSign}
- Luna: ${moonSign}
- Ascendente: ${ascendant}

Tu interpretación debe:
1. Explicar la influencia de los tránsitos más fuertes
2. Dar recomendaciones prácticas
3. Señalar oportunidades y desafíos del día
4. Estar escrita en un lenguaje claro y sencillo

IMPORTANTE: Devuelve solo el texto de la interpretación, SIN JSON, SIN estructura, solo texto en párrafos.`
          : `Вы профессиональный астролог. Проанализируйте следующие транзиты на дату ${date.toLocaleDateString('ru-RU')} и дайте краткую интерпретацию (150-200 слов):

ТРАНЗИТЫ:
${transitDescriptions}

НАТАЛЬНАЯ КАРТА:
- Солнце: ${sunSign}
- Луна: ${moonSign}
- Асцендент: ${ascendant}

Дайте интерпретацию, которая:
1. Объясняет влияние самых сильных транзитов
2. Даёт практические рекомендации
3. Указывает на возможности и вызовы дня
4. Написана простым, понятным языком

ВАЖНО: Верните только текст интерпретации, БЕЗ JSON, БЕЗ структуры, только простой текст параграфами.`;

    try {
      const response = await this.aiService.generateText(
        prompt,
        {
          temperature: 0.7,
          maxTokens: 500,
        },
        locale,
      );

      const text = response.trim();

      // Если AI вернул JSON вместо текста, извлекаем текст
      if (text.startsWith('{') || text.startsWith('[')) {
        try {
          const parsed = JSON.parse(text);
          // Пытаемся извлечь текст из разных возможных ключей
          const extractedText =
            parsed.general ||
            parsed.interpretation ||
            parsed.text ||
            parsed.content ||
            Object.values(parsed).join('\n\n');

          this.logger.warn(
            `AI returned JSON instead of plain text. Extracted: ${extractedText.substring(0, 100)}...`,
          );

          return extractedText;
        } catch (parseError) {
          this.logger.warn('Failed to parse AI JSON response, returning as-is');
          return text;
        }
      }

      return text;
    } catch (error) {
      this.logger.error('AI generation failed:', error);
      throw error;
    }
  }

  /**
   * Rule-based interpretation (FREE users)
   */
  private getRuleBasedInterpretation(
    transits: TransitAspect[],
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): string {
    if (transits.length === 0) {
      if (locale === 'en') {
        return 'There are no significant transits today. A good time for calm work and rest.';
      }
      if (locale === 'es') {
        return 'Hoy no hay tránsitos significativos. Buen momento para un trabajo tranquilo y descanso.';
      }
      return 'Сегодня нет значительных транзитов. Хорошее время для спокойной работы и отдыха.';
    }

    const strongest = transits[0];
    const planetName = this.translatePlanet(strongest.transitPlanet, locale);
    const aspectName = this.translateAspect(strongest.aspect, locale);
    const targetName = this.translatePlanet(strongest.natalPlanet, locale);

    const isHarmonious = ['trine', 'sextile'].includes(strongest.aspect);

    if (isHarmonious) {
      if (locale === 'en') {
        return `Today a harmonious aspect is active: ${planetName} ${aspectName} ${targetName}. This is a favorable time to act in the relevant areas of life. Use this energy to achieve your goals.`;
      }
      if (locale === 'es') {
        return `Hoy está activo un aspecto armonioso: ${planetName} ${aspectName} ${targetName}. Es un momento favorable para actuar en las áreas relevantes de la vida. Usa esta energía para alcanzar tus metas.`;
      }
      return `Сегодня активен гармоничный аспект: ${planetName} ${aspectName} ${targetName}. Это благоприятное время для действий в соответствующих сферах жизни. Используйте эту энергию для достижения целей.`;
    } else {
      if (locale === 'en') {
        return `Today a tense aspect is active: ${planetName} ${aspectName} ${targetName}. Be attentive in the relevant areas of life. This is a time for overcoming challenges and growth.`;
      }
      if (locale === 'es') {
        return `Hoy está activo un aspecto tenso: ${planetName} ${aspectName} ${targetName}. Sé cuidadoso en las áreas relevantes de la vida. Es un tiempo para superar desafíos y crecer.`;
      }
      return `Сегодня активен напряжённый аспект: ${planetName} ${aspectName} ${targetName}. Будьте внимательны в соответствующих сферах жизни. Это время для преодоления вызовов и роста.`;
    }
  }

  /**
   * Translate planet names
   */
  private translatePlanet(
    planet: string,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): string {
    const dict: Record<'ru' | 'en' | 'es', Record<string, string>> = {
      ru: {
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
      },
      en: {
        sun: 'Sun',
        moon: 'Moon',
        mercury: 'Mercury',
        venus: 'Venus',
        mars: 'Mars',
        jupiter: 'Jupiter',
        saturn: 'Saturn',
        uranus: 'Uranus',
        neptune: 'Neptune',
        pluto: 'Pluto',
      },
      es: {
        sun: 'Sol',
        moon: 'Luna',
        mercury: 'Mercurio',
        venus: 'Venus',
        mars: 'Marte',
        jupiter: 'Júpiter',
        saturn: 'Saturno',
        uranus: 'Urano',
        neptune: 'Neptuno',
        pluto: 'Plutón',
      },
    };
    return dict[locale][planet.toLowerCase()] || planet;
  }

  /**
   * Translate aspect names
   */
  private translateAspect(
    aspect: string,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): string {
    const dict: Record<'ru' | 'en' | 'es', Record<string, string>> = {
      ru: {
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
      },
      en: {
        conjunction: 'conjunct',
        opposition: 'opposed to',
        trine: 'trine',
        square: 'square',
        sextile: 'sextile',
        quincunx: 'quincunx',
        'semi-sextile': 'semi-sextile',
        'semi-square': 'semi-square',
        sesquiquadrate: 'sesquiquadrate',
        quintile: 'quintile',
        biquintile: 'biquintile',
      },
      es: {
        conjunction: 'en conjunción con',
        opposition: 'en oposición a',
        trine: 'en trígono con',
        square: 'en cuadratura con',
        sextile: 'en sextil con',
        quincunx: 'en quincuncio con',
        'semi-sextile': 'en semisextil con',
        'semi-square': 'en semicuadratura con',
        sesquiquadrate: 'en sesquicuadratura con',
        quintile: 'en quintil con',
        biquintile: 'en biquintil con',
      },
    };
    return dict[locale][aspect.toLowerCase()] || aspect;
  }
}
