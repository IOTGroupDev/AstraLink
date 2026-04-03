/**
 * Biorhythm Service
 * Microservice for calculating biorhythms based on birth date
 */

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import {
  buildBiorhythmSnapshotFromBirthDate,
  type BiorhythmSnapshot,
  toUtcNoonDate,
} from '@/common/utils/daily-astro-context.util';
import { normalizeBirthDateValue } from '@/common/utils/birth-data.util';

@Injectable()
export class BiorhythmService {
  private readonly logger = new Logger(BiorhythmService.name);

  constructor(private supabaseService: SupabaseService) {}

  private async resolveBirthDate(
    userId: string,
    natalChart: any,
  ): Promise<Date> {
    const { data: user, error: userErr } =
      await this.supabaseService.getUserProfileAdmin(userId);

    if (!userErr && user?.birth_date) {
      const normalizedBirthDate = normalizeBirthDateValue(user.birth_date);
      if (normalizedBirthDate) {
        return toUtcNoonDate(normalizedBirthDate);
      }
    }

    if (natalChart) {
      const bd = natalChart?.data?.birthDate || natalChart?.data?.birth_date;
      const normalizedBirthDate = normalizeBirthDateValue(bd);
      if (normalizedBirthDate) {
        return toUtcNoonDate(normalizedBirthDate);
      }
    }

    throw new NotFoundException('User birth date not found');
  }

  /**
   * Get real biorhythms based on user's birth date (using Swiss Ephemeris JD)
   */
  async getBiorhythms(
    userId: string,
    natalChart: any,
    dateStr?: string,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): Promise<BiorhythmSnapshot> {
    const targetDateNoon = toUtcNoonDate(dateStr);
    const birthDate = await this.resolveBirthDate(userId, natalChart);
    const snapshot = buildBiorhythmSnapshotFromBirthDate(
      birthDate,
      targetDateNoon,
      locale,
    );

    if (!snapshot) {
      throw new NotFoundException('User birth date not found');
    }

    return snapshot;
  }
}
