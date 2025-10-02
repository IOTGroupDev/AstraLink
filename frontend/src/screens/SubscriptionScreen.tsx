// frontend/src/screens/SubscriptionScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

import { useSubscription } from '../hooks/useSubscription';
import {
  SUBSCRIPTION_PLANS,
  SubscriptionTier,
  formatPrice,
  getTierColors,
} from '../types/subscription';
import CosmicBackground from '../components/CosmicBackground';
import LoadingLogo from '../components/LoadingLogo';
import SubscriptionCard from '../components/SubscriptionCard';

const { width, height } = Dimensions.get('window');

interface SubscriptionScreenProps {
  navigation: any;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({
  navigation,
}) => {
  const {
    subscription,
    tier,
    isLoading,
    isTrialAvailable,
    isTrial,
    activateTrial,
    upgrade,
    isActivatingTrial,
    isUpgrading,
  } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier | null>(
    null
  );

  // Анимации
  const headerScale = useSharedValue(0);

  React.useEffect(() => {
    headerScale.value = withSpring(1, { damping: 8, stiffness: 100 });
  }, []);

  const animatedHeaderStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
  }));

  // Обработчик активации Trial
  const handleActivateTrial = async () => {
    Alert.alert(
      '🎁 Активировать Trial?',
      '7 дней Premium подписки бесплатно. Без автоматического продления.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Активировать',
          onPress: async () => {
            const result = await activateTrial();
            if (result.success) {
              Alert.alert(
                '✨ Trial активирован!',
                'Наслаждайтесь всеми функциями Premium 7 дней бесплатно',
                [{ text: 'Отлично!', onPress: () => navigation.goBack() }]
              );
            } else {
              Alert.alert('Ошибка', 'Не удалось активировать Trial');
            }
          },
        },
      ]
    );
  };

  // Обработчик покупки подписки (Mock)
  const handlePurchasePlan = async (planTier: SubscriptionTier) => {
    if (planTier === SubscriptionTier.FREE) {
      Alert.alert('Информация', 'Вы уже используете Free версию');
      return;
    }

    if (planTier === tier) {
      Alert.alert('Информация', 'У вас уже есть эта подписка');
      return;
    }

    const plan = SUBSCRIPTION_PLANS.find((p) => p.tier === planTier);
    if (!plan) return;

    Alert.alert(
      '💳 Подтверждение покупки',
      `Подписка: ${plan.name}\nЦена: ${formatPrice(plan.price, plan.currency)}/${plan.period === 'month' ? 'мес' : 'год'}\n\n(Mock платеж для разработки)`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Купить',
          onPress: async () => {
            const result = await upgrade(planTier, 'mock');
            if (result.success) {
              Alert.alert(
                '🎉 Подписка активирована!',
                `Вы успешно подключили ${plan.name}`,
                [{ text: 'Отлично!', onPress: () => navigation.goBack() }]
              );
            } else {
              Alert.alert('Ошибка', 'Не удалось активировать подписку');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <LoadingLogo />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CosmicBackground />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeIn.delay(200)}
          style={[styles.header, animatedHeaderStyle]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.title}>Выберите подписку</Text>
          <Text style={styles.subtitle}>
            Откройте все возможности AstraLink
          </Text>
        </Animated.View>

        {/* Current Subscription Card */}
        {subscription && (
          <Animated.View entering={SlideInUp.delay(400)}>
            <SubscriptionCard
              subscription={subscription}
              onUpgrade={() => {}}
              showUpgradeButton={false}
            />
          </Animated.View>
        )}

        {/* Trial Banner (если доступен) */}
        {isTrialAvailable() && !isTrial && (
          <Animated.View
            entering={SlideInUp.delay(600)}
            style={styles.trialBanner}
          >
            <LinearGradient
              colors={['#10B981', '#059669', '#047857']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.trialGradient}
            >
              <View style={styles.trialContent}>
                <Ionicons name="gift" size={32} color="#fff" />
                <View style={styles.trialText}>
                  <Text style={styles.trialTitle}>
                    🎁 Попробуйте Premium бесплатно!
                  </Text>
                  <Text style={styles.trialDescription}>
                    7 дней полного доступа без оплаты
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.trialButton}
                onPress={handleActivateTrial}
                disabled={isActivatingTrial}
              >
                <View style={styles.trialButtonContent}>
                  <Text style={styles.trialButtonText}>
                    {isActivatingTrial ? 'Активация...' : 'Активировать Trial'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </View>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Plans */}
        <View style={styles.plansContainer}>
          <Text style={styles.plansTitle}>Все планы</Text>

          {SUBSCRIPTION_PLANS.map((plan, index) => (
            <Animated.View
              key={plan.tier}
              entering={SlideInUp.delay(800 + index * 100)}
            >
              <PlanCard
                plan={plan}
                isCurrentPlan={tier === plan.tier}
                onSelect={() => handlePurchasePlan(plan.tier)}
                isLoading={isUpgrading && selectedPlan === plan.tier}
              />
            </Animated.View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            • Безопасная оплата через Apple/Google Pay
          </Text>
          <Text style={styles.footerText}>• Отмена подписки в любое время</Text>
          <Text style={styles.footerText}>• Без скрытых платежей</Text>
        </View>
      </ScrollView>
    </View>
  );
};

// ========================================
// PLAN CARD COMPONENT
// ========================================
interface PlanCardProps {
  plan: (typeof SUBSCRIPTION_PLANS)[0];
  isCurrentPlan: boolean;
  onSelect: () => void;
  isLoading?: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isCurrentPlan,
  onSelect,
  isLoading,
}) => {
  const scaleAnim = useSharedValue(1);

  const handlePressIn = () => {
    scaleAnim.value = withTiming(0.98, { duration: 100 });
  };

  const handlePressOut = () => {
    scaleAnim.value = withTiming(1, { duration: 100 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  return (
    <Animated.View style={[styles.planCard, animatedStyle]}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
        style={styles.planCardGradient}
      >
        {/* Popular Badge */}
        {plan.isPopular && (
          <View style={styles.popularBadge}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.popularGradient}
            >
              <Ionicons name="star" size={14} color="#fff" />
              <Text style={styles.popularText}>Популярный</Text>
            </LinearGradient>
          </View>
        )}

        {/* Plan Header */}
        <View style={styles.planHeader}>
          <View style={styles.planTierBadge}>
            <LinearGradient
              colors={plan.colors}
              style={styles.planTierGradient}
            >
              <Text style={styles.planTierText}>{plan.name}</Text>
            </LinearGradient>
          </View>

          <View style={styles.planPriceContainer}>
            <Text style={styles.planPrice}>
              {formatPrice(plan.price, plan.currency)}
            </Text>
            {plan.price > 0 && (
              <Text style={styles.planPeriod}>
                /{plan.period === 'month' ? 'мес' : 'год'}
              </Text>
            )}
          </View>
        </View>

        {/* Features */}
        <View style={styles.planFeatures}>
          {plan.features.map((feature, idx) => (
            <View key={idx} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Action Button */}
        {isCurrentPlan ? (
          <View style={styles.currentPlanButton}>
            <Text style={styles.currentPlanText}>Текущий план</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.selectButton}
            onPress={onSelect}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient colors={plan.colors} style={styles.selectGradient}>
              {isLoading ? (
                <LoadingLogo size="small" />
              ) : (
                <>
                  <Text style={styles.selectText}>
                    {plan.tier === SubscriptionTier.FREE
                      ? 'Бесплатно'
                      : 'Выбрать план'}
                  </Text>
                  {plan.tier !== SubscriptionTier.FREE && (
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  )}
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(139, 92, 246, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#B0B0B0',
    lineHeight: 22,
  },
  trialBanner: {
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  trialGradient: {
    padding: 20,
  },
  trialContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  trialText: {
    flex: 1,
    marginLeft: 16,
  },
  trialTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  trialDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  trialButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  trialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  trialButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  plansContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  plansTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  planCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  planCardGradient: {
    padding: 20,
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 10,
  },
  popularGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  popularText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  planHeader: {
    marginBottom: 20,
  },
  planTierBadge: {
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  planTierGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  planTierText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  planPeriod: {
    fontSize: 16,
    color: '#B0B0B0',
    marginLeft: 4,
  },
  planFeatures: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#E0E0E0',
    marginLeft: 12,
    flex: 1,
  },
  currentPlanButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  currentPlanText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  selectText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
});

export default SubscriptionScreen;
