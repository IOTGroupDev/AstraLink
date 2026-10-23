import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra;
export const stripePublishableKey =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  extra?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  '';

// StoreKit products and verification must be configured before enabling iOS store purchases.
export const stripeSubscriptionAvailable =
  Boolean(stripePublishableKey) &&
  Platform.OS !== 'web' &&
  (Platform.OS !== 'ios' ||
    __DEV__ ||
    extra?.buildProfile === 'development' ||
    extra?.buildProfile === 'preview');
