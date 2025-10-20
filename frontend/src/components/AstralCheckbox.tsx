// components/AstralCheckbox.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import CheckboxSvg from './assets/CheckboxSvg';

interface AstralCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  animationValue: Animated.SharedValue<number>;
  disabled?: boolean;
}

const AstralCheckbox: React.FC<AstralCheckboxProps> = ({
  checked,
  onToggle,
  label,
  animationValue,
  disabled = false,
}) => {
  const scaleAnimation = useSharedValue(1);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(animationValue.value, [0, 1], [0.8, 1]) },
      { translateY: interpolate(animationValue.value, [0, 1], [50, 0]) },
    ],
    opacity: interpolate(animationValue.value, [0, 1], [0, 1]),
  }));

  const animatedCheckboxStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnimation.value }],
  }));

  const handlePress = () => {
    if (disabled) return;

    scaleAnimation.value = withTiming(0.9, { duration: 100 }, () => {
      scaleAnimation.value = withTiming(1, { duration: 100 });
    });

    onToggle();
  };

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      <TouchableOpacity
        style={[styles.checkboxContainer, disabled && styles.disabled]}
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Animated.View style={animatedCheckboxStyle}>
          <CheckboxSvg
            checked={checked}
            color={disabled ? 'rgba(255, 255, 255, 0.3)' : '#FFFFFF'}
          />
        </Animated.View>
        <Text style={[styles.label, disabled && styles.disabledText]}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  label: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 20,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 19,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
});

export default AstralCheckbox;
