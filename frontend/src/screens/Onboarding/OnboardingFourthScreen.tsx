import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

// Components
import CosmicBackground from '../../components/shared/CosmicBackground';
import AstralInput from '../../components/shared/AstralInput';
import AstralCheckbox from '../../components/shared/AstralCheckbox';
import AstralTimePicker from '../../components/shared/AstralTimePicker';
import ArrowBackSvg from '../../components/svg/ArrowBackSvg';

// Store
import { useOnboardingStore } from '../../stores/onboarding.store';

const OnboardingFourthScreen: React.FC = () => {
  const navigation = useNavigation();

  // Получаем данные и методы из store
  const storedName = useOnboardingStore((state) => state.data.name);
  const storedBirthTime = useOnboardingStore((state) => state.data.birthTime);
  const storedBirthPlace = useOnboardingStore((state) => state.data.birthPlace);

  const setNameInStore = useOnboardingStore((state) => state.setName);
  const setBirthTimeInStore = useOnboardingStore((state) => state.setBirthTime);
  const setBirthPlaceInStore = useOnboardingStore(
    (state) => state.setBirthPlace
  );

  // Инициализируем state из store или значениями по умолчанию
  const [name, setName] = useState(storedName || '');
  const [birthPlace, setBirthPlace] = useState(storedBirthPlace?.city || '');
  const [selectedHour, setSelectedHour] = useState(storedBirthTime?.hour ?? 12);
  const [selectedMinute, setSelectedMinute] = useState(
    storedBirthTime?.minute ?? 0
  );
  const [dontKnowTime, setDontKnowTime] = useState(!storedBirthTime);

  // Animation values
  const animationValue = useSharedValue(0);

  React.useEffect(() => {
    animationValue.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.quad),
    });
  }, []);

  const handleContinue = () => {
    // Валидация
    if (!name.trim() || !birthPlace.trim()) {
      return;
    }

    // Сохраняем данные в store
    setNameInStore(name.trim());

    // Сохраняем время только если пользователь его указал
    if (!dontKnowTime) {
      setBirthTimeInStore({
        hour: selectedHour,
        minute: selectedMinute,
      });
    } else {
      // Если не знает время, можно сохранить null или не сохранять
      setBirthTimeInStore({ hour: 12, minute: 0 }); // или удалить это поле
    }

    // Сохраняем место рождения
    // TODO: В будущем добавить геокодирование для получения координат
    setBirthPlaceInStore({
      city: birthPlace.trim(),
      country: '', // TODO: определить страну через geocoding API
      latitude: 0, // TODO: получить координаты
      longitude: 0, // TODO: получить координаты
    });

    navigation.navigate('SignUp' as never);
  };

  return (
    <View style={styles.container}>
      {/* Оптимизированный космический фон */}
      <CosmicBackground />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          {/* Header */}
          <Animated.View entering={FadeIn.delay(100)} style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <ArrowBackSvg width={36} height={36} />
            </TouchableOpacity>
            <Text style={styles.title}>Регистрация</Text>
            <View style={styles.placeholder} />
          </Animated.View>

          {/* Description */}
          <Animated.View
            entering={FadeIn.delay(200)}
            style={styles.descriptionContainer}
          >
            <Text style={styles.description}>
              Введите ваши имя, время{'\n'}и место рождения
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View
            entering={FadeIn.delay(300)}
            style={styles.formContainer}
          >
            {/* Time Section */}
            <View style={styles.timeSection}>
              <Text style={styles.timeTitle}>Ваше время рождения</Text>

              <AstralCheckbox
                checked={dontKnowTime}
                onToggle={() => setDontKnowTime(!dontKnowTime)}
                label="не знаю точное время"
                animationValue={animationValue}
              />

              {!dontKnowTime && (
                <AstralTimePicker
                  selectedHour={selectedHour}
                  selectedMinute={selectedMinute}
                  onHourChange={setSelectedHour}
                  onMinuteChange={setSelectedMinute}
                  animationValue={animationValue}
                  visible={!dontKnowTime}
                />
              )}
            </View>

            {/* Name Input */}
            <AstralInput
              placeholder="Ваше имя"
              value={name}
              onChangeText={setName}
              icon="person-outline"
              required={true}
              animationValue={animationValue}
            />

            {/* Birth Place Input */}
            <AstralInput
              placeholder="Ваше место рождения"
              value={birthPlace}
              onChangeText={setBirthPlace}
              icon="location-outline"
              required={true}
              animationValue={animationValue}
            />
          </Animated.View>
        </ScrollView>

        {/* Action Button */}
        <Animated.View
          entering={FadeIn.delay(500)}
          style={styles.actionButtonContainer}
        >
          <TouchableOpacity
            style={[
              styles.actionButton,
              (!name.trim() || !birthPlace.trim()) &&
                styles.actionButtonDisabled,
            ]}
            onPress={handleContinue}
            activeOpacity={0.8}
            disabled={!name.trim() || !birthPlace.trim()}
          >
            <Text style={styles.actionButtonText}>далее</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 79,
    paddingBottom: 140,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 36,
  },
  descriptionContainer: {
    width: '100%',
    marginBottom: 10,
  },
  description: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 22.17,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 27,
  },
  formContainer: {
    width: '100%',
    gap: 20,
  },
  timeSection: {
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
  },
  timeTitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 20,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  actionButtonContainer: {
    position: 'absolute',
    bottom: 98,
    left: 24,
    right: 24,
  },
  actionButton: {
    backgroundColor: '#ECECEC',
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    height: 60,
  },
  actionButtonDisabled: {
    backgroundColor: 'rgba(236, 236, 236, 0.4)',
  },
  actionButtonText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 20,
    fontWeight: '500',
    color: '#000000',
    textTransform: 'uppercase',
    lineHeight: 24.38,
  },
  bottomIndicator: {
    position: 'absolute',
    bottom: 12,
    left: '50%',
    marginLeft: -70,
    width: 140,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
});

export default OnboardingFourthScreen;
