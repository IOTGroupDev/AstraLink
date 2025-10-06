/**
 * Общие константы проекта AstraLink
 */

// Астрологические константы
export const PLANETS = {
  SUN: 'sun',
  MOON: 'moon',
  MERCURY: 'mercury',
  VENUS: 'venus',
  MARS: 'mars',
  JUPITER: 'jupiter',
  SATURN: 'saturn',
  URANUS: 'uranus',
  NEPTUNE: 'neptune',
  PLUTO: 'pluto',
  NORTH_NODE: 'north_node',
  SOUTH_NODE: 'south_node',
  LILITH: 'lilith',
  CHIRON: 'chiron',
} as const;

export const SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const;

export const ASPECTS = {
  CONJUNCTION: 'conjunction',
  SEXTILE: 'sextile',
  SQUARE: 'square',
  TRINE: 'trine',
  OPPOSITION: 'opposition',
} as const;

// Углы аспектов в градусах
export const ASPECT_ANGLES = {
  [ASPECTS.CONJUNCTION]: 0,
  [ASPECTS.SEXTILE]: 60,
  [ASPECTS.SQUARE]: 90,
  [ASPECTS.TRINE]: 120,
  [ASPECTS.OPPOSITION]: 180,
} as const;

// Орбы аспектов (допустимые отклонения)
export const ASPECT_ORBS = {
  [ASPECTS.CONJUNCTION]: 8,
  [ASPECTS.SEXTILE]: 6,
  [ASPECTS.SQUARE]: 8,
  [ASPECTS.TRINE]: 8,
  [ASPECTS.OPPOSITION]: 8,
} as const;

// Весовые коэффициенты аспектов для совместимости
export const ASPECT_WEIGHTS = {
  [ASPECTS.CONJUNCTION]: 0.8,
  [ASPECTS.SEXTILE]: 0.9,
  [ASPECTS.SQUARE]: 0.3,
  [ASPECTS.TRINE]: 1.0,
  [ASPECTS.OPPOSITION]: 0.5,
} as const;

// Константы для биоритмов
export const BIORHYTHM_CYCLES = {
  PHYSICAL: 23,
  EMOTIONAL: 28,
  INTELLECTUAL: 33,
} as const;

// Константы подписок
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PREMIUM: 'premium',
  MAX: 'max',
} as const;

// Лимиты подписок
export const SUBSCRIPTION_LIMITS = {
  [SUBSCRIPTION_TIERS.FREE]: {
    natalChart: 0.2, // 20% данных
    horoscope: 'interpreter', // Только интерпретатор
  },
  [SUBSCRIPTION_TIERS.PREMIUM]: {
    natalChart: 1, // Полная карта
    horoscope: 'ai', // AI генерация
  },
  [SUBSCRIPTION_TIERS.MAX]: {
    natalChart: 1,
    horoscope: 'ai',
  },
} as const;

// API константы
export const API_PREFIX = 'api';
export const API_VERSION = 'v1';

// Временные константы
export const CACHE_TTL = {
  SHORT: 300, // 5 минут
  MEDIUM: 3600, // 1 час
  LONG: 86400, // 24 часа
} as const;

// Ограничения запросов
export const RATE_LIMITS = {
  WINDOW_MS: 15 * 60 * 1000, // 15 минут
  MAX_REQUESTS: 100, // запросов на окно
} as const;

// Сообщения об ошибках
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Пользователь не аутентифицирован',
  FORBIDDEN: 'Доступ запрещен',
  NOT_FOUND: 'Ресурс не найден',
  BAD_REQUEST: 'Некорректные данные запроса',
  INTERNAL_ERROR: 'Внутренняя ошибка сервера',
  SWISS_EPHEMERIS_ERROR: 'Ошибка расчета эфемерид',
  INVALID_DATE: 'Некорректная дата',
  INVALID_TIME: 'Некорректное время',
  INVALID_COORDINATES: 'Некорректные координаты',
} as const;
