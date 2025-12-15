// src/screens/onboarding/OnboardingSecondScreen.tsx
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import OnboardingHeader from '../../components/onboarding/OnboardingHeader';
import OnboardingButton from '../../components/onboarding/OnboardingButton';
import { DatePicker } from '@quidone/react-native-wheel-picker';
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

// ====== helpers: struct <-> ISO ======
function structToIso({
  day,
  month,
  year,
}: {
  day: number;
  month: number;
  year: number;
}): string {
  const d = String(day).padStart(2, '0');
  const m = String(month).padStart(2, '0');
  const y = String(year);
  return `${y}-${m}-${d}`;
}

function isoToStruct(iso: string): {
  day: number;
  month: number;
  year: number;
} {
  const [y, m, d] = iso.split('-').map(Number);
  return { day: d, month: m, year: y };
}

export default function OnboardingSecondScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t, i18n } = useTranslation();
  const storedBirthDate = useOnboardingStore((state) => state.data.birthDate);
  const setBirthDateInStore = useOnboardingStore((state) => state.setBirthDate);

  // Инициализация строки для DatePicker из стора (или текущей даты)
  const initialDateStr = useMemo(() => {
    if (storedBirthDate) return structToIso(storedBirthDate);
    const now = new Date();
    return structToIso({
      day: now.getDate(),
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    });
  }, [storedBirthDate]);

  // ЕДИНЫЙ источник правды — только ISO-строка
  const [dateStr, setDateStr] = useState<string>(initialDateStr);

  // Если стор обновится извне (маловероятно на онбординге), синхронизируем
  useEffect(() => {
    setDateStr(initialDateStr);
  }, [initialDateStr]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleNext = useCallback(() => {
    // Конвертация только здесь — перед сохранением
    setBirthDateInStore(isoToStruct(dateStr));
    navigation.navigate('Onboarding3');
  }, [dateStr, setBirthDateInStore, navigation]);

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
          <DatePicker
            date={dateStr} // формат YYYY-MM-DD
            onDateChanged={({ date }) => setDateStr(date)}
            itemTextStyle={styles.itemText}
            overlayItemStyle={styles.overlayItem}
            contentContainerStyle={styles.content}
            itemHeight={40}
            visibleItemCount={5}
            locale={i18n.language}
          />
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
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
    marginTop: theme.spacing.xxxl * 3.125, // 100px (32 * 3.125)
  },
  itemText: {
    color: ONBOARDING_COLORS.white,
    fontSize: theme.fontSizes.xxl, // 24px
  },
  overlayItem: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    paddingHorizontal: theme.spacing.md, // 12px (close to 10)
  },
});
