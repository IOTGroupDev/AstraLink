import { useQuery } from '@tanstack/react-query';
import { chartAPI } from '../services/api';

/**
 * Хук для получения фазы луны
 */
export function useMoonPhase(date?: string) {
  return useQuery({
    queryKey: ['moonPhase', date],
    queryFn: () => chartAPI.getMoonPhase(date),
    staleTime: 1000 * 60 * 60, // 1 час
    gcTime: 1000 * 60 * 60 * 24, // 24 часа
  });
}

/**
 * Хук для получения лунного дня
 */
export function useLunarDay(date?: string) {
  return useQuery({
    queryKey: ['lunarDay', date],
    queryFn: () => chartAPI.getLunarDay(date),
    staleTime: 1000 * 60 * 60, // 1 час
    gcTime: 1000 * 60 * 60 * 24, // 24 часа
  });
}

/**
 * Хук для получения лунного календаря на месяц
 */
export function useLunarCalendar(year?: number, month?: number) {
  return useQuery({
    queryKey: ['lunarCalendar', year, month],
    queryFn: () => chartAPI.getLunarCalendar(year, month),
    staleTime: 1000 * 60 * 60 * 24, // 24 часа - календарь меняется редко
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 дней
  });
}
