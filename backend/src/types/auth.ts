// import { Request } from 'express';
//
// export interface AuthenticatedUser {
//   id: string;
//   userId?: string;
//   sub?: string;
//   email: string;
//   name?: string;
//   role?: string;
// }
//
// export interface AuthenticatedRequest extends Request {
//   user?: AuthenticatedUser;
// }

// ==================== Auth Types ====================

/**
 * Запрос на регистрацию (БЕЗ пароля)
 * Используется passwordless аутентификация через email верификацию
 */
export interface SignupRequest {
  email: string;
  name: string;
  birthDate: string; // YYYY-MM-DD
  birthTime?: string; // HH:MM
  birthPlace?: string;
}

/**
 * Ответ после успешной аутентификации
 */
export interface AuthResponse {
  user: UserData;
  access_token: string;
}

/**
 * Данные пользователя
 */
export interface UserData {
  id: string;
  email: string;
  name?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Запрос на отправку магической ссылки
 */
export interface SendMagicLinkRequest {
  email: string;
}

/**
 * Запрос на завершение регистрации для OAuth пользователей
 */
export interface CompleteSignupRequest {
  userId: string;
  name?: string;
  birthDate: string; // YYYY-MM-DD
  birthTime?: string; // HH:MM
  birthPlace?: string;
}

/**
 * OAuth callback данные для внешних провайдеров
 */
export interface OAuthCallbackRequest {
  access_token: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

/**
 * Google OAuth callback данные
 */
export type GoogleCallbackRequest = OAuthCallbackRequest;

/**
 * Apple OAuth callback данные
 */
export type AppleCallbackRequest = OAuthCallbackRequest;

// ==================== Chart Types ====================

/**
 * Данные натальной карты
 */
export interface NatalChartData {
  planets: Planet[];
  houses: House[];
  aspects: Aspect[];
  metadata: ChartMetadata;
}

export interface Planet {
  name: string;
  position: number; // градусы 0-360
  sign: string;
  house: number;
  retrograde: boolean;
}

export interface House {
  number: number;
  cusp: number; // градусы 0-360
  sign: string;
}

export interface Aspect {
  planet1: string;
  planet2: string;
  type: string; // conjunction, opposition, trine, square, sextile
  angle: number;
  orb: number;
}

export interface ChartMetadata {
  calculatedAt: string;
  location: Location;
  julianDay: number;
}

export interface Location {
  latitude: number;
  longitude: number;
  timezone: number;
}

// ==================== Subscription Types ====================

export type SubscriptionTier = 'free' | 'basic' | 'premium';

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  trialEndsAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== Error Types ====================

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// ==================== Response Types ====================

export interface SuccessResponse {
  success: boolean;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ==================== Request Guard Types ====================

/**
 * Authenticated request with user data from JWT token
 * Поддерживает различные форматы токенов (Supabase, JWT, etc.)
 */
export interface AuthenticatedRequest extends Request {
  user: {
    id: string; // Primary user ID
    email: string;
    role?: string;

    // Alternative ID fields for compatibility
    userId?: string; // Sometimes used instead of id
    sub?: string; // JWT standard subject field

    // Additional optional fields
    name?: string;
    iat?: number; // Issued at
    exp?: number; // Expiration
  };
}
