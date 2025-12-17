// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   SafeAreaView,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   ActivityIndicator,
//   Alert,
// } from 'react-native';
// import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
// import { Ionicons } from '@expo/vector-icons';
// import { useNavigation } from '@react-navigation/native';
//
// import CosmicBackground from '../../components/shared/CosmicBackground';
// import AstralInput from '../../components/shared/AstralInput';
// import { authAPI } from '../../services/api';
// import ArrowBackSvg from '../../components/svg/ArrowBackSvg';
//
// const AuthEmailScreen: React.FC = () => {
//   const navigation = useNavigation();
//
//   const [email, setEmail] = useState('');
//   const [isEmailValid, setIsEmailValid] = useState(true);
//   const [isLoading, setIsLoading] = useState(false);
//   const [errorMessage, setErrorMessage] = useState('');
//
//   //   function getRedirectUri() {
//   //   const isExpoGo = Constants.appOwnership === 'expo';
//   //   // Итоговые варианты:
//   //   // - Expo Go: прокси-URL от Expo (useProxy: true)
//   //   // - Standalone/Dev Client: astralink://auth/callback  (совпадает с app.json)
//   //   return AuthSession.makeRedirectUri({
//   //     useProxy: isExpoGo,
//   //     scheme: 'astralink',
//   //     path: 'auth/callback', // <- host "auth" + pathPrefix "/callback" из intentFilters
//   //   });
//   // }
//
//   const validateEmail = (text: string) => {
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     return emailRegex.test(text);
//   };
//
//   const handleNext = async () => {
//     // Очищаем предыдущие ошибки
//     setErrorMessage('');
//
//     // Валидация email
//     if (!validateEmail(email)) {
//       setIsEmailValid(false);
//       setErrorMessage('Введите корректный email');
//       return;
//     }
//
//     setIsEmailValid(true);
//     setIsLoading(true);
//
//     try {
//       authLogger.log('📧 Отправка OTP кода на:', email);
//
//       // Отправляем magic link через Supabase
//       const result = await authAPI.sendVerificationCode(email);
//
//       authLogger.log('✅ OTP успешно отправлен:', result);
//
//       // Переходим на экран ввода кода
//       // @ts-ignore
//       navigation.navigate('OptCode', {
//         email,
//         codeLength: 6,
//         shouldCreateUser: true,
//       });
//     } catch (error: any) {
//       authLogger.error('❌ Ошибка отправки magic link:', error);
//
//       // Обрабатываем ошибки
//       let message = error.message || 'Не удалось отправить письмо';
//
//       // Специфичная обработка ошибок
//       if (message.includes('rate limit')) {
//         message = 'Слишком много попыток. Подождите минуту';
//       } else if (message.includes('Invalid email')) {
//         message = 'Некорректный email адрес';
//       } else if (message.includes('Email not confirmed')) {
//         message = 'Email не подтвержден. Проверьте почту';
//       }
//
//       setErrorMessage(message);
//
//       // Показываем alert только для критичных ошибок
//       if (!message.includes('rate limit')) {
//         Alert.alert('Ошибка', message, [{ text: 'OK' }]);
//       }
//     } finally {
//       setIsLoading(false);
//     }
//   };
//
//   return (
//     <View style={styles.container}>
//       <CosmicBackground />
//
//       <SafeAreaView style={styles.safeArea}>
//         <KeyboardAvoidingView
//           behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//           style={styles.keyboardView}
//         >
//           <ScrollView
//             contentContainerStyle={styles.scrollContent}
//             keyboardShouldPersistTaps="handled"
//             showsVerticalScrollIndicator={false}
//           >
//             {/* Шапка с кнопкой назад и заголовком */}
//             <Animated.View
//               entering={FadeIn.duration(600)}
//               style={styles.header}
//             >
//               <TouchableOpacity
//                 onPress={() => navigation.goBack()}
//                 activeOpacity={0.7}
//                 disabled={isLoading}
//               >
//                 <ArrowBackSvg />
//               </TouchableOpacity>
//
//               <Text style={styles.title}>Регистрация</Text>
//
//               <View style={styles.placeholder} />
//             </Animated.View>
//
//             {/* Текст-подсказка */}
//             <Animated.Text
//               entering={FadeInDown.duration(600).delay(200)}
//               style={styles.subtitle}
//             >
//               Введите ваш{'\n'}Email
//             </Animated.Text>
//
//             {/* Контент */}
//             <View style={styles.content}>
//               {/* Поле ввода */}
//               <View style={styles.inputContainer}>
//                 <AstralInput
//                   icon="mail-outline"
//                   placeholder="Ваш email"
//                   value={email}
//                   onChangeText={(text) => {
//                     setEmail(text);
//                     setErrorMessage('');
//                     setIsEmailValid(true);
//                   }}
//                   keyboardType="email-address"
//                   autoComplete="email"
//                   textContentType="emailAddress"
//                   editable={!isLoading}
//                   autoCapitalize="none"
//                 />
//
//                 {/* Сообщение об ошибке */}
//                 {errorMessage ? (
//                   <Animated.Text
//                     entering={FadeInDown.duration(300)}
//                     style={styles.errorText}
//                   >
//                     {errorMessage}
//                   </Animated.Text>
//                 ) : null}
//               </View>
//
//               {/* Информационное сообщение */}
//               <Animated.Text
//                 entering={FadeInDown.duration(600).delay(300)}
//                 style={styles.infoText}
//               >
//                 Мы отправим 6‑значный код на вашу почту
//               </Animated.Text>
//             </View>
//
//             {/* Кнопка "Далее" */}
//             <Animated.View
//               entering={FadeInDown.duration(600).delay(400)}
//               style={styles.buttonContainer}
//             >
//               <TouchableOpacity
//                 style={[
//                   styles.button,
//                   (!email || isLoading) && styles.buttonDisabled,
//                 ]}
//                 onPress={handleNext}
//                 disabled={!email || isLoading}
//                 activeOpacity={0.8}
//               >
//                 {isLoading ? (
//                   <ActivityIndicator color="#000000" size="small" />
//                 ) : (
//                   <Text style={styles.buttonText}>ДАЛЕЕ</Text>
//                 )}
//               </TouchableOpacity>
//             </Animated.View>
//           </ScrollView>
//         </KeyboardAvoidingView>
//       </SafeAreaView>
//     </View>
//   );
// };
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#0D0618',
//   },
//   safeArea: {
//     flex: 1,
//   },
//   keyboardView: {
//     flex: 1,
//   },
//   scrollContent: {
//     flexGrow: 1,
//     paddingHorizontal: 24,
//     paddingTop: 30,
//     paddingBottom: 40,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     marginBottom: 12,
//   },
//
//   title: {
//     fontWeight: '600',
//     fontSize: 24,
//     color: '#FFFFFF',
//     lineHeight: 28,
//     textAlign: 'center',
//   },
//   placeholder: {
//     width: 36,
//   },
//   content: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   subtitle: {
//     fontWeight: '400',
//     fontSize: 22,
//     color: 'rgba(255, 255, 255, 0.7)',
//     textAlign: 'center',
//     lineHeight: 27,
//     marginBottom: 12,
//     marginTop: 24,
//   },
//   inputContainer: {
//     width: '100%',
//     marginBottom: 16,
//   },
//   errorText: {
//     fontWeight: '400',
//     fontSize: 14,
//     color: '#FF6B6B',
//     marginTop: 8,
//     marginLeft: 4,
//   },
//   infoText: {
//     fontWeight: '400',
//     fontSize: 14,
//     color: 'rgba(255, 255, 255, 0.5)',
//     textAlign: 'center',
//     marginBottom: 20,
//     paddingHorizontal: 16,
//   },
//   buttonContainer: {
//     width: '100%',
//     marginTop: 'auto',
//   },
//   button: {
//     backgroundColor: '#ECECEC',
//     borderRadius: 58,
//     paddingVertical: 18,
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#8B5CF6',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     elevation: 4,
//     minHeight: 56,
//   },
//   buttonDisabled: {
//     backgroundColor: 'rgba(236, 236, 236, 0.5)',
//     shadowOpacity: 0,
//   },
//   buttonText: {
//     fontWeight: '500',
//     fontSize: 20,
//     color: '#000000',
//     letterSpacing: 0.5,
//   },
// });
//
// export default AuthEmailScreen;

