// src/screens/onboarding/OnboardingSecondScreen.tsx
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import OnboardingHeader from '../../components/onboarding/OnboardingHeader';
import OnboardingButton from '../../components/onboarding/OnboardingButton';
import { useOnboardingStore } from '../../stores/onboarding.store';
import { theme } from '../../styles/theme';
import {
  ONBOARDING_COLORS,
  ONBOARDING_TYPOGRAPHY,
  ONBOARDING_LAYOUT,
} from '../../constants/onboarding.constants';

type RootStackParamList = {
  Onboarding2: undefined;
  Onboarding3: undefined;
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding2'
>;

export default function OnboardingSecondScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t, i18n } = useTranslation();
  const storedBirthDate = useOnboardingStore((state) => state.data.birthDate);
  const setBirthDateInStore = useOnboardingStore((state) => state.setBirthDate);

  // Инициализация Date объекта из стора или дефолтная дата (20 лет назад)
  const initialDate = useMemo(() => {
    if (storedBirthDate) {
      return new Date(
        storedBirthDate.year,
        storedBirthDate.month - 1,
        storedBirthDate.day
      );
    }
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() - 20);
    return defaultDate;
  }, [storedBirthDate]);

  const [date, setDate] = useState<Date>(initialDate);

  // Синхронизация с initialDate при изменении
  useEffect(() => {
    setDate(initialDate);
  }, [initialDate]);

  // Форматирование даты с учетом локали для отображения
  const formatDate = useCallback(
    (dateToFormat: Date): string => {
      const day = dateToFormat.getDate().toString().padStart(2, '0');
      const month = (dateToFormat.getMonth() + 1).toString().padStart(2, '0');
      const year = dateToFormat.getFullYear();

      // Для en используем MM.DD.YYYY, для остальных DD.MM.YYYY
      if (i18n.language === 'en') {
        return `${month}.${day}.${year}`;
      }
      return `${day}.${month}.${year}`;
    },
    [i18n.language]
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setDate(selectedDate);
    }
  }, []);

  const handleNext = useCallback(() => {
    setBirthDateInStore({
      day: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    });
    navigation.navigate('Onboarding3');
  }, [date, setBirthDateInStore, navigation]);

  return (
    <OnboardingLayout>
      <View style={styles.container}>
        <OnboardingHeader title={t('onboarding.second.header')} onBack={handleBack} showStep />

        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            {t('onboarding.second.description')}
          </Text>
        </View>

        <View style={styles.contentContainer}>
          {/* Большая кнопка с выбранной датой */}
          <View style={styles.dateDisplayContainer}>
            <View style={styles.dateDisplay}>
              <Text style={styles.dateDisplayText}>{formatDate(date)}</Text>
            </View>
          </View>

          {/* Inline DateTimePicker */}
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
              onChange={handleDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1920, 0, 1)}
              textColor={ONBOARDING_COLORS.white}
              themeVariant="dark"
              style={styles.picker}
            />
          </View>
        </View>

        <OnboardingButton title={t('onboarding.button.next')} onPress={handleNext} />
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  descriptionContainer: {
    paddingHorizontal: ONBOARDING_LAYOUT.horizontalPadding,
    marginTop: theme.spacing.xxxl * 1.875, // 60px (32 * 1.875)
    marginBottom: theme.spacing.xxxl * 1.25, // 40px (32 * 1.25)
  },
  description: {
    color: ONBOARDING_COLORS.textDim70,
    ...ONBOARDING_TYPOGRAPHY.h2,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplayContainer: {
    marginTop: theme.spacing.lg, // 20px
    marginBottom: theme.spacing.xl, // 24px
  },
  dateDisplay: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: theme.spacing.lg, // 20px
    paddingVertical: theme.spacing.lg, // 20px
    paddingHorizontal: theme.spacing.xxxl * 1.5, // 48px
    minWidth: 260,
    alignItems: 'center',
  },
  dateDisplayText: {
    color: ONBOARDING_COLORS.white,
    fontSize: theme.fontSizes.xxxl, // 28px
    fontWeight: '600',
    letterSpacing: 1,
  },
  pickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  picker: {
    width: 320,
    height: 200,
  },
});
