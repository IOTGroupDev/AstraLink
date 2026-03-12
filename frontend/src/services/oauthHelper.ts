// frontend/src/services/oauthHelper.ts
// Helper для OAuth с поддержкой биометрии

import { tokenService } from './tokenService';
import { Alert } from 'react-native';
import { authLogger } from './logger';
import i18n from '../i18n';

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
    const err: any = new Error(
      i18n.t('auth.oauth.errors.biometricCancelledFor', {
        provider: providerName,
        defaultValue: `Biometric authentication was cancelled for ${providerName}`,
      })
    );
    err.code = 'biometric_cancelled';
    throw err;
  }

  // Выполняем OAuth
  return await oauthMethod();
};

/**
 * Обработка ошибок OAuth с user-friendly сообщениями
 */
export const handleOAuthError = (error: any, providerName: string) => {
  const rawMsg = String(error?.message || '');

  let title = i18n.t('auth.oauth.errors.title', {
    defaultValue: 'Authorization error',
  });

  let message = i18n.t('auth.oauth.errors.failed', {
    provider: providerName,
    defaultValue: `Could not sign in with ${providerName}`,
  });

  const isCancelled =
    error?.code === 'oauth_cancelled' ||
    /cancel/i.test(rawMsg) ||
    /отмен/i.test(rawMsg);

  if (isCancelled) {
    title = i18n.t('auth.oauth.errors.cancelledTitle', {
      defaultValue: 'Authorization cancelled',
    });
    message = i18n.t('auth.oauth.errors.cancelled', {
      provider: providerName,
      defaultValue: `Sign in with ${providerName} was cancelled`,
    });
  } else if (
    error?.code === 'biometric_cancelled' ||
    /biometric/i.test(rawMsg)
  ) {
    title = i18n.t('auth.oauth.errors.biometricCancelledTitle', {
      defaultValue: 'Biometrics cancelled',
    });
    message = i18n.t('auth.oauth.errors.biometricCancelled', {
      defaultValue: 'Biometric authentication is required to sign in.',
    });
  } else if (/network/i.test(rawMsg) || error?.code === 'ERR_NETWORK') {
    title = i18n.t('common.errors.network', { defaultValue: 'Network error' });
    message = i18n.t('auth.oauth.errors.network', {
      defaultValue: 'Check your internet connection and try again.',
    });
  } else if (rawMsg) {
    message = rawMsg;
  }

  Alert.alert(title, message, [{ text: i18n.t('common.buttons.ok') }]);
};

/**
 * Проверяет нужно ли пользователю пройти онбординг
 */
export const needsOnboarding = (user: any): boolean => {
  return !user.birthDate || !user.birthTime || !user.birthPlace;
};
