import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSpring,
  withDelay,
  FadeIn,
  SlideInUp,
  SlideInRight,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';

import { authAPI, setStoredToken } from '../services/api';
import { SignupRequest } from '../types';
import AnimatedStars from '../components/AnimatedStars';
import AstrologicalChart from '../components/AstrologicalChart';
import AstralLogo from '../components/AstralLogo';
import AstralInput from '../components/AstralInput';

const { width, height } = Dimensions.get('window');

interface SignupScreenProps {
  onSignup: () => void;
  onSwitchToLogin: () => void;
}

export default function SignupScreen({
  onSignup,
  onSwitchToLogin,
}: SignupScreenProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    birthDate: '',
    birthTime: '',
    birthPlace: '',
  });
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    name: '',
    birthDate: '',
    birthTime: '',
    birthPlace: '',
  });

  // Анимации для полей ввода
  const fieldAnimations = {
    name: useSharedValue(0),
    email: useSharedValue(0),
    password: useSharedValue(0),
    birthDate: useSharedValue(0),
    birthTime: useSharedValue(0),
    birthPlace: useSharedValue(0),
  };

  useEffect(() => {
    // Анимация появления полей
    Object.values(fieldAnimations).forEach((animation, index) => {
      animation.value = withDelay(
        index * 100,
        withSpring(1, { damping: 8, stiffness: 100 })
      );
    });
  }, []);

  // Функции валидации
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const validateName = (name: string): boolean => {
    return name.trim().length >= 2;
  };

  const validateBirthDate = (date: string): boolean => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;

    const birthDate = new Date(date);
    const today = new Date();

    // Проверяем, что дата не в будущем
    if (birthDate > today) return false;

    const age = today.getFullYear() - birthDate.getFullYear();
    return age >= 0 && age <= 120;
  };

  const validateBirthTime = (time: string): boolean => {
    if (!time) return true; // Время необязательно
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  // Обработчики изменения полей
  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Очищаем ошибку при изменении
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Обработчики потери фокуса с валидацией
  const handleFieldBlur = (field: string, value: string) => {
    setFocusedField(null);

    let error = '';

    switch (field) {
      case 'email':
        if (value && !validateEmail(value)) {
          error = 'Введите корректный email адрес';
        }
        break;
      case 'password':
        if (value && !validatePassword(value)) {
          error = 'Пароль должен содержать не менее 6 символов';
        }
        break;
      case 'name':
        if (value && !validateName(value)) {
          error = 'Имя должно содержать не менее 2 символов';
        }
        break;
      case 'birthDate':
        if (value && !validateBirthDate(value)) {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(value)) {
            error = 'Введите дату в формате YYYY-MM-DD';
          } else {
            const birthDate = new Date(value);
            const today = new Date();
            if (birthDate > today) {
              error = 'Дата рождения не может быть в будущем';
            } else {
              error = 'Некорректная дата рождения';
            }
          }
        }
        break;
      case 'birthTime':
        if (value && !validateBirthTime(value)) {
          error = 'Введите время в формате HH:MM';
        }
        break;
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleSignup = async () => {
    // Очищаем предыдущие ошибки
    setErrors({
      email: '',
      password: '',
      name: '',
      birthDate: '',
      birthTime: '',
      birthPlace: '',
    });

    // Проверяем обязательные поля
    if (
      !formData.email.trim() ||
      !formData.password.trim() ||
      !formData.name.trim() ||
      !formData.birthDate.trim()
    ) {
      Alert.alert(
        'Ошибка ввода',
        'Пожалуйста, заполните все обязательные поля',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    // Валидация всех полей
    const newErrors = { ...errors };
    let hasErrors = false;

    if (!validateEmail(formData.email)) {
      newErrors.email = 'Введите корректный email адрес';
      hasErrors = true;
    }

    if (!validatePassword(formData.password)) {
      newErrors.password = 'Пароль должен содержать не менее 6 символов';
      hasErrors = true;
    }

    if (!validateName(formData.name)) {
      newErrors.name = 'Имя должно содержать не менее 2 символов';
      hasErrors = true;
    }

    if (!validateBirthDate(formData.birthDate)) {
      newErrors.birthDate = 'Введите дату в формате YYYY-MM-DD';
      hasErrors = true;
    }

    if (formData.birthTime && !validateBirthTime(formData.birthTime)) {
      newErrors.birthTime = 'Введите время в формате HH:MM';
      hasErrors = true;
    }

    if (hasErrors) {
      setErrors(newErrors);
      Alert.alert('Ошибка валидации', 'Пожалуйста, исправьте ошибки в полях', [
        { text: 'OK', style: 'default' },
      ]);
      return;
    }

    setLoading(true);
    try {
      const signupData: SignupRequest = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password.trim(),
        birthDate: formData.birthDate.trim(),
        birthTime: formData.birthTime.trim() || undefined,
        birthPlace: formData.birthPlace.trim() || undefined,
      };

      const response = await authAPI.signup(signupData);
      setStoredToken(response.access_token);

      // Небольшая задержка для анимации
      setTimeout(() => {
        onSignup();
      }, 300);
    } catch (error: any) {
      console.error('Signup error:', error);

      // Определяем тип ошибки и показываем соответствующее сообщение
      if (error.response?.status === 409) {
        Alert.alert(
          'Ошибка регистрации',
          'Пользователь с таким email уже существует. Попробуйте войти в систему или используйте другой email.',
          [{ text: 'OK', style: 'default' }]
        );
      } else if (error.response?.status === 400) {
        Alert.alert(
          'Ошибка регистрации',
          error.response?.data?.message ||
            'Некорректные данные. Проверьте правильность введенной информации.',
          [{ text: 'OK', style: 'default' }]
        );
      } else if (error.code === 'ERR_NETWORK') {
        Alert.alert(
          'Ошибка сети',
          'Не удалось подключиться к серверу. Проверьте подключение к интернету.',
          [{ text: 'OK', style: 'default' }]
        );
      } else if (
        error.code === 'ECONNABORTED' ||
        error.message?.includes('timeout')
      ) {
        Alert.alert(
          'Ошибка подключения',
          'Превышено время ожидания ответа от сервера. Проверьте подключение к интернету и попробуйте еще раз.',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert(
          'Ошибка регистрации',
          error.message ||
            'Произошла ошибка при регистрации. Попробуйте еще раз.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f0f23']}
      style={styles.container}
    >
      <AnimatedStars />
      <AstrologicalChart />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeIn.delay(200)} style={styles.header}>
            <AstralLogo />
            <Text style={styles.title}>AstraLink</Text>
            <Text style={styles.subtitle}>
              Создайте свой астрологический профиль
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={SlideInUp.delay(400)} style={styles.form}>
            <Text style={styles.formTitle}>Регистрация</Text>

            <View>
              <AstralInput
                placeholder="Имя"
                value={formData.name}
                onChangeText={(text) => handleFieldChange('name', text)}
                onFocus={() => setFocusedField('name')}
                onBlur={() => handleFieldBlur('name', formData.name)}
                icon="person"
                required
                animationValue={fieldAnimations.name}
                error={!!errors.name}
                errorMessage={errors.name}
              />

              <AstralInput
                placeholder="Email"
                value={formData.email}
                onChangeText={(text) => handleFieldChange('email', text)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => handleFieldBlur('email', formData.email)}
                keyboardType="email-address"
                icon="mail"
                required
                animationValue={fieldAnimations.email}
                error={!!errors.email}
                errorMessage={errors.email}
              />

              <AstralInput
                placeholder="Пароль"
                value={formData.password}
                onChangeText={(text) => handleFieldChange('password', text)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => handleFieldBlur('password', formData.password)}
                secureTextEntry
                icon="lock-closed"
                required
                animationValue={fieldAnimations.password}
                error={!!errors.password}
                errorMessage={errors.password}
              />

              <AstralInput
                placeholder="Дата рождения (YYYY-MM-DD)"
                value={formData.birthDate}
                onChangeText={(text) => handleFieldChange('birthDate', text)}
                onFocus={() => setFocusedField('birthDate')}
                onBlur={() => handleFieldBlur('birthDate', formData.birthDate)}
                keyboardType="numeric"
                icon="calendar"
                required
                animationValue={fieldAnimations.birthDate}
                error={!!errors.birthDate}
                errorMessage={errors.birthDate}
              />

              <AstralInput
                placeholder="Время рождения (HH:MM)"
                value={formData.birthTime}
                onChangeText={(text) => handleFieldChange('birthTime', text)}
                onFocus={() => setFocusedField('birthTime')}
                onBlur={() => handleFieldBlur('birthTime', formData.birthTime)}
                keyboardType="numeric"
                icon="time"
                animationValue={fieldAnimations.birthTime}
                error={!!errors.birthTime}
                errorMessage={errors.birthTime}
              />

              <AstralInput
                placeholder="Место рождения"
                value={formData.birthPlace}
                onChangeText={(text) => handleFieldChange('birthPlace', text)}
                onFocus={() => setFocusedField('birthPlace')}
                onBlur={() => setFocusedField(null)}
                icon="location"
                animationValue={fieldAnimations.birthPlace}
              />
            </View>

            {/* Submit Button */}
            <Animated.View
              entering={SlideInUp.delay(1000)}
              style={styles.buttonContainer}
            >
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#3B82F6', '#1E40AF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons
                        name="star"
                        size={20}
                        color="#fff"
                        style={styles.buttonIcon}
                      />
                      <Text style={styles.buttonText}>Создать профиль</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Login Link */}
            <Animated.View
              entering={FadeIn.delay(1200)}
              style={styles.linkContainer}
            >
              <TouchableOpacity
                onPress={onSwitchToLogin}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>
                  Уже есть аккаунт?
                  <Text style={styles.linkTextAccent}> Войти в систему</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    textShadowColor: 'rgba(139, 92, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.8,
    lineHeight: 22,
  },
  form: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 25,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
    textShadowColor: 'rgba(139, 92, 246, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  button: {
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 30,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  linkContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  linkButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  linkText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.8,
  },
  linkTextAccent: {
    color: '#8B5CF6',
    fontWeight: 'bold',
    textShadowColor: 'rgba(139, 92, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
});
