/**
 * Transit Service
 * Microservice for calculating planetary transits
 */

import { Injectable, Logger } from '@nestjs/common';
import { EphemerisService } from '../../services/ephemeris.service';

@Injectable()
export class TransitService {
  private readonly logger = new Logger(TransitService.name);

  constructor(private ephemerisService: EphemerisService) {}

  /**
   * Get transits for a date range
   */
  async getTransits(
    userId: string,
    natalChart: any,
    from: string,
    to: string,
  ) {
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
}
