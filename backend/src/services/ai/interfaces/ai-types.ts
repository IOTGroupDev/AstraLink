/**
 * AI Service Types and Interfaces
 * Shared types for all AI providers
 */

export type AIProvider = 'claude' | 'openai' | 'deepseek' | 'none';

export interface AIGenerationContext {
  sunSign: string;
  moonSign: string;
  ascendant: string;
  planets: any;
  houses: any;
  aspects: any[];
  transits: any[];
  period: string;
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
