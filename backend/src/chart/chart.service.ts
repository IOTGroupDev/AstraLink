/**
 * Chart Service (Refactored as Facade)
 * Delegates to microservices: NatalChart, Transit, Prediction, Biorhythm
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HoroscopeGeneratorService } from '../services/horoscope-generator.service';
import { NatalChartService } from './services/natal-chart.service';
import { TransitService } from './services/transit.service';
import { PredictionService } from './services/prediction.service';
import { BiorhythmService } from './services/biorhythm.service';

@Injectable()
export class ChartService {
  private readonly logger = new Logger(ChartService.name);

  constructor(
    private prisma: PrismaService,
    private horoscopeService: HoroscopeGeneratorService,
    private natalChartService: NatalChartService,
    private transitService: TransitService,
    private predictionService: PredictionService,
    private biorhythmService: BiorhythmService,
  ) {}

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
   */
  async getHoroscope(
    userId: string,
    period: 'day' | 'tomorrow' | 'week' | 'month' = 'day',
  ) {
    // Check user subscription
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    const isPremium =
      subscription?.tier !== 'free' &&
      subscription?.expiresAt != null &&
      new Date(subscription.expiresAt) > new Date();

    // Generate horoscope via HoroscopeGeneratorService
    return await this.horoscopeService.generateHoroscope(
      userId,
      period,
      isPremium,
    );
  }

  /**
   * Get all horoscope types (for widget)
   */
  async getAllHoroscopes(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    const isPremium =
      subscription?.tier !== 'free' &&
      subscription?.expiresAt != null &&
      new Date(subscription.expiresAt) > new Date();

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
}
