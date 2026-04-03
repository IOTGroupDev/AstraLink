import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Chart } from '../types';
import type { BiorhythmResponse, HoroscopeBundle } from './api/chart.api';

const HOROSCOPE_SCREEN_CACHE_VERSION = 'v1';
const HOROSCOPE_SCREEN_CACHE_PREFIX = `horoscope-screen:${HOROSCOPE_SCREEN_CACHE_VERSION}:`;

export interface HoroscopeScreenCachePayload {
  bucketKey: string;
  locale: 'ru' | 'en' | 'es';
  tier: string;
  chartRevision: string;
  chart: Chart | null;
  currentPlanets: unknown;
  predictions: HoroscopeBundle | null;
  biorhythms: BiorhythmResponse | null;
  cachedAt: string;
}

export const buildHoroscopeDailyBucketKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getHoroscopeChartRevision = (chart: Chart | null): string => {
  if (!chart) return 'no-chart';
  const maybeRecord = chart as Chart & { updated_at?: string };
  return String(chart.updatedAt || maybeRecord.updated_at || 'unknown');
};

const buildHoroscopeScreenCacheKey = (userId: string): string =>
  `${HOROSCOPE_SCREEN_CACHE_PREFIX}${userId}`;

export async function readHoroscopeScreenCache(
  userId: string
): Promise<HoroscopeScreenCachePayload | null> {
  try {
    const raw = await AsyncStorage.getItem(
      buildHoroscopeScreenCacheKey(userId)
    );
    if (!raw) return null;
    return JSON.parse(raw) as HoroscopeScreenCachePayload;
  } catch {
    return null;
  }
}

export async function writeHoroscopeScreenCache(
  userId: string,
  payload: HoroscopeScreenCachePayload
): Promise<void> {
  await AsyncStorage.setItem(
    buildHoroscopeScreenCacheKey(userId),
    JSON.stringify(payload)
  );
}

export async function clearHoroscopeScreenCache(
  userId?: string
): Promise<void> {
  if (userId) {
    await AsyncStorage.removeItem(buildHoroscopeScreenCacheKey(userId));
    return;
  }

  const keys = await AsyncStorage.getAllKeys();
  const horoscopeKeys = keys.filter((key) =>
    key.startsWith(HOROSCOPE_SCREEN_CACHE_PREFIX)
  );
  if (horoscopeKeys.length) {
    await AsyncStorage.multiRemove(horoscopeKeys);
  }
}
