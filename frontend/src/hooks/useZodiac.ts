// hooks/useZodiac.ts
// Хук для работы со знаком зодиака пользователя

import { useMemo } from 'react';
import {
  getZodiacSign,
  formatDateRange,
  getElementDescription,
  ZodiacSign,
} from '../services/zodiac.service';

interface UseZodiacResult {
  zodiacSign: ZodiacSign;
  dateRange: string;
  elementDescription: string;
}

/**
 * Хук для получения информации о знаке зодиака по дате рождения
 * @param day - день рождения (1-31)
 * @param month - месяц рождения (1-12)
 * @returns объект с информацией о знаке зодиака
 */
export function useZodiac(day: number, month: number): UseZodiacResult {
  const zodiacSign = useMemo(() => getZodiacSign(day, month), [day, month]);

  const dateRange = useMemo(() => formatDateRange(zodiacSign), [zodiacSign]);

  const elementDescription = useMemo(
    () => getElementDescription(zodiacSign.element),
    [zodiacSign.element]
  );

  return {
    zodiacSign,
    dateRange,
    elementDescription,
  };
}
