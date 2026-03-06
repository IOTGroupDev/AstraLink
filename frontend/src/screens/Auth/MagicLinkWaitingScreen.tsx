// // import React, { useEffect, useState } from 'react';
// // import {
// //   View,
// //   Text,
// //   StyleSheet,
// //   TouchableOpacity,
// //   Platform,
// // } from 'react-native';
// // import { useNavigation, useRoute } from '@react-navigation/native';
// // import { Ionicons } from '@expo/vector-icons';
// // import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
// // import CosmicBackground from '../../components/CosmicBackground';
// // import { supabase } from '../../services/supabase';
// // import { tokenService } from '../../services/tokenService';
// // import { authAPI } from '../../services/api';
// //
// // interface RouteParams {
// //   email?: string;
// // }
// //
// // const MagicLinkWaitingScreen: React.FC = () => {
// //   const navigation = useNavigation();
// //   const route = useRoute();
// //   const { email } = (route.params as RouteParams) || {};
// //
// //   const [isChecking, setIsChecking] = useState(false);
// //   const [isResending, setIsResending] = useState(false);
// //   const [message, setMessage] = useState<string | null>(null);
// //
// //   useEffect(() => {
// //     // Mobile: подписываемся на изменения auth state
// //     if (Platform.OS !== 'web') {
// //       const { data: authListener } = supabase.auth.onAuthStateChange(
// //         async (event, session) => {
// //           authLogger.log('🔐 Auth state changed:', event);
// //
// //           if (event === 'SIGNED_IN' && session) {
// //             authLogger.log('✅ Пользователь вошел через magic link');
// //             // @ts-ignore
// //             navigation.replace('UserDataLoader');
// //           }
// //         }
// //       );
// //
// //       return () => {
// //         authListener?.subscription.unsubscribe();
// //       };
// //     }
// //   }, [navigation]);
// //
// //   // Web: слушаем BroadcastChannel (основной канал) + fallback на storage
// //   useEffect(() => {
// //     if (Platform.OS === 'web') {
// //       let bc: BroadcastChannel | null = null;
// //
// //       // Основной канал для мгновенного обмена между вкладками
// //       try {
// //         // @ts-ignore
// //         bc = new BroadcastChannel('supabase-auth');
// //         bc.onmessage = async (event: MessageEvent) => {
// //           try {
// //             const msg: any = event?.data;
// //             if (msg?.type === 'SIGNED_IN' && msg?.accessToken) {
// //               authLogger.log('📡 BroadcastChannel: SIGNED_IN received');
// //               const { error } = await supabase.auth.setSession({
// //                 access_token: msg.accessToken,
// //                 refresh_token: msg.refreshToken || '',
// //               });
// //               if (error) {
// //                 authLogger.error('❌ setSession from BroadcastChannel failed:', error);
// //                 return;
// //               }
// //               // @ts-ignore
// //               navigation.replace('UserDataLoader');
// //             }
// //           } catch (e) {
// //             authLogger.error('BroadcastChannel handler error:', e);
// //           }
// //         };
// //       } catch (e) {
// //         authLogger.warn('BroadcastChannel init failed, will rely on storage fallback:', e);
// //       }
// //
// //       // Fallback: onstorage триггер с локальным токеном (если BroadcastChannel недоступен)
// //       const onStorage = async (e: StorageEvent) => {
// //         try {
// //           if (e.key === 'al_token_broadcast' && e.newValue) {
// //             authLogger.log('🔔 Storage fallback: broadcast flag received');
// //             const token = await tokenService.getToken();
// //             if (token) {
// //               const { error } = await supabase.auth.setSession({
// //                 access_token: token,
// //                 refresh_token: '',
// //               });
// //               if (error) {
// //                 authLogger.error('❌ setSession from storage fallback failed:', error);
// //                 return;
// //               }
// //               // @ts-ignore
// //               navigation.replace('UserDataLoader');
// //             }
// //           }
// //         } catch (err) {
// //           authLogger.error('storage fallback handler error:', err);
// //         }
// //       };
// //       window.addEventListener('storage', onStorage);
// //
// //       return () => {
// //         window.removeEventListener('storage', onStorage);
// //         if (bc) {
// //           try {
// //             bc.close();
// //           } catch {}
// //         }
// //       };
// //     }
// //   }, [navigation]);
// //
// //   const handleCheckEmail = async () => {
// //     setMessage(null);
// //     setIsChecking(true);
// //     try {
// //       if (Platform.OS === 'web') {
// //         // Пытаемся прочитать токен, сохранённый callback-вкладкой
// //         const token = await tokenService.getToken();
// //         if (token) {
// //           authLogger.log('🔑 Token found in storage, establishing session in this tab');
// //           const { error } = await supabase.auth.setSession({
// //             access_token: token,
// //             refresh_token: '',
// //           });
// //           if (error) {
// //             authLogger.error('❌ setSession failed:', error);
// //             setMessage('Не удалось применить сессию. Обновите страницу и повторите.');
// //           } else {
// //             // @ts-ignore
// //             navigation.replace('UserDataLoader');
// //             return;
// //           }
// //         } else {
// //           setMessage('Сначала перейдите по ссылке из письма на этом устройстве.');
// //         }
// //       } else {
// //         // Mobile: проверяем текущую сессию
// //         const {
// //           data: { session },
// //         } = await supabase.auth.getSession();
// //
// //         if (session) {
// //           authLogger.log('✅ Сессия найдена');
// //           // @ts-ignore
// //           navigation.replace('UserDataLoader');
// //           return;
// //         } else {
// //           setMessage('Сессия не найдена. Откройте ссылку из письма.');
// //         }
// //       }
// //     } finally {
// //       setIsChecking(false);
// //     }
// //   };
// //
// //   const handleResendLink = async () => {
// //     if (!email) {
// //       setMessage('Email не указан. Вернитесь и введите email.');
// //       return;
// //     }
// //     setIsResending(true);
// //     setMessage(null);
// //     try {
// //       await authAPI.sendVerificationCode(email);
// //       setMessage('Ссылка отправлена повторно. Проверьте почту.');
// //     } catch (err: any) {
// //       authLogger.error('Resend magic link error:', err);
// //       setMessage(err?.message || 'Не удалось отправить ссылку. Повторите позже.');
// //     } finally {
// //       setIsResending(false);
// //     }
// //   };
// //
// //   const handleChangeEmail = () => {
// //     // @ts-ignore
// //     navigation.navigate('AuthEmail');
// //   };
// //
// //   return (
// //     <View style={styles.container}>
// //       <CosmicBackground />
// //
// //       <View style={styles.content}>
// //         {/* Иконка письма */}
// //         <Animated.View entering={FadeIn.duration(600)} style={styles.iconContainer}>
// //           <Ionicons name="mail-outline" size={80} color="#8B5CF6" />
// //         </Animated.View>
// //
// //         {/* Заголовок */}
// //         <Animated.Text entering={FadeInDown.duration(600).delay(200)} style={styles.title}>
// //           Проверьте почту
// //         </Animated.Text>
// //
// //         {/* Описание */}
// //         <Animated.Text entering={FadeInDown.duration(600).delay(300)} style={styles.description}>
// //           Мы отправили письмо со ссылкой для входа на
// //         </Animated.Text>
// //
// //         {email && (
// //           <Animated.Text entering={FadeInDown.duration(600).delay(400)} style={styles.email}>
// //             {email}
// //           </Animated.Text>
// //         )}
// //
// //         {/* Инструкция */}
// //         <Animated.View
// //           entering={FadeInDown.duration(600).delay(500)}
// //           style={styles.instructionContainer}
// //         >
// //           <View style={styles.instructionItem}>
// //             <View style={styles.bulletPoint} />
// //             <Text style={styles.instructionText}>Откройте письмо на этом устройстве</Text>
// //           </View>
// //           <View style={styles.instructionItem}>
// //             <View style={styles.bulletPoint} />
// //             <Text style={styles.instructionText}>Нажмите на ссылку для входа</Text>
// //           </View>
// //           <View style={styles.instructionItem}>
// //             <View style={styles.bulletPoint} />
// //             <Text style={styles.instructionText}>Ссылка действительна 24 часа</Text>
// //           </View>
// //         </Animated.View>
// //
// //         {/* Сообщение пользователю */}
// //         {message ? (
// //           <Animated.Text entering={FadeInDown.duration(300)} style={[styles.hint, { marginBottom: 8 }]}>
// //             {message}
// //           </Animated.Text>
// //         ) : null}
// //
// //         {/* Действия (Web) */}
// //         {Platform.OS === 'web' && (
// //           <Animated.View
// //             entering={FadeInDown.duration(600).delay(600)}
// //             style={[styles.buttonContainer, { gap: 12 }]}
// //           >
// //             <TouchableOpacity
// //               style={styles.checkButton}
// //               onPress={handleCheckEmail}
// //               disabled={isChecking}
// //               activeOpacity={0.8}
// //             >
// //               <Text style={styles.checkButtonText}>
// //                 {isChecking ? 'Проверка...' : 'Я уже перешел по ссылке'}
// //               </Text>
// //             </TouchableOpacity>
// //
// //             <TouchableOpacity
// //               style={[
// //                 styles.checkButton,
// //                 { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.6)' },
// //               ]}
// //               onPress={handleResendLink}
// //               disabled={isResending}
// //               activeOpacity={0.8}
// //             >
// //               <Text style={[styles.checkButtonText, { color: '#8B5CF6' }]}>
// //                 {isResending ? 'Отправка...' : 'Отправить ссылку еще раз'}
// //               </Text>
// //             </TouchableOpacity>
// //
// //             <TouchableOpacity
// //               style={[styles.backButton, { alignSelf: 'center', paddingHorizontal: 0 }]}
// //               onPress={handleChangeEmail}
// //               activeOpacity={0.7}
// //             >
// //               <Text style={[styles.backButtonText, { textDecorationLine: 'underline' }]}>
// //                 Изменить email
// //               </Text>
// //             </TouchableOpacity>
// //           </Animated.View>
// //         )}
// //
// //         {/* Кнопка назад */}
// //         <Animated.View entering={FadeInDown.duration(600).delay(700)} style={styles.backButtonContainer}>
// //           <TouchableOpacity
// //             onPress={() => navigation.goBack()}
// //             style={styles.backButton}
// //             activeOpacity={0.7}
// //           >
// //             <Ionicons name="arrow-back" size={20} color="rgba(255, 255, 255, 0.7)" />
// //             <Text style={styles.backButtonText}>Назад</Text>
// //           </TouchableOpacity>
// //         </Animated.View>
// //
// //         {/* Hint */}
// //         <Animated.Text entering={FadeInDown.duration(600).delay(800)} style={styles.hint}>
// //           Не пришло письмо? Проверьте папку "Спам"
// //         </Animated.Text>
// //       </View>
// //     </View>
// //   );
// // };
// //
// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     backgroundColor: '#0D0618',
// //   },
// //   content: {
// //     flex: 1,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //     paddingHorizontal: 32,
// //   },
// //   iconContainer: {
// //     width: 120,
// //     height: 120,
// //     borderRadius: 60,
// //     backgroundColor: 'rgba(139, 92, 246, 0.1)',
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //     marginBottom: 32,
// //   },
// //   title: {
// //     fontFamily: 'Montserrat_600SemiBold',
// //     fontSize: 28,
// //     color: '#FFFFFF',
// //     textAlign: 'center',
// //     marginBottom: 16,
// //   },
// //   description: {
// //     fontFamily: 'Montserrat_400Regular',
// //     fontSize: 16,
// //     color: 'rgba(255, 255, 255, 0.7)',
// //     textAlign: 'center',
// //     marginBottom: 8,
// //   },
// //   email: {
// //     fontFamily: 'Montserrat_600SemiBold',
// //     fontSize: 16,
// //     color: '#8B5CF6',
// //     textAlign: 'center',
// //     marginBottom: 32,
// //   },
// //   instructionContainer: {
// //     width: '100%',
// //     backgroundColor: 'rgba(139, 92, 246, 0.05)',
// //     borderRadius: 16,
// //     padding: 20,
// //     marginBottom: 32,
// //   },
// //   instructionItem: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     marginBottom: 12,
// //   },
// //   bulletPoint: {
// //     width: 6,
// //     height: 6,
// //     borderRadius: 3,
// //     backgroundColor: '#8B5CF6',
// //     marginRight: 12,
// //   },
// //   instructionText: {
// //     fontFamily: 'Montserrat_400Regular',
// //     fontSize: 14,
// //     color: 'rgba(255, 255, 255, 0.8)',
// //     flex: 1,
// //   },
// //   buttonContainer: {
// //     width: '100%',
// //     marginBottom: 16,
// //   },
// //   checkButton: {
// //     width: '100%',
// //     backgroundColor: '#8B5CF6',
// //     borderRadius: 58,
// //     paddingVertical: 16,
// //     alignItems: 'center',
// //     justifyContent: 'center',
// //   },
// //   checkButtonText: {
// //     fontFamily: 'Montserrat_500Medium',
// //     fontSize: 16,
// //     color: '#FFFFFF',
// //   },
// //   backButtonContainer: {
// //     marginBottom: 16,
// //   },
// //   backButton: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     paddingVertical: 8,
// //     paddingHorizontal: 16,
// //   },
// //   backButtonText: {
// //     fontFamily: 'Montserrat_500Medium',
// //     fontSize: 16,
// //     color: 'rgba(255, 255, 255, 0.7)',
// //     marginLeft: 8,
// //   },
// //   hint: {
// //     fontFamily: 'Montserrat_400Regular',
// //     fontSize: 12,
// //     color: 'rgba(255, 255, 255, 0.5)',
// //     textAlign: 'center',
// //   },
// // });
// //
// // export default MagicLinkWaitingScreen;
//
//
// import React, { useEffect, useState } from 'react';
// import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Platform } from 'react-native';
// import { useNavigation, useRoute } from '@react-navigation/native';
// import * as AuthSession from 'expo-auth-session';
// import Constants from 'expo-constants';
// import { supabase } from '../../services/supabase'; // <- поправь путь, если у тебя другой
//
// type RouteParams = { email?: string };
//
// function getRedirectUri() {
//   const isExpoGo = Constants.appOwnership === 'expo';
//   return AuthSession.makeRedirectUri({
//     useProxy: isExpoGo,
//     scheme: 'astralink',
//     path: 'auth/callback',
//   });
// }
//
// export default function MagicLinkWaitingScreen() {
//   const navigation = useNavigation<any>();
//   const route = useRoute<any>();
//   const email = (route.params as RouteParams)?.email ?? '';
//   const [checking, setChecking] = useState(false);
//   const [resending, setResending] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//
//   // Слушаем изменение auth-состояния — как только юзер кликнет ссылку в письме,
//   // супабейс создаст сессию, мы это поймаем и уедем в приложение.
//   useEffect(() => {
//     const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
//       if (session?.access_token) {
//         try {
//           setChecking(true);
//           // Если у тебя есть сервис сохранения токена — сохрани при необходимости
//           // await tokenService.saveAccessToken(session.access_token);
//
//           navigation.reset({
//             index: 0,
//             routes: [{ name: 'Main' }], // <- замени на корневой экран твоего приложения
//           });
//         } finally {
//           setChecking(false);
//         }
//       }
//     });
//
//     return () => {
//       sub.subscription?.unsubscribe?.();
//     };
//   }, [navigation]);
//
//   const onOpenMail = async () => {
//     // Пробуем открыть почтовое приложение (не на всех устройствах сработает)
//     try {
//       // mailto: откроет выбор почтового клиента
//       await Linking.openURL('mailto:');
//     } catch {
//       // no-op
//     }
//   };
//
//   const onChangeEmail = () => {
//     navigation.navigate('AuthEmail');
//   };
//
//   const onResend = async () => {
//     setError(null);
//     if (!email) return;
//
//     try {
//       setResending(true);
//       const emailRedirectTo = getRedirectUri();
//       const { error } = await supabase.auth.signInWithOtp({
//         email,
//         options: {
//           shouldCreateUser: true,
//           emailRedirectTo,
//         },
//       });
//       if (error) throw error;
//     } catch (e: any) {
//       setError(e?.message ?? 'Не удалось отправить повторно');
//     } finally {
//       setResending(false);
//     }
//   };
//
//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Проверь почту</Text>
//       <Text style={styles.subtitle}>Мы отправили ссылку для входа на</Text>
//       <Text style={styles.email}>{email}</Text>
//
//       {!!error && <Text style={styles.error}>{error}</Text>}
//
//       <TouchableOpacity onPress={onOpenMail} style={styles.primaryBtn} disabled={checking}>
//         {checking ? <ActivityIndicator /> : <Text style={styles.primaryText}>Открыть почту</Text>}
//       </TouchableOpacity>
//
//       <TouchableOpacity onPress={onResend} style={styles.secondaryBtn} disabled={resending || checking}>
//         {resending ? <ActivityIndicator /> : <Text style={styles.secondaryText}>Отправить ещё раз</Text>}
//       </TouchableOpacity>
//
//       <TouchableOpacity onPress={onChangeEmail} style={styles.ghostBtn} disabled={checking}>
//         <Text style={styles.ghostText}>Указать другой email</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }
//
// const styles = StyleSheet.create({
//   container: { flex: 1, padding: 24, justifyContent: 'center' },
//   title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
//   subtitle: { fontSize: 14, opacity: 0.7, textAlign: 'center' },
//   email: { fontSize: 16, textAlign: 'center', marginTop: 2, marginBottom: 24, fontWeight: '600' },
//   error: { color: '#d00', textAlign: 'center', marginBottom: 8 },
//   primaryBtn: { padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
//   primaryText: { fontSize: 16, fontWeight: '600' },
//   secondaryBtn: { padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 12, borderWidth: 1 },
//   secondaryText: { fontSize: 14, fontWeight: '600' },
//   ghostBtn: { padding: 10, alignItems: 'center', marginTop: 10 },
//   ghostText: { fontSize: 14, opacity: 0.8, textDecorationLine: 'underline' },
// });

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import CosmicBackground from '../../components/shared/CosmicBackground';
import { authAPI } from '../../services/api';
import { authLogger } from '../../services/logger';

