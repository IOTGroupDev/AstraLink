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

type BiorhythmPhase =
  | 'peak'
  | 'high'
  | 'rising'
  | 'critical'
  | 'falling'
  | 'low';

interface BiorhythmTrendPoint {
  date: string;
  physical: number;
  emotional: number;
  intellectual: number;
  overall: number;
  overallPhase: BiorhythmPhase;
}

interface BiorhythmCriticalDay {
  date: string;
  channels: Array<'physical' | 'emotional' | 'intellectual'>;
}

export interface BiorhythmSnapshot {
  date: string;
  physical: number;
  emotional: number;
  intellectual: number;
  physicalPhase: BiorhythmPhase;
  emotionalPhase: BiorhythmPhase;
  intellectualPhase: BiorhythmPhase;
  overall: number;
  overallPhase: BiorhythmPhase;
  summary: string;
  trend: BiorhythmTrendPoint[];
  criticalDays: BiorhythmCriticalDay[];
}

@Injectable()
export class BiorhythmService {
  private readonly logger = new Logger(BiorhythmService.name);

  constructor(
    private supabaseService: SupabaseService,
    private ephemerisService: EphemerisService,
  ) {}

  private readonly cyclePeriods = {
    physical: 23,
    emotional: 28,
    intellectual: 33,
  } as const;

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

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private shiftDays(baseDate: Date, days: number): Date {
    const nextDate = new Date(baseDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + days);
    return nextDate;
  }

