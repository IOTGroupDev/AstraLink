import { api } from './client';
import type {
  ArchetypeResult,
  Chart,
  TransitsResponse,
  LunarCalendarDay,
  LunarDay,
  MoonPhase,
} from '../../types';
import { CodePurpose, PersonalCodeResult } from '../../types/personal-code';
import { chartLogger } from '../logger';

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildLocalDateParams = (date?: string): URLSearchParams => {
  const now = new Date();
  return new URLSearchParams({
    date: date ?? formatLocalDate(now),
    tzOffsetMinutes: String(-now.getTimezoneOffset()),
  });
};

const buildLocalTimezoneParams = (): URLSearchParams => {
  const now = new Date();
  return new URLSearchParams({
    tzOffsetMinutes: String(-now.getTimezoneOffset()),
  });
};

const normalizeLocale = (locale?: string): 'ru' | 'en' | 'es' => {
  const normalized = String(locale || 'ru').toLowerCase();
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  if (normalized === 'es' || normalized.startsWith('es-')) return 'es';
  return 'ru';
};

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

export interface BiorhythmResponse {
  physical: number;
  emotional: number;
  intellectual: number;
  date: string;
  physicalPhase: BiorhythmPhase;
  emotionalPhase: BiorhythmPhase;
  intellectualPhase: BiorhythmPhase;
  overall: number;
  overallPhase: BiorhythmPhase;
  summary: string;
  trend: BiorhythmTrendPoint[];
  criticalDays: BiorhythmCriticalDay[];
}

export type HoroscopeGeneratedBy = 'ai' | 'interpreter' | 'mixed';
export type HoroscopeStatus = 'ready' | 'ai_pending';
export type HoroscopeTone = 'supportive' | 'mixed' | 'challenging';

export interface HoroscopeMeta {
  tone: HoroscopeTone;
  focus: string;
  risk: string;
  keyWindow: string;
}

export interface HoroscopeMainTransit {
  name: string;
  description: string;
  aspect?: string;
  targetPlanet?: string;
  strength?: number;
  tone: HoroscopeTone;
  transitPlanetKey?: string;
  natalPlanetKey?: string;
}

export interface HoroscopeDailyContext {
  source: 'natal-daily-v1';
  tone: HoroscopeTone;
  summary: string;
  biorhythmSummary: string;
  lunarSummary: string;
}

export interface HoroscopeContent {
  general: string;
  love: string;
  career: string;
  health: string;
  finance: string;
  advice: string;
  luckyNumbers: number[];
  luckyColors: Array<string | Record<string, unknown>>;
  energy: number;
  mood: string;
  challenges: string[];
  opportunities: string[];
  generatedBy: HoroscopeGeneratedBy;
  status: HoroscopeStatus;
  updatedAt: string;
  meta: HoroscopeMeta;
  mainTransit?: HoroscopeMainTransit | null;
  dailyContext?: HoroscopeDailyContext;
}

export interface HoroscopeBundle {
  day: HoroscopeContent | null;
  tomorrow: HoroscopeContent | null;
  week: HoroscopeContent | null;
  month: HoroscopeContent | null;
}