type RouteParams = { email?: string };

export default function MagicLinkWaitingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const email = (route.params as RouteParams)?.email ?? '';
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const onOpenMail = async () => {
    try {
      await Linking.openURL('mailto:');
    } catch {
      // Игнорируем ошибки
    }
  };

  const onChangeEmail = () => {
    navigation.navigate('AuthEmail');
  };

  const onResend = async () => {
    setError(null);
    if (!email) {
      setError('Email не указан');
      return;
    }

    try {
      setResending(true);

      // Используем общий хендлер (с ретраем без shouldCreateUser при 23505/users_email_key)
      await authAPI.sendVerificationCode(String(email).trim().toLowerCase());

      authLogger.log('✅ OTP повторно отправлен');
    } catch (e: any) {
      authLogger.error('❌ Ошибка повторной отправки:', e);
      setError(e?.message ?? 'Не удалось отправить повторно');
    } finally {
      setResending(false);
    }
  };

  const onVerifyCode = async () => {
    try {
      setError(null);
      if (!email) {
        setError('Email не указан');
        return;
      }
      if (!code || code.trim().length < 6) {
        setError('Введите 6-значный код из письма');
        return;
      }
      setVerifying(true);

      // Проверяем OTP код — создаст session при успехе
      await authAPI.verifyCode(email, code.trim());
    } catch (e: any) {
      authLogger.error('❌ Ошибка подтверждения кода:', e);
      const msg =
        e?.message ||
        'Не удалось подтвердить код. Убедитесь, что вы ввели его правильно';
      setError(msg);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <View style={styles.container}>
      <CosmicBackground />

      <View style={styles.content}>
        {/* Иконка письма */}
        <Animated.View
          entering={FadeIn.duration(600)}
          style={styles.iconContainer}
        >
          <Ionicons name="mail-outline" size={80} color="#8B5CF6" />
        </Animated.View>

        {/* Заголовок */}
        <Animated.Text
          entering={FadeInDown.duration(600).delay(200)}
          style={styles.title}
        >
          Проверьте почту
        </Animated.Text>

        {/* Описание */}
        <Animated.Text
          entering={FadeInDown.duration(600).delay(300)}
          style={styles.description}
        >
          Мы отправили письмо со ссылкой для входа на
        </Animated.Text>

        {email && (
          <Animated.Text
            entering={FadeInDown.duration(600).delay(400)}
            style={styles.email}
          >
            {email}
          </Animated.Text>
        )}

        {/* Инструкция */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(500)}
          style={styles.instructionContainer}
        >
          <View style={styles.instructionItem}>
            <View style={styles.bulletPoint} />
            <Text style={styles.instructionText}>
              Откройте письмо на этом устройстве
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.bulletPoint} />
            <Text style={styles.instructionText}>
              Нажмите на ссылку для входа
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.bulletPoint} />
            <Text style={styles.instructionText}>
              Ссылка действительна 24 часа
            </Text>
          </View>
        </Animated.View>

        {/* Сообщение об ошибке */}
        {error && (
          <Animated.Text
            entering={FadeInDown.duration(300)}
            style={styles.errorText}
          >
            {error}
          </Animated.Text>
        )}

        {/* Ввод 6-значного кода из письма */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(550)}
          style={styles.codeContainer}
        >
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.replace(/\\D/g, '').slice(0, 6))}
            placeholder="Введите 6-значный код"
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="number-pad"
            maxLength={6}
            style={styles.codeInput}
          />
          <TouchableOpacity
            onPress={onVerifyCode}
            style={[styles.primaryButton, { marginTop: 12 }]}
            disabled={verifying}
            activeOpacity={0.8}
          >
            {verifying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Подтвердить код</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Кнопки действий */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(600)}
          style={styles.buttonsContainer}
        >
          <TouchableOpacity
            onPress={onOpenMail}
            style={styles.primaryButton}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Открыть почту</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onResend}
            style={styles.secondaryButton}
            disabled={resending}
            activeOpacity={0.8}
          >
            {resending ? (
              <ActivityIndicator color="#8B5CF6" />
            ) : (
              <Text style={styles.secondaryButtonText}>Отправить ещё раз</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onChangeEmail}
            style={styles.ghostButton}
            activeOpacity={0.7}
          >
            <Text style={styles.ghostButtonText}>Указать другой email</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Подсказка */}
        <Animated.Text
          entering={FadeInDown.duration(600).delay(800)}
          style={styles.hint}
        >
          Не пришло письмо? Проверьте папку "Спам"
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0618',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 28,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 8,
  },
  email: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    color: '#8B5CF6',
    textAlign: 'center',
    marginBottom: 32,
  },
  instructionContainer: {
    width: '100%',
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8B5CF6',
    marginRight: 12,
  },
  instructionText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  errorText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  codeContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: 8,
  },
  codeInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderRadius: 12,
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 58,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  primaryButtonText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
    color: '#FFFFFF',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderRadius: 58,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  secondaryButtonText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
    color: '#8B5CF6',
  },
  ghostButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  ghostButtonText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'underline',
  },
  hint: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 24,
  },
});
