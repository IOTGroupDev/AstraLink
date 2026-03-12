// src/screens/onboarding/OnboardingFirstScreen.tsx
import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../components/onboarding/OnboardingButton';
import OnboardingFirstBackgroundSvg from '../../components/onboarding/OnboardingFirstBackgroundSvg';
import OnboardingBadge from '../../components/onboarding/OnboardingBadge';
import { theme } from '../../styles';
import {
  ONBOARDING_COLORS,
  ONBOARDING_TYPOGRAPHY,
  ONBOARDING_LAYOUT,
} from '../../constants/onboarding.constants';

type RootStackParamList = {
  Onboarding1: undefined;
  Onboarding2: undefined;
  AuthEmail: undefined;
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding1'
>;

export default function OnboardingFirstScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const handleRegister = useCallback(() => {
    navigation.navigate('Onboarding2');
  }, [navigation]);

  const handleLogin = useCallback(() => {
    navigation.navigate('AuthEmail');
  }, [navigation]);

  return (
    <OnboardingLayout>
      <View style={styles.container}>
        <View style={styles.illustrationContainer}>
          <OnboardingFirstBackgroundSvg />

          {/* App name centered below the star */}
          <Text style={styles.appName}>AstraLink</Text>

          {/* Badges positioned absolutely as per original design */}
          <OnboardingBadge
            text={t('onboarding.first.badges.astrology')}
            style={styles.badgeLeft}
          />
          <OnboardingBadge
            text={t('onboarding.first.badges.constellation')}
            style={styles.badgeRight}
          />
          <OnboardingBadge
            text={t('onboarding.first.badges.partner')}
            style={styles.badgeBottom}
          />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>{t('onboarding.first.title')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.first.subtitle')}</Text>
        </View>

        <View
          style={[
            styles.actionsContainer,
            { bottom: ONBOARDING_LAYOUT.buttonBottomOffset + insets.bottom },
          ]}
        >
          <OnboardingButton
            title={t('onboarding.button.register')}
            onPress={handleRegister}
            isFixed={false}
            uppercase={true}
          />
          <OnboardingButton
            title={t('onboarding.button.login')}
            onPress={handleLogin}
            isFixed={false}
            variant="secondary"
            uppercase={true}
          />
        </View>
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
    marginBottom: theme.spacing.xxxl * 6.25, // 200px (32 * 6.25)
    gap: theme.spacing.md, // 12px instead of 10
  },
  actionsContainer: {
    position: 'absolute',
    left: ONBOARDING_LAYOUT.horizontalPadding,
    right: ONBOARDING_LAYOUT.horizontalPadding,
    gap: theme.spacing.sm,
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
  // App name centered below the star
  appName: {
    position: 'absolute',
    fontSize: 28,
    fontWeight: '700',
    color: ONBOARDING_COLORS.white,
    letterSpacing: 1.25,
    bottom: 180,
  },
  // Badge positioning as per original SVG design (viewBox 430x834)
  badgeLeft: {
    position: 'absolute',
    left: 37,
    top: -40,
  },
  badgeRight: {
    position: 'absolute',
    right: 24,
    top: 50,
  },
  badgeBottom: {
    position: 'absolute',
    left: 63,
    bottom: 100,
  },
});
