import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface AstralInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  icon?: keyof typeof Ionicons.glyphMap;
  required?: boolean;
  animationValue: Animated.SharedValue<number>;
  error?: boolean;
  errorMessage?: string;
}

const AstralInput: React.FC<AstralInputProps> = ({
  placeholder,
  value,
  onChangeText,
  onFocus,
  onBlur,
  secureTextEntry = false,
  keyboardType = 'default',
  icon,
  required = false,
  animationValue,
  error = false,
  errorMessage,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnimation = useSharedValue(0);
  const glowAnimation = useSharedValue(0);

  useEffect(() => {
    if (isFocused || value) {
      focusAnimation.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.quad),
      });
      if (isFocused) {
        glowAnimation.value = withRepeat(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          -1,
          true
        );
      }
    } else {
      focusAnimation.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.quad),
      });
      glowAnimation.value = withTiming(0, { duration: 200 });
    }
  }, [isFocused, value]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(animationValue.value, [0, 1], [0.8, 1]) },
      { translateY: interpolate(animationValue.value, [0, 1], [50, 0]) },
    ],
    opacity: interpolate(animationValue.value, [0, 1], [0, 1]),
  }));

  const animatedInputStyle = useAnimatedStyle(() => {
    if (error) {
      return {
        borderColor: '#FF4444',
        borderWidth: 2,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowColor: '#FF4444',
      };
    }
    return {
      borderColor: interpolate(
        focusAnimation.value,
        [0, 1],
        ['rgba(139, 92, 246, 0.3)', 'rgba(139, 92, 246, 0.8)']
      ),
      borderWidth: interpolate(focusAnimation.value, [0, 1], [1, 1.5]),
      shadowOpacity: interpolate(glowAnimation.value, [0, 1], [0.1, 0.3]),
      shadowRadius: interpolate(glowAnimation.value, [0, 1], [3, 8]),
      shadowColor: '#8B5CF6',
    };
  });

  const animatedLabelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(focusAnimation.value, [0, 1], [0, -20]) },
      { scale: interpolate(focusAnimation.value, [0, 1], [1, 0.8]) },
    ],
    color: error
      ? '#FF4444'
      : interpolate(
          focusAnimation.value,
          [0, 1],
          ['rgba(255, 255, 255, 0.7)', 'rgba(139, 92, 246, 0.9)']
        ),
  }));

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      <Animated.View style={[styles.inputContainer, animatedInputStyle]}>
        {icon && (
          <View style={styles.iconContainer}>
            <Ionicons
              name={icon}
              size={20}
              color={
                error
                  ? '#FF4444'
                  : isFocused
                    ? 'rgba(139, 92, 246, 0.8)'
                    : 'rgba(255, 255, 255, 0.6)'
              }
            />
          </View>
        )}

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            placeholderTextColor="transparent"
            autoCapitalize="none"
          />

          <Animated.Text style={[styles.label, animatedLabelStyle]}>
            {placeholder} {required && '*'}
          </Animated.Text>
        </View>
      </Animated.View>

      {error && errorMessage && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    minHeight: 80,
    paddingHorizontal: 15,
  },
  iconContainer: {
    paddingLeft: 15,
    paddingRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    paddingVertical: 20,
    paddingLeft: 5,
    paddingRight: 15,
    position: 'relative',
  },
  label: {
    position: 'absolute',
    top: 20,
    left: 5,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  input: {
    fontSize: 16,
    color: '#fff',
    paddingTop: 8,
    paddingBottom: 5,
    minHeight: 30,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    marginTop: 5,
    marginLeft: 15,
    textShadowColor: 'rgba(255, 68, 68, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
});

export default AstralInput;
