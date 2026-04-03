/**
 * AI Service Types and Interfaces
 * Shared types for all AI providers
 */

export type AIProvider = 'claude' | 'openai' | 'deepseek' | 'none';
export type AILocale = 'ru' | 'en' | 'es';

export interface AIGenerateOptions {
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  temperature?: number;
  responseFormat?: 'json_object' | 'text';
}

export interface AIGenerationContext {
  sunSign: string;
  moonSign: string;
  ascendant: string;
  planets: any;
  houses: any;
  aspects: any[];
  transits: any[];
  period: string;
  locale?: AILocale;
  dailyContext?: {
    energy: number;
    tone: 'supportive' | 'mixed' | 'challenging';
    summary: string;
    biorhythmSummary: string;
    lunarSummary: string;
    mainTransitSummary: string;
    lunarDaySummary?: string;
  };
  userProfile?: {
    name?: string;
    birthDate?: string;
    birthPlace?: string;
  };
}

export interface HoroscopeResponse {
  general: string;
  love: string;
  career: string;
  health: string;
  finance: string;
  advice: string;
  challenges: string[];
  opportunities: string[];
}

export interface UsageStats {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: string;
  duration: string;
  attempt?: number;
}
