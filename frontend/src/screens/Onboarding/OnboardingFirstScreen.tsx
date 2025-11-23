// src/screens/onboarding/OnboardingFirstScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import OnboardingButton from '../../components/onboarding/OnboardingButton';
import OnboardingFirstMainSvg from '../../components/onboarding/OnboardingFirstMainSvg';
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

  const handleContinue = () => {
    navigation.navigate('Onboarding2');
  };

  return (
    <OnboardingLayout>
      <View style={styles.container}>
        <View style={styles.illustrationContainer}>
          <OnboardingFirstMainSvg />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>Ваш космос —{'\n'}в одном касании</Text>
          <Text style={styles.subtitle}>
            Анализ натальной карты, советы звёзд и астрологические знакомства —
            всё, чтобы лучше понять себя и мир вокруг.
          </Text>
        </View>

        <OnboardingButton title="ДАЛЕЕ" onPress={handleContinue} />
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
    marginTop: 160,
  },
  contentContainer: {
    paddingHorizontal: ONBOARDING_LAYOUT.horizontalPadding,
    marginBottom: 140,
    gap: 10,
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
