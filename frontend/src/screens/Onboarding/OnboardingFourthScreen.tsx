// src/screens/onboarding/OnboardingFourthScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import OnboardingHeader from '../../components/onboarding/OnboardingHeader';
import OnboardingButton from '../../components/onboarding/OnboardingButton';
import AstralInput from '../../components/shared/AstralInput';
import AstralCityInput from '../../components/shared/AstralCityInput';
import AstralCheckbox from '../../components/shared/AstralCheckbox';
import AstralTimePicker from '../../components/shared/AstralTimePicker';

import { useOnboardingStore } from '../../stores/onboarding.store';
import {
  ONBOARDING_COLORS,
  ONBOARDING_TYPOGRAPHY,
  ONBOARDING_LAYOUT,
} from '../../constants/onboarding.constants';
import type { CityOption } from '../../services/api/geo.api';

type RootStackParamList = {
  Onboarding4: undefined;
  SignUp: undefined;
};
type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding4'
>;

export default function OnboardingFourthScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();

  // store
  const storedName = useOnboardingStore((s) => s.data.name);
  const storedBirthTime = useOnboardingStore((s) => s.data.birthTime);
  const storedBirthPlace = useOnboardingStore((s) => s.data.birthPlace);
  const setNameInStore = useOnboardingStore((s) => s.setName);
  const setBirthTimeInStore = useOnboardingStore((s) => s.setBirthTime);
  const setBirthPlaceInStore = useOnboardingStore((s) => s.setBirthPlace);

  // local state
  const [name, setName] = useState(storedName ?? '');
  const [birthPlace, setBirthPlace] = useState(storedBirthPlace?.city ?? '');
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [selectedHour, setSelectedHour] = useState<number>(
    storedBirthTime?.hour ?? 12
  );
  const [selectedMinute, setSelectedMinute] = useState<number>(
    storedBirthTime?.minute ?? 0
  );
  const [dontKnowTime, setDontKnowTime] = useState<boolean>(!storedBirthTime);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleContinue = useCallback(() => {
    const nameClean = name.trim();
    const placeClean = birthPlace.trim();
    if (!nameClean || !placeClean) return;

    setNameInStore(nameClean);

    if (dontKnowTime) {
      setBirthTimeInStore({ hour: 12, minute: 0 });
    } else {
      setBirthTimeInStore({ hour: selectedHour, minute: selectedMinute });
    }

    // Use selected city data if available, otherwise use manual input
    if (selectedCity) {
      setBirthPlaceInStore({
        city: selectedCity.city || placeClean,
        country: selectedCity.country || '',
        latitude: selectedCity.lat,
        longitude: selectedCity.lon,
      });
    } else {
      setBirthPlaceInStore({
        city: placeClean,
        country: '',
        latitude: 0,
        longitude: 0,
      });
    }

    navigation.navigate('SignUp');
  }, [
    name,
    birthPlace,
    dontKnowTime,
    selectedHour,
    selectedMinute,
    selectedCity,
    setNameInStore,
    setBirthTimeInStore,
    setBirthPlaceInStore,
    navigation,
  ]);

  const handleCitySelect = useCallback((city: CityOption) => {
    setSelectedCity(city);
  }, []);

  const isFormValid = Boolean(name.trim() && birthPlace.trim());

  return (
    <OnboardingLayout>
      <View style={styles.container}>
        <OnboardingHeader
          title={t('onboarding.fourth.header')}
          onBack={handleBack}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.descriptionContainer}>
              <Text style={styles.description}>
                {t('onboarding.fourth.description')}
              </Text>
            </View>

            <View style={styles.timeSection}>
              <Text style={styles.timeTitle}>
                {t('onboarding.fourth.timeTitle')}
              </Text>

              <AstralCheckbox
                checked={dontKnowTime}
                onToggle={() => setDontKnowTime((v) => !v)}
                label={t('onboarding.fourth.unknownTime')}
              />

              {!dontKnowTime && (
                <AstralTimePicker
                  selectedHour={selectedHour}
                  selectedMinute={selectedMinute}
                  onHourChange={setSelectedHour}
                  onMinuteChange={setSelectedMinute}
                />
              )}
            </View>

            <View style={styles.form}>
              <AstralInput
                placeholder={t('onboarding.fourth.namePlaceholder')}
                value={name}
                onChangeText={setName}
                icon="person-outline"
                required
              />

              <AstralCityInput
                placeholder={t('onboarding.fourth.placePlaceholder')}
                value={birthPlace}
                onChangeText={setBirthPlace}
                onCitySelect={handleCitySelect}
                icon="location-outline"
                required
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <OnboardingButton
          title={t('onboarding.button.next')}
          onPress={handleContinue}
          disabled={!isFormValid}
        />
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: ONBOARDING_LAYOUT.horizontalPadding,
    paddingBottom: 16,
    gap: 16,
  },
  descriptionContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  description: {
    color: ONBOARDING_COLORS.textDim70,
    ...ONBOARDING_TYPOGRAPHY.h2,
    textAlign: 'center',
  },
  timeSection: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 35,
  },
  timeTitle: {
    color: ONBOARDING_COLORS.textDim50,
    ...ONBOARDING_TYPOGRAPHY.bodyLarge,
    textAlign: 'center',
  },
  form: {
    gap: 16,
    marginBottom: 8,
  },
});
