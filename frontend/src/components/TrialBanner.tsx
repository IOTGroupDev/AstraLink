// frontend/src/components/TrialBanner.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSubscription } from '../hooks/useSubscription';
import { TRIAL_CONFIG } from '../types/subscription';

const { width } = Dimensions.get('window');

interface TrialBannerProps {
  /** Показывать ли баннер (по умолчанию true) */
  show?: boolean;
  /** Позиция баннера */
  position?: 'top' | 'bottom';
  /** Callback при закрытии */
  onDismiss?: () => void;
  /** Показать компактную версию */
  compact?: boolean;
}

const STORAGE_KEY = 'trial_banner_dismissed_count';
const MAX_DISMISSALS = 3; // Максимум 3 закрытия, потом баннер не показывается

/**
 * Умный баннер для активации Trial
 * - Автоматически скрывается если Trial уже активирован
 * - Запоминает количество закрытий
 * - Показывает персонализированные сообщения
 */
const TrialBanner: React.FC<TrialBannerProps> = ({
  show = true,
  position = 'bottom',
  onDismiss,
  compact = false,
}) => {
  const navigation = useNavigation();
  const { isTrialAvailable, isTrial, activateTrial, isActivatingTrial, tier } =
    useSubscription();

  const [isDismissed, setIsDismissed] = useState(false);
  const [dismissCount, setDismissCount] = useState(0);

  // Анимации
  const glowAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(1);

  useEffect(() => {
    loadDismissCount();
    startGlowAnimation();
  }, []);

  const loadDismissCount = async () => {
    try {
      const count = await AsyncStorage.getItem(STORAGE_KEY);
      if (count) {
        setDismissCount(parseInt(count, 10));
      }
    } catch (error) {
      console.error('Error loading dismiss count:', error);
    }
  };

  const startGlowAnimation = () => {
    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0.4, { duration: 2000 })
      ),
      -1,
      true
    );
  };

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

  // Обработчик закрытия баннера
  const handleDismiss = async () => {
    const newCount = dismissCount + 1;
    setDismissCount(newCount);
    setIsDismissed(true);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, newCount.toString());
    } catch (error) {
      console.error('Error saving dismiss count:', error);
    }

    if (onDismiss) {
      onDismiss();
    }
  };

  // Обработчик активации Trial
  const handleActivateTrial = async () => {
    Alert.alert(
      '🎁 Активировать Trial?',
      `${TRIAL_CONFIG.duration} дней Premium подписки бесплатно. Без автоматического продления.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Активировать',
          onPress: async () => {
            const result = await activateTrial();
            if (result.success) {
              Alert.alert(
                '✨ Trial активирован!',
                `Наслаждайтесь всеми функциями Premium ${TRIAL_CONFIG.duration} дней бесплатно`,
                [{ text: 'Отлично!' }]
              );
            } else {
              Alert.alert('Ошибка', 'Не удалось активировать Trial');
            }
          },
        },
      ]
    );
  };

  // Обработчик перехода на экран подписок
  const handleLearnMore = () => {
    navigation.navigate('Subscription' as never);
  };

  // Не показываем баннер если:
  // - show = false
  // - Trial не доступен
  // - Trial уже активен
  // - Баннер был закрыт MAX_DISMISSALS раз
  // - Баннер закрыт в текущей сессии
  if (
    !show ||
    !isTrialAvailable() ||
    isTrial ||
    dismissCount >= MAX_DISMISSALS ||
    isDismissed
  ) {
    return null;
  }

  // Персонализированные сообщения в зависимости от количества закрытий
  const getMessage = () => {
    if (dismissCount === 0) {
      return {
        title: '🎁 Попробуйте Premium бесплатно!',
        description: `${TRIAL_CONFIG.duration} дней полного доступа без оплаты`,
      };
    } else if (dismissCount === 1) {
      return {
        title: '✨ Не упустите возможность!',
        description: 'AI-гороскопы, полная карта и многое другое',
      };
    } else {
      return {
        title: '🌟 Последнее напоминание',
        description: 'Откройте все функции AstraLink',
      };
    }
  };

  const message = getMessage();

  if (compact) {
    return (
      <Animated.View
        entering={FadeIn.delay(500)}
        style={[styles.compactContainer, animatedScaleStyle]}
      >
        <TouchableOpacity onPress={handleActivateTrial} activeOpacity={0.8}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.compactGradient}
          >
            <Ionicons name="gift" size={20} color="#fff" />
            <Text style={styles.compactText}>
              {isActivatingTrial ? 'Активация...' : 'Trial 7 дней'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={position === 'top' ? SlideInDown.delay(500) : FadeIn.delay(500)}
      style={[
        styles.container,
        position === 'top' ? styles.positionTop : styles.positionBottom,
        animatedScaleStyle,
      ]}
    >
      {/* Background Glow */}
      <Animated.View style={[styles.backgroundGlow, animatedGlowStyle]}>
        <LinearGradient
          colors={['#10B981', '#059669', 'transparent']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Content */}
      <LinearGradient
        colors={['#10B981', '#059669', '#047857']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
          <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.8)" />
        </TouchableOpacity>

        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="gift" size={32} color="#fff" />
        </View>

        {/* Text */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{message.title}</Text>
          <Text style={styles.description}>{message.description}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.learnMoreButton}
            onPress={handleLearnMore}
          >
            <Text style={styles.learnMoreText}>Подробнее</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.activateButton}
            onPress={handleActivateTrial}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isActivatingTrial}
            activeOpacity={0.8}
          >
            <View style={styles.activateButtonContent}>
              <Text style={styles.activateText}>
                {isActivatingTrial ? 'Активация...' : 'Активировать'}
              </Text>
              {!isActivatingTrial && (
                <Ionicons name="arrow-forward" size={18} color="#10B981" />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 100,
  },
  positionTop: {
    top: 60,
  },
  positionBottom: {
    bottom: 90, // Над tab bar
  },
  backgroundGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 25,
  },
  gradient: {
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    marginBottom: 12,
  },
  textContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  learnMoreButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  learnMoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  activateButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activateText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 6,
  },
  // Compact version
  compactContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 10,
  },
  compactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  compactText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default TrialBanner;
