import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import {
  ONBOARDING_COLORS,
  ONBOARDING_TYPOGRAPHY,
} from '../../constants/onboarding.constants';
import { theme } from '../../styles/theme';

interface OnboardingBadgeProps {
  text: string;
  style?: ViewStyle;
}

export const OnboardingBadge: React.FC<OnboardingBadgeProps> = ({
  text,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>{text.toUpperCase()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(11, 11, 11, 0.9)',
    borderRadius: 17,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    alignSelf: 'flex-start',
    // Subtle glow effect
    ...theme.shadows.medium,
    shadowColor: '#B194DA',
    shadowOpacity: 0.7,
  },
  text: {
    color: ONBOARDING_COLORS.white,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});

export default OnboardingBadge;
