import React from 'react';
import {
  Alert,
  Animated,
  Image,
  ImageBackground,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import comingSoonBackground from '@assets/coming-soon-gb.png';
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

function SubscriptionScreen({ navigation }: SubscriptionScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const [purchasing, setPurchasing] = React.useState<string | null>(null);
  const loadingPopupVisible = purchasing !== null;

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
  const topFadeOpacity = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.backgroundFrame}>
        <ImageBackground
          source={comingSoonBackground}
          resizeMode="cover"
          style={styles.background}
          imageStyle={styles.backgroundImage}
        />
      </View>

      <View style={styles.viewport}>
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + 6 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('common.buttons.close', 'Close')}
        >
          <Ionicons
            name="close-outline"
            size={34}
            color="rgba(255, 255, 255, 0.32)"
          />
        </TouchableOpacity>

        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            {
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 92,
            },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          <View style={styles.hero}>
            <Image
              source={premiumHero}
              resizeMode="contain"
              style={styles.heroImage}
            />
            <Text style={styles.title}>
              {t('subscription.paywall.title', 'Try it free')}
            </Text>
          </View>

          <View style={styles.benefits}>
            {benefits.map((benefit) => (
              <View key={benefit.title} style={styles.benefit}>
                <Ionicons
                  name={benefit.icon}
                  size={32}
                  color="#FFFFFF"
                  style={styles.benefitIcon}
                />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitDescription}>
                    {benefit.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.ctaSection}>
            <Text style={styles.pricing}>
              {t('subscription.paywall.pricing', '3 days free, then $9.99/mo')}
            </Text>
            <TouchableOpacity
              style={[styles.continueButton, isPurchasing && styles.disabled]}
              onPress={() =>
                handlePurchase(SubscriptionTier.PREMIUM, premiumPlan.name)
              }
              activeOpacity={0.84}
              disabled={isPurchasing}
            >
              <Text style={styles.continueText}>
                {isPurchasing
                  ? t('subscription.purchasing', 'Processing...')
                  : t('subscription.paywall.continue', 'Continue')}
              </Text>
            </TouchableOpacity>
            <Text style={styles.cancelText}>
              {t('subscription.paywall.cancel', 'Cancel anytime')}
            </Text>
          </View>

          <View style={styles.legal}>
            <Text style={styles.legalText}>
              {t('subscription.paywall.terms', 'Terms and Conditions')}
            </Text>
            <Text style={styles.legalText}>
              {t('subscription.paywall.privacy', 'Privacy Policy')}
            </Text>
          </View>
        </Animated.ScrollView>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.topFade,
            { height: insets.top + 56, opacity: topFadeOpacity },
          ]}
        >
          <LinearGradient
            colors={[
              'rgba(8, 14, 28, 0.98)',
              'rgba(8, 14, 28, 0.62)',
              'rgba(8, 14, 28, 0)',
            ]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(8, 14, 28, 0)',
            'rgba(8, 14, 28, 0.52)',
            'rgba(8, 14, 28, 0.94)',
            '#080E1C',
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.bottomFade, { height: insets.bottom + 72 }]}
        />
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
    opacity: 0.28,
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
  scrollView: {
    flex: 1,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  hero: {
    alignItems: 'center',
    gap: 7,
  },
  heroImage: {
    width: 115,
    height: 92,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '600',
    textAlign: 'center',
  },
  benefits: {
    width: '100%',
    gap: 18,
    marginTop: 36,
    paddingHorizontal: 20,
  },
  benefit: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  benefitIcon: {
    width: 32,
  },
  benefitText: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  benefitTitle: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14.5,
    lineHeight: 18,
    fontWeight: '600',
  },
  benefitDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '400',
  },
  ctaSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 40,
  },
  pricing: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 24,
  },
  continueButton: {
    width: '100%',
    minHeight: 60,
    backgroundColor: '#8D26A9',
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  disabled: {
    opacity: 0.65,
  },
  continueText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_500Medium',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '500',
  },
  cancelText: {
    marginTop: 25,
    color: '#FFFFFF',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '400',
    textAlign: 'center',
  },
  legal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginTop: 43,
  },
  legalText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    textAlign: 'center',
  },
});

export default SubscriptionScreen;
