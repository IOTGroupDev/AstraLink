let mockBuildProfile = 'production';
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        get buildProfile() {
          return mockBuildProfile;
        },
      },
    },
  },
}));

describe('iOS subscription release gate', () => {
  const originalDev = __DEV__;
  const originalKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  beforeEach(() => {
    Object.defineProperty(globalThis, '__DEV__', {
      value: false,
      configurable: true,
      writable: true,
    });
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY =
      'pk_test_configuration_fixture';
  });
  afterAll(() => {
    Object.defineProperty(globalThis, '__DEV__', {
      value: originalDev,
      configurable: true,
      writable: true,
    });
    if (originalKey === undefined)
      delete process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    else process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = originalKey;
  });
  it.each([
    ['production', false],
    ['unconfigured', false],
    ['preview', true],
    ['development', true],
  ])('profile %s permits Stripe = %s', (profile, expected) => {
    mockBuildProfile = profile;
    jest.isolateModules(() => {
      const {
        stripeSubscriptionAvailable,
      } = require('../subscription-payment-config');
      expect(stripeSubscriptionAvailable).toBe(expected);
    });
  });
});
