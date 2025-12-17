// import React, { useState } from 'react';
// import {
//   StyleSheet,
//   View,
//   Text,
//   TouchableOpacity,
//   SafeAreaView,
//   ActivityIndicator,
//   Alert,
// } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import CosmicBackground from '../../components/shared/CosmicBackground';
// import { useNavigation } from '@react-navigation/native';
// import { authAPI } from '../../services/api';
// import { useAuthStore } from '../../stores/auth.store';
// import { useOnboardingStore } from '../../stores/onboarding.store';
// import {
//   withBiometricProtection,
//   handleOAuthError,
//   needsOnboarding,
// } from '../../services/oauthHelper';
//
// const SignUpScreen = () => {
//   const navigation = useNavigation();
//   const [loading, setLoading] = useState(false);
//   const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
//
//   const { login } = useAuthStore();
//   const { setCompleted } = useOnboardingStore();
//
//   const handleEmailSignUp = () => {
//     navigation.navigate('AuthEmail' as never);
//   };
//
//   const handleGoogleSignUp = async () => {
//     try {
//       setLoading(true);
//       setLoadingProvider('google');
//       authLogger.log('🔐 Начинаем Google регистрацию');
//
//       // OAuth с биометрической защитой (если включена)
//       const response = await withBiometricProtection(
//         () => authAPI.googleSignIn(),
//         'Google'
//       );
//
//       authLogger.log('✅ Google авторизация успешна');
//
//       // Сохраняем пользователя в store
//       login(response.user);
//
//       // Проверяем заполнены ли данные о рождении
//       if (needsOnboarding(response.user)) {
//         authLogger.log('📝 Требуется заполнить данные о рождении');
//         navigation.navigate('OnboardingName' as never);
//       } else {
//         setCompleted(true);
//         navigation.navigate('Main' as never);
//       }
//     } catch (error: any) {
//       authLogger.error('❌ Google sign up error:', error);
//       handleOAuthError(error, 'Google');
//     } finally {
//       setLoading(false);
//       setLoadingProvider(null);
//     }
//   };
//
//   const handleAppleSignUp = async () => {
//     try {
//       setLoading(true);
//       setLoadingProvider('apple');
//       authLogger.log('🍎 Apple sign up');
//
//       // TODO: Реализовать Apple OAuth
//       Alert.alert(
//         'В разработке',
//         'Авторизация через Apple будет доступна в следующей версии',
//         [{ text: 'OK' }]
//       );
//     } catch (error: any) {
//       authLogger.error('❌ Apple sign up error:', error);
//       handleOAuthError(error, 'Apple');
//     } finally {
//       setLoading(false);
//       setLoadingProvider(null);
//     }
//   };
//
//   const handleVKSignUp = async () => {
//     try {
//       setLoading(true);
//       setLoadingProvider('vk');
//       authLogger.log('🔵 VK sign up');
//
//       // TODO: Реализовать VK OAuth
//       Alert.alert(
//         'В разработке',
//         'Авторизация через VK будет доступна в следующей версии',
//         [{ text: 'OK' }]
//       );
//     } catch (error: any) {
//       authLogger.error('❌ VK sign up error:', error);
//       handleOAuthError(error, 'VK');
//     } finally {
//       setLoading(false);
//       setLoadingProvider(null);
//     }
//   };
//
//   return (
//     <View style={styles.container}>
//       <CosmicBackground />
//
//       <SafeAreaView style={styles.safeArea}>
//         <View style={styles.content}>
//           {/* Header */}
//           <View style={styles.header}>
//             <TouchableOpacity
//               style={styles.backButton}
//               onPress={() => navigation.goBack()}
//               disabled={loading}
//             >
//               <Ionicons
//                 name="arrow-back"
//                 size={24}
//                 color="rgba(255, 255, 255, 0.7)"
//               />
//             </TouchableOpacity>
//
//             <Text style={styles.title}>Регистрация</Text>
//
//             <View style={styles.placeholder} />
//           </View>
//
//           {/* Main Content */}
//           <View style={styles.mainContent}>
//             <Text style={styles.subtitle}>
//               Выберите способ{'\n'}авторизации
//             </Text>
//
//             <View style={styles.buttonsContainer}>
//               {/* Email Button */}
//               <TouchableOpacity
//                 style={[styles.emailButton, loading && styles.disabledButton]}
//                 onPress={handleEmailSignUp}
//                 activeOpacity={0.8}
//                 disabled={loading}
//               >
//                 <Text style={styles.emailButtonText}>через почту</Text>
//               </TouchableOpacity>
//
//               {/* Social Buttons */}
//               <View style={styles.socialButtons}>
//                 {/* Google */}
//                 <TouchableOpacity
//                   style={[
//                     styles.socialButton,
//                     loading &&
//                       loadingProvider !== 'google' &&
//                       styles.disabledButton,
//                   ]}
//                   onPress={handleGoogleSignUp}
//                   activeOpacity={0.8}
//                   disabled={loading}
//                 >
//                   {loadingProvider === 'google' ? (
//                     <ActivityIndicator color="#ECECEC" size="small" />
//                   ) : (
//                     <Ionicons name="logo-google" size={28} color="#ECECEC" />
//                   )}
//                 </TouchableOpacity>
//
//                 {/* Apple */}
//                 <TouchableOpacity
//                   style={[
//                     styles.socialButton,
//                     loading &&
//                       loadingProvider !== 'apple' &&
//                       styles.disabledButton,
//                   ]}
//                   onPress={handleAppleSignUp}
//                   activeOpacity={0.8}
//                   disabled={loading}
//                 >
//                   {loadingProvider === 'apple' ? (
//                     <ActivityIndicator color="#ECECEC" size="small" />
//                   ) : (
//                     <Ionicons name="logo-apple" size={32} color="#ECECEC" />
//                   )}
//                 </TouchableOpacity>
//
//                 {/* VK */}
//                 <TouchableOpacity
//                   style={[
//                     styles.socialButton,
//                     loading &&
//                       loadingProvider !== 'vk' &&
//                       styles.disabledButton,
//                   ]}
//                   onPress={handleVKSignUp}
//                   activeOpacity={0.8}
//                   disabled={loading}
//                 >
//                   {loadingProvider === 'vk' ? (
//                     <ActivityIndicator color="#ECECEC" size="small" />
//                   ) : (
//                     <View style={styles.vkIcon}>
//                       <Text style={styles.vkText}>VK</Text>
//                     </View>
//                   )}
//                 </TouchableOpacity>
//               </View>
//             </View>
//
//             {/* Hint Text */}
//             {loading && (
//               <Text style={styles.loadingText}>
//                 {loadingProvider === 'google' && 'Авторизация через Google...'}
//                 {loadingProvider === 'apple' && 'Авторизация через Apple...'}
//                 {loadingProvider === 'vk' && 'Авторизация через VK...'}
//               </Text>
//             )}
//           </View>
//         </View>
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
//   content: {
//     flex: 1,
//     paddingHorizontal: 24,
//     paddingTop: 20,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     marginBottom: 36,
//   },
//   backButton: {
//     width: 36,
//     height: 36,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   title: {
//     fontFamily: 'Montserrat-SemiBold',
//     fontSize: 24,
//     fontWeight: '600',
//     color: '#FFFFFF',
//     letterSpacing: 0,
//     textAlign: 'center',
//   },
//   placeholder: {
//     width: 36,
//   },
//   mainContent: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingBottom: 100,
//   },
//   subtitle: {
//     fontFamily: 'Montserrat-Regular',
//     fontSize: 22,
//     fontWeight: '400',
//     color: 'rgba(255, 255, 255, 0.7)',
//     textAlign: 'center',
//     marginBottom: 36,
//     lineHeight: 27,
//   },
//   buttonsContainer: {
//     width: '100%',
//     gap: 12,
//   },
//   emailButton: {
//     width: '100%',
//     height: 60,
//     backgroundColor: '#ECECEC',
//     borderRadius: 58,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 28,
//     paddingVertical: 14,
//   },
//   emailButtonText: {
//     fontFamily: 'Montserrat-Medium',
//     fontSize: 20,
//     fontWeight: '500',
//     color: '#000000',
//     textTransform: 'uppercase',
//     letterSpacing: 0,
//   },
//   socialButtons: {
//     flexDirection: 'row',
//     gap: 10,
//     width: '100%',
//   },
//   socialButton: {
//     flex: 1,
//     height: 60,
//     borderRadius: 58,
//     borderWidth: 1,
//     borderColor: '#ECECEC',
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'transparent',
//   },
//   vkIcon: {
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   vkText: {
//     fontFamily: 'Montserrat-Bold',
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#ECECEC',
//   },
//   disabledButton: {
//     opacity: 0.5,
//   },
//   loadingText: {
//     fontFamily: 'Montserrat-Regular',
//     fontSize: 14,
//     color: 'rgba(255, 255, 255, 0.6)',
//     marginTop: 20,
//     textAlign: 'center',
//   },
// });
//
// export default SignUpScreen;

// src/screens/auth/SignUpScreen.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../../components/auth/AuthLayout';
import OnboardingHeader from '../../components/onboarding/OnboardingHeader';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { useOnboardingStore } from '../../stores/onboarding.store';
import {
  withBiometricProtection,
  handleOAuthError,
  needsOnboarding,
} from '../../services/oauthHelper';
import {
  AUTH_COLORS,
  AUTH_TYPOGRAPHY,
  AUTH_LAYOUT,
} from '../../constants/auth.constants';

const SignUpScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const { login } = useAuthStore();
  const { setCompleted } = useOnboardingStore();

  const handleEmailSignUp = () => {
    navigation.navigate('AuthEmail' as never);
  };

  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      setLoadingProvider('google');
      const response = await withBiometricProtection(
        () => authAPI.googleSignIn(),
        'Google'
      );
      login(response.user);

      if (needsOnboarding(response.user)) {
        navigation.navigate('OnboardingName' as never);
      } else {
        setCompleted(true);
        navigation.navigate('Main' as never);
      }
    } catch (error: any) {
      handleOAuthError(error, 'Google');
    } finally {
      setLoading(false);
      setLoadingProvider(null);
    }
  };

  const handleAppleSignUp = async () => {
    try {
      setLoading(true);
      setLoadingProvider('apple');
      const response = await withBiometricProtection(
        () => authAPI.appleSignIn(),
        'Apple'
      );

      // Сохраняем пользователя в store
      login(response.user);

      // Проверяем, нужен ли онбординг
      if (needsOnboarding(response.user)) {
        navigation.navigate('OnboardingName' as never);
      } else {
        setCompleted(true);
        navigation.navigate('Main' as never);
      }
    } catch (error: any) {
      handleOAuthError(error, 'Apple');
    } finally {
      setLoading(false);
      setLoadingProvider(null);
    }
  };

  const handleVKSignUp = async () => {
    try {
      setLoading(true);
      setLoadingProvider('vk');
      Alert.alert(
        'В разработке',
        'Авторизация через VK будет доступна в следующей версии',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      handleOAuthError(error, 'VK');
    } finally {
      setLoading(false);
      setLoadingProvider(null);
    }
  };

  return (
    <AuthLayout>
      <View style={styles.container}>
        <OnboardingHeader
          title={t('auth.signUp.title')}
          onBack={() => navigation.goBack()}
        />

        <View style={styles.content}>
          <Text style={styles.subtitle}>{t('auth.signUp.subtitle')}</Text>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.emailButton, loading && styles.disabledButton]}
              onPress={handleEmailSignUp}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text style={styles.emailButtonText}>{t('auth.signUp.emailButton')}</Text>
            </TouchableOpacity>

            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={[
                  styles.socialButton,
                  loading &&
                    loadingProvider !== 'google' &&
                    styles.disabledButton,
                ]}
                onPress={handleGoogleSignUp}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loadingProvider === 'google' ? (
                  <ActivityIndicator color={AUTH_COLORS.border} size="small" />
                ) : (
                  <Ionicons
                    name="logo-google"
                    size={28}
                    color={AUTH_COLORS.border}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.socialButton,
                  loading &&
                    loadingProvider !== 'apple' &&
                    styles.disabledButton,
                ]}
                onPress={handleAppleSignUp}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loadingProvider === 'apple' ? (
                  <ActivityIndicator color={AUTH_COLORS.border} size="small" />
                ) : (
                  <Ionicons
                    name="logo-apple"
                    size={32}
                    color={AUTH_COLORS.border}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.socialButton,
                  loading && loadingProvider !== 'vk' && styles.disabledButton,
                ]}
                onPress={handleVKSignUp}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loadingProvider === 'vk' ? (
                  <ActivityIndicator color={AUTH_COLORS.border} size="small" />
                ) : (
                  <View style={styles.vkIcon}>
                    <Text style={styles.vkText}>VK</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {loading && (
            <Text style={styles.loadingText}>
              {loadingProvider === 'google' && t('auth.signUp.loading.google')}
              {loadingProvider === 'apple' && t('auth.signUp.loading.apple')}
              {loadingProvider === 'vk' && t('auth.signUp.loading.vk')}
            </Text>
          )}
        </View>
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: AUTH_LAYOUT.horizontalPadding,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  subtitle: {
    ...AUTH_TYPOGRAPHY.subtitle,
    color: AUTH_COLORS.textDim70,
    textAlign: 'center',
    marginBottom: 36,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  emailButton: {
    width: '100%',
    height: AUTH_LAYOUT.buttonHeight,
    backgroundColor: AUTH_COLORS.btnBg,
    borderRadius: AUTH_LAYOUT.buttonRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailButtonText: {
    ...AUTH_TYPOGRAPHY.button,
    color: AUTH_COLORS.btnText,
    textTransform: 'uppercase',
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  socialButton: {
    flex: 1,
    height: AUTH_LAYOUT.buttonHeight,
    borderRadius: AUTH_LAYOUT.buttonRadius,
    borderWidth: 1,
    borderColor: AUTH_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  vkIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  vkText: {
    fontSize: 20,
    fontWeight: '700',
    color: AUTH_COLORS.border,
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingText: {
    ...AUTH_TYPOGRAPHY.hint,
    color: AUTH_COLORS.textDim60,
    marginTop: 20,
    textAlign: 'center',
  },
});

export default SignUpScreen;
