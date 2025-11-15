import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { RedisService } from '@/redis/redis.service';
import { EphemerisService } from '@/services/ephemeris.service';

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
  userChartData: any;
  candidateChartData: any;
  priority?: number;
}

export interface BatchCalculateJob {
  userId: string;
  userChartData: any;
  candidateChartIds: string[];
  candidatesData: any[];
}

@Processor('compatibility-calculation')
export class CompatibilityCalculatorProcessor {
  private readonly logger = new Logger(CompatibilityCalculatorProcessor.name);

  // Cache TTL: 7 days (synastry doesn't change unless charts change)
  private readonly SYNASTRY_CACHE_TTL = 7 * 24 * 60 * 60;

  constructor(
    private readonly redis: RedisService,
    private readonly ephemerisService: EphemerisService,
  ) {}

  /**
   * Calculate synastry between two charts
   * Result is cached for 7 days
   */
  @Process('calculate-synastry')
  async handleCalculateSynastry(job: Job<CalculateSynastryJob>) {
    const { userChartId, candidateChartId, userChartData, candidateChartData } =
      job.data;

    try {
      this.logger.debug(
        `Calculating synastry: ${userChartId} <-> ${candidateChartId}`,
      );

      // Check if already cached
      const cacheKey = this.getSynastryCacheKey(userChartId, candidateChartId);
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        this.logger.debug(`Synastry already cached: ${cacheKey}`);
        return { cached: true, result: cached };
      }

      // Calculate synastry
      const startTime = Date.now();
      const synastry = await this.ephemerisService.getSynastry(
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
        result: synastry,
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
    const { userId, userChartData, candidatesData } = job.data;

    this.logger.log(
      `Batch calculating synastry for user ${userId} with ${candidatesData.length} candidates`,
    );

    const results = [];
    let cached = 0;
    let calculated = 0;
    let failed = 0;

    for (const candidate of candidatesData) {
      try {
        const cacheKey = this.getSynastryCacheKey(
          userId,
          candidate.chart_id || candidate.id,
        );

        // Check cache first
        const cachedResult = await this.redis.get(cacheKey);
        if (cachedResult) {
          cached++;
          results.push({
            candidateId: candidate.chart_id || candidate.id,
            cached: true,
          });
          continue;
        }

        // Calculate synastry
        const synastry = await this.ephemerisService.getSynastry(
          userChartData,
          candidate.chart_data || candidate.data,
        );

        // Cache result
        await this.redis.set(cacheKey, synastry, this.SYNASTRY_CACHE_TTL);

        calculated++;
        results.push({
          candidateId: candidate.chart_id || candidate.id,
          calculated: true,
        });
      } catch (error) {
        failed++;
        this.logger.warn(
          `Failed to calculate synastry for candidate ${candidate.chart_id || candidate.id}:`,
          error,
        );
      }

      // Update job progress
      const progress = Math.round(
        (results.length / candidatesData.length) * 100,
      );
      job.progress(progress);
    }

    this.logger.log(
      `Batch calculation complete for user ${userId}: ` +
        `${cached} cached, ${calculated} calculated, ${failed} failed`,
    );

    return {
      success: true,
      total: candidatesData.length,
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
