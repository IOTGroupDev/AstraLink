/**
 * Biorhythm Service
 * Microservice for calculating biorhythms based on birth date
 */

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { EphemerisService } from '../../services/ephemeris.service';
import {
  getBirthDateParts,
  normalizeBirthDateValue,
} from '@/common/utils/birth-data.util';

@Injectable()
export class BiorhythmService {
  private readonly logger = new Logger(BiorhythmService.name);

  constructor(
    private supabaseService: SupabaseService,
    private ephemerisService: EphemerisService,
  ) {}

  private toUtcNoonDate(value?: string): Date {
    const parts = getBirthDateParts(value);
    if (parts) {
      return new Date(
        Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0),
      );
    }

    const parsed = value ? new Date(value) : new Date();
    return new Date(
      Date.UTC(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate(),
        12,
        0,
        0,
      ),
    );
  }

  /**
   * Get real biorhythms based on user's birth date (using Swiss Ephemeris JD)
   */
  async getBiorhythms(
    userId: string,
    natalChart: any,
    dateStr?: string,
  ): Promise<{
    date: string;
    physical: number;
    emotional: number;
    intellectual: number;
  }> {
    // Target date (noon UTC for Julian day stability)
    const targetDateNoon = this.toUtcNoonDate(dateStr);

    // Get user's birth date from Supabase (admin client to bypass RLS)
    const { data: user, error: userErr } =
      await this.supabaseService.getUserProfileAdmin(userId);

    if (userErr || !user?.birth_date) {
      // Fallback: if birth date is missing in users table — try to get from saved natal chart
      try {
        if (natalChart) {
          const bd =
            natalChart?.data?.birthDate || natalChart?.data?.birth_date;
          const normalizedBirthDate = normalizeBirthDateValue(bd);
          if (normalizedBirthDate) {
            const birthNoon = this.toUtcNoonDate(normalizedBirthDate);

            const jdBirth = this.ephemerisService.dateToJulianDay(birthNoon);
            const jdTarget =
              this.ephemerisService.dateToJulianDay(targetDateNoon);
            const days = Math.max(0, Math.floor(jdTarget - jdBirth));

            const cycle = (period: number) =>
              Math.round(
                ((Math.sin((2 * Math.PI * days) / period) + 1) / 2) * 100,
              );

            const physical = Math.min(100, Math.max(0, cycle(23)));
            const emotional = Math.min(100, Math.max(0, cycle(28)));
            const intellectual = Math.min(100, Math.max(0, cycle(33)));

            return {
              date: targetDateNoon.toISOString().split('T')[0],
              physical,
              emotional,
              intellectual,
            };
          }
        }
      } catch (_e) {
        // ignore, will throw error below if unable to get date
      }

      throw new NotFoundException('User birth date not found');
    }

    const normalizedBirthDate = normalizeBirthDateValue(user.birth_date);
    if (!normalizedBirthDate) {
      throw new NotFoundException('User birth date not found');
    }
    const birthNoon = this.toUtcNoonDate(normalizedBirthDate);

    // Difference in Julian days via Swiss Ephemeris (real source)
    const jdBirth = this.ephemerisService.dateToJulianDay(birthNoon);
    const jdTarget = this.ephemerisService.dateToJulianDay(targetDateNoon);
    const days = Math.max(0, Math.floor(jdTarget - jdBirth));

    const cycle = (period: number) =>
      Math.round(((Math.sin((2 * Math.PI * days) / period) + 1) / 2) * 100);

    const physical = Math.min(100, Math.max(0, cycle(23)));
    const emotional = Math.min(100, Math.max(0, cycle(28)));
    const intellectual = Math.min(100, Math.max(0, cycle(33)));

    return {
      date: targetDateNoon.toISOString().split('T')[0],
      physical,
      emotional,
      intellectual,
    };
  }
}
