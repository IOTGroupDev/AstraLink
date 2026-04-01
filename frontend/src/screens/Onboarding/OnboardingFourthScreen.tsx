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
import { supabase } from '../../services/supabase';
import { authAPI, userExtendedProfileAPI } from '../../services/api';
import { AuthEngine } from '../../services/authEngine';
import { authLogger } from '../../services/logger';

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
import { useAuthStore } from '../../stores/auth.store';
import type { CityOption } from '../../services/api/geo.api';

type RootStackParamList = {
  Onboarding4: undefined;
  AuthEmail: undefined;
  MainTabs: undefined;
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
  const storedBirthDate = useOnboardingStore((s) => s.data.birthDate);
  const storedBirthTime = useOnboardingStore((s) => s.data.birthTime);
  const storedBirthPlace = useOnboardingStore((s) => s.data.birthPlace);
  const setNameInStore = useOnboardingStore((s) => s.setName);
  const setBirthTimeInStore = useOnboardingStore((s) => s.setBirthTime);
  const setBirthPlaceInStore = useOnboardingStore((s) => s.setBirthPlace);
  const setCompleted = useOnboardingStore((s) => s.setCompleted);
  const authSession = useAuthStore((s) => s.session);
  const authProfile = useAuthStore((s) => s.profile);
  const setAuthState = useAuthStore((s) => s.setAuthState);
  const setAuthProfile = useAuthStore((s) => s.setProfile);

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
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const resolveSessionFromStoreOrSupabase = useCallback(async () => {
    if (authSession?.user?.id) {
      return authSession;
    }

    const sessionResult = await Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('session_timeout')), 1500);
      }),
    ]);

    return (
      sessionResult as Awaited<ReturnType<typeof supabase.auth.getSession>>
    ).data.session;
  }, [authSession]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleContinue = useCallback(async () => {
    if (submitting) return;
    const nameClean = name.trim();
    const placeClean = birthPlace.trim();
    if (!nameClean || !placeClean) return;

    setErrorText(null);
    setSubmitting(true);

    setNameInStore(nameClean);

    const time = dontKnowTime
      ? { hour: 12, minute: 0 }
      : { hour: selectedHour, minute: selectedMinute };

    setBirthTimeInStore(time);

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

    try {
      const session = await resolveSessionFromStoreOrSupabase();
      const userId = session?.user.id || authProfile?.id;

      if (!userId) {
        setErrorText(t('auth.userDataLoader.sessionNotFound'));
        navigation.navigate('AuthEmail');
        return;
      }

      const fallbackBirthDate =
        authProfile?.birthDate?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
      const birthDate = storedBirthDate
        ? `${storedBirthDate.year}-${String(storedBirthDate.month).padStart(2, '0')}-${String(storedBirthDate.day).padStart(2, '0')}`
        : fallbackBirthDate;

      if (!birthDate) {
        setErrorText(t('onboarding.fourth.missingBirthDate'));
        return;
      }

      const birthTime = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
      const resolvedBirthPlace = selectedCity?.city || placeClean;

      authLogger.log('Submitting onboarding completion', {
        userId,
        birthDate,
        birthTime,
        birthPlace: resolvedBirthPlace,
      });

      await authAPI.completeSignup({
        userId,
        name: nameClean,
        birthDate,
        birthTime,
        birthPlace: resolvedBirthPlace,
      });

      void userExtendedProfileAPI
        .updateUserProfile({
          is_onboarded: true,
        })
        .catch((extendedProfileError) => {
          authLogger.warn(
            'Extended profile update failed after complete-signup',
            extendedProfileError
          );
        });

      setCompleted(true);
      setAuthProfile({
        id: userId,
        email: session?.user.email || authProfile?.email || '',
        name: nameClean,
        birthDate,
        birthTime,
        birthPlace: resolvedBirthPlace,
        onboardingCompleted: true,
      });
      setAuthState('AUTHORIZED');
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      void AuthEngine.refreshProfileInBackground();
    } catch (error) {
      authLogger.error('Onboarding completion failed', error);
      const responseMessage = (error as any)?.response?.data?.message;
      const serverMessage = Array.isArray(responseMessage)
        ? responseMessage.join('\n')
        : typeof responseMessage === 'string'
          ? responseMessage
          : error instanceof Error
            ? error.message
            : null;
      setErrorText(serverMessage || t('onboarding.fourth.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    name,
    birthPlace,
    dontKnowTime,
    selectedHour,
    selectedMinute,
    selectedCity,
    storedBirthDate,
    authSession,
    authProfile,
    resolveSessionFromStoreOrSupabase,
    setNameInStore,
    setBirthTimeInStore,
    setBirthPlaceInStore,
    setCompleted,
    setAuthState,
    setAuthProfile,
    navigation,
    t,
  ]);

  const handleCitySelect = useCallback((city: CityOption) => {
    setSelectedCity(city);
  }, []);

  const handleBirthPlaceChange = useCallback((text: string) => {
    setBirthPlace(text);
    setSelectedCity((current) => (current?.display === text ? current : null));
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
                onChangeText={handleBirthPlaceChange}
                onCitySelect={handleCitySelect}
                icon="location-outline"
                required
              />

              {errorText ? (
                <Text style={styles.errorText}>{errorText}</Text>
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <OnboardingButton
          title={
            submitting
              ? t('onboarding.fourth.submitting')
              : t('onboarding.button.next')
          }
          onPress={handleContinue}
          disabled={!isFormValid || submitting}
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
  errorText: {
    color: ONBOARDING_COLORS.error,
    ...ONBOARDING_TYPOGRAPHY.body,
    textAlign: 'center',
  },
});
