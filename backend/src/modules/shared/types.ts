/**
 * Общие типы проекта AstraLink
 */

// Астрологические типы
export type Planet =
  (typeof import('./constants').PLANETS)[keyof typeof import('./constants').PLANETS];
export type Sign = (typeof import('./constants').SIGNS)[number];
export type Aspect =
  (typeof import('./constants').ASPECTS)[keyof typeof import('./constants').ASPECTS];
export type SubscriptionTier =
  (typeof import('./constants').SUBSCRIPTION_TIERS)[keyof typeof import('./constants').SUBSCRIPTION_TIERS];

// Интерфейсы для планет и домов
export interface PlanetPosition {
  longitude: number;
  sign: Sign;
  degree: number;
  speed?: number;
}

export interface HousePosition {
  longitude: number;
  sign: Sign;
  degree: number;
}

export interface AspectData {
  planet1: Planet;
  planet2: Planet;
  aspect: Aspect;
  orb: number;
  strength: number;
}

// Интерфейсы для карт
export interface NatalChart {
  type: 'natal';
  birthDate: string;
  location: {
    latitude: number;
    longitude: number;
    timezone: number;
  };
  planets: Record<Planet, PlanetPosition>;
  houses: Record<string, HousePosition>;
  aspects: AspectData[];
  calculatedAt: string;
}

export interface TransitChart {
  type: 'transit';
  date: string;
  planets: Record<Planet, PlanetPosition>;
  natalChart: NatalChart;
}

// Интерфейсы для подписок
export interface SubscriptionLimits {
  natalChart: number | 'full' | 'basic';
  horoscope: 'ai' | 'interpreter';
}

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isActive: boolean;
  isTrial: boolean;
  expiresAt?: string;
  trialEndsAt?: string;
  features: string[];
  limits: SubscriptionLimits;
}

// Интерфейсы для API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Интерфейсы для ошибок
export interface AppError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

// Интерфейсы для кеширования
export interface CacheOptions {
  ttl?: number;
  key?: string;
}

// Интерфейсы для координат
export interface Coordinates {
  latitude: number;
  longitude: number;
  timezone?: number;
}

// Интерфейсы для биоритмов
export interface BiorhythmData {
  date: string;
  physical: number;
  emotional: number;
  intellectual: number;
}

// Интерфейсы для предсказаний
export interface PredictionData {
  period: string;
  date: string;
  general: string;
  love: string;
  career: string;
  health: string;
  finance: string;
  advice: string;
  luckyNumbers: number[];
  luckyColors: string[];
  energy: number;
  mood: string;
  challenges: string[];
  opportunities: string[];
  generatedBy: 'ephemeris' | 'ai';
}

// Утилитарные типы
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Типы для валидации
export type ValidationResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      errors: string[];
    };

// Типы для конфигурации
export interface AppConfig {
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  ai: {
    openaiKey?: string;
    anthropicKey?: string;
  };
  cache: {
    ttl: typeof import('./constants').CACHE_TTL;
  };
}
