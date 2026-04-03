// frontend/src/types/lunar.ts
// Полные TypeScript типы для лунного календаря

/**
 * Фаза Луны
 */
export interface MoonPhase {
  /** Фаза луны 0-1 (0 = новолуние, 0.5 = полнолуние) */
  phase: number;

  /** Название фазы на русском */
  phaseName: string;

  /** Процент освещенности 0-100 */
  illumination: number;

  /** Знак зодиака, в котором находится Луна */
  sign: string;

  /** Градус в знаке (0-30) */
  degree: number;

  /** Дом в натальной карте (если доступна) */
  house?: number;

  /** Луна без курса (Void of Course) */
  isVoidOfCourse: boolean;

  /** Дата следующей ключевой фазы (ISO string) */
  nextPhaseDate: string;

  /** Рекомендации на основе фазы */
  recommendations: {
    /** Общие рекомендации */
    general: string;
    /** Эмоциональная сфера */
    emotional: string;
    /** Практические действия */
    practical: string;
    /** Чего избегать */
    avoid: string;
  };
}

/**
 * Лунный день (1-30)
 */
export interface LunarDay {
  /** Номер лунного дня */
  number: number;

  /** Название дня */
  name: string;

  /** Энергетика дня */
  energy: 'positive' | 'neutral' | 'challenging';

  /** Рекомендации на день */
  recommendations: string[];

  /** Сила дня по шкале 0-100 */
  energyScore: number;

  /** Основной режим дня */
  focus: 'initiate' | 'build' | 'complete' | 'release' | 'restore';

  /** Краткое человеческое резюме дня */
  summary: string;

  /** Для чего день подходит лучше всего */
  bestFor: string[];

  /** Чего стоит избегать */
  avoid: string[];
}

/**
 * День в лунном календаре
 */
export interface LunarCalendarDay {
  /** Дата в формате YYYY-MM-DD */
  date: string;

  /** Фаза луны на эту дату */
  moonPhase: MoonPhase;

  /** Лунный день */
  lunarDay: LunarDay;

  /** Благоприятен ли день для начинаний */
  isFavorable: boolean;

  /** Общая сила дня */
  favorabilityScore: number;

  /** Тип дня */
  dayType: 'power' | 'supportive' | 'mixed' | 'challenging';
}

/**
 * Полный месячный календарь
 */
export interface MonthlyLunarCalendar {
  /** Год */
  year: number;

  /** Месяц (0-11) */
  month: number;

  /** Массив дней */
  days: LunarCalendarDay[];
}

// Экспорт для удобства
export type MoonPhaseName =
  | 'Новолуние'
  | 'Растущий серп'
  | 'Первая четверть'
  | 'Растущая луна'
  | 'Полнолуние'
  | 'Убывающая луна'
  | 'Последняя четверть'
  | 'Убывающий серп';

export type LunarDayEnergy = 'positive' | 'neutral' | 'challenging';

// Helper функции для работы с фазами
export const getMoonPhaseIcon = (phase: number): string => {
  if (phase < 0.03) return '🌑'; // Новолуние
  if (phase < 0.22) return '🌒'; // Растущий серп
  if (phase < 0.28) return '🌓'; // Первая четверть
  if (phase < 0.47) return '🌔'; // Растущая луна
  if (phase < 0.53) return '🌕'; // Полнолуние
  if (phase < 0.72) return '🌖'; // Убывающая луна
  if (phase < 0.78) return '🌗'; // Последняя четверть
  if (phase < 0.97) return '🌘'; // Убывающий серп
  return '🌑'; // Новолуние
};

export const getMoonPhaseColor = (phase: number): string => {
  if (phase < 0.25) return '#8B5CF6'; // Фиолетовый - новолуние/растущая
  if (phase < 0.5) return '#EC4899'; // Розовый - полнолуние приближается
  if (phase < 0.75) return '#3B82F6'; // Синий - убывающая
  return '#6366F1'; // Индиго - к новолунию
};

export const isWaxing = (phase: number): boolean => {
  return phase > 0 && phase < 0.5;
};

export const isWaning = (phase: number): boolean => {
  return phase >= 0.5 && phase < 1;
};

export const isNewMoon = (phase: number): boolean => {
  return phase < 0.03 || phase > 0.97;
};

export const isFullMoon = (phase: number): boolean => {
  return phase >= 0.47 && phase <= 0.53;
};

// Утилиты для форматирования
export const formatMoonPhase = (moonPhase: MoonPhase): string => {
  return `${moonPhase.phaseName} (${moonPhase.illumination}%)`;
};

export const formatLunarDay = (lunarDay: LunarDay): string => {
  return `${lunarDay.number}-й лунный день: ${lunarDay.name}`;
};

// Цвета энергии дня
export const LUNAR_ENERGY_COLORS = {
  positive: '#10B981',
  neutral: '#8B5CF6',
  challenging: '#EF4444',
} as const;
