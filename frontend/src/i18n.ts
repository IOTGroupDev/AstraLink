import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en';
import es from './locales/es';
import ru from './locales/ru';
import { storageLogger } from './services/logger';

const LANGUAGE_STORAGE_KEY = '@AstraLink:language';

// Получаем сохраненный язык из AsyncStorage
const getStoredLanguage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch (error) {
    storageLogger.error('Failed to get stored language:', error);
    return null;
  }
};

// Сохраняем язык в AsyncStorage
export const setStoredLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    storageLogger.error('Failed to store language:', error);
  }
};

// Определяем язык по умолчанию
const getDefaultLanguage = (): string => {
  const supportedLanguages = ['en', 'es', 'ru'];

  const raw =
    (Localization as any).locale || (Localization as any).locales?.[0];

  if (!raw || typeof raw !== 'string') {
    return 'en';
  }

  const deviceLanguage = raw.split(/[-_]/)[0].toLowerCase();

  return supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en';
};

// Инициализация i18next
const initI18n = async () => {
  const storedLanguage = await getStoredLanguage();
  const defaultLanguage = storedLanguage || getDefaultLanguage();

  await i18n.use(initReactI18next).init({
    compatibilityJSON: 'v3',
    resources: {
      en: { translation: en },
      es: { translation: es },
      ru: { translation: ru },
    },
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

  return i18n;
};

// Инициализируем i18n при импорте модуля
export const i18nReady = initI18n();
export default i18n;
