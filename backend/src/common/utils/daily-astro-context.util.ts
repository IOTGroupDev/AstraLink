import {
  getAspectName,
  getPlanetNameLocalized,
} from '@/modules/shared/astro-text';
import type { PlanetKey } from '@/modules/shared/types';
import type { TransitAspect } from '@/services/horoscope.types';
import { getBirthDateParts, normalizeBirthDateValue } from './birth-data.util';

export type DailyAstroLocale = 'ru' | 'en' | 'es';

export type BiorhythmPhase =
  | 'peak'
  | 'high'
  | 'rising'
  | 'critical'
  | 'falling'
  | 'low';

export interface BiorhythmTrendPoint {
  date: string;
  physical: number;
  emotional: number;
  intellectual: number;
  overall: number;
  overallPhase: BiorhythmPhase;
}

export interface BiorhythmCriticalDay {
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

export interface DailyAstroMainTransit {
  name: string;
  description: string;
  aspect?: string;
  targetPlanet?: string;
  strength?: number;
  tone: 'supportive' | 'mixed' | 'challenging';
  transitPlanetKey?: string;
  natalPlanetKey?: string;
}

export interface DailyAstroContext {
  source: 'natal-daily-v1';
  energy: number;
  mood: string;
  tone: 'supportive' | 'mixed' | 'challenging';
  summary: string;
  biorhythmSummary: string;
  lunarSummary: string;
  mainTransit: DailyAstroMainTransit | null;
}

interface MinimalLunarPhase {
  phaseName?: string;
  illumination?: number;
  isVoidOfCourse?: boolean;
}

interface MinimalLunarDay {
  number?: number;
  energy?: string;
  energyScore?: number;
  summary?: string;
  focus?: string;
}

const CYCLE_PERIODS = {
  physical: 23,
  emotional: 28,
  intellectual: 33,
} as const;

const clampPercentage = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(value)));

const formatDate = (date: Date): string => date.toISOString().split('T')[0];