export const chartAPI = {
  getNatalChart: async (): Promise<Chart | null> => {
    try {
      const response = await api.get('/chart/natal');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        chartLogger.log('Натальная карта не найдена');
        return null;
      }
      throw error;
    }
  },

  createNatalChart: async (
    data: any,
    locale: 'ru' | 'en' | 'es' = 'ru'
  ): Promise<Chart> => {
    const response = await api.post(
      `/chart/natal?locale=${normalizeLocale(locale)}`,
      { data }
    );
    return response.data;
  },

  recalculateNatalChart: async (
    locale: 'ru' | 'en' | 'es' = 'ru'
  ): Promise<Chart> => {
    const response = await api.post(
      `/chart/natal/recalculate?locale=${normalizeLocale(locale)}`
    );
    return response.data;
  },

  getChartInterpretation: async (
    locale: 'ru' | 'en' | 'es' = 'ru'
  ): Promise<any> => {
    try {
      const response = await api.get(
        `/chart/natal/interpretation?locale=${normalizeLocale(locale)}`
      );
      return response.data;
    } catch (error) {
      chartLogger.error('Ошибка загрузки интерпретации', error);
      return null;
    }
  },

  getNatalChartWithInterpretation: async (
    locale: 'ru' | 'en' | 'es' = 'ru'
  ): Promise<any> => {
    try {
      const response = await api.get(
        `/chart/natal/full?locale=${normalizeLocale(locale)}`
      );
      return response.data;
    } catch (error) {
      chartLogger.error('Ошибка загрузки полной карты', error);
      throw error;
    }
  },

  getArchetype: async (
    locale: 'ru' | 'en' | 'es' = 'ru'
  ): Promise<ArchetypeResult> => {
    const response = await api.get(
      `/chart/archetype?locale=${normalizeLocale(locale)}`
    );
    return response.data;
  },

  getHoroscope: async (
    period: 'day' | 'tomorrow' | 'week' | 'month' = 'day',
    locale: 'ru' | 'en' | 'es' = 'ru'
  ): Promise<any> => {
    try {
      const params = buildLocalTimezoneParams();
      params.set('period', period);
      params.set('locale', normalizeLocale(locale));
      const response = await api.get(`/chart/horoscope?${params.toString()}`);
      return response.data;
    } catch (error) {
      chartLogger.error(`Ошибка загрузки гороскопа на ${period}`, error);
      throw error;
    }
  },

  getAllHoroscopes: async (
    locale: 'ru' | 'en' | 'es' = 'ru'
  ): Promise<{
    today: unknown;
    tomorrow: unknown;
    week: unknown;
    month: unknown;
  }> => {
    try {
      const params = buildLocalTimezoneParams();
      params.set('locale', normalizeLocale(locale));
      const response = await api.get(
        `/chart/horoscope/all?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      chartLogger.error('Ошибка загрузки всех гороскопов', error);
      throw error;
    }
  },

  getTransits: async (from: string, to: string): Promise<TransitsResponse> => {
    const response = await api.get(`/chart/transits?from=${from}&to=${to}`);
    return response.data;
  },

  getCurrentPlanets: async (): Promise<any> => {
    const response = await api.get('/chart/current');
    return response.data;
  },

  getMoonPhase: async (
    date?: string,
    locale: 'ru' | 'en' | 'es' = 'ru'
  ): Promise<MoonPhase> => {
    try {
      const params = buildLocalDateParams(date);
      params.set('locale', locale);
      const url = `/chart/moon-phase?${params.toString()}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      chartLogger.error('Ошибка загрузки фазы луны', error);
      throw error;
    }
  },

  getLunarDay: async (
    date?: string,
    locale: 'ru' | 'en' | 'es' = 'ru'
  ): Promise<LunarDay> => {
    try {
      const params = buildLocalDateParams(date);
      params.set('locale', locale);
      const url = `/chart/lunar-day?${params.toString()}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      chartLogger.error('Ошибка загрузки лунного дня', error);
      throw error;
    }
  },

  getLunarCalendar: async (
    year?: number,
    month?: number,
    locale: 'ru' | 'en' | 'es' = 'ru'
  ): Promise<LunarCalendarDay[]> => {
    try {
      const now = new Date();
      const targetYear = year ?? now.getFullYear();
      const targetMonth = month ?? now.getMonth();
      const tzOffsetMinutes = -now.getTimezoneOffset();
      const response = await api.get(
        `/chart/lunar-calendar?year=${targetYear}&month=${targetMonth}&locale=${locale}&tzOffsetMinutes=${tzOffsetMinutes}`
      );
      return response.data;
    } catch (error) {
      chartLogger.error('Ошибка загрузки лунного календаря', error);
      throw error;
    }
  },

  getBiorhythms: async (
    date?: string,
    locale: 'ru' | 'en' | 'es' = 'ru'
  ): Promise<BiorhythmResponse> => {
    const params = buildLocalDateParams(date);
    params.set('locale', normalizeLocale(locale));
    const url = `/chart/biorhythms?${params.toString()}`;
    const response = await api.get(url);
    return response.data;
  },

  getInterpretationDetails: async (params: {
    type: 'planet' | 'ascendant' | 'house' | 'aspect';
    planet?: string;
    sign?: string;
    houseNum?: number | string;
    aspect?: string;
    planetA?: string;
    planetB?: string;
    locale?: 'ru' | 'en' | 'es';
  }): Promise<{ lines: string[] }> => {
    const qs = new URLSearchParams();
    qs.set('type', params.type);
    if (params.planet) qs.set('planet', params.planet);
    if (params.sign) qs.set('sign', params.sign);
    if (params.houseNum != null) qs.set('houseNum', String(params.houseNum));
    if (params.aspect) qs.set('aspect', params.aspect);
    if (params.planetA) qs.set('planetA', params.planetA);
    if (params.planetB) qs.set('planetB', params.planetB);
    if (params.locale) qs.set('locale', params.locale);

    const url = `/chart/interpretation/details?${qs.toString()}`;
    const response = await api.get(url);
    return response.data;
  },

  regenerateChartWithAI: async (): Promise<{
    success: boolean;
    message: string;
    canRegenerateAt?: string;
  }> => {
    const response = await api.post('/chart/regenerate-ai');
    return response.data;
  },

  /**
   * Get detailed transit interpretation with AI (subscription-aware)
   * FREE: Basic rule-based interpretation
   * PREMIUM/MAX: AI-enhanced personalized interpretation
   */
  getTransitInterpretation: async (
    date?: string,
    locale: 'ru' | 'en' | 'es' = 'ru'
  ): Promise<{
    date: string;
    transitPlanets: Record<string, any>;
    natalPlanets: Record<string, any>;
    aspects: Array<{
      transitPlanet: string;
      natalPlanet: string;
      aspect: string;
      orb: number;
      strength: number;
      transitSign?: string;
      isRetrograde?: boolean;
    }>;
    aiInterpretation: string;
    subscriptionTier: string;
    hasAIAccess: boolean;
    message: string;
  }> => {
    const url = date
      ? `/chart/transits/interpretation?date=${date}&locale=${locale}`
      : `/chart/transits/interpretation?locale=${locale}`;
    const response = await api.get(url);
    return response.data;
  },

  getMainTransitInterpretation: async (
    locale: 'ru' | 'en' | 'es' = 'ru',
    date?: string
  ): Promise<{
    date: string;
    interpretation: string;
    aspect?: any;
    dailyContext?: HoroscopeDailyContext;
  }> => {
    const qs = buildLocalDateParams(date);
    if (locale) qs.set('locale', locale);
    const url = `/chart/transits/main-interpretation?${qs.toString()}`;
    const response = await api.get(url);
    return response.data;
  },

  /**
   * Generate personal numerical code
   */
  generatePersonalCode: async (
    purpose: CodePurpose,
    digitCount: number = 4
  ): Promise<PersonalCodeResult> => {
    try {
      const response = await api.post('/personal-code/generate', {
        purpose,
        digitCount,
      });
      return response.data;
    } catch (error) {
      chartLogger.error('Error generating personal code', error);
      throw error;
    }
  },

  /**
   * Get available code purposes
   */
  getCodePurposes: async (): Promise<{
    purposes: Array<{
      key: string;
      name: string;
      description: string;
      icon: string;
      color: string;
    }>;
  }> => {
    try {
      const response = await api.get('/personal-code/purposes');
      return response.data;
    } catch (error) {
      chartLogger.error('Error fetching purposes', error);
      throw error;
    }
  },
};
