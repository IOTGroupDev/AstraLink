import { api } from './client';
import type {
  Chart,
  TransitsResponse,
  LunarCalendarDay,
  LunarDay,
  MoonPhase,
} from '../../types';
import { CodePurpose, PersonalCodeResult } from '../../types/personal-code';
import { chartLogger } from '../logger';

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

  createNatalChart: async (data: any): Promise<Chart> => {
    const response = await api.post('/chart/natal', { data });
    return response.data;
  },

  getChartInterpretation: async (): Promise<any> => {
    try {
      const response = await api.get('/chart/natal/interpretation');
      return response.data;
    } catch (error) {
      chartLogger.error('Ошибка загрузки интерпретации', error);
      return null;
    }
  },

  getNatalChartWithInterpretation: async (): Promise<any> => {
    try {
      const response = await api.get('/chart/natal/full');
      return response.data;
    } catch (error) {
      chartLogger.error('Ошибка загрузки полной карты', error);
      throw error;
    }
  },

  getHoroscope: async (
    period: 'day' | 'tomorrow' | 'week' | 'month' = 'day'
  ): Promise<any> => {
    try {
      const response = await api.get(`/chart/horoscope?period=${period}`);
      return response.data;
    } catch (error) {
      chartLogger.error(`Ошибка загрузки гороскопа на ${period}`, error);
      throw error;
    }
  },

  getAllHoroscopes: async (): Promise<{
    today: any;
    tomorrow: any;
    week: any;
    month: any;
    isPremium: boolean;
  }> => {
    try {
      const response = await api.get('/chart/horoscope/all');
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

  getMoonPhase: async (date?: string): Promise<MoonPhase> => {
    try {
      const url = date ? `/chart/moon-phase?date=${date}` : '/chart/moon-phase';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      chartLogger.error('Ошибка загрузки фазы луны', error);
      throw error;
    }
  },

  getLunarDay: async (date?: string): Promise<LunarDay> => {
    try {
      const url = date ? `/chart/lunar-day?date=${date}` : '/chart/lunar-day';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      chartLogger.error('Ошибка загрузки лунного дня', error);
      throw error;
    }
  },

  getLunarCalendar: async (
    year?: number,
    month?: number
  ): Promise<LunarCalendarDay[]> => {
    try {
      const now = new Date();
      const targetYear = year ?? now.getFullYear();
      const targetMonth = month ?? now.getMonth();
      const response = await api.get(
        `/chart/lunar-calendar?year=${targetYear}&month=${targetMonth}`
      );
      return response.data;
    } catch (error) {
      chartLogger.error('Ошибка загрузки лунного календаря', error);
      throw error;
    }
  },

  getBiorhythms: async (
    date?: string
  ): Promise<{
    physical: number;
    emotional: number;
    intellectual: number;
    date: string;
    physicalPhase: 'peak' | 'high' | 'low' | 'critical';
    emotionalPhase: 'peak' | 'high' | 'low' | 'critical';
    intellectualPhase: 'peak' | 'high' | 'low' | 'critical';
  }> => {
    const url = date ? `/chart/biorhythms?date=${date}` : '/chart/biorhythms';
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
    date?: string
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
      ? `/chart/transits/interpretation?date=${date}`
      : '/chart/transits/interpretation';
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
