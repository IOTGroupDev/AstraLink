import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Subscription, SUBSCRIPTION_PLANS } from '../types';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types/navigation';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import SubscriptionCard from '../components/profile/SubscriptionCard';
import { userAPI } from '../services/api';
import { subscriptionAPI } from '../services/api/subscription.api';
import { SubscriptionTier } from '../types/subscription';
import { chartAPI } from '../services/api/chart.api';

type SubscriptionScreenProps = StackScreenProps<
  RootStackParamList,
  'Subscription'
>;

function SubscriptionScreen({ navigation }: SubscriptionScreenProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const cachedSubscription =
    queryClient.getQueryData<Subscription>(['subscription']) ?? null;
  const [currentSubscription, setCurrentSubscription] =
    React.useState<Subscription | null>(cachedSubscription);
  const [loading, setLoading] = React.useState(!cachedSubscription);
  const [purchasing, setPurchasing] = React.useState<string | null>(null);
  const [purchaseStage, setPurchaseStage] = React.useState<
    'activating' | 'syncing' | 'natal' | 'horoscope' | 'finalizing' | null
  >(null);
  const loadingPopupVisible = purchasing !== null;

  React.useEffect(() => {
    fetchSubscription();
  }, []);

  const getApiLocale = React.useCallback((): 'ru' | 'en' | 'es' => {
    const locale = String(i18n.language || 'en').toLowerCase();
    if (locale.startsWith('ru')) return 'ru';
    if (locale.startsWith('es')) return 'es';
    return 'en';
  }, [i18n.language]);

  const fetchSubscription = async () => {
    try {
      const subscription = await userAPI.getSubscription();
      setCurrentSubscription(subscription);
      queryClient.setQueryData(['subscription'], subscription);
    } catch (error) {
      // If no subscription, default to free
      const freeFallback = {
        tier: 'free',
        isActive: false,
        isTrial: false,
        isTrialActive: false,
        features: [],
      } as any;
      setCurrentSubscription((current) => current ?? freeFallback);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (tier: SubscriptionTier, planName: string) => {
    // If it's the current plan, just show info
    if (currentSubscription?.tier === tier) {
      Alert.alert(
        t('subscription.current', 'Current Plan'),
        t(
          'subscription.currentPlanMessage',
          'This is your current subscription plan.'
        )
      );
      return;
    }

    // Confirm purchase
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
              setPurchaseStage('activating');
              const locale = getApiLocale();
              const result = await subscriptionAPI.upgrade(tier, 'mock');

              if (result.success) {
                const optimisticSubscription = {
                  ...(currentSubscription || {}),
                  tier,
                  isActive: true,
                  isTrial: false,
                  expiresAt: result.subscription?.expiresAt,
                } as Subscription;
                setCurrentSubscription(optimisticSubscription);
                queryClient.setQueryData(
                  ['subscription'],
                  optimisticSubscription
                );

                setPurchaseStage('syncing');
                const freshSubscription = await subscriptionAPI.getStatus();
                setCurrentSubscription(freshSubscription as Subscription);
                queryClient.setQueryData(['subscription'], freshSubscription);
                await queryClient.invalidateQueries({
                  queryKey: ['subscription'],
                });
                await queryClient.refetchQueries({
                  queryKey: ['subscription'],
                  type: 'active',
                });

                setPurchaseStage('natal');
                await chartAPI.getNatalChartWithInterpretation(locale);

                setPurchaseStage('horoscope');
                await chartAPI.getAllHoroscopes(locale);

                setPurchaseStage('finalizing');

                Alert.alert(
                  t('subscription.successTitle', 'Success!'),
                  t(
                    'subscription.successMessage',
                    'Your subscription has been upgraded successfully.'
                  ),
                  [
                    {
                      text: t('common.buttons.ok', 'OK'),
                      onPress: () => {
                        navigation.goBack();
                      },
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
              setPurchaseStage(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            {t('common.loading.loading', 'Loading...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Back Button */}
      <View style={styles.navigationHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('subscription.title', 'Subscription Plans')}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            {t('subscription.subtitle', 'Choose the plan that works for you')}
          </Text>
        </View>

        {SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrentPlan = currentSubscription?.tier === plan.tier;
          const isPurchasing = purchasing === plan.tier;

          const mockSubscription: Subscription = {
            id: plan.tier,
            userId: '',
            tier: plan.tier as any,
            isActive: isCurrentPlan,
            isTrial: false,
            isTrialActive: false,
            features: plan.features,
            expiresAt: isCurrentPlan
              ? currentSubscription?.expiresAt
              : undefined,
            trialEndsAt: isCurrentPlan
              ? currentSubscription?.trialEndsAt
              : undefined,
          } as any;

          return (
            <View key={plan.tier} style={styles.planContainer}>
              {plan.isPopular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>
                    {t('subscription.popular', 'Most Popular')}
                  </Text>
                </View>
              )}
              {isCurrentPlan && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentText}>
                    {t('subscription.current', 'Current Plan')}
                  </Text>
                </View>
              )}
              <SubscriptionCard
                subscription={mockSubscription}
                onUpgrade={() => handlePurchase(plan.tier, plan.name)}
                showUpgradeButton={false}
              />
              {plan.price > 0 && (
                <View style={styles.priceContainer}>
                  <Text style={styles.price}>
                    {plan.currency === 'RUB' ? '₽' : '$'}
                    {plan.price}
                  </Text>
                  <Text style={styles.period}>
                    / {t(`subscription.period.${plan.period}`, plan.period)}
                  </Text>
                </View>
              )}
              {/* Purchase Button */}
              <TouchableOpacity
                style={[
                  styles.purchaseButton,
                  isCurrentPlan && styles.currentPlanButton,
                  isPurchasing && styles.purchasingButton,
                ]}
                onPress={() => handlePurchase(plan.tier, plan.name)}
                disabled={isPurchasing}
              >
                <Text
                  style={[
                    styles.purchaseButtonText,
                    isCurrentPlan && styles.currentPlanButtonText,
                  ]}
                >
                  {isPurchasing
                    ? t('subscription.purchasing', 'Processing...')
                    : isCurrentPlan
                      ? t('subscription.currentPlan', 'Current Plan')
                      : plan.price === 0
                        ? t('subscription.chooseFree', 'Choose Free')
                        : t('subscription.choosePlan', 'Choose Plan')}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={loadingPopupVisible}
        onRequestClose={() => {
          // Prevent closing while premium assets are being prepared
        }}
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingModal}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingModalTitle}>
              {t('subscription.loadingModal.title', 'Preparing your Premium')}
            </Text>
            <Text style={styles.loadingModalMessage}>
              {t(
                'subscription.loadingModal.message',
                'Loading premium data and generating your AI interpretations. This can take a little time.'
              )}
            </Text>
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>
                {t('subscription.loadingModal.progressTitle', 'Current step')}
              </Text>
              <Text style={styles.progressValue}>
                {purchaseStage === 'syncing' &&
                  t(
                    'subscription.loadingModal.stages.syncing',
                    'Syncing premium access...'
                  )}
                {purchaseStage === 'natal' &&
                  t(
                    'subscription.loadingModal.stages.natal',
                    'Refreshing natal chart interpretation...'
                  )}
                {purchaseStage === 'horoscope' &&
                  t(
                    'subscription.loadingModal.stages.horoscope',
                    'Updating AI horoscope...'
                  )}
                {purchaseStage === 'finalizing' &&
                  t(
                    'subscription.loadingModal.stages.finalizing',
                    'Finalizing and updating your screens...'
                  )}
                {purchaseStage !== 'syncing' &&
                  purchaseStage !== 'natal' &&
                  purchaseStage !== 'horoscope' &&
                  purchaseStage !== 'finalizing' &&
                  t(
                    'subscription.loadingModal.stages.activating',
                    'Activating subscription...'
                  )}
              </Text>
            </View>
            <View style={styles.aiRefreshBanner}>
              <Ionicons name="sparkles-outline" size={18} color="#F59E0B" />
              <Text style={styles.aiRefreshText}>
                {t(
                  'subscription.aiRefreshing',
                  'Updating AI horoscope and interpretation...'
                )}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 20,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  planContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 28,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  popularText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  currentBadge: {
    position: 'absolute',
    top: -8,
    left: 28,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  currentText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: -12,
    marginBottom: 12,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  period: {
    fontSize: 16,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  purchaseButton: {
    marginHorizontal: 16,
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentPlanButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  purchasingButton: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  currentPlanButtonText: {
    color: '#10B981',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingModal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#111827',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.28)',
    alignItems: 'center',
  },
  loadingModalTitle: {
    marginTop: 16,
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingModalMessage: {
    marginTop: 10,
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  progressCard: {
    marginTop: 16,
    width: '100%',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  progressTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  progressValue: {
    marginTop: 6,
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  aiRefreshBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  aiRefreshText: {
    color: '#F9FAFB',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
});

export default SubscriptionScreen;
