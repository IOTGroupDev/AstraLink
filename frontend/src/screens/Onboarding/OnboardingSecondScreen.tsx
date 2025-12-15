// src/screens/onboarding/OnboardingSecondScreen.tsx
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
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
  const [showPicker, setShowPicker] = useState(false);

  // Синхронизация с initialDate при изменении
  useEffect(() => {
    setDate(initialDate);
  }, [initialDate]);

  // Форматирование даты с учетом локали
  const formatDate = useCallback(
    (dateToFormat: Date): string => {
      const locale = i18n.language === 'en' ? 'en-US' : i18n.language === 'es' ? 'es-ES' : 'ru-RU';
      return dateToFormat.toLocaleDateString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    },
    [i18n.language]
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    // На Android picker закрывается автоматически
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (selectedDate) {
      setDate(selectedDate);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (Platform.OS === 'ios') {
      setShowPicker(false);
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

        <View style={styles.dateDisplayContainer}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dateText}>{formatDate(date)}</Text>
          </TouchableOpacity>
        </View>

        {showPicker && (
          <>
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1920, 0, 1)}
              textColor={ONBOARDING_COLORS.white}
              themeVariant="dark"
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>{t('onboarding.button.confirm')}</Text>
              </TouchableOpacity>
            )}
          </>
        )}

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
  dateDisplayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xxxl * 3.125, // 100px (32 * 3.125)
    marginBottom: theme.spacing.xxxl, // 32px
  },
  dateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: theme.spacing.md, // 12px
    paddingVertical: theme.spacing.lg, // 20px
    paddingHorizontal: theme.spacing.xxxl, // 32px
    minWidth: 200,
    alignItems: 'center',
  },
  dateText: {
    color: ONBOARDING_COLORS.white,
    fontSize: theme.fontSizes.xxl, // 24px
    fontWeight: '600',
  },
  confirmButton: {
    alignSelf: 'center',
    backgroundColor: ONBOARDING_COLORS.primary,
    borderRadius: theme.spacing.md, // 12px
    paddingVertical: theme.spacing.md, // 12px
    paddingHorizontal: theme.spacing.xxxl, // 32px
    marginTop: theme.spacing.lg, // 20px
  },
  confirmButtonText: {
    color: ONBOARDING_COLORS.white,
    fontSize: theme.fontSizes.lg, // 18px
    fontWeight: '600',
  },
});
