// src/screens/onboarding/OnboardingThirdScreen.tsx
import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import OnboardingHeader from '../../components/onboarding/OnboardingHeader';
import OnboardingButton from '../../components/onboarding/OnboardingButton';
import { ZodiacConstellationSvg } from '../../components/svg/zodiac/zodiacSvgMap';
import { useOnboardingStore } from '../../stores/onboarding.store';
import { useZodiac } from '../../hooks/useZodiac';
import { theme } from '../../styles/theme';
import {
  ONBOARDING_COLORS,
  ONBOARDING_TYPOGRAPHY,
  ONBOARDING_LAYOUT,
  FRAME,
} from '../../constants/onboarding.constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type RootStackParamList = {
  Onboarding3: undefined;
  Onboarding4: undefined;
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding3'
>;

export default function OnboardingThirdScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const birthDate = useOnboardingStore((s) => s.data.birthDate);
  const day = birthDate?.day ?? 1;
  const month = birthDate?.month ?? 1;
  const { zodiacSign } = useZodiac(day, month);

  // Локализованный диапазон дат
  const localizedDateRange = useMemo(() => {
    const startDay = String(zodiacSign.startDate.day).padStart(2, '0');
    const endDay = String(zodiacSign.endDate.day).padStart(2, '0');
    const startMonth = t(`zodiac.months.${zodiacSign.startDate.month}`);
    const endMonth = t(`zodiac.months.${zodiacSign.endDate.month}`);
    return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
  }, [zodiacSign, t]);

  // Локализованное описание
  const localizedDescription = t(`zodiac.descriptions.${zodiacSign.key}`);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleNext = useCallback(() => {
    navigation.navigate('Onboarding4');
  }, [navigation]);

  return (
    <OnboardingLayout>
      <View style={styles.container}>
        <OnboardingHeader
          title={t('onboarding.third.header')}
          onBack={handleBack}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.constellationContainer}>
            <ZodiacConstellationSvg
              signKey={zodiacSign.key}
              width={SCREEN_WIDTH}
              height={SCREEN_WIDTH}
              opacity={0.95}
            />
          </View>

          <View style={styles.pillsRow}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {t(`zodiac.signs.${zodiacSign.key}`)}
              </Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{localizedDateRange}</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {t(`zodiac.elements.${zodiacSign.element}`)}
              </Text>
            </View>
          </View>

          <View style={styles.descriptionBlock}>
            <Text style={styles.descriptionText}>{localizedDescription}</Text>
            <Text
              style={[styles.descriptionText, styles.additionalDescription]}
            >
              {t('onboarding.third.description')}
            </Text>
          </View>
        </ScrollView>

        <OnboardingButton
          title={t('onboarding.button.next')}
          onPress={handleNext}
        />
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxxl * 4.375, // 140px (32 * 4.375)
  },
  constellationContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    marginTop: 0,
    marginBottom: theme.spacing.md, // 12px
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm, // 10px (близко к 8px)
    marginBottom: theme.spacing.xl * 1.25, // 30px (24 * 1.25)
    paddingHorizontal: ONBOARDING_LAYOUT.horizontalPadding,
  },
  pill: {
    paddingHorizontal: theme.spacing.lg - 2, // 18px (20 - 2)
    paddingVertical: theme.spacing.sm, // 10px (близко к 8px)
    borderRadius: theme.spacing.xl, // 24px
    borderWidth: 1,
    borderColor: ONBOARDING_COLORS.pillBorder,
    backgroundColor: ONBOARDING_COLORS.pillBg,
  },
  pillText: {
    color: ONBOARDING_COLORS.text,
    fontSize: theme.fontSizes.sm, // 12px
    fontFamily: 'Montserrat_500Medium',
    letterSpacing: 0.5,
  },
  descriptionBlock: {
    marginBottom: theme.spacing.lg, // 20px
    paddingHorizontal: ONBOARDING_LAYOUT.horizontalPadding,
  },
  descriptionText: {
    color: ONBOARDING_COLORS.text,
    opacity: 0.9,
    ...ONBOARDING_TYPOGRAPHY.body,
    textAlign: 'left',
  },
  additionalDescription: {
    marginTop: theme.spacing.md, // 12px
  },
});
