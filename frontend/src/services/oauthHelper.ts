// frontend/src/services/oauthHelper.ts
// Хелпер для OAuth с поддержкой биометрии

import { tokenService } from './tokenService';
import { Alert } from 'react-native';
import { authLogger } from './logger';

/**
 * Проверяет биометрию перед OAuth авторизацией (если включена)
 * @returns true если можно продолжить, false если отменено
 */
export const checkBiometricBeforeOAuth = async (): Promise<boolean> => {
  try {
    const biometricEnabled = await tokenService.getBiometricEnabled();

    if (!biometricEnabled) {
      // Биометрия не включена, продолжаем без проверки
      return true;
    }

    const { available } = await tokenService.checkBiometricSupport();

    if (!available) {
      // Биометрия недоступна на устройстве, продолжаем без проверки
      authLogger.warn('Биометрия включена но недоступна на устройстве');
      return true;
    }

    // Запрашиваем биометрическую аутентификацию
    const authenticated = await tokenService.authenticateWithBiometrics();

    if (!authenticated) {
      authLogger.log('Биометрическая аутентификация не пройдена');
      return false;
    }

    authLogger.log('Биометрическая аутентификация успешна');
    return true;
  } catch (error) {
    authLogger.error('Ошибка проверки биометрии', error);
    // В случае ошибки разрешаем продолжить
    return true;
  }
};

/**
 * Wrapper для OAuth методов с биометрической защитой
 */
export const withBiometricProtection = async <T>(
  oauthMethod: () => Promise<T>,
  providerName: string
): Promise<T> => {
  // Проверяем биометрию перед OAuth
  const canProceed = await checkBiometricBeforeOAuth();

  if (!canProceed) {
    throw new Error(
      `Биометрическая аутентификация отменена для ${providerName}`
    );
  }

  // Выполняем OAuth
  return await oauthMethod();
};

/**
 * Обработка ошибок OAuth с user-friendly сообщениями
 */
export const handleOAuthError = (error: any, providerName: string) => {
  let title = 'Ошибка авторизации';
  let message = `Не удалось войти через ${providerName}`;

  if (
    error.message?.includes('отменена') ||
    error.message?.includes('cancel')
  ) {
    title = 'Авторизация отменена';
    message = `Вход через ${providerName} был отменен`;
  } else if (error.message?.includes('биометрич')) {
    title = 'Биометрия отменена';
    message =
      'Для входа через социальную сеть требуется биометрическая аутентификация';
  } else if (
    error.message?.includes('network') ||
    error.code === 'ERR_NETWORK'
  ) {
    title = 'Ошибка сети';
    message = 'Проверьте подключение к интернету и попробуйте снова';
  } else if (error.message) {
    message = error.message;
  }

  Alert.alert(title, message, [{ text: 'OK' }]);
};

/**
 * Проверяет нужно ли пользователю пройти онбординг
 */
export const needsOnboarding = (user: any): boolean => {
  return !user.birthDate || !user.birthTime || !user.birthPlace;
};
