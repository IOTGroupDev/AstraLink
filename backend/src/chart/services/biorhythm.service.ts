/**
 * Biorhythm Service
 * Microservice for calculating biorhythms based on birth date
 */

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { EphemerisService } from '../../services/ephemeris.service';

@Injectable()
export class BiorhythmService {
  private readonly logger = new Logger(BiorhythmService.name);

  constructor(
    private supabaseService: SupabaseService,
    private ephemerisService: EphemerisService,
  ) {}

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
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const targetDateNoon = new Date(
      Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate(),
        12,
        0,
        0,
      ),
    );

    // Get user's birth date from Supabase
    const { data: user, error: userErr } = await this.supabaseService
      .from('users')
      .select('id, birth_date')
      .eq('id', userId)
      .single();

    if (userErr || !user?.birth_date) {
      // Fallback: if birth date is missing in users table — try to get from saved natal chart
      try {
        if (natalChart) {
          const bd =
            natalChart?.data?.birthDate || natalChart?.data?.birth_date;
          if (bd) {
            const birth = new Date(bd as string);
            const birthNoon = new Date(
              Date.UTC(
                birth.getUTCFullYear(),
                birth.getUTCMonth(),
                birth.getUTCDate(),
                12,
                0,
                0,
              ),
            );

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

    const birth = new Date(user.birth_date as string);
    const birthNoon = new Date(
      Date.UTC(
        birth.getUTCFullYear(),
        birth.getUTCMonth(),
        birth.getUTCDate(),
        12,
        0,
        0,
      ),
    );

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