// src/screens/auth/AuthEmailScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../../components/auth/AuthLayout';
import OnboardingHeader from '../../components/onboarding/OnboardingHeader';
import { AuthButton } from '../../components/auth/AuthButton';
import AstralInput from '../../components/shared/AstralInput';
import { authAPI } from '../../services/api';
import {
  AUTH_COLORS,
  AUTH_TYPOGRAPHY,
  AUTH_LAYOUT,
} from '../../constants/auth.constants';

const AuthEmailScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validateEmail = (text: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(text);
  };

  const handleNext = React.useCallback(async () => {
    setErrorMessage('');

    if (!validateEmail(email)) {
      setIsEmailValid(false);
      setErrorMessage(t('auth.email.errors.invalid'));
      return;
    }

    setIsEmailValid(true);
    setIsLoading(true);

    try {
      await authAPI.sendVerificationCode(email);
      // @ts-ignore
      navigation.navigate('OptCode', {
        email,
        codeLength: 6,
        shouldCreateUser: true,
      });
    } catch (error: any) {
      let message = error.message || t('auth.email.errors.sendFailed');

      if (message.includes('rate limit')) {
        message = t('auth.email.errors.rateLimit');
      } else if (message.includes('Invalid email')) {
        message = t('auth.email.errors.invalid');
      } else if (message.includes('Email not confirmed')) {
        message = t('auth.email.errors.notConfirmed');
      }

      setErrorMessage(message);

      if (!message.includes('rate limit')) {
        Alert.alert(t('auth.email.errors.title'), message, [{ text: t('buttons.ok') }]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, navigation, t]);

  return (
    <AuthLayout>
      <View style={styles.container}>
        <OnboardingHeader
          title={t('auth.email.title')}
          onBack={() => navigation.goBack()}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.Text
              entering={FadeInDown.duration(600).delay(200)}
              style={styles.subtitle}
            >
              {t('auth.email.subtitle')}
            </Animated.Text>

            <View style={styles.content}>
            <View style={styles.inputContainer}>
              <AstralInput
                icon="mail-outline"
                placeholder={t('auth.email.placeholder')}
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

              {errorMessage ? (
                <Animated.Text
                  entering={FadeInDown.duration(300)}
                  style={styles.errorText}
                >
                  {errorMessage}
                </Animated.Text>
              ) : null}
            </View>

            <Animated.Text
              entering={FadeInDown.duration(600).delay(300)}
              style={styles.infoText}
            >
              {t('auth.email.info')}
            </Animated.Text>
          </View>

          <Animated.View
            entering={FadeInDown.duration(600).delay(400)}
            style={styles.buttonContainer}
          >
            <AuthButton
              title={t('auth.email.button')}
              onPress={handleNext}
              disabled={!email}
              loading={isLoading}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: AUTH_LAYOUT.horizontalPadding,
    paddingTop: 30,
    paddingBottom: 40,
  },
  subtitle: {
    ...AUTH_TYPOGRAPHY.subtitle,
    color: AUTH_COLORS.textDim70,
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  errorText: {
    ...AUTH_TYPOGRAPHY.error,
    color: AUTH_COLORS.error,
    marginTop: 8,
    marginLeft: 4,
  },
  infoText: {
    ...AUTH_TYPOGRAPHY.hint,
    color: AUTH_COLORS.textDim50,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 'auto',
  },
});

export default AuthEmailScreen;
