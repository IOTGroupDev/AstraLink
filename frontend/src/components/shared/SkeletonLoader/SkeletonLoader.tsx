import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '@/styles/theme';

interface SkeletonLoaderProps {
  /**
   * Ширина скелетона
   */
  width?: number | string;
  /**
   * Высота скелетона
   */
  height?: number;
  /**
   * Border radius
   */
  borderRadius?: number;
  /**
   * Custom style
   */
  style?: ViewStyle;
  /**
   * Тип скелетона (определяет размер и стиль)
   */
  variant?: 'card' | 'text' | 'circle' | 'rect';
}

/**
 * SkeletonLoader - компонент для отображения загрузки
 * Использует lunar gradient как в LunarCalendarWidget
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 120,
  borderRadius = theme.borderRadius.large,
  style,
  variant = 'card',
}) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    // Пульсирующая анимация
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1, // Бесконечно
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Размеры в зависимости от variant
  const getSize = () => {
    switch (variant) {
      case 'circle':
        return { width: height, height, borderRadius: height / 2 };
      case 'text':
        return { width, height: 20, borderRadius: theme.borderRadius.small };
      case 'rect':
        return { width, height, borderRadius: theme.borderRadius.medium };
      case 'card':
      default:
        return { width, height, borderRadius };
    }
  };

  return (
    <Animated.View style={[styles.container, getSize(), style, animatedStyle]}>
      <LinearGradient
        colors={theme.gradients.skeleton}
        start={{ x: 0, y: 0.44 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
