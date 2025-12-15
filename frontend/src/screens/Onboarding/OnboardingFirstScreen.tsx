// src/screens/onboarding/OnboardingFirstScreen.tsx
import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../components/onboarding/OnboardingButton';
import OnboardingFirstBackgroundSvg from '../../components/onboarding/OnboardingFirstBackgroundSvg';
import { theme } from '../../styles/theme';
import {
  ONBOARDING_COLORS,
  ONBOARDING_TYPOGRAPHY,
  ONBOARDING_LAYOUT,
} from '../../constants/onboarding.constants';

type RootStackParamList = {
  Onboarding1: undefined;
  Onboarding2: undefined;
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding1'
>;

export default function OnboardingFirstScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();

  const handleContinue = useCallback(() => {
    navigation.navigate('Onboarding2');
  }, [navigation]);

  return (
    <OnboardingLayout>
      <View style={styles.container}>
        <View style={styles.illustrationContainer}>
          <OnboardingFirstBackgroundSvg />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>{t('onboarding.first.title')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.first.subtitle')}</Text>
        </View>

        <OnboardingButton title={t('onboarding.button.next')} onPress={handleContinue} />
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xxxl * 5, // 160px (32 * 5)
  },
  contentContainer: {
    paddingHorizontal: ONBOARDING_LAYOUT.horizontalPadding,
    marginBottom: theme.spacing.xxxl * 4.375, // 140px (32 * 4.375)
    gap: theme.spacing.md, // 12px instead of 10
  },
  title: {
    color: ONBOARDING_COLORS.text,
    ...ONBOARDING_TYPOGRAPHY.h1,
    textAlign: 'left',
  },
  subtitle: {
    color: ONBOARDING_COLORS.textDim,
    ...ONBOARDING_TYPOGRAPHY.body,
    textAlign: 'left',
  },
});
