import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL || config.extra?.EXPO_PUBLIC_API_URL;
  const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (process.env.EAS_BUILD_PROFILE === 'production') {
    if (!apiUrl || new URL(apiUrl).protocol !== 'https:') {
      throw new Error('Production EXPO_PUBLIC_API_URL must use HTTPS');
    }
    if (stripeKey && !stripeKey.startsWith('pk_live_')) {
      throw new Error('Production cannot use a test Stripe publishable key');
    }
  }
  return {
    ...config,
    name:
      process.env.EAS_BUILD_PROFILE === 'production'
        ? 'AstraLink'
        : (config.name ?? 'AstraLink'),
    slug: config.slug ?? 'AstraLink',
    extra: {
      ...config.extra,
      buildProfile: process.env.EAS_BUILD_PROFILE || 'unconfigured',
      EXPO_PUBLIC_API_URL: apiUrl,
      ...(stripeKey ? { EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: stripeKey } : {}),
    },
  };
};