const shiftDays = (baseDate: Date, days: number): Date => {
  const nextDate = new Date(baseDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
};

export function toUtcNoonDate(value?: string | Date): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
        12,
        0,
        0,
      ),
    );
  }

  const parts = getBirthDateParts(value);
  if (parts) {
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
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

export function extractChartBirthDate(chartLike: unknown): string | null {
  if (!chartLike || typeof chartLike !== 'object') {
    return null;
  }

  const record = chartLike as Record<string, unknown>;
  const nestedData =
    record.data && typeof record.data === 'object'
      ? (record.data as Record<string, unknown>)
      : null;

  return (
    normalizeBirthDateValue(record.birthDate) ||
    normalizeBirthDateValue(record.birth_date) ||
    normalizeBirthDateValue(nestedData?.birthDate) ||
    normalizeBirthDateValue(nestedData?.birth_date)
  );
}

function cycleValue(days: number, period: number): number {
  return clampPercentage(
    ((Math.sin((2 * Math.PI * days) / period) + 1) / 2) * 100,
  );
}

function rawCycle(days: number, period: number): number {
  return Math.sin((2 * Math.PI * days) / period);
}

function getPhase(value: number, delta: number): BiorhythmPhase {
  if (value >= 90) return 'peak';
  if (value <= 10) return 'low';
  if (value >= 65) return delta >= 0 ? 'rising' : 'high';
  if (value <= 35) return delta <= 0 ? 'falling' : 'low';
  return 'critical';
}

function getChannelSummary(
  channel: 'physical' | 'emotional' | 'intellectual',
  phase: BiorhythmPhase,
  locale: DailyAstroLocale,
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
        rising: 'el ánimo mejora, buen momento para conversaciones importantes',
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

function buildBiorhythmSummaryText(
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
  locale: DailyAstroLocale,
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

  const body = getChannelSummary(strongest[0], strongest[2], locale);
  const caution = getChannelSummary(weakest[0], weakest[2], locale);

  if (locale === 'ru') {
    const ruLead = {
      peak: 'Сегодня общий ритм на пике.',
      high: 'Сегодня общий ритм сильный.',
      rising: 'Сегодня ритм постепенно набирает силу.',
      critical: 'Сегодня переходный день: возможны перепады ресурса.',
      falling: 'Сегодня ритм постепенно снижается.',
      low: 'Сегодня лучше замедлиться и беречь силы.',
    } as const;
    const ruChannelNames = {
      physical: 'физический ресурс',
      emotional: 'эмоциональный фон',
      intellectual: 'умственный фокус',
    } as const;

    return `${ruLead[values.overallPhase]} Сильнее всего поддерживает ${ruChannelNames[strongest[0]]}: ${body}. Зона внимания: ${ruChannelNames[weakest[0]]}: ${caution}.`;
  }
  if (locale === 'es') {
    return `${phaseLead[locale][values.overallPhase]}: ahora destaca que ${body}, y conviene vigilar que ${caution}.`;
  }

  return `${phaseLead[locale][values.overallPhase]}: the clearest support today is that ${body}, while the main caution is that ${caution}.`;
}

function buildBiorhythmSnapshotCore(
  birthDate: Date,
  targetDate: Date,
  locale: DailyAstroLocale,
): Omit<BiorhythmSnapshot, 'trend' | 'criticalDays'> {
  const days = Math.max(
    0,
    Math.floor(
      (targetDate.getTime() - birthDate.getTime()) / (24 * 60 * 60 * 1000),
    ),
  );

  const physical = cycleValue(days, CYCLE_PERIODS.physical);
  const emotional = cycleValue(days, CYCLE_PERIODS.emotional);
  const intellectual = cycleValue(days, CYCLE_PERIODS.intellectual);

  const physicalDelta = cycleValue(days + 1, CYCLE_PERIODS.physical) - physical;
  const emotionalDelta =
    cycleValue(days + 1, CYCLE_PERIODS.emotional) - emotional;
  const intellectualDelta =
    cycleValue(days + 1, CYCLE_PERIODS.intellectual) - intellectual;

  const physicalPhase = getPhase(physical, physicalDelta);
  const emotionalPhase = getPhase(emotional, emotionalDelta);
  const intellectualPhase = getPhase(intellectual, intellectualDelta);
  const overall = clampPercentage((physical + emotional + intellectual) / 3);
  const overallPhase = getPhase(
    overall,
    (physicalDelta + emotionalDelta + intellectualDelta) / 3,
  );

  return {
    date: formatDate(targetDate),
    physical,
    emotional,
    intellectual,
    physicalPhase,
    emotionalPhase,
    intellectualPhase,
    overall,
    overallPhase,
    summary: buildBiorhythmSummaryText(
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

function buildBiorhythmTrend(
  birthDate: Date,
  targetDate: Date,
): BiorhythmTrendPoint[] {
  return Array.from({ length: 7 }, (_, index) => {
    const point = buildBiorhythmSnapshotCore(
      birthDate,
      shiftDays(targetDate, index),
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

function buildBiorhythmCriticalDays(
  birthDate: Date,
  targetDate: Date,
): BiorhythmCriticalDay[] {
  return Array.from({ length: 14 }, (_, index) => {
    const date = shiftDays(targetDate, index);
    const days = Math.max(
      0,
      Math.floor(
        (date.getTime() - birthDate.getTime()) / (24 * 60 * 60 * 1000),
      ),
    );
    const channels = (
      Object.entries(CYCLE_PERIODS) as Array<
        ['physical' | 'emotional' | 'intellectual', number]
      >
    )
      .filter(([, period]) => Math.abs(rawCycle(days, period)) <= 0.12)
      .map(([channel]) => channel);

    if (!channels.length) {
      return null;
    }

    return {
      date: formatDate(date),
      channels,
    };
  }).filter((item): item is BiorhythmCriticalDay => item !== null);
}

export function buildBiorhythmSnapshotFromBirthDate(
  birthDateValue: unknown,
  targetDate: Date,
  locale: DailyAstroLocale,
): BiorhythmSnapshot | null {
  const normalizedBirthDate = normalizeBirthDateValue(birthDateValue);
  if (!normalizedBirthDate) {
    return null;
  }

  const birthNoon = toUtcNoonDate(normalizedBirthDate);
  const targetNoon = toUtcNoonDate(targetDate);
  const snapshot = buildBiorhythmSnapshotCore(birthNoon, targetNoon, locale);

  return {
    ...snapshot,
    trend: buildBiorhythmTrend(birthNoon, targetNoon),
    criticalDays: buildBiorhythmCriticalDays(birthNoon, targetNoon),
  };
}

export function calculateTransitEnergyScore(
  transitAspects: TransitAspect[],
): number {
  let energy = 50;

  transitAspects.forEach((aspect) => {
    if (['trine', 'sextile'].includes(aspect.aspect)) {
      energy += aspect.strength * 15;
    } else if (aspect.aspect === 'conjunction') {
      energy += aspect.strength * 10;
    } else if (['square', 'opposition'].includes(aspect.aspect)) {
      energy += aspect.strength * 5;
    }

    if (aspect.isRetrograde) {
      energy -= aspect.strength * 5;
    }
  });

  return clampPercentage(energy);
}

function calculateTransitTone(
  transitAspects: TransitAspect[],
): 'supportive' | 'mixed' | 'challenging' {
  let score = 0;

  transitAspects.forEach((aspect) => {
    if (['trine', 'sextile'].includes(aspect.aspect)) {
      score += aspect.strength;
    } else if (aspect.aspect === 'conjunction') {
      score += aspect.strength * 0.4;
    } else if (
      [
        'square',
        'opposition',
        'quincunx',
        'semi-square',
        'sesquiquadrate',
      ].includes(aspect.aspect)
    ) {
      score -= aspect.strength;
    }
  });

  if (score > 0.5) return 'supportive';
  if (score < -0.5) return 'challenging';
  return 'mixed';
}

function buildMainTransit(
  transitAspects: TransitAspect[],
  locale: DailyAstroLocale,
): DailyAstroMainTransit | null {
  const mainAspect = [...transitAspects].sort(
    (a, b) => b.strength - a.strength,
  )[0];
  if (!mainAspect) {
    return null;
  }

  const transitPlanetKey = String(
    mainAspect.transitPlanet || 'sun',
  ) as PlanetKey;
  const natalPlanetKey = String(mainAspect.natalPlanet || 'sun') as PlanetKey;
  const transitPlanet = getPlanetNameLocalized(transitPlanetKey, locale);
  const natalPlanet = getPlanetNameLocalized(natalPlanetKey, locale);
  const aspectName = getAspectName(mainAspect.aspect, locale);
  const tone = calculateTransitTone([mainAspect]);

  const description =
    locale === 'en'
      ? `${transitPlanet} ${aspectName} natal ${natalPlanet} sets the main tone of the day.`
      : locale === 'es'
        ? `${transitPlanet} ${aspectName} al ${natalPlanet} natal marca el tono principal del día.`
        : `${transitPlanet} в аспекте ${aspectName} к натальному ${natalPlanet} задаёт главный тон дня.`;

  return {
    name: `${transitPlanet} ${aspectName} ${natalPlanet}`,
    description,
    aspect: aspectName,
    targetPlanet: natalPlanet,
    strength: mainAspect.strength || 0,
    tone,
    transitPlanetKey,
    natalPlanetKey,
  };
}

function buildLunarSummary(
  lunarPhase: MinimalLunarPhase | null,
  lunarDay: MinimalLunarDay | null,
  locale: DailyAstroLocale,
): string {
  if (!lunarPhase && !lunarDay) {
    if (locale === 'en') return 'Lunar context is neutral.';
    if (locale === 'es') return 'El contexto lunar es neutro.';
    return 'Лунный фон нейтральный.';
  }

  const phaseName =
    lunarPhase?.phaseName ||
    (locale === 'en'
      ? 'current Moon phase'
      : locale === 'es'
        ? 'fase lunar actual'
        : 'текущая фаза Луны');
  const dayNumber = lunarDay?.number;
  const lunarSummary = lunarDay?.summary;
  const voidNote = lunarPhase?.isVoidOfCourse
    ? locale === 'en'
      ? ' The Moon is void of course, so avoid rushed commitments.'
      : locale === 'es'
        ? ' La Luna está sin curso, así que evita compromisos precipitados.'
        : ' Луна без курса, поэтому лучше не принимать поспешных обязательств.'
    : '';

  if (locale === 'en') {
    return `Lunar backdrop: ${phaseName}${dayNumber != null ? `, lunar day ${dayNumber}` : ''}. ${lunarSummary || 'Use the day for softer, intuitive pacing.'}${voidNote}`;
  }
  if (locale === 'es') {
    return `Fondo lunar: ${phaseName}${dayNumber != null ? `, día lunar ${dayNumber}` : ''}. ${lunarSummary || 'Conviene moverse con un ritmo más suave e intuitivo.'}${voidNote}`;
  }
  return `Лунный фон: ${phaseName}${dayNumber != null ? `, ${dayNumber}-й лунный день` : ''}. ${lunarSummary || 'Лучше держать более мягкий и интуитивный ритм.'}${voidNote}`;
}

function getCombinedMood(
  energy: number,
  tone: 'supportive' | 'mixed' | 'challenging',
  locale: DailyAstroLocale,
): string {
  if (locale === 'en') {
    if (tone === 'challenging' && energy < 45) return 'Intense and demanding';
    if (tone === 'supportive' && energy >= 65) return 'Energized and open';
    if (energy < 40) return 'Quiet and careful';
    if (energy > 70) return 'Focused and proactive';
    return 'Balanced but changeable';
  }
  if (locale === 'es') {
    if (tone === 'challenging' && energy < 45) return 'Intenso y exigente';
    if (tone === 'supportive' && energy >= 65) return 'Con energía y apertura';
    if (energy < 40) return 'Calmado y prudente';
    if (energy > 70) return 'Enfocado y proactivo';
    return 'Equilibrado pero cambiante';
  }
  if (tone === 'challenging' && energy < 45)
    return 'Напряжённое и требовательное';
  if (tone === 'supportive' && energy >= 65) return 'Собранное и открытое';
  if (energy < 40) return 'Тихое и осторожное';
  if (energy > 70) return 'Сфокусированное и активное';
  return 'Сбалансированное, но переменчивое';
}

function buildDailySummary(
  tone: 'supportive' | 'mixed' | 'challenging',
  energy: number,
  mainTransit: DailyAstroMainTransit | null,
  biorhythm: BiorhythmSnapshot | null,
  lunarPhase: MinimalLunarPhase | null,
  locale: DailyAstroLocale,
): string {
  const voidOfCourse = lunarPhase?.isVoidOfCourse === true;
  const transitName = mainTransit?.name;

  if (locale === 'en') {
    if (mainTransit?.tone === 'supportive' && energy < 50) {
      return `${transitName ? `${transitName} opens a real opportunity, ` : ''}but your internal reserve is lower than the outer momentum suggests. Move selectively, conserve strength, and avoid treating the whole day as a green light.`;
    }
    if (mainTransit?.tone === 'challenging' && energy >= 55) {
      return `${transitName ? `${transitName} raises pressure, ` : ''}but your reserve is strong enough to handle it. Use the day for disciplined action, not impulsive reactions${voidOfCourse ? ', and avoid locking in fast decisions' : ''}.`;
    }
    if (tone === 'supportive' && energy >= 65) {
      return `${transitName ? `${transitName} supports movement, and ` : ''}your internal reserve is holding well. This is a day to act with focus, not chaos${voidOfCourse ? ', while leaving room for revisions' : ''}.`;
    }
    if (tone === 'challenging') {
      return `${transitName ? `${transitName} adds tension, ` : ''}and the day is not supported by strong inner reserve. Slow the pace, reduce friction, and be careful with overcommitment.`;
    }
    return `${biorhythm?.summary || 'The day is mixed.'} ${voidOfCourse ? 'The Moon is void of course, so flexible plans will work better than rigid ones.' : ''}`.trim();
  }

  if (locale === 'es') {
    if (mainTransit?.tone === 'supportive' && energy < 50) {
      return `${transitName ? `${transitName} abre una oportunidad real, ` : ''}pero tu reserva interna es menor de lo que sugiere el impulso externo. Muévete de forma selectiva, cuida tu energía y no trates todo el día como luz verde.`;
    }
    if (mainTransit?.tone === 'challenging' && energy >= 55) {
      return `${transitName ? `${transitName} eleva la presión, ` : ''}pero tu reserva alcanza para sostenerla. Usa el día para acciones disciplinadas, no para reacciones impulsivas${voidOfCourse ? ', y evita cerrar decisiones apresuradas' : ''}.`;
    }
    if (tone === 'supportive' && energy >= 65) {
      return `${transitName ? `${transitName} impulsa el movimiento, y ` : ''}tu reserva interna sostiene bien el ritmo. Es un día para actuar con enfoque, no con caos${voidOfCourse ? ', dejando margen para revisiones' : ''}.`;
    }
    if (tone === 'challenging') {
      return `${transitName ? `${transitName} añade tensión, ` : ''}y el día no está respaldado por una reserva interna fuerte. Baja el ritmo, reduce la fricción y cuida no comprometerte de más.`;
    }
    return `${biorhythm?.summary || 'El día es mixto.'} ${voidOfCourse ? 'La Luna está sin curso, así que un plan flexible funcionará mejor que uno rígido.' : ''}`.trim();
  }

  if (mainTransit?.tone === 'supportive' && energy < 50) {
    return `${transitName ? `${transitName} открывает возможность, ` : ''}но внутренний ресурс ниже, чем подсказывает внешний импульс. Лучше действовать точечно, беречь силы и не воспринимать весь день как сплошной зелёный свет.`;
  }
  if (mainTransit?.tone === 'challenging' && energy >= 55) {
    return `${transitName ? `${transitName} повышает давление, ` : ''}но запаса сил достаточно, чтобы пройти день собранно. Подойдут дисциплина и точные шаги, а не импульсивные реакции${voidOfCourse ? ', особенно если решение хочется принять слишком быстро' : ''}.`;
  }
  if (tone === 'supportive' && energy >= 65) {
    return `${transitName ? `${transitName} поддерживает движение, а ` : ''}внутренний ресурс сейчас держит хороший темп. Это день для собранных действий, а не для хаотичных рывков${voidOfCourse ? ', с запасом на пересборку планов' : ''}.`;
  }
  if (tone === 'challenging') {
    return `${transitName ? `${transitName} добавляет напряжение, ` : ''}и день не поддержан сильным внутренним ресурсом. Лучше снизить темп, убрать лишнее трение и осторожнее относиться к перегрузке.`;
  }
  return `${biorhythm?.summary || 'День смешанный.'} ${voidOfCourse ? 'Луна без курса, поэтому гибкий план сработает лучше жёсткого.' : ''}`.trim();
}

export function buildDailyAstroContext(params: {
  birthDateValue?: unknown;
  targetDate: Date;
  transitAspects: TransitAspect[];
  lunarPhase?: MinimalLunarPhase | null;
  lunarDay?: MinimalLunarDay | null;
  locale: DailyAstroLocale;
}): DailyAstroContext {
  const {
    birthDateValue,
    targetDate,
    transitAspects,
    lunarPhase,
    lunarDay,
    locale,
  } = params;
  const biorhythm = buildBiorhythmSnapshotFromBirthDate(
    birthDateValue,
    targetDate,
    locale,
  );
  const transitEnergy = calculateTransitEnergyScore(transitAspects);
  const transitTone = calculateTransitTone(transitAspects);
  const mainTransit = buildMainTransit(transitAspects, locale);

  let lunarSupport =
    typeof lunarDay?.energyScore === 'number' ? lunarDay.energyScore : 50;
  if (lunarPhase?.isVoidOfCourse) {
    lunarSupport = Math.max(0, lunarSupport - 15);
  }

  const reserve = biorhythm?.overall ?? 50;
  const energy = clampPercentage(
    reserve * 0.55 + transitEnergy * 0.35 + lunarSupport * 0.1,
  );

  const tone: 'supportive' | 'mixed' | 'challenging' =
    transitTone === 'supportive' && reserve >= 55 && lunarSupport >= 50
      ? 'supportive'
      : transitTone === 'challenging' && (reserve <= 45 || lunarSupport < 40)
        ? 'challenging'
        : 'mixed';

  const summary = buildDailySummary(
    tone,
    energy,
    mainTransit,
    biorhythm,
    lunarPhase || null,
    locale,
  );

  return {
    source: 'natal-daily-v1',
    energy,
    mood: getCombinedMood(energy, tone, locale),
    tone,
    summary,
    biorhythmSummary:
      biorhythm?.summary ||
      (locale === 'en'
        ? 'No birth-date based biorhythm snapshot is available.'
        : locale === 'es'
          ? 'No hay una instantánea de biorritmos basada en la fecha de nacimiento.'
          : 'Нет снимка биоритмов на основе даты рождения.'),
    lunarSummary: buildLunarSummary(
      lunarPhase || null,
      lunarDay || null,
      locale,
    ),
    mainTransit,
  };
}
