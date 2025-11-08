// src/screens/onboarding/OnboardingSecondScreen.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import OnboardingHeader from '../../components/onboarding/OnboardingHeader';
import OnboardingButton from '../../components/onboarding/OnboardingButton';
import { DatePicker } from '@quidone/react-native-wheel-picker';
import { useOnboardingStore } from '../../stores/onboarding.store';
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

  const handleBack = () => navigation.goBack();

  const handleNext = () => {
    // Конвертация только здесь — перед сохранением
    setBirthDateInStore(isoToStruct(dateStr));
    navigation.navigate('Onboarding3');
  };

  return (
    <OnboardingLayout>
      <View style={styles.container}>
        <OnboardingHeader title="Дата рождения" onBack={handleBack} showStep />

        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            Введите дату рождения — узнаем, кто вы по гороскопу!
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
            locale="ru"
          />
        </View>

        <OnboardingButton title="ДАЛЕЕ" onPress={handleNext} />
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  descriptionContainer: {
    paddingHorizontal: ONBOARDING_LAYOUT.horizontalPadding,
    marginTop: 60,
    marginBottom: 40,
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
    marginTop: 100,
  },
  itemText: {
    color: ONBOARDING_COLORS.white,
    fontSize: 24,
  },
  overlayItem: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    paddingHorizontal: 10,
  },
});
