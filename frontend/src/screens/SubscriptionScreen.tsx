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
  withRepeat,
  withSequence,
} from 'react-native-reanimated';

import { useSubscription } from '../hooks/useSubscription';
import {
  SUBSCRIPTION_PLANS,
  SubscriptionTier,
  formatPrice,
  getTierColors,
  TRIAL_CONFIG,
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
      `Подписка: ${plan.name}\nЦена: ${formatPrice(plan.price, plan.currency)}/${
        plan.period === 'month' ? 'мес' : 'год'
      }\n\n(Mock платеж для разработки)`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Купить',
          onPress: async () => {
            setSelectedPlan(planTier);
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
            setSelectedPlan(null);
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

        {/* Plans Container */}
        <View style={styles.plansContainer}>
          <Text style={styles.plansTitle}>Доступные планы</Text>

          {/* Trial Plan (если доступен) */}
          {isTrialAvailable() && !isTrial && (
            <Animated.View entering={SlideInUp.delay(600)}>
              <TrialPlanCard
                onActivate={handleActivateTrial}
                isLoading={isActivatingTrial}
              />
            </Animated.View>
          )}

          {/* Regular Plans */}
          {SUBSCRIPTION_PLANS.map((plan, index) => (
            <Animated.View
              key={plan.tier}
              entering={SlideInUp.delay(800 + index * 100)}
            >
              <PlanCard
                plan={plan}
                isCurrentPlan={tier === plan.tier && !isTrial}
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
// TRIAL PLAN CARD COMPONENT
// ========================================
interface TrialPlanCardProps {
  onActivate: () => void;
  isLoading: boolean;
}

const TrialPlanCard: React.FC<TrialPlanCardProps> = ({
  onActivate,
  isLoading,
}) => {
  const glowAnim = useSharedValue(0);

  React.useEffect(() => {
    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
  }));

  return (
    <View style={styles.trialCard}>
      {/* Glow Effect */}
      <Animated.View style={[styles.trialGlow, animatedGlowStyle]}>
        <LinearGradient
          colors={['#10B981', '#059669', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Content */}
      <LinearGradient
        colors={['#10B981', '#059669', '#047857']}
        style={styles.trialGradient}
      >
        {/* Badge */}
        <View style={styles.trialBadge}>
          <Ionicons name="gift" size={20} color="#fff" />
          <Text style={styles.trialBadgeText}>БЕСПЛАТНО</Text>
        </View>

        {/* Main Content */}
        <View style={styles.trialContent}>
          <View style={styles.trialHeader}>
            <Ionicons name="star" size={32} color="#fff" />
            <View style={styles.trialTitleContainer}>
              <Text style={styles.trialPlanName}>Premium Trial</Text>
              <Text style={styles.trialDuration}>7 дней бесплатно</Text>
            </View>
          </View>

          <Text style={styles.trialDescription}>
            🎉 Попробуйте все функции Premium абсолютно бесплатно! Никаких
            обязательств, никакой автоматической оплаты.
          </Text>

          {/* Features */}
          <View style={styles.trialFeatures}>
            {[
              'Полная натальная карта с AI',
              'Детальные транзиты',
              'Астросимулятор',
              'Cosmic Dating',
              'Неограниченная совместимость',
            ].map((feature, index) => (
              <View key={index} style={styles.trialFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.trialFeatureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {/* Activate Button */}
          <TouchableOpacity
            style={styles.trialActivateButton}
            onPress={onActivate}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <View style={styles.trialActivateButtonContent}>
              <Ionicons name="gift" size={24} color="#10B981" />
              <Text style={styles.trialActivateButtonText}>
                {isLoading ? 'Активация...' : '🎁 Активировать Trial бесплатно'}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.trialNote}>
            * Trial доступен один раз для каждого пользователя
          </Text>
        </View>
      </LinearGradient>
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
  isLoading = false,
}) => {
  const scaleAnim = useSharedValue(1);

  const handlePressIn = () => {
    scaleAnim.value = withSpring(0.98, { damping: 10 });
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1, { damping: 10 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  return (
    <Animated.View style={[styles.planCard, animatedStyle]}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
        style={styles.planGradient}
      >
        {/* Popular Badge */}
        {plan.isPopular && (
          <View style={styles.popularBadge}>
            <LinearGradient colors={plan.colors} style={styles.popularGradient}>
              <Ionicons name="star" size={14} color="#fff" />
              <Text style={styles.popularText}>ПОПУЛЯРНЫЙ</Text>
            </LinearGradient>
          </View>
        )}

        {/* Plan Header */}
        <View style={styles.planHeader}>
          <View style={styles.planTier}>
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
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={plan.colors[0]}
              />
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
                <Text style={styles.selectText}>Обработка...</Text>
              ) : (
                <>
                  <Text style={styles.selectText}>
                    {plan.tier === SubscriptionTier.FREE
                      ? 'Бесплатно'
                      : 'Выбрать план'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

// ========================================
// STYLES
// ========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#B0B0B0',
  },
  plansContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  plansTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },

  // Trial Card
  trialCard: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  trialGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 30,
  },
  trialGradient: {
    padding: 24,
    borderRadius: 24,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  trialBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  trialContent: {},
  trialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trialTitleContainer: {
    marginLeft: 12,
  },
  trialPlanName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  trialDuration: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  trialDescription: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
    marginBottom: 20,
  },
  trialFeatures: {
    marginBottom: 20,
  },
  trialFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trialFeatureText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 12,
    flex: 1,
  },
  trialActivateButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  trialActivateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialActivateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
    marginLeft: 8,
  },
  trialNote: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Plan Card
  planCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  planGradient: {
    padding: 20,
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderRadius: 20,
    overflow: 'hidden',
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
  planTier: {
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
