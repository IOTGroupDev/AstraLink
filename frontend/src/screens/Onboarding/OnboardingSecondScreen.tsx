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
  const [showPicker, setShowPicker] = useState(Platform.OS === 'android');

  // Синхронизация с initialDate при изменении
  useEffect(() => {
    setDate(initialDate);
  }, [initialDate]);

  // На Android показываем picker автоматически при входе на экран
  useEffect(() => {
    if (Platform.OS === 'android') {
      setShowPicker(true);
    }
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'dismissed') {
        // Если пользователь закрыл picker на Android, открываем снова
        setTimeout(() => setShowPicker(true), 100);
        return;
      }
    }

    if (selectedDate) {
      setDate(selectedDate);

      // На Android переотображаем picker после выбора
      if (Platform.OS === 'android') {
        setTimeout(() => setShowPicker(true), 100);
      }
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

        <View style={styles.pickerContainer}>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={date}
              mode="date"
              display="inline"
              onChange={handleDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1920, 0, 1)}
              textColor={ONBOARDING_COLORS.white}
              themeVariant="dark"
              style={styles.picker}
            />
          ) : (
            showPicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1920, 0, 1)}
              />
            )
          )}
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
  pickerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xxxl * 1.25, // 40px (32 * 1.25)
    marginBottom: theme.spacing.xxxl, // 32px
  },
  picker: {
    width: '100%',
    height: 200,
  },
});
