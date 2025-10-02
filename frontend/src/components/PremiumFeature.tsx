// frontend/src/components/PremiumFeature.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

import { useSubscription } from '../hooks/useSubscription';
import {
  SubscriptionTier,
  getTierName,
  getTierColors,
  UPGRADE_SUGGESTIONS,
  FEATURE_REQUIREMENTS,
} from '../types/subscription';

const { width } = Dimensions.get('window');

interface PremiumFeatureProps {
  /** Ключ функции из FEATURE_REQUIREMENTS */
  feature: keyof typeof FEATURE_REQUIREMENTS;

  /** Контент, который будет показан при наличии доступа */
  children: React.ReactNode;

  /** Кастомное сообщение (опционально) */
  customMessage?: string;

  /** Кастомный заголовок (опционально) */
  customTitle?: string;

  /** Показать ли кнопку Trial (если доступен) */
  showTrialButton?: boolean;

  /** Callback при нажатии на upgrade */
  onUpgradePress?: () => void;
}

/**
 * Компонент-обертка для премиум функций
 * Автоматически показывает upgrade prompt, если нет доступа
 */
const PremiumFeature: React.FC<PremiumFeatureProps> = ({
  feature,
  children,
  customMessage,
  customTitle,
  showTrialButton = true,
  onUpgradePress,
}) => {
  const navigation = useNavigation();
  const {
    hasFeature,
    tier,
    isTrialAvailable,
    activateTrial,
    isActivatingTrial,
    getMinimumTierForFeature,
  } = useSubscription();

  // Анимации
  const glowAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(1);

  React.useEffect(() => {
    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0.4, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  const handlePressIn = () => {
    scaleAnim.value = withTiming(0.98, { duration: 100 });
  };

  const handlePressOut = () => {
    scaleAnim.value = withTiming(1, { duration: 100 });
  };

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
  }));

  const animatedScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  // Если есть доступ - показываем контент
  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  // Получаем информацию о требуемой подписке
  const requiredTier = getMinimumTierForFeature(feature);
  const suggestion = UPGRADE_SUGGESTIONS[feature];
  const requiredTierColors = requiredTier
    ? getTierColors(requiredTier)
    : ['#8B5CF6', '#A855F7'];

  // Обработчик активации Trial
  const handleActivateTrial = async () => {
    const result = await activateTrial();
    if (result.success) {
      // Trial активирован - компонент автоматически перерисуется
      console.log('Trial activated successfully!');
    }
  };

  // Обработчик перехода на экран подписок
  const handleUpgrade = () => {
    if (onUpgradePress) {
      onUpgradePress();
    } else {
      navigation.navigate('Subscription' as never);
    }
  };

  return (
    <Animated.View style={[styles.container, animatedScaleStyle]}>
      {/* Background Glow */}
      <Animated.View style={[styles.backgroundGlow, animatedGlowStyle]}>
        <LinearGradient
          colors={[...requiredTierColors, 'transparent']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Content */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
        style={styles.content}
      >
        {/* Lock Icon */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={requiredTierColors}
            style={styles.iconGradient}
          >
            <Ionicons name="lock-closed" size={40} color="#fff" />
          </LinearGradient>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {customTitle || suggestion?.featureName || 'Премиум функция'}
        </Text>

        {/* Message */}
        <Text style={styles.message}>
          {customMessage ||
            suggestion?.benefit ||
            'Эта функция доступна с Premium подпиской'}
        </Text>

        {/* Required Tier Badge */}
        {requiredTier && (
          <View style={styles.tierBadge}>
            <LinearGradient
              colors={requiredTierColors}
              style={styles.tierBadgeGradient}
            >
              <Ionicons
                name={(suggestion?.icon as any) || 'star'}
                size={16}
                color="#fff"
                style={styles.tierIcon}
              />
              <Text style={styles.tierText}>{getTierName(requiredTier)}</Text>
            </LinearGradient>
          </View>
        )}

        {/* Current Tier */}
        <Text style={styles.currentTier}>
          Ваша подписка: {getTierName(tier)}
        </Text>

        {/* Trial Button (если доступен) */}
        {showTrialButton && isTrialAvailable() && (
          <TouchableOpacity
            style={styles.trialButton}
            onPress={handleActivateTrial}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isActivatingTrial}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.trialGradient}
            >
              <Ionicons name="gift" size={20} color="#fff" />
              <Text style={styles.trialText}>
                {isActivatingTrial
                  ? 'Активация...'
                  : '7 дней Premium бесплатно'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Upgrade Button */}
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={handleUpgrade}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={requiredTierColors}
            style={styles.upgradeGradient}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
            <Text style={styles.upgradeText}>
              {isTrialAvailable() ? 'Узнать больше' : 'Улучшить подписку'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  backgroundGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 25,
  },
  content: {
    padding: 30,
    alignItems: 'center',
    minHeight: 300,
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 20,
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(139, 92, 246, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  message: {
    fontSize: 16,
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  tierBadge: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
  },
  tierBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tierIcon: {
    marginRight: 8,
  },
  tierText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentTier: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
  },
  trialButton: {
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  trialGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 30,
  },
  trialText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  upgradeButton: {
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 30,
  },
  upgradeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default PremiumFeature;
