/**
 * Chart Service (Refactored as Facade)
 * Delegates to microservices: NatalChart, Transit, Prediction, Biorhythm
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HoroscopeGeneratorService } from '../services/horoscope-generator.service';
import { EphemerisService } from '../services/ephemeris.service';
import { NatalChartService } from './services/natal-chart.service';
import { TransitService } from './services/transit.service';
import { PredictionService } from './services/prediction.service';
import { BiorhythmService } from './services/biorhythm.service';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ChartService {
  private readonly logger = new Logger(ChartService.name);

  // ✅ ОПТИМИЗАЦИЯ: In-memory cache для подписок
  private subscriptionCache = new Map<
    string,
    { subscription: any; timestamp: number }
  >();
  private readonly SUBSCRIPTION_CACHE_TTL = 5 * 60 * 1000; // 5 минут

  constructor(
    private prisma: PrismaService,
    private horoscopeService: HoroscopeGeneratorService,
    private ephemerisService: EphemerisService,
    private natalChartService: NatalChartService,
    private transitService: TransitService,
    private predictionService: PredictionService,
    private biorhythmService: BiorhythmService,
    private supabaseService: SupabaseService,
  ) {}

  // ============================================================
  // PRIVATE CACHE HELPERS
  // ============================================================

  /**
   * ✅ ОПТИМИЗАЦИЯ: Получить подписку с кэшированием
   * Кэш на 5 минут для снижения нагрузки на БД
   */
  private async getCachedSubscription(userId: string) {
    const now = Date.now();
    const cached = this.subscriptionCache.get(userId);

    // Проверяем актуальность кэша
    if (cached && now - cached.timestamp < this.SUBSCRIPTION_CACHE_TTL) {
      this.logger.debug(`Subscription cache HIT for user ${userId}`);
      return cached.subscription;
    }

    // Запрашиваем из БД
    this.logger.debug(`Subscription cache MISS for user ${userId}`);
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    // Обновляем кэш
    this.subscriptionCache.set(userId, {
      subscription,
      timestamp: now,
    });

    // Ограничиваем размер кэша (максимум 1000 пользователей)
    if (this.subscriptionCache.size > 1000) {
      const firstKey = this.subscriptionCache.keys().next().value;
      if (firstKey) {
        this.subscriptionCache.delete(firstKey);
      }
    }

    return subscription;
  }

  /**
   * Проверить, является ли подписка premium
   */
  private isPremiumSubscription(subscription: any): boolean {
    return (
      subscription?.tier !== 'free' &&
      subscription?.expiresAt != null &&
      new Date(subscription.expiresAt) > new Date()
    );
  }

  // ============================================================
  // UTILITY METHODS (Backward Compatibility)
  // ============================================================

  /**
   * Get location coordinates (delegated to NatalChartService)
   */
  getLocationCoordinates(birthPlace: string): {
    latitude: number;
    longitude: number;
    timezone: number;
  } {
    return this.natalChartService.getLocationCoordinates(birthPlace);
  }

  // ============================================================
  // NATAL CHART OPERATIONS (Delegate to NatalChartService)
  // ============================================================

  /**
   * Create natal chart with interpretation at registration
   */
  async createNatalChartWithInterpretation(
    userId: string,
    birthDateISO: string,
    birthTime: string,
    birthPlace: string,
  ) {
    return this.natalChartService.createNatalChartWithInterpretation(
      userId,
      birthDateISO,
      birthTime,
      birthPlace,
    );
  }

  /**
   * Get natal chart with interpretation
   */
  async getNatalChartWithInterpretation(userId: string) {
    return this.natalChartService.getNatalChartWithInterpretation(userId);
  }

  /**
   * Get only natal chart interpretation
   */
  async getChartInterpretation(userId: string) {
    return this.natalChartService.getChartInterpretation(userId);
  }

  /**
   * Get natal chart
   */
  async getNatalChart(userId: string) {
    return this.natalChartService.getNatalChart(userId);
  }

  /**
   * Create natal chart (basic method for backward compatibility)
   */
  async createNatalChart(userId: string, data: any) {
    return this.natalChartService.createNatalChart(userId, data);
  }

  /**
   * Get lazy interpretation details ("Read more")
   */
  async getInterpretationDetails(
    userId: string,
    query: {
      type: 'planet' | 'ascendant' | 'house' | 'aspect';
      planet?: string;
      sign?: string;
      houseNum?: number | string;
      aspect?: string;
    },
  ): Promise<string[]> {
    return this.natalChartService.getInterpretationDetails(userId, query);
  }

  // ============================================================
  // HOROSCOPE OPERATIONS (Stay in ChartService)
  // ============================================================

  /**
   * Get horoscope for specific period
   * ✅ ОПТИМИЗАЦИЯ: Использует кэшированную подписку
   */
  async getHoroscope(
    userId: string,
    period: 'day' | 'tomorrow' | 'week' | 'month' = 'day',
  ) {
    // Check user subscription (cached)
    const subscription = await this.getCachedSubscription(userId);
    const isPremium = this.isPremiumSubscription(subscription);

    // Generate horoscope via HoroscopeGeneratorService
    return await this.horoscopeService.generateHoroscope(
      userId,
      period,
      isPremium,
    );
  }

  /**
   * Get all horoscope types (for widget)
   * ✅ ОПТИМИЗАЦИЯ: Использует кэшированную подписку
   */
  async getAllHoroscopes(userId: string) {
    // Check user subscription (cached)
    const subscription = await this.getCachedSubscription(userId);
    const isPremium = this.isPremiumSubscription(subscription);

    const [today, tomorrow, week, month] = await Promise.all([
      this.horoscopeService.generateHoroscope(userId, 'day', isPremium),
      this.horoscopeService.generateHoroscope(userId, 'tomorrow', isPremium),
      this.horoscopeService.generateHoroscope(userId, 'week', isPremium),
      this.horoscopeService.generateHoroscope(userId, 'month', isPremium),
    ]);

    return {
      today,
      tomorrow,
      week,
      month,
    };
  }

  // ============================================================
  // TRANSIT OPERATIONS (Delegate to TransitService)
  // ============================================================

  /**
   * Get transits for date range
   */
  async getTransits(userId: string, from: string, to: string) {
    const natalChart = await this.natalChartService.getNatalChart(userId);
    return this.transitService.getTransits(userId, natalChart, from, to);
  }

  /**
   * Get current planetary positions
   */
  async getCurrentPlanets(userId: string) {
    return this.transitService.getCurrentPlanets(userId);
  }

  /**
   * Get detailed transit interpretation with AI (subscription-aware)
   * ✅ ОПТИМИЗАЦИЯ: Использует кэшированную подписку
   */
  async getTransitInterpretation(userId: string, date: Date) {
    // Get user's subscription (cached)
    const subscription = await this.getCachedSubscription(userId);

    // Determine subscription tier (default to FREE)
    const tier = (subscription?.tier as any) || 'free';

    // Get natal chart
    const natalChart = await this.natalChartService.getNatalChart(userId);

    // Get transit interpretation from service
    return this.transitService.getTransitInterpretation(
      userId,
      natalChart,
      date,
      tier,
    );
  }

  // ============================================================
  // PREDICTION OPERATIONS (Delegate to PredictionService)
  // ============================================================

  /**
   * Get astrological predictions
   */
  async getPredictions(userId: string, period: string = 'day') {
    const natalChart = await this.natalChartService.getNatalChart(userId);
    return this.predictionService.getPredictions(natalChart, period);
  }

  // ============================================================
  // BIORHYTHM OPERATIONS (Delegate to BiorhythmService)
  // ============================================================

  /**
   * Get real biorhythms based on user's birth date
   */
  async getBiorhythms(
    userId: string,
    dateStr?: string,
  ): Promise<{
    date: string;
    physical: number;
    emotional: number;
    intellectual: number;
  }> {
    const natalChart = await this.natalChartService.getNatalChart(userId);
    return this.biorhythmService.getBiorhythms(userId, natalChart, dateStr);
  }

  // ============================================================
  // AI REGENERATION WITH RATE LIMITING
  // ============================================================

  /**
   * Regenerate chart interpretation with AI
   * Rate limited: 1 generation per 24 hours
   */
  async regenerateChartWithAI(userId: string): Promise<{
    success: boolean;
    message: string;
    canRegenerateAt?: string;
  }> {
    try {
      // 1. Check natal chart exists
      const natalChart = await this.natalChartService.getNatalChart(userId);
      if (!natalChart) {
        return {
          success: false,
          message: 'Натальная карта не найдена. Создайте карту сначала.',
        };
      }

      // 2. Check rate limiting (24 hours) using Prisma
      const chartData = await this.prisma.chart.findFirst({
        where: { userId },
        select: { aiGeneratedAt: true },
        orderBy: { createdAt: 'desc' },
      });

      if (chartData?.aiGeneratedAt) {
        const lastGenerated = chartData.aiGeneratedAt;
        const now = new Date();
        const hoursSinceLastGen =
          (now.getTime() - lastGenerated.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastGen < 24) {
          const canRegenerateAt = new Date(
            lastGenerated.getTime() + 24 * 60 * 60 * 1000,
          );

          return {
            success: false,
            message: `Вы можете обновить гороскоп только раз в сутки. Попробуйте через ${Math.ceil(24 - hoursSinceLastGen)} часов.`,
            canRegenerateAt: canRegenerateAt.toISOString(),
          };
        }
      }

      // 3. Regenerate interpretation with AI
      await this.natalChartService.regenerateInterpretation(userId);

      // 4. Update ai_generated_at timestamp using Prisma
      await this.prisma.chart.updateMany({
        where: { userId },
        data: { aiGeneratedAt: new Date() },
      });

      this.logger.log(`AI regeneration successful for user ${userId}`);

      return {
        success: true,
        message: 'Гороскоп успешно обновлен с помощью AI',
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to regenerate chart for user ${userId}: ${error?.message || String(error)}`,
      );

      return {
        success: false,
        message: 'Ошибка при обновлении гороскопа. Попробуйте позже.',
      };
    }
  }
}
