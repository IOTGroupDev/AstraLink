import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { userAPI } from './api/user.api';
import { logger } from './logger';

const notificationsLogger = logger.createContext('Notifications');
const LAST_PUSH_TOKEN_KEY = 'notifications:last-expo-push-token';
const LAST_PUSH_USER_KEY = 'notifications:last-user-id';

let initialized = false;
let syncPromise: Promise<void> | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const getProjectId = (): string | null => {
  const constantsWithEas = Constants as typeof Constants & {
    easConfig?: {
      projectId?: string;
    };
  };
  const easProjectId = constantsWithEas.easConfig?.projectId;
  const extraProjectId = (
    (Constants.expoConfig?.extra as Record<string, unknown> | undefined)
      ?.eas as Record<string, unknown> | undefined
  )?.projectId;

  if (typeof easProjectId === 'string' && easProjectId.trim()) {
    return easProjectId;
  }

  if (typeof extraProjectId === 'string' && extraProjectId.trim()) {
    return extraProjectId;
  }

  return null;
};

const configureAndroidChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#F59E0B',
    sound: 'default',
  });
};

const ensurePermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;

  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    status = requested.status;
  }

  return status === 'granted';
};

const getExpoPushToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return null;
  }

  const hasPermission = await ensurePermissions();
  if (!hasPermission) {
    notificationsLogger.warn('Push permissions were not granted');
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    notificationsLogger.warn('Expo projectId is missing for push token setup');
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data || null;
};

export const notificationService = {
  async init(): Promise<void> {
    if (initialized) {
      return;
    }

    initialized = true;
    await configureAndroidChannel();
  },

  async syncAuthenticatedPushToken(userId: string): Promise<void> {
    if (!userId || Platform.OS === 'web') {
      return;
    }

    if (syncPromise) {
      return syncPromise;
    }

    syncPromise = (async () => {
      try {
        const expoPushToken = await getExpoPushToken();
        if (!expoPushToken) {
          return;
        }

        const [lastToken, lastUserId] = await Promise.all([
          AsyncStorage.getItem(LAST_PUSH_TOKEN_KEY),
          AsyncStorage.getItem(LAST_PUSH_USER_KEY),
        ]);

        if (lastToken === expoPushToken && lastUserId === userId) {
          return;
        }

        await userAPI.updatePushToken({
          expoPushToken,
          enabled: true,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
        });

        await Promise.all([
          AsyncStorage.setItem(LAST_PUSH_TOKEN_KEY, expoPushToken),
          AsyncStorage.setItem(LAST_PUSH_USER_KEY, userId),
        ]);
      } catch (error) {
        notificationsLogger.warn('Push token sync failed', error);
      }
    })().finally(() => {
      syncPromise = null;
    });

    return syncPromise;
  },

  async unregisterCurrentPushToken(): Promise<void> {
    if (Platform.OS === 'web') {
      return;
    }

    try {
      const expoPushToken =
        (await AsyncStorage.getItem(LAST_PUSH_TOKEN_KEY)) || null;
      if (!expoPushToken) {
        return;
      }

      await userAPI.updatePushToken({
        expoPushToken,
        enabled: false,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });
    } catch (error) {
      notificationsLogger.warn('Push token unregister failed', error);
    } finally {
      await this.clearCachedPushToken();
    }
  },

  async clearCachedPushToken(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(LAST_PUSH_TOKEN_KEY),
      AsyncStorage.removeItem(LAST_PUSH_USER_KEY),
    ]);
  },
};
