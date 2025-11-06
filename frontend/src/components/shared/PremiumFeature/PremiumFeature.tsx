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

import { useSubscription } from '../../../hooks/useSubscription';
import {
  SubscriptionTier,
  getTierName,
  getTierColors,
  UPGRADE_SUGGESTIONS,
  FEATURE_REQUIREMENTS,
} from '../../../types';

const { width } = Dimensions.get('window');

interface PremiumFeatureProps {
  /** Ключ функции из FEATURE_REQUIREMENTS */
  feature: keyof typeof FEATURE_REQUIREMENTS;

  /** Контент, который будет показан при наличии доступа (опционально) */
  children?: React.ReactNode;

  /** Кастомное сообщение (опционально) */
  customMessage?: string;

  /** Кастомный заголовок (опционально) */
  customTitle?: string;

  /** Показать ли кнопку Trial (если доступен) */
  showTrialButton?: boolean;

  /** Callback при нажатии на upgrade */
  onUpgradePress?: () => void;

  /**
   * Режим отображения без доступа:
   * - 'hide': скрывает контент полностью, показывает upgrade prompt
   * - 'lock': показывает контент с overlay и замком поверх него
   */
  lockMode?: 'hide' | 'lock';

  /** Компактный режим блокировки (для lockMode='lock') */
  compactLock?: boolean;
}

/**
 * Компонент-обертка для премиум функций
 * Автоматически показывает upgrade prompt, если нет доступа
 */
const PremiumFeature: React.FC<PremiumFeatureProps> = ({
  feature,
  children,
  customMessage,
  customTitle = 'Premium',
  showTrialButton = true,
  onUpgradePress,
  lockMode = 'hide',
  compactLock = false,
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
    return children ? <>{children}</> : null;
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

  // Режим LOCK - показываем контент с overlay
  if (lockMode === 'lock' && children) {
    return (
      <View style={styles.lockContainer}>
        {/* Затемнённый контент */}
        <View style={styles.lockedContent}>{children}</View>

        {/* Overlay с замком */}
        <TouchableOpacity
          style={styles.lockOverlay}
          onPress={handleUpgrade}
          activeOpacity={0.95}
        >
          <Animated.View
            style={[StyleSheet.absoluteFillObject, animatedGlowStyle]}
          >
            <LinearGradient
              colors={[
                requiredTierColors[0],
                requiredTierColors[1],
                'transparent',
              ]}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>

          <LinearGradient
            colors={['rgba(0, 0, 0, 0.85)', 'rgba(0, 0, 0, 0.75)']}
            style={styles.lockOverlayGradient}
          >
            {compactLock ? (
              // Компактный режим - только иконка
              <View style={styles.compactLockContent}>
                <View style={styles.compactIconContainer}>
                  <LinearGradient
                    colors={[requiredTierColors[0], requiredTierColors[1]]}
                    style={styles.compactIconGradient}
                  >
                    <Ionicons name="lock-closed" size={24} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={styles.compactLockText}>Premium</Text>
              </View>
            ) : (
              // Полный режим - с кнопками
              <View style={styles.fullLockContent}>
                <View style={styles.lockIconContainer}>
                  <LinearGradient
                    colors={[requiredTierColors[0], requiredTierColors[1]]}
                    style={styles.lockIconGradient}
                  >
                    <Ionicons name="lock-closed" size={32} color="#fff" />
                  </LinearGradient>
                </View>

                <Text style={styles.lockTitle}>
                  {customTitle || suggestion?.featureName || 'Премиум функция'}
                </Text>

                {requiredTier && (
                  <View style={styles.lockTierBadge}>
                    <LinearGradient
                      colors={[requiredTierColors[0], requiredTierColors[1]]}
                      style={styles.tierBadgeGradient}
                    >
                      <Ionicons
                        name={(suggestion?.icon as any) || 'star'}
                        size={14}
                        color="#fff"
                        style={styles.tierIcon}
                      />
                      <Text style={styles.tierText}>
                        {getTierName(requiredTier)}
                      </Text>
                    </LinearGradient>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.lockUpgradeButton}
                  onPress={handleUpgrade}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[requiredTierColors[0], requiredTierColors[1]]}
                    style={styles.lockUpgradeGradient}
                  >
                    <Ionicons name="arrow-up" size={18} color="#fff" />
                    <Text style={styles.lockUpgradeText}>Разблокировать</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  // Режим HIDE - показываем полный upgrade prompt
  return (
    <Animated.View style={[styles.container, animatedScaleStyle]}>
      {/* Background Glow */}
      <Animated.View style={[styles.backgroundGlow, animatedGlowStyle]}>
        <LinearGradient
          colors={[requiredTierColors[0], requiredTierColors[1], 'transparent']}
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
            colors={[requiredTierColors[0], requiredTierColors[1]]}
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
              colors={[requiredTierColors[0], requiredTierColors[1]]}
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
            colors={[requiredTierColors[0], requiredTierColors[1]]}
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
  // Стили для режима LOCK
  lockContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  lockedContent: {
    opacity: 0.3,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    overflow: 'hidden',
  },
  lockOverlayGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  // Компактный режим
  compactLockContent: {
    alignItems: 'center',
    gap: 8,
  },
  compactIconContainer: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  compactIconGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactLockText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Полный режим блокировки
  fullLockContent: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  lockIconContainer: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
  },
  lockIconGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  lockTierBadge: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  lockUpgradeButton: {
    width: '80%',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  lockUpgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
  },
  lockUpgradeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default PremiumFeature;
