import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  withSpring,
  withDelay,
  FadeIn,
  SlideInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { authAPI } from '../services/api';
import { LoginRequest } from '../types';
import AstralLogo from '../components/AstralLogo';
import AstralInput from '../components/AstralInput';
import ErrorModal from '../components/ErrorModal';

interface LoginScreenProps {
  onLogin: () => void;
  onSwitchToSignup: () => void;
}

export default function LoginScreen({
  onLogin,
  onSwitchToSignup,
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Анимации для полей ввода
  const fieldAnimations = {
    email: useSharedValue(0),
    password: useSharedValue(0),
  };

  useEffect(() => {
    // Анимация появления полей
    fieldAnimations.email.value = withDelay(
      200,
      withSpring(1, { damping: 8, stiffness: 100 })
    );
    fieldAnimations.password.value = withDelay(
      400,
      withSpring(1, { damping: 8, stiffness: 100 })
    );
  }, []);

  // Функция валидации email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Функция показа модального окна ошибки
  const showErrorModal = (title: string, message: string) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setErrorModalVisible(true);
  };

  // Обработка изменения email без валидации
  const handleEmailChange = (text: string) => {
    setEmail(text);
    // Очищаем ошибку при изменении текста
    if (emailError) {
      setEmailError('');
    }
  };

  // Обработка потери фокуса с валидацией
  const handleEmailBlur = () => {
    setFocusedField(null);
    // Валидация только при потере фокуса
    if (email && !validateEmail(email)) {
      setEmailError('Введите корректный email адрес');
    } else {
      setEmailError('');
    }
  };

  const handleLogin = async () => {
    // Очищаем предыдущие ошибки
    setEmailError('');
    setPasswordError('');

    if (!email.trim() || !password.trim()) {
      showErrorModal('Ошибка ввода', 'Пожалуйста, заполните все поля');
      return;
    }

    // Валидация email
    if (!validateEmail(email)) {
      setEmailError('Введите корректный email адрес');
      showErrorModal('Ошибка ввода', 'Введите корректный email адрес');
      return;
    }

    // Валидация пароля
    if (password.length < 6) {
      setPasswordError('Пароль должен содержать минимум 6 символов');
      showErrorModal(
        'Ошибка ввода',
        'Пароль должен содержать минимум 6 символов'
      );
      return;
    }

    setLoading(true);
    try {
      const loginData: LoginRequest = {
        email: email.trim(),
        password: password.trim(),
      };
      console.log('🔐 Попытка входа с данными:', {
        email: loginData.email,
        password: '***',
      });
      const response = await authAPI.login(loginData);
      console.log(
        '✅ Успешный вход, получен токен:',
        response.access_token.substring(0, 20) + '...'
      );

      // Небольшая задержка для анимации
      setTimeout(() => {
        onLogin();
      }, 300);
    } catch (error: any) {
      console.error('Login error:', error);

      // Определяем тип ошибки и показываем соответствующее сообщение
      if (error.response?.status === 401) {
        showErrorModal(
          'Ошибка входа',
          'Неверный email или пароль. Проверьте правильность введенных данных.'
        );
      } else if (error.response?.status === 400) {
        showErrorModal(
          'Ошибка входа',
          'Некорректные данные. Проверьте формат email и пароля.'
        );
      } else if (error.code === 'ERR_NETWORK') {
        showErrorModal(
          'Ошибка сети',
          'Не удалось подключиться к серверу. Проверьте подключение к интернету.'
        );
      } else if (
        error.code === 'ECONNABORTED' ||
        error.message?.includes('timeout')
      ) {
        showErrorModal(
          'Ошибка подключения',
          'Превышено время ожидания ответа от сервера. Проверьте подключение к интернету и попробуйте еще раз.'
        );
      } else {
        const msg =
          typeof error?.message === 'string' && error.message
            ? error.message
            : 'Произошла ошибка при входе в систему. Попробуйте еще раз.';
        showErrorModal('Ошибка входа', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      style={styles.container}
    >
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
              Войдите в свой астрологический мир
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={SlideInUp.delay(400)} style={styles.form}>
            <Text style={styles.formTitle}>Вход в систему</Text>

            <View>
              <AstralInput
                placeholder="Email"
                value={email}
                onChangeText={handleEmailChange}
                onFocus={() => setFocusedField('email')}
                onBlur={handleEmailBlur}
                keyboardType="email-address"
                icon="mail"
                animationValue={fieldAnimations.email}
                isFocused={focusedField === 'email'}
                error={!!emailError}
                errorMessage={emailError}
              />

              <AstralInput
                placeholder="Пароль"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry
                icon="lock-closed"
                animationValue={fieldAnimations.password}
                isFocused={focusedField === 'password'}
                error={!!passwordError}
                errorMessage={passwordError}
              />
            </View>

            {/* Submit Button */}
            <Animated.View
              entering={SlideInUp.delay(600)}
              style={styles.buttonContainer}
            >
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
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
                        name="log-in"
                        size={20}
                        color="#fff"
                        style={styles.buttonIcon}
                      />
                      <Text style={styles.buttonText}>Войти в систему</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Signup Link */}
            <Animated.View
              entering={FadeIn.delay(800)}
              style={styles.linkContainer}
            >
              <TouchableOpacity
                onPress={onSwitchToSignup}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>
                  Нет аккаунта?
                  <Text style={styles.linkTextAccent}> Создать профиль</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ErrorModal
        visible={errorModalVisible}
        title={errorTitle}
        message={errorMessage}
        onClose={() => setErrorModalVisible(false)}
      />
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
    justifyContent: 'center',
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
    textShadowColor: 'rgba(139, 92, 246, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
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
