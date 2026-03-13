// src/components/onboarding/OnboardingButton.tsx
import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FRAME,
  ONBOARDING_COLORS,
  ONBOARDING_TYPOGRAPHY,
  ONBOARDING_LAYOUT,
} from '../../constants/onboarding.constants';

interface OnboardingButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  isFixed?: boolean;
  variant?: 'primary' | 'secondary';
  uppercase?: boolean;
}

const S = FRAME.SCALE;

export default function OnboardingButton({
  title,
  onPress,
  disabled,
  isFixed = true,
  variant = 'primary',
  uppercase = true,
}: OnboardingButtonProps) {
  const insets = useSafeAreaInsets();
  const isSecondary = variant === 'secondary';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        isSecondary && styles.buttonSecondary,
        isFixed && styles.buttonFixed,
        isFixed && {
          bottom: ONBOARDING_LAYOUT.buttonBottomOffset * S + insets.bottom,
        },
        {
          height: ONBOARDING_LAYOUT.buttonHeight * S,
          borderRadius: ONBOARDING_LAYOUT.buttonBorderRadius * S,
          opacity: disabled ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          isSecondary && styles.buttonTextSecondary,
          !uppercase && styles.buttonTextNormalCase,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: ONBOARDING_COLORS.btnBg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ONBOARDING_LAYOUT.horizontalPadding * S,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: ONBOARDING_COLORS.pillBorder,
  },
  buttonFixed: {
    position: 'absolute',
    left: ONBOARDING_LAYOUT.horizontalPadding * S,
    right: ONBOARDING_LAYOUT.horizontalPadding * S,
  },
  buttonText: {
    color: ONBOARDING_COLORS.btnText,
    textTransform: 'uppercase',
    ...ONBOARDING_TYPOGRAPHY.cta,
  },
  buttonTextSecondary: {
    color: ONBOARDING_COLORS.white,
  },
  buttonTextNormalCase: {
    textTransform: 'none',
  },
});
