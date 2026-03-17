import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { chartAPI } from '../services/api';
import { useAuth } from './useAuth';

/**
 * Хук для получения фазы луны
 */
export function useMoonPhase(date?: string) {
  const { isAuthenticated } = useAuth();
  const { i18n } = useTranslation();
  const getApiLocale = (): 'ru' | 'en' | 'es' => {
    const lang = String(i18n.language || 'en').toLowerCase();
    return lang === 'ru' || lang === 'en' || lang === 'es' ? lang : 'en';
  };

  return useQuery({
    queryKey: ['moonPhase', date, i18n.language],
    queryFn: () => chartAPI.getMoonPhase(date, getApiLocale()),
    staleTime: 1000 * 60 * 60, // 1 час
    gcTime: 1000 * 60 * 60 * 24, // 24 часа
    enabled: isAuthenticated, // Загружаем только если пользователь авторизован
  });
}

/**
 * Хук для получения лунного дня
 */
export function useLunarDay(date?: string) {
  const { isAuthenticated } = useAuth();
  const { i18n } = useTranslation();
  const getApiLocale = (): 'ru' | 'en' | 'es' => {
    const lang = String(i18n.language || 'en').toLowerCase();
    return lang === 'ru' || lang === 'en' || lang === 'es' ? lang : 'en';
  };

  return useQuery({
    queryKey: ['lunarDay', date, i18n.language],
    queryFn: () => chartAPI.getLunarDay(date, getApiLocale()),
    staleTime: 1000 * 60 * 60, // 1 час
    gcTime: 1000 * 60 * 60 * 24, // 24 часа
    enabled: isAuthenticated, // Загружаем только если пользователь авторизован
  });
}

/**
 * Хук для получения лунного календаря на месяц
 */
export function useLunarCalendar(year?: number, month?: number) {
  const { i18n } = useTranslation();
  const getApiLocale = (): 'ru' | 'en' | 'es' => {
    const lang = String(i18n.language || 'en').toLowerCase();
    return lang === 'ru' || lang === 'en' || lang === 'es' ? lang : 'en';
  };

  return useQuery({
    queryKey: ['lunarCalendar', year, month, i18n.language],
    queryFn: () => chartAPI.getLunarCalendar(year, month, getApiLocale()),
    staleTime: 1000 * 60 * 60 * 24, // 24 часа - календарь меняется редко
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 дней
  });
}
