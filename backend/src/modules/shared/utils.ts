/**
 * Общие утилиты проекта AstraLink
 */

import { ERROR_MESSAGES } from './constants';
import type { Coordinates, ValidationResult } from './types';

/**
 * Преобразует долготу в знак зодиака
 */
export function longitudeToSign(longitude: number): string {
  const signs = [
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
  ];
  const signIndex = Math.floor(longitude / 30);
  return signs[signIndex % 12];
}

/**
 * Вычисляет аспект между двумя долготами
 */
export function calculateAspect(
  longitude1: number,
  longitude2: number,
): any | null {
  const diff = Math.abs(longitude1 - longitude2);
  const normalizedDiff = Math.min(diff, 360 - diff);

  const aspects = [
    { type: 'conjunction', angle: 0, orb: 8 },
    { type: 'sextile', angle: 60, orb: 6 },
    { type: 'square', angle: 90, orb: 8 },
    { type: 'trine', angle: 120, orb: 8 },
    { type: 'opposition', angle: 180, orb: 8 },
  ];

  for (const aspect of aspects) {
    const orb = Math.abs(normalizedDiff - aspect.angle);
    if (orb <= aspect.orb) {
      return {
        type: aspect.type,
        orb: orb,
        strength: 1 - orb / aspect.orb,
      };
    }
  }

  return null;
}

/**
 * Валидирует формат даты (YYYY-MM-DD)
 */
export function isValidDateFormat(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return false;
  }

  const date = new Date(dateStr + 'T00:00:00');
  return date.toISOString().startsWith(dateStr);
}

/**
 * Валидирует формат времени (HH:MM)
 */
export function isValidTimeFormat(timeStr: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeStr);
}

/**
 * Валидирует координаты
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Преобразует строку в координаты
 */
export function parseCoordinates(
  latStr: string,
  lngStr: string,
): ValidationResult<Coordinates> {
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return {
      success: false,
      errors: [ERROR_MESSAGES.INVALID_COORDINATES],
    };
  }

  if (!isValidCoordinates(lat, lng)) {
    return {
      success: false,
      errors: [ERROR_MESSAGES.INVALID_COORDINATES],
    };
  }

  return {
    success: true,
    data: { latitude: lat, longitude: lng },
  };
}

/**
 * Получает координаты места рождения по умолчанию
 */
export function getDefaultLocationCoordinates(birthPlace: string): Coordinates {
  const locations: Record<string, Coordinates> = {
    Москва: { latitude: 55.7558, longitude: 37.6176, timezone: 3 },
    'Санкт-Петербург': { latitude: 59.9311, longitude: 30.3609, timezone: 3 },
    Екатеринбург: { latitude: 56.8431, longitude: 60.6454, timezone: 5 },
    Новосибирск: { latitude: 55.0084, longitude: 82.9357, timezone: 7 },
  };

  return (
    locations[birthPlace] || {
      latitude: 55.7558,
      longitude: 37.6176,
      timezone: 3,
    }
  );
}

/**
 * Вычисляет среднюю долготу между двумя точками
 */
export function averageLongitude(
  longitude1: number,
  longitude2: number,
): number {
  let avg = (longitude1 + longitude2) / 2;
  if (Math.abs(longitude1 - longitude2) > 180) {
    avg += 180;
  }
  return avg % 360;
}

/**
 * Нормализует значение в диапазоне 0-100
 */
export function normalizeToPercentage(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Генерирует уникальный ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Безопасно получает значение из объекта по пути
 */
export function safeGet<T>(obj: any, path: string, defaultValue: T): T {
  try {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
      if (result == null || typeof result !== 'object') {
        return defaultValue;
      }
      result = result[key];
    }

    return result !== undefined ? result : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Группирует массив объектов по ключу
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce(
    (groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    },
    {} as Record<string, T[]>,
  );
}

/**
 * Удаляет дубликаты из массива
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * Проверяет, находится ли точка в доме
 */
export function isInHouse(
  longitude: number,
  cusp1: number,
  cusp2: number,
): boolean {
  if (cusp1 <= cusp2) {
    return longitude >= cusp1 && longitude < cusp2;
  } else {
    return longitude >= cusp1 || longitude < cusp2;
  }
}

/**
 * Определяет дом по долготе
 */
export function longitudeToHouse(
  longitude: number,
  houses: Record<string, any>,
): number {
  for (let i = 1; i <= 12; i++) {
    const nextHouse = i === 12 ? 1 : i + 1;
    const currentCusp = houses[i]?.longitude || houses[i]?.cusp || 0;
    const nextCusp =
      houses[nextHouse]?.longitude || houses[nextHouse]?.cusp || 0;

    if (isInHouse(longitude, currentCusp, nextCusp)) {
      return i;
    }
  }
  return 1;
}

/**
 * Форматирует дату для отображения
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Форматирует время для отображения
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toTimeString().slice(0, 5);
}
