import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import CosmicBackground from '../../components/shared/CosmicBackground';
import AstralInput from '../../components/shared/AstralInput';
import { authAPI } from '../../services/api';

const AuthEmailScreen: React.FC = () => {
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  //   function getRedirectUri() {
  //   const isExpoGo = Constants.appOwnership === 'expo';
  //   // Итоговые варианты:
  //   // - Expo Go: прокси-URL от Expo (useProxy: true)
  //   // - Standalone/Dev Client: astralink://auth/callback  (совпадает с app.json)
  //   return AuthSession.makeRedirectUri({
  //     useProxy: isExpoGo,
  //     scheme: 'astralink',
  //     path: 'auth/callback', // <- host "auth" + pathPrefix "/callback" из intentFilters
  //   });
  // }

  const validateEmail = (text: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(text);
  };

  const handleNext = async () => {
    // Очищаем предыдущие ошибки
    setErrorMessage('');

    // Валидация email
    if (!validateEmail(email)) {
      setIsEmailValid(false);
      setErrorMessage('Введите корректный email');
      return;
    }

    setIsEmailValid(true);
    setIsLoading(true);

    try {
      console.log('📧 Отправка OTP кода на:', email);

      // Отправляем magic link через Supabase
      const result = await authAPI.sendVerificationCode(email);

      console.log('✅ OTP успешно отправлен:', result);

      // Переходим на экран ввода кода
      // @ts-ignore
      navigation.navigate('OptCode', {
        email,
        codeLength: 6,
        shouldCreateUser: true,
      });
    } catch (error: any) {
      console.error('❌ Ошибка отправки magic link:', error);

      // Обрабатываем ошибки
      let message = error.message || 'Не удалось отправить письмо';

      // Специфичная обработка ошибок
      if (message.includes('rate limit')) {
        message = 'Слишком много попыток. Подождите минуту';
      } else if (message.includes('Invalid email')) {
        message = 'Некорректный email адрес';
      } else if (message.includes('Email not confirmed')) {
        message = 'Email не подтвержден. Проверьте почту';
      }

      setErrorMessage(message);

      // Показываем alert только для критичных ошибок
      if (!message.includes('rate limit')) {
        Alert.alert('Ошибка', message, [{ text: 'OK' }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CosmicBackground />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Шапка с кнопкой назад и заголовком */}
            <Animated.View
              entering={FadeIn.duration(600)}
              style={styles.header}
            >
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Ionicons
                  name="arrow-back"
                  size={28}
                  color={
                    isLoading
                      ? 'rgba(255, 255, 255, 0.3)'
                      : 'rgba(255, 255, 255, 0.7)'
                  }
                />
              </TouchableOpacity>

              <Text style={styles.title}>Регистрация</Text>

              <View style={styles.placeholder} />
            </Animated.View>

            {/* Контент */}
            <View style={styles.content}>
              {/* Текст-подсказка */}
              <Animated.Text
                entering={FadeInDown.duration(600).delay(200)}
                style={styles.subtitle}
              >
                Введите ваш{'\n'}Email
              </Animated.Text>

              {/* Поле ввода */}
              <View style={styles.inputContainer}>
                <AstralInput
                  icon="mail-outline"
                  placeholder="Ваш email"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setErrorMessage('');
                    setIsEmailValid(true);
                  }}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  editable={!isLoading}
                  autoCapitalize="none"
                />

                {/* Сообщение об ошибке */}
                {errorMessage ? (
                  <Animated.Text
                    entering={FadeInDown.duration(300)}
                    style={styles.errorText}
                  >
                    {errorMessage}
                  </Animated.Text>
                ) : null}
              </View>

              {/* Информационное сообщение */}
              <Animated.Text
                entering={FadeInDown.duration(600).delay(300)}
                style={styles.infoText}
              >
                Мы отправим 6‑значный код на вашу почту
              </Animated.Text>
            </View>

            {/* Кнопка "Далее" */}
            <Animated.View
              entering={FadeInDown.duration(600).delay(400)}
              style={styles.buttonContainer}
            >
              <TouchableOpacity
                style={[
                  styles.button,
                  (!email || isLoading) && styles.buttonDisabled,
                ]}
                onPress={handleNext}
                disabled={!email || isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#000000" size="small" />
                ) : (
                  <Text style={styles.buttonText}>ДАЛЕЕ</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0618',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 46,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 24,
    color: '#FFFFFF',
    lineHeight: 28,
    textAlign: 'center',
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 22,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 27,
    marginBottom: 90,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#FF6B6B',
    marginTop: 8,
    marginLeft: 4,
  },
  infoText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 'auto',
  },
  button: {
    backgroundColor: '#ECECEC',
    borderRadius: 58,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 56,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(236, 236, 236, 0.5)',
    shadowOpacity: 0,
  },
  buttonText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 20,
    color: '#000000',
    letterSpacing: 0.5,
  },
});

