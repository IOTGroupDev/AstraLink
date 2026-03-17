import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Subscription, SUBSCRIPTION_PLANS } from '../types';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types/navigation';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import SubscriptionCard from '../components/profile/SubscriptionCard';
import { chartAPI, userAPI } from '../services/api';
import { subscriptionAPI } from '../services/api/subscription.api';
import { SubscriptionTier } from '../types/subscription';

type SubscriptionScreenProps = StackScreenProps<
  RootStackParamList,
  'Subscription'
>;

function SubscriptionScreen({ navigation }: SubscriptionScreenProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [currentSubscription, setCurrentSubscription] =
    React.useState<Subscription | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [purchasing, setPurchasing] = React.useState<string | null>(null);
  const [aiRefreshing, setAiRefreshing] = React.useState(false);

  const getApiLocale = React.useCallback((): 'ru' | 'en' | 'es' => {
    const lang = String(i18n.language || 'en').toLowerCase();
    return lang === 'ru' || lang === 'en' || lang === 'es' ? lang : 'en';
  }, [i18n.language]);

  React.useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const subscription = await userAPI.getSubscription();
      setCurrentSubscription(subscription);
    } catch (error) {
      // If no subscription, default to free
      setCurrentSubscription({
        tier: 'free',
        isActive: false,
        isTrial: false,
        isTrialActive: false,
        features: [],
      } as any);
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
              const result = await subscriptionAPI.upgrade(tier, 'mock');

              if (result.success) {
                setAiRefreshing(true);
                void Promise.allSettled([
                  chartAPI.regenerateChartWithAI(),
                  chartAPI.getAllHoroscopes(getApiLocale()),
                ]).finally(() => setAiRefreshing(false));

                queryClient.invalidateQueries({ queryKey: ['subscription'] });

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
                        fetchSubscription();
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

        {aiRefreshing && (
          <View style={styles.aiRefreshBanner}>
            <Ionicons name="sparkles" size={18} color="#F59E0B" />
            <Text style={styles.aiRefreshText}>
              {t(
                'subscription.aiRefreshing',
                'Updating AI horoscope and interpretation...'
              )}
            </Text>
          </View>
        )}
      </ScrollView>
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
  aiRefreshBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginHorizontal: 16,
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
