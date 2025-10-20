import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

// Components
import CosmicBackground from '../components/CosmicBackground';
import AstralInput from '../components/AstralInput';
import AstralCheckbox from '../components/AstralCheckbox';
import AstralTimePicker from '../components/AstralTimePicker';
import ArrowBackSvg from '../components/assets/ArrowBackSvg';
import PersonSvg from '../components/assets/PersonSvg';
import LocationSvg from '../components/assets/LocationSvg';

const { width: screenWidth } = Dimensions.get('window');

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [dontKnowTime, setDontKnowTime] = useState(false);

  // Animation values
  const animationValue = useSharedValue(0);

  React.useEffect(() => {
    animationValue.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.quad),
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Cosmic Background */}
      <CosmicBackground />

      {/* Gradient Overlay */}

      {/* Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.delay(100)} style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ArrowBackSvg width={36} height={36} />
          </TouchableOpacity>
          <Text style={styles.title}>Регистрация</Text>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>1/3</Text>
          </View>
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

            <AstralTimePicker
              selectedHour={selectedHour}
              selectedMinute={selectedMinute}
              onHourChange={setSelectedHour}
              onMinuteChange={setSelectedMinute}
              animationValue={animationValue}
              visible={!dontKnowTime}
            />
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
          style={styles.actionButton}
          onPress={() => navigation.navigate('Onboarding2' as never)}
        >
          <Text style={styles.actionButtonText}>перейти к приложению</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom Element */}
      <View style={styles.bottomElement} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010',
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 79,
    paddingBottom: 79,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
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
  },
  stepIndicator: {
    width: 36,
    alignItems: 'flex-end',
  },
  stepText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 20,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
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
    flex: 1,
    justifyContent: 'center',
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
  actionButtonText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 20,
    fontWeight: '500',
    color: '#000000',
    textTransform: 'uppercase',
    lineHeight: 24.38,
  },
  bottomElement: {
    position: 'absolute',
    bottom: 12,
    left: 145,
    width: 140,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
});

export default RegisterScreen;
