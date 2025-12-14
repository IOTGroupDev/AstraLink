import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Subscription, SUBSCRIPTION_PLANS } from '../types';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types/navigation';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import SubscriptionCard from '../components/profile/SubscriptionCard';
import { useAuth } from '../hooks/useAuth';
import { userAPI } from '../services/api';

type SubscriptionScreenProps = StackScreenProps<
  RootStackParamList,
  'Subscription'
>;

function SubscriptionScreen(_: SubscriptionScreenProps) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [currentSubscription, setCurrentSubscription] = React.useState<Subscription | null>(null);
  const [loading, setLoading] = React.useState(true);

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

  const handleUpgrade = (tier: string) => {
    // TODO: Navigate to payment/upgrade flow
    console.log('Upgrading to:', tier);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('subscription.title', 'Subscription Plans')}</Text>
        <Text style={styles.subtitle}>
          {t('subscription.subtitle', 'Choose the plan that works for you')}
        </Text>
      </View>

      {SUBSCRIPTION_PLANS.map((plan) => {
        const isCurrentPlan = currentSubscription?.tier === plan.tier;
        const mockSubscription: Subscription = {
          id: plan.tier,
          userId: '',
          tier: plan.tier as any,
          isActive: isCurrentPlan,
          isTrial: false,
          isTrialActive: false,
          features: plan.features,
          expiresAt: isCurrentPlan ? currentSubscription?.expiresAt : undefined,
          trialEndsAt: isCurrentPlan ? currentSubscription?.trialEndsAt : undefined,
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
              onUpgrade={() => handleUpgrade(plan.tier)}
              showUpgradeButton={!isCurrentPlan}
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
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  contentContainer: {
    paddingVertical: 20,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  planContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 32,
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
    left: 32,
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
    marginBottom: 8,
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
  loadingText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});

export default SubscriptionScreen;