  private clampPercentage(value: number): number {
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  private cycleValue(days: number, period: number): number {
    return this.clampPercentage(
      ((Math.sin((2 * Math.PI * days) / period) + 1) / 2) * 100,
    );
  }

  private rawCycle(days: number, period: number): number {
    return Math.sin((2 * Math.PI * days) / period);
  }

  private getPhase(value: number, delta: number): BiorhythmPhase {
    if (value >= 90) return 'peak';
    if (value <= 10) return 'low';
    if (value >= 65) return delta >= 0 ? 'rising' : 'high';
    if (value <= 35) return delta <= 0 ? 'falling' : 'low';
    return 'critical';
  }

  private getChannelSummary(
    channel: 'physical' | 'emotional' | 'intellectual',
    phase: BiorhythmPhase,
    locale: 'ru' | 'en' | 'es',
  ): string {
    const copy = {
      ru: {
        physical: {
          peak: 'тело на максимуме, можно брать активные задачи',
          high: 'ресурс хороший, держите устойчивый темп',
          rising: 'энергия набирается, лучше входить в нагрузку постепенно',
          critical: 'идёт перелом фазы, распределяйте силы аккуратнее',
          falling: 'энергия снижается, не перегружайте себя',
          low: 'нужны восстановление, сон и мягкий режим',
        },
        emotional: {
          peak: 'эмоции открыты, легче договариваться и проявляться',
          high: 'контакт с чувствами хороший, общение даётся легче',
          rising: 'эмоциональный фон улучшается, можно идти в важные разговоры',
          critical: 'фон нестабилен, реагировать лучше без резкости',
          falling: 'чувствительность растёт, стоит снизить драму и шум',
          low: 'лучше беречь себя и не перегружать нервную систему',
        },
        intellectual: {
          peak: 'голова работает очень чётко, хорошо планировать и анализировать',
          high: 'фокус хороший, можно закрывать сложные задачи',
          rising: 'концентрация усиливается, хороший момент для обучения',
          critical: 'ум в переходной фазе, перепроверяйте решения',
          falling: 'внимание проседает, лучше дробить задачи',
          low: 'лучше не перегружать себя сложной аналитикой',
        },
      },
      en: {
        physical: {
          peak: 'your body is at a peak, good for demanding tasks',
          high: 'energy is solid, keep a steady pace',
          rising: 'energy is building, ease into stronger effort',
          critical: 'the cycle is turning, pace yourself carefully',
          falling: 'energy is dropping, avoid overload',
          low: 'recovery, sleep, and a softer schedule will help',
        },
        emotional: {
          peak: 'emotions are open, conversations flow more easily',
          high: 'emotional stability is strong, connection feels easier',
          rising: 'your mood is improving, good for important talks',
          critical: 'the emotional cycle is unstable, react more gently',
          falling: 'sensitivity is rising, reduce noise and drama',
          low: 'self-care matters more than emotional overexposure today',
        },
        intellectual: {
          peak: 'mental clarity is strong, ideal for strategy and analysis',
          high: 'focus is solid, good for complex work',
          rising: 'concentration is improving, useful for learning',
          critical: 'the mental cycle is shifting, double-check decisions',
          falling: 'focus is slipping, break work into smaller steps',
          low: 'avoid overloading yourself with heavy analysis today',
        },
      },
      es: {
        physical: {
          peak: 'el cuerpo está en pico, buen momento para tareas exigentes',
          high: 'la energía es estable, mantén un ritmo constante',
          rising: 'la energía está subiendo, entra en carga poco a poco',
          critical: 'el ciclo está cambiando, dosifica mejor las fuerzas',
          falling: 'la energía baja, evita sobrecargarte',
          low: 'hoy convienen descanso, sueño y un ritmo más suave',
        },
        emotional: {
          peak: 'las emociones están abiertas, es más fácil conectar',
          high: 'hay buena estabilidad emocional, hablar resulta más fácil',
          rising:
            'el ánimo mejora, buen momento para conversaciones importantes',
          critical:
            'el ciclo emocional está inestable, responde con más suavidad',
          falling: 'sube la sensibilidad, baja el drama y el ruido',
          low: 'hoy conviene cuidarte y no saturarte emocionalmente',
        },
        intellectual: {
          peak: 'la mente está muy clara, ideal para análisis y estrategia',
          high: 'el foco es bueno, sirve para tareas complejas',
          rising: 'la concentración mejora, buen momento para estudiar',
          critical: 'el ciclo mental está cambiando, revisa tus decisiones',
          falling: 'el foco cae, divide el trabajo en pasos cortos',
          low: 'mejor no cargarte con demasiada analítica hoy',
        },
      },
    } as const;

    return copy[locale][channel][phase];
  }

  private buildSummary(
    values: {
      physical: number;
      emotional: number;
      intellectual: number;
      physicalPhase: BiorhythmPhase;
      emotionalPhase: BiorhythmPhase;
      intellectualPhase: BiorhythmPhase;
      overall: number;
      overallPhase: BiorhythmPhase;
    },
    locale: 'ru' | 'en' | 'es',
  ): string {
    const channels: Array<
      ['physical' | 'emotional' | 'intellectual', number, BiorhythmPhase]
    > = [
      ['physical', values.physical, values.physicalPhase],
      ['emotional', values.emotional, values.emotionalPhase],
      ['intellectual', values.intellectual, values.intellectualPhase],
    ];

    const strongest = [...channels].sort((a, b) => b[1] - a[1])[0];
    const weakest = [...channels].sort((a, b) => a[1] - b[1])[0];

    const phaseLead = {
      ru: {
        peak: 'день на пике',
        high: 'день сильный',
        rising: 'день набирает ход',
        critical: 'день переходный',
        falling: 'день идёт на спад',
        low: 'день требует замедления',
      },
      en: {
        peak: 'the day is at a peak',
        high: 'the day feels strong',
        rising: 'the day is gaining momentum',
        critical: 'the day is in a turning phase',
        falling: 'the day is winding down',
        low: 'the day calls for a slower pace',
      },
      es: {
        peak: 'el día está en pico',
        high: 'el día se siente fuerte',
        rising: 'el día va ganando impulso',
        critical: 'el día está en una fase de cambio',
        falling: 'el día va bajando',
        low: 'el día pide bajar el ritmo',
      },
    } as const;

    const body = this.getChannelSummary(strongest[0], strongest[2], locale);
    const caution = this.getChannelSummary(weakest[0], weakest[2], locale);

    if (locale === 'ru') {
      return `${phaseLead[locale][values.overallPhase]}: сильнее всего сейчас ${body}, а внимательнее стоит отнестись к тому, что ${caution}.`;
    }
    if (locale === 'es') {
      return `${phaseLead[locale][values.overallPhase]}: ahora destaca que ${body}, y conviene vigilar que ${caution}.`;
    }

    return `${phaseLead[locale][values.overallPhase]}: the clearest support today is that ${body}, while the main caution is that ${caution}.`;
  }

  private buildSnapshot(
    birthDate: Date,
    targetDate: Date,
    locale: 'ru' | 'en' | 'es',
  ): Omit<BiorhythmSnapshot, 'trend' | 'criticalDays'> {
    const jdBirth = this.ephemerisService.dateToJulianDay(birthDate);
    const jdTarget = this.ephemerisService.dateToJulianDay(targetDate);
    const days = Math.max(0, Math.floor(jdTarget - jdBirth));

    const physical = this.cycleValue(days, this.cyclePeriods.physical);
    const emotional = this.cycleValue(days, this.cyclePeriods.emotional);
    const intellectual = this.cycleValue(days, this.cyclePeriods.intellectual);

    const physicalDelta =
      this.cycleValue(days + 1, this.cyclePeriods.physical) - physical;
    const emotionalDelta =
      this.cycleValue(days + 1, this.cyclePeriods.emotional) - emotional;
    const intellectualDelta =
      this.cycleValue(days + 1, this.cyclePeriods.intellectual) - intellectual;

    const physicalPhase = this.getPhase(physical, physicalDelta);
    const emotionalPhase = this.getPhase(emotional, emotionalDelta);
    const intellectualPhase = this.getPhase(intellectual, intellectualDelta);
    const overall = this.clampPercentage(
      (physical + emotional + intellectual) / 3,
    );
    const overallPhase = this.getPhase(
      overall,
      (physicalDelta + emotionalDelta + intellectualDelta) / 3,
    );

    return {
      date: this.formatDate(targetDate),
      physical,
      emotional,
      intellectual,
      physicalPhase,
      emotionalPhase,
      intellectualPhase,
      overall,
      overallPhase,
      summary: this.buildSummary(
        {
          physical,
          emotional,
          intellectual,
          physicalPhase,
          emotionalPhase,
          intellectualPhase,
          overall,
          overallPhase,
        },
        locale,
      ),
    };
  }

  private buildTrend(birthDate: Date, targetDate: Date): BiorhythmTrendPoint[] {
    return Array.from({ length: 7 }, (_, index) => {
      const point = this.buildSnapshot(
        birthDate,
        this.shiftDays(targetDate, index),
        'en',
      );
      return {
        date: point.date,
        physical: point.physical,
        emotional: point.emotional,
        intellectual: point.intellectual,
        overall: point.overall,
        overallPhase: point.overallPhase,
      };
    });
  }

  private buildCriticalDays(
    birthDate: Date,
    targetDate: Date,
  ): BiorhythmCriticalDay[] {
    const jdBirth = this.ephemerisService.dateToJulianDay(birthDate);

    return Array.from({ length: 14 }, (_, index) => {
      const date = this.shiftDays(targetDate, index);
      const jdTarget = this.ephemerisService.dateToJulianDay(date);
      const days = Math.max(0, Math.floor(jdTarget - jdBirth));
      const channels = (
        Object.entries(this.cyclePeriods) as Array<
          ['physical' | 'emotional' | 'intellectual', number]
        >
      )
        .filter(([, period]) => Math.abs(this.rawCycle(days, period)) <= 0.12)
        .map(([channel]) => channel);

      if (!channels.length) {
        return null;
      }

      return {
        date: this.formatDate(date),
        channels,
      };
    }).filter((item): item is BiorhythmCriticalDay => item !== null);
  }

  private async resolveBirthDate(
    userId: string,
    natalChart: any,
  ): Promise<Date> {
    const { data: user, error: userErr } =
      await this.supabaseService.getUserProfileAdmin(userId);

    if (!userErr && user?.birth_date) {
      const normalizedBirthDate = normalizeBirthDateValue(user.birth_date);
      if (normalizedBirthDate) {
        return this.toUtcNoonDate(normalizedBirthDate);
      }
    }

    if (natalChart) {
      const bd = natalChart?.data?.birthDate || natalChart?.data?.birth_date;
      const normalizedBirthDate = normalizeBirthDateValue(bd);
      if (normalizedBirthDate) {
        return this.toUtcNoonDate(normalizedBirthDate);
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
    const targetDateNoon = this.toUtcNoonDate(dateStr);
    const birthNoon = await this.resolveBirthDate(userId, natalChart);
    const snapshot = this.buildSnapshot(birthNoon, targetDateNoon, locale);

    return {
      ...snapshot,
      trend: this.buildTrend(birthNoon, targetDateNoon),
      criticalDays: this.buildCriticalDays(birthNoon, targetDateNoon),
    };
  }
}
