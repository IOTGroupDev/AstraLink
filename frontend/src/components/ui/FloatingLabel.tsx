import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '../../theme/tokens';

interface FloatingLabelProps {
  label: string;
  required?: boolean;
  error?: boolean;
  progress: Animated.SharedValue<number>; // 0 - placeholder over input, 1 - floated label
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  floatedTop?: number; // custom translateY for floated position (default -20)
}

/**
 * Generic floating label to unify label animation for inputs and pickers
 * Use: pass shared progress (0..1). When value present or focused - set to 1, otherwise 0.
 */
const FloatingLabel: React.FC<FloatingLabelProps> = ({
  label,
  required = false,
  error = false,
  progress,
  containerStyle,
  labelStyle,
  floatedTop = -20,
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, floatedTop]) },
      { scale: interpolate(progress.value, [0, 1], [1, 0.8]) },
    ],
    color: error
      ? colors.danger
      : (interpolate(progress.value, [0, 1], [0, 1]) as unknown as number), // interpolation to pick color below
  }));

  // We can't interpolate strings in RN directly; we keep color switch via two layers
  // Use two stacked Text nodes with opposing opacity to mimic color interpolation
  const baseOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0]),
  }));
  const activeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  return (
    <View style={[styles.container, containerStyle]} pointerEvents="none">
      {/* Base (placeholder) color */}
      <Animated.Text
        style={[
          styles.label,
          animatedStyle,
          baseOpacity,
          labelStyle,
          { color: 'rgba(255, 255, 255, 0.7)' },
        ]}
      >
        {label} {required && '*'}
      </Animated.Text>
      {/* Active (floated) color */}
      <Animated.Text
        style={[
          styles.label,
          animatedStyle,
          activeOpacity,
          labelStyle,
          { color: 'rgba(139, 92, 246, 0.9)' },
        ]}
      >
        {label} {required && '*'}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 5,
    top: 20,
    zIndex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default FloatingLabel;
