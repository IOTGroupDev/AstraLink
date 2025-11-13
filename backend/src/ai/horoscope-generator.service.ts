import { Injectable } from '@nestjs/common';
import { EphemerisService } from '../services/ephemeris.service';
import { AIService, AIProvider } from './ai.service';
import { RedisService } from '../redis/redis.service';
import { ChartRepository } from '../chart/chart.repository';

export interface HoroscopeOptions {
  period?: 'day' | 'week' | 'month';
  userId?: number;
  provider?: AIProvider;
}

@Injectable()
export class HoroscopeGeneratorService {
  constructor(
    private ephemerisService: EphemerisService,
    private aiService: AIService,
    private redisService: RedisService,
    private chartRepository: ChartRepository,
  ) {}

  async generateHoroscope(options: HoroscopeOptions): Promise<string> {
    const { period = 'day', userId, provider = AIProvider.CLAUDE } = options;

    // Check cache first
    const cacheKey = `horoscope:${userId}:${period}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get user's natal chart
    let natalChart;
    if (userId) {
      natalChart = await this.chartRepository.findFirstByUserId(userId);
    }

    // Get current planetary positions
    const now = new Date();
    const julianDay = this.ephemerisService.dateToJulianDay(now);
    const currentPlanets = await this.ephemerisService.calculatePlanets(julianDay);

    // Build prompt for AI
    const prompt = this.buildHoroscopePrompt(natalChart, currentPlanets, period);

    // Generate horoscope using AI
    const horoscope = await this.aiService.generateText(prompt, provider);

    // Cache the result
    const ttl = period === 'day' ? 3600 : period === 'week' ? 86400 : 2592000;
    await this.redisService.setex(cacheKey, ttl, horoscope);

    return horoscope;
  }

  private buildHoroscopePrompt(
    natalChart: any,
    currentPlanets: any,
    period: string,
  ): string {
    let prompt = `Generate a ${period}ly horoscope based on the following astrological data:\n\n`;

    if (natalChart) {
      prompt += `Natal Chart:\n${JSON.stringify(natalChart.data, null, 2)}\n\n`;
    }

    prompt += `Current Planetary Positions:\n${JSON.stringify(currentPlanets, null, 2)}\n\n`;

    prompt += `Please provide a detailed horoscope for the ${period} covering:\n`;
    prompt += `- General overview\n`;
    prompt += `- Love and relationships\n`;
    prompt += `- Career and finances\n`;
    prompt += `- Health and wellness\n`;
    prompt += `- Advice and recommendations\n`;

    return prompt;
  }

  async generatePersonalizedReading(
    userId: number,
    question: string,
    provider: AIProvider = AIProvider.CLAUDE,
  ): Promise<string> {
    // Get user's natal chart
    const natalChart = await this.chartRepository.findFirstByUserId(userId);

    if (!natalChart) {
      throw new Error('Natal chart not found for user');
    }

    // Build prompt with question and natal chart
    const prompt = `Based on the following natal chart data, please answer this question: "${question}"\n\nNatal Chart:\n${JSON.stringify(natalChart.data, null, 2)}`;

    // Generate answer using AI
    return this.aiService.generateText(prompt, provider);
  }
}
