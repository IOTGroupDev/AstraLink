// src/screens/onboarding/OnboardingFourthScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import OnboardingHeader from '../../components/onboarding/OnboardingHeader';
import OnboardingButton from '../../components/onboarding/OnboardingButton';
import AstralInput from '../../components/shared/AstralInput';
import AstralCheckbox from '../../components/shared/AstralCheckbox';
import AstralTimePicker from '../../components/shared/AstralTimePicker';

import { useOnboardingStore } from '../../stores/onboarding.store';
import {
  ONBOARDING_COLORS,
  ONBOARDING_TYPOGRAPHY,
  ONBOARDING_LAYOUT,
} from '../../constants/onboarding.constants';

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
  const [selectedHour, setSelectedHour] = useState<number>(
    storedBirthTime?.hour ?? 12
  );
  const [selectedMinute, setSelectedMinute] = useState<number>(
    storedBirthTime?.minute ?? 0
  );
  const [dontKnowTime, setDontKnowTime] = useState<boolean>(!storedBirthTime);

  const handleBack = () => navigation.goBack();

  const handleContinue = () => {
    const nameClean = name.trim();
    const placeClean = birthPlace.trim();
    if (!nameClean || !placeClean) return;

    setNameInStore(nameClean);

    if (dontKnowTime) {
      setBirthTimeInStore({ hour: 12, minute: 0 });
    } else {
      setBirthTimeInStore({ hour: selectedHour, minute: selectedMinute });
    }

    setBirthPlaceInStore({
      city: placeClean,
      country: '',
      latitude: 0,
      longitude: 0,
    });

    navigation.navigate('SignUp');
  };

  const isFormValid = Boolean(name.trim() && birthPlace.trim());

  return (
    <OnboardingLayout>
      <View style={styles.container}>
        <OnboardingHeader title="Регистрация" onBack={handleBack} />

        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            Введите ваши имя, время{'\n'}и место рождения
          </Text>
        </View>

        <View style={styles.timeSection}>
          <Text style={styles.timeTitle}>Ваше время рождения</Text>

          <AstralCheckbox
            checked={dontKnowTime}
            onToggle={() => setDontKnowTime((v) => !v)}
            label="не знаю точное время"
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
            placeholder="Ваше имя"
            value={name}
            onChangeText={setName}
            icon="person-outline"
            required
          />

          <AstralInput
            placeholder="Ваше место рождения"
            value={birthPlace}
            onChangeText={setBirthPlace}
            icon="location-outline"
            required
          />
        </View>

        <OnboardingButton
          title="ДАЛЕЕ"
          onPress={handleContinue}
          disabled={!isFormValid}
        />
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
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
