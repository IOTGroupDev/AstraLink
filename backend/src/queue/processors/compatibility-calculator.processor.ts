import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { RedisService } from '@/redis/redis.service';
import { EphemerisService } from '@/services/ephemeris.service';
import { PrismaService } from '@/prisma/prisma.service';
import type { ChartData, SynastryData } from '@/dating/dating.types';

/**
 * Compatibility Calculator Processor
 *
 * Background worker that pre-calculates synastry (compatibility) between charts
 * Results are cached in Redis for fast retrieval
 *
 * Queue: 'compatibility-calculation'
 * Job Types:
 * - calculate-synastry: Calculate compatibility between two charts
 * - batch-calculate: Pre-calculate compatibility for a user with potential matches
 */

export interface CalculateSynastryJob {
  userChartId: string;
  candidateChartId: string;
  priority?: number;
}

export interface BatchCalculateJob {
  userChartId: string;
  candidateChartIds: string[];
}

type BatchCalculateResult =
  | {
      candidateChartId: string;
      cached: true;
    }
  | {
      candidateChartId: string;
      calculated: true;
    }
  | {
      candidateChartId: string;
      failed: true;
      reason: 'chart_not_found';
    };

@Processor('compatibility-calculation')
export class CompatibilityCalculatorProcessor {
  private readonly logger = new Logger(CompatibilityCalculatorProcessor.name);

  // Cache TTL: 7 days (synastry doesn't change unless charts change)
  private readonly SYNASTRY_CACHE_TTL = 7 * 24 * 60 * 60;

  constructor(
    private readonly redis: RedisService,
    private readonly ephemerisService: EphemerisService,
    private readonly prisma: PrismaService,
  ) {}

  private async getChartData(chartId: string): Promise<ChartData | null> {
    const chart = await this.prisma.chart.findUnique({
      where: { id: chartId },
      select: { data: true },
    });

    return (chart?.data as ChartData | undefined) ?? null;
  }

  /**
   * Calculate synastry between two charts
   * Result is cached for 7 days
   */
  @Process('calculate-synastry')
  async handleCalculateSynastry(job: Job<CalculateSynastryJob>) {
    const { userChartId, candidateChartId } = job.data;

    try {
      this.logger.debug(
        `Calculating synastry: ${userChartId} <-> ${candidateChartId}`,
      );

      // Check if already cached
      const cacheKey = this.getSynastryCacheKey(userChartId, candidateChartId);
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        this.logger.debug(`Synastry already cached: ${cacheKey}`);
        return { cached: true, cacheKey };
      }

      const [userChartData, candidateChartData] = await Promise.all([
        this.getChartData(userChartId),
        this.getChartData(candidateChartId),
      ]);

      if (!userChartData || !candidateChartData) {
        this.logger.warn(
          `Cannot calculate synastry; chart data missing for ${userChartId} <-> ${candidateChartId}`,
        );
        return { success: false, reason: 'chart_not_found' };
      }

      // Calculate synastry
      const startTime = Date.now();
      const synastry: SynastryData = await this.ephemerisService.getSynastry(
        userChartData,
        candidateChartData,
      );
      const duration = Date.now() - startTime;

      // Cache result
      await this.redis.set(cacheKey, synastry, this.SYNASTRY_CACHE_TTL);

      this.logger.log(
        `Synastry calculated and cached in ${duration}ms: ${cacheKey}`,
      );

      return {
        success: true,
        cacheKey,
        duration,
      };
    } catch (error) {
      this.logger.error(
        `Failed to calculate synastry ${userChartId} <-> ${candidateChartId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Batch calculate compatibility for multiple candidates
   * Useful for pre-calculating when user opens dating page
   */
  @Process('batch-calculate')
  async handleBatchCalculate(job: Job<BatchCalculateJob>) {
    const { userChartId, candidateChartIds } = job.data;

    this.logger.log(
      `Batch calculating synastry for chart ${userChartId} with ${candidateChartIds.length} candidates`,
    );

    const results: BatchCalculateResult[] = [];
    let cached = 0;
    let calculated = 0;
    let failed = 0;

    const userChartData = await this.getChartData(userChartId);
    if (!userChartData) {
      this.logger.warn(
        `Cannot batch calculate synastry; chart ${userChartId} not found`,
      );
      return {
        success: false,
        total: candidateChartIds.length,
        cached,
        calculated,
        failed: candidateChartIds.length,
        results,
      };
    }

    for (const candidateChartId of candidateChartIds) {
      try {
        const cacheKey = this.getSynastryCacheKey(
          userChartId,
          candidateChartId,
        );

        // Check cache first
        const cachedResult = await this.redis.get(cacheKey);
        if (cachedResult) {
          cached++;
          results.push({
            candidateChartId,
            cached: true,
          });
          continue;
        }

        const candidateChartData = await this.getChartData(candidateChartId);
        if (!candidateChartData) {
          failed++;
          results.push({
            candidateChartId,
            failed: true,
            reason: 'chart_not_found',
          });
          continue;
        }

        // Calculate synastry
        const synastry: SynastryData = await this.ephemerisService.getSynastry(
          userChartData,
          candidateChartData,
        );

        // Cache result
        await this.redis.set(cacheKey, synastry, this.SYNASTRY_CACHE_TTL);

        calculated++;
        results.push({
          candidateChartId,
          calculated: true,
        });
      } catch (error) {
        failed++;
        this.logger.warn(
          `Failed to calculate synastry for candidate chart ${candidateChartId}:`,
          error,
        );
      }

      // Update job progress
      const progress = Math.round(
        (results.length / candidateChartIds.length) * 100,
      );
      await job.progress(progress);
    }

    this.logger.log(
      `Batch calculation complete for chart ${userChartId}: ` +
        `${cached} cached, ${calculated} calculated, ${failed} failed`,
    );

    return {
      success: true,
      total: candidateChartIds.length,
      cached,
      calculated,
      failed,
      results,
    };
  }

  /**
   * Generate cache key for synastry result
   * Sorted to ensure same key regardless of order
   */
  private getSynastryCacheKey(chartId1: string, chartId2: string): string {
    const [id1, id2] = [chartId1, chartId2].sort();
    return `synastry:${id1}:${id2}`;
  }
}
