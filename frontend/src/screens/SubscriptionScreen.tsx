import React from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { StackScreenProps } from '@react-navigation/stack';
import { Subscription, SUBSCRIPTION_PLANS } from '../types';
import type { RootStackParamList } from '../types/navigation';
import { chartAPI, userAPI } from '../services/api';
import { subscriptionAPI } from '../services/api/subscription.api';
import {
  normalizeSubscriptionTier,
  SubscriptionTier,
} from '../types/subscription';
import FullscreenLoadingScreen from '../components/shared/FullscreenLoadingScreen';
import { writeHoroscopeScreenInvalidationMarker } from '../services/horoscope-cache';
import paywallBackground from '@assets/loading-bg.png';
import premiumHero from '@assets/premium-hero.png';

type SubscriptionScreenProps = StackScreenProps<
  RootStackParamList,
  'Subscription'
>;

interface PaywallBenefit {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const PAYWALL_BASE_CONTENT_HEIGHT = 748;

function SubscriptionScreen({ navigation }: SubscriptionScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const queryClient = useQueryClient();
  const [purchasing, setPurchasing] = React.useState<string | null>(null);
  const loadingPopupVisible = purchasing !== null;
  const availableContentHeight = screenHeight - insets.top - insets.bottom;
  const layoutScale = Math.min(
    1,
    availableContentHeight / PAYWALL_BASE_CONTENT_HEIGHT
  );
  const scaled = React.useCallback(
    (value: number) => Math.round(value * layoutScale),
    [layoutScale]
  );

  const getApiLocale = React.useCallback((): 'ru' | 'en' | 'es' => {
    const rawLocale = String(i18n.language || 'ru').toLowerCase();
    if (rawLocale === 'en' || rawLocale.startsWith('en-')) return 'en';
    if (rawLocale === 'es' || rawLocale.startsWith('es-')) return 'es';
    return 'ru';
  }, [i18n.language]);

  const freeFallback: Subscription = {
    id: 'free-fallback',
    userId: '',
    tier: SubscriptionTier.FREE,
    isActive: false,
    isTrial: false,
    features: [],
  };

  const { data: currentSubscription = freeFallback, isLoading: loading } =
    useQuery<Subscription>({
      queryKey: ['subscription'],
      queryFn: () => userAPI.getSubscription(),
      staleTime: 30_000,
    });

  const premiumPlan = SUBSCRIPTION_PLANS.find(
    (plan) => plan.tier === SubscriptionTier.PREMIUM
  );

  const handlePurchase = async (tier: SubscriptionTier, planName: string) => {
    if (normalizeSubscriptionTier(currentSubscription?.tier) === tier) {
      Alert.alert(
        t('subscription.current', 'Current Plan'),
        t(
          'subscription.currentPlanMessage',
          'This is your current subscription plan.'
        )
      );
      return;
    }

    const displayName = t(`subscription.tiers.${tier}.name`, planName);
    Alert.alert(
      t('subscription.confirmTitle', 'Confirm Subscription'),
      t('subscription.confirmMessage', { planName: displayName }),
      [
        {
          text: t('common.buttons.cancel', 'Cancel'),
          style: 'cancel',
        },
        {
          text: t('common.buttons.confirm', 'Confirm'),
          onPress: async () => {
            try {
              setPurchasing(tier);
              const result = await subscriptionAPI.upgrade(tier, 'mock');

              if (result.success) {
                const locale = getApiLocale();
                void Promise.allSettled([
                  chartAPI.getNatalChartWithInterpretation(locale),
                  chartAPI.getHoroscope('day', locale),
                ]);

                await writeHoroscopeScreenInvalidationMarker();
                await queryClient.invalidateQueries({
                  queryKey: ['subscription'],
                });

                Alert.alert(
                  t('subscription.successTitle', 'Success!'),
                  t(
                    'subscription.successMessage',
                    'Your subscription has been upgraded successfully.'
                  ),
                  [
                    {
                      text: t('common.buttons.ok', 'OK'),
                      onPress: () => navigation.goBack(),
                    },
                  ]
                );
              } else {
                throw new Error(result.message || 'Upgrade failed');
              }
            } catch (error: any) {
              Alert.alert(
                t('common.errors.generic', 'Error'),
                error.response?.data?.message ||
                  error.message ||
                  t(
                    'subscription.errorMessage',
                    'Failed to upgrade subscription. Please try again.'
                  )
              );
            } finally {
              setPurchasing(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <FullscreenLoadingScreen />;
  }

  if (!premiumPlan) {
    return null;
  }

  const benefits: PaywallBenefit[] = [
    {
      icon: 'sparkles-outline',
      title: t(
        'subscription.paywall.features.natal.title',
        'Full natal charts'
      ),
      description: t(
        'subscription.paywall.features.natal.description',
        'Full natal charts'
      ),
    },
    {
      icon: 'chatbubble-outline',
      title: t(
        'subscription.paywall.features.horoscope.title',
        'AI horoscopes'
      ),
      description: t(
        'subscription.paywall.features.horoscope.description',
        'Full natal charts'
      ),
    },
    {
      icon: 'people-outline',
      title: t(
        'subscription.paywall.features.consultations.title',
        '2 astrologer consultations/year'
      ),
      description: t(
        'subscription.paywall.features.consultations.description',
        'Full natal charts'
      ),
    },
    {
      icon: 'heart-outline',
      title: t('subscription.paywall.features.dating.title', 'Cosmic Dating'),
      description: t(
        'subscription.paywall.features.dating.description',
        'Full natal charts'
      ),
    },
    {
      icon: 'eye-outline',
      title: t('subscription.paywall.features.likes.title', 'Who liked you'),
      description: t(
        'subscription.paywall.features.likes.description',
        'Full natal charts'
      ),
    },
  ];
  const isPurchasing = purchasing === SubscriptionTier.PREMIUM;

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.backgroundFrame}>
        <ImageBackground
          source={paywallBackground}
          resizeMode="cover"
          style={styles.background}
          imageStyle={styles.backgroundImage}
        />
      </View>

      <View style={styles.viewport}>
        <TouchableOpacity
          style={[
            styles.closeButton,
            {
              top: insets.top + scaled(6),
              width: scaled(46),
              height: scaled(46),
            },
          ]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('common.buttons.close', 'Close')}
        >
          <Ionicons
            name="close-outline"
            size={scaled(34)}
            color="rgba(255, 255, 255, 0.32)"
          />
        </TouchableOpacity>

        <View
          style={[
            styles.contentContainer,
            {
              paddingTop: insets.top + scaled(20),
              paddingBottom: insets.bottom + scaled(16),
            },
          ]}
        >
          <View style={[styles.hero, { gap: scaled(7) }]}>
            <Image
              source={premiumHero}
              resizeMode="contain"
              style={{
                width: scaled(115),
                height: scaled(92),
              }}
            />
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[
                styles.title,
                { fontSize: scaled(25), lineHeight: scaled(30) },
              ]}
            >
              {t('subscription.paywall.title', 'Try it free')}
            </Text>
          </View>

          <View
            style={[
              styles.benefits,
              {
                gap: scaled(18),
                marginTop: scaled(36),
                paddingHorizontal: scaled(20),
              },
            ]}
          >
            {benefits.map((benefit) => (
              <View
                key={benefit.title}
                style={[
                  styles.benefit,
                  { minHeight: scaled(44), gap: scaled(20) },
                ]}
              >
                <Ionicons
                  name={benefit.icon}
                  size={scaled(32)}
                  color="#FFFFFF"
                  style={{ width: scaled(32) }}
                />
                <View style={[styles.benefitText, { gap: scaled(4) }]}>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    numberOfLines={1}
                    style={[
                      styles.benefitTitle,
                      { fontSize: scaled(14.5), lineHeight: scaled(18) },
                    ]}
                  >
                    {benefit.title}
                  </Text>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    numberOfLines={1}
                    style={[
                      styles.benefitDescription,
                      { fontSize: scaled(13), lineHeight: scaled(16) },
                    ]}
                  >
                    {benefit.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={[styles.ctaSection, { paddingTop: scaled(40) }]}>
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[
                styles.pricing,
                {
                  fontSize: scaled(17),
                  lineHeight: scaled(22),
                  marginBottom: scaled(24),
                },
              ]}
            >
              {t('subscription.paywall.pricing', '3 days free, then $9.99/mo')}
            </Text>
            <TouchableOpacity
              style={[
                styles.continueButton,
                {
                  minHeight: scaled(60),
                  borderRadius: scaled(58),
                  paddingHorizontal: scaled(28),
                  paddingVertical: scaled(14),
                },
                isPurchasing && styles.disabled,
              ]}
              onPress={() =>
                handlePurchase(SubscriptionTier.PREMIUM, premiumPlan.name)
              }
              activeOpacity={0.84}
              disabled={isPurchasing}
            >
              <Text
                style={[
                  styles.continueText,
                  { fontSize: scaled(18), lineHeight: scaled(23) },
                ]}
              >
                {isPurchasing
                  ? t('subscription.purchasing', 'Processing...')
                  : t('subscription.paywall.continue', 'Continue')}
              </Text>
            </TouchableOpacity>
            <Text
              style={[
                styles.cancelText,
                {
                  marginTop: scaled(25),
                  fontSize: scaled(14),
                  lineHeight: scaled(18),
                },
              ]}
            >
              {t('subscription.paywall.cancel', 'Cancel anytime')}
            </Text>
          </View>

          <View
            style={[styles.legal, { gap: scaled(24), marginTop: scaled(43) }]}
          >
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[
                styles.legalText,
                { fontSize: scaled(12), lineHeight: scaled(16) },
              ]}
            >
              {t('subscription.paywall.terms', 'Terms and Conditions')}
            </Text>
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[
                styles.legalText,
                { fontSize: scaled(12), lineHeight: scaled(16) },
              ]}
            >
              {t('subscription.paywall.privacy', 'Privacy Policy')}
            </Text>
          </View>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={loadingPopupVisible}
        onRequestClose={() => {
          // Prevent closing while premium assets are being prepared.
        }}
      >
        <FullscreenLoadingScreen />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#080E1C',
  },
  backgroundFrame: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ rotate: '180deg' }],
  },
  background: {
    flex: 1,
    backgroundColor: '#080E1C',
  },
  backgroundImage: {
    opacity: 0.7,
  },
  viewport: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 8,
    zIndex: 2,
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  hero: {
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_600SemiBold',
    fontWeight: '600',
    textAlign: 'center',
  },
  benefits: {
    width: '100%',
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    flex: 1,
    justifyContent: 'center',
  },
  benefitTitle: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_600SemiBold',
    fontWeight: '600',
  },
  benefitDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Montserrat_400Regular',
    fontWeight: '400',
  },
  ctaSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 'auto',
  },
  pricing: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_400Regular',
    fontWeight: '400',
    textAlign: 'center',
  },
  continueButton: {
    width: '100%',
    backgroundColor: '#8D26A9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.65,
  },
  continueText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_500Medium',
    fontWeight: '500',
  },
  cancelText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_400Regular',
    fontWeight: '400',
    textAlign: 'center',
  },
  legal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_400Regular',
    fontWeight: '400',
    textAlign: 'center',
  },
});

export default SubscriptionScreen;
