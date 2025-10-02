export interface MoonPhase {
  phase: number;
  phaseName: string;
  illumination: number;
  sign: string;
  degree: number;
  house?: number;
  isVoidOfCourse: boolean;
  nextPhaseDate: string;
  recommendations: {
    general: string;
    emotional: string;
    practical: string;
    avoid: string;
  };
}
export interface LunarDay {
  number: number;
  name: string;
  energy: 'positive' | 'neutral' | 'challenging';
  recommendations: string[];
}
export interface LunarCalendarDay {
  date: string;
  moonPhase: MoonPhase;
  lunarDay: LunarDay;
  isFavorable: boolean;
}
export interface MonthlyLunarCalendar {
  year: number;
  month: number;
  days: LunarCalendarDay[];
}
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
export declare const getMoonPhaseIcon: (phase: number) => string;
export declare const getMoonPhaseColor: (phase: number) => string;
export declare const isWaxing: (phase: number) => boolean;
export declare const isWaning: (phase: number) => boolean;
export declare const isNewMoon: (phase: number) => boolean;
export declare const isFullMoon: (phase: number) => boolean;
export declare const formatMoonPhase: (moonPhase: MoonPhase) => string;
export declare const formatLunarDay: (lunarDay: LunarDay) => string;
export declare const LUNAR_ENERGY_COLORS: {
  readonly positive: '#10B981';
  readonly neutral: '#8B5CF6';
  readonly challenging: '#EF4444';
};
