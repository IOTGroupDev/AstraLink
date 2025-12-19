/**
 * Утилиты для работы с онбордингом и проверки профиля пользователя
 */

interface UserProfile {
  name?: string | null;
  birth_date?: string | null;
  birthDate?: string | null;
  birth_time?: string | null;
  birthTime?: string | null;
  birth_place?: string | null;
  birthPlace?: string | null;
}

interface ExtendedProfile {
  bio?: string | null;
  gender?: string | null;
  city?: string | null;
  preferences?: {
    interests?: string[] | null;
  } | null;
}

/**
 * Проверяет, нужен ли пользователю онбординг
 * @param profile - профиль пользователя или объект с данными о рождении
 * @returns true, если нужен онбординг (отсутствуют данные о рождении)
 */
export const needsOnboarding = (
  profile: UserProfile | null | undefined
): boolean => {
  if (!profile) {
    return true;
  }

  const hasBirthDate = !!(profile.birth_date || profile.birthDate);
  const hasBirthTime = !!(profile.birth_time || profile.birthTime);
  const hasBirthPlace = !!(profile.birth_place || profile.birthPlace);

  return !hasBirthDate || !hasBirthTime || !hasBirthPlace;
};

/**
 * Проверяет, заполнены ли все обязательные поля профиля
 * @param profile - профиль пользователя
 * @returns true, если все обязательные поля заполнены
 */
export const isProfileComplete = (
  profile: UserProfile | null | undefined
): boolean => {
  return !needsOnboarding(profile);
};

/**
 * Получает отсутствующие поля профиля
 * @param profile - профиль пользователя
 * @returns массив названий отсутствующих полей
 */
export const getMissingFields = (
  profile: UserProfile | null | undefined
): string[] => {
  const missing: string[] = [];

  if (!profile) {
    return ['birth_date', 'birth_time', 'birth_place'];
  }

  if (!profile.birth_date && !profile.birthDate) {
    missing.push('birth_date');
  }
  if (!profile.birth_time && !profile.birthTime) {
    missing.push('birth_time');
  }
  if (!profile.birth_place && !profile.birthPlace) {
    missing.push('birth_place');
  }

  return missing;
};

/**
 * Форматирует дату рождения в формат YYYY-MM-DD
 * @param date - объект с датой рождения
 * @returns отформатированная дата или null
 */
export const formatBirthDate = (
  date:
    | {
        day: number;
        month: number;
        year: number;
      }
    | null
    | undefined
): string | null => {
  if (!date) return null;

  const { year, month, day } = date;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Форматирует время рождения в формат HH:MM
 * @param time - объект с временем рождения
 * @returns отформатированное время или '12:00' по умолчанию
 */
export const formatBirthTime = (
  time:
    | {
        hour: number;
        minute: number;
      }
    | null
    | undefined
): string => {
  if (!time) return '12:00';

  const { hour, minute } = time;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

/**
 * Парсит дату рождения из строки формата YYYY-MM-DD
 * @param dateString - строка с датой
 * @returns объект с датой или null
 */
export const parseBirthDate = (
  dateString: string | null | undefined
): {
  day: number;
  month: number;
  year: number;
} | null => {
  if (!dateString) return null;

  try {
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) return null;

    return { day, month, year };
  } catch {
    return null;
  }
};

/**
 * Парсит время рождения из строки формата HH:MM
 * @param timeString - строка с временем
 * @returns объект с временем или null
 */
export const parseBirthTime = (
  timeString: string | null | undefined
): {
  hour: number;
  minute: number;
} | null => {
  if (!timeString) return null;

  try {
    const [hour, minute] = timeString.split(':').map(Number);
    if (hour === undefined || minute === undefined) return null;

    return { hour, minute };
  } catch {
    return null;
  }
};

/**
 * Валидирует email
 * @param email - email адрес
 * @returns true, если email валиден
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Валидирует дату рождения
 * @param date - объект с датой
 * @returns true, если дата валидна
 */
export const isValidBirthDate = (
  date:
    | {
        day: number;
        month: number;
        year: number;
      }
    | null
    | undefined
): boolean => {
  if (!date) return false;

  const { day, month, year } = date;

  // Проверяем диапазоны
  if (year < 1900 || year > new Date().getFullYear()) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Проверяем что дата не в будущем
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  if (birthDate > today) return false;

  return true;
};

/**
 * Валидирует время рождения
 * @param time - объект с временем
 * @returns true, если время валидно
 */
export const isValidBirthTime = (
  time:
    | {
        hour: number;
        minute: number;
      }
    | null
    | undefined
): boolean => {
  if (!time) return false;

  const { hour, minute } = time;

  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
};

/**
 * Определяет, нужно ли переходить на онбординг после авторизации
 * @param user - данные пользователя
 * @param profile - профиль пользователя из базы
 * @returns true, если нужно перейти на онбординг
 */
export const shouldRedirectToOnboarding = (
  user: any,
  profile: UserProfile | null | undefined
): boolean => {
  // Если профиля нет - нужен онбординг
  if (!profile) return true;

  // Если не хватает данных - нужен онбординг
  if (needsOnboarding(profile)) return true;

  return false;
};

/**
 * Получает название следующего экрана онбординга на основе заполненных данных
 * @param profile - профиль пользователя
 * @returns название экрана для навигации
 */
export const getNextOnboardingScreen = (
  profile: UserProfile | null | undefined
): string => {
  if (!profile) return 'OnboardingName';

  const missing = getMissingFields(profile);

  if (missing.includes('birth_date')) return 'OnboardingBirthDate';
  if (missing.includes('birth_time')) return 'OnboardingBirthTime';
  if (missing.includes('birth_place')) return 'OnboardingBirthPlace';

  return 'MainTabs'; // Все данные заполнены
};

/**
 * Рассчитывает процент заполненности профиля пользователя
 * @param profile - базовый профиль
 * @param extendedProfile - расширенный профиль
 * @returns процент заполненности (0-100)
 */
export const calculateProfileCompletion = (
  profile: UserProfile | null | undefined,
  extendedProfile?: ExtendedProfile | null
): number => {
  const fields = [
    profile?.name,
    profile?.birth_date ?? profile?.birthDate,
    profile?.birth_time ?? profile?.birthTime,
    profile?.birth_place ?? profile?.birthPlace,
    extendedProfile?.gender,
    extendedProfile?.city,
    extendedProfile?.bio,
    extendedProfile?.preferences?.interests?.length
      ? extendedProfile.preferences.interests
      : null,
  ];

  const total = fields.length;
  if (total === 0) return 0;

  const filled = fields.filter((value) => {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return !!value;
  }).length;

  return Math.round((filled / total) * 100);
};