export default AuthEmailScreen;

// import React, { useState } from 'react';
// import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
// import * as AuthSession from 'expo-auth-session';
// import Constants from 'expo-constants';
// import { useNavigation } from '@react-navigation/native';
// import { supabase } from '../../services/supabase'; // <- поправь путь, если у тебя другой
//
// function getRedirectUri() {
//   const isExpoGo = Constants.appOwnership === 'expo';
//   // Итоговые варианты:
//   // - Expo Go: прокси-URL от Expo (useProxy: true)
//   // - Standalone/Dev Client: astralink://auth/callback  (совпадает с app.json)
//   return AuthSession.makeRedirectUri({
//     useProxy: isExpoGo,
//     scheme: 'astralink',
//     path: 'auth/callback', // <- host "auth" + pathPrefix "/callback" из intentFilters
//   });
// }
//
// function validateEmail(email: string) {
//   return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
// }
//
// export default function AuthEmailScreen() {
//   const navigation = useNavigation<any>();
//   const [email, setEmail] = useState('');
//   const [sending, setSending] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//
//   const onSend = async () => {
//     setError(null);
//
//     if (!validateEmail(email)) {
//       setError('Некорректный email');
//       return;
//     }
//
//     try {
//       setSending(true);
//
//       const emailRedirectTo = getRedirectUri();
//
//       const { error } = await supabase.auth.signInWithOtp({
//         email,
//         options: {
//           shouldCreateUser: true,
//           emailRedirectTo, // 👈 Критично. Без этого в Expo Go часто падает с "origin of undefined"
//         },
//       });
//
//       if (error) throw error;
//
//       // Идём на экран ожидания
//       navigation.navigate('MagicLinkWaiting', { email });
//     } catch (e: any) {
//       setError(e?.message ?? 'Ошибка отправки письма');
//     } finally {
//       setSending(false);
//     }
//   };
//
//   return (
//     <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
//       <View style={styles.container}>
//         <Text style={styles.title}>Вход по email</Text>
//         <Text style={styles.subtitle}>Мы отправим ссылку для входа</Text>
//
//         <TextInput
//           placeholder="you@example.com"
//           autoCapitalize="none"
//           keyboardType="email-address"
//           value={email}
//           onChangeText={setEmail}
//           style={styles.input}
//         />
//
//         {!!error && <Text style={styles.error}>{error}</Text>}
//
//         <TouchableOpacity onPress={onSend} style={[styles.button, sending && styles.buttonDisabled]} disabled={sending}>
//           {sending ? <ActivityIndicator /> : <Text style={styles.buttonText}>Отправить ссылку</Text>}
//         </TouchableOpacity>
//       </View>
//     </KeyboardAvoidingView>
//   );
// }
//
// const styles = StyleSheet.create({
//   container: { flex: 1, padding: 24, justifyContent: 'center' },
//   title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
//   subtitle: { fontSize: 14, opacity: 0.7, textAlign: 'center', marginBottom: 24 },
//   input: {
//     borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16,
//   },
//   error: { color: '#d00', marginTop: 10, marginBottom: 4, textAlign: 'center' },
//   button: {
//     marginTop: 16, backgroundColor: '#111', padding: 14, borderRadius: 12, alignItems: 'center',
//   },
//   buttonDisabled: { opacity: 0.5 },
//   buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
// });
