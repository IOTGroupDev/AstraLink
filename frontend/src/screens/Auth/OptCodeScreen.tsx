// // src/screens/OtpCodeScreen.tsx
// import React, { useMemo, useRef, useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   Pressable,
//   KeyboardAvoidingView,
//   Platform,
//   StyleSheet,
//   ActivityIndicator,
// } from 'react-native';
// import * as Clipboard from 'expo-clipboard';
// import * as Haptics from 'expo-haptics';
//
// import CosmicBackground from '../../components/shared/CosmicBackground';
// import { supabase } from '../../services/supabase';
// import { StackScreenProps } from '@react-navigation/stack';
//
// import type { RootStackParamList } from '../../types/navigation';
// import ArrowBackSvg from '../../components/svg/ArrowBackSvg';
//
// type Props = StackScreenProps<RootStackParamList, 'OptCode'>;
//
// const RESEND_SECONDS = 30;
//
// const OtpCodeScreen: React.FC<Props> = ({ route, navigation }) => {
//   const { email, codeLength = 6, shouldCreateUser = true } = route.params;
//   const CODE_LENGTH = codeLength;
//
//   const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
//   const [submitting, setSubmitting] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [resendIn, setResendIn] = useState(RESEND_SECONDS);
//
//   const inputsRef = useRef<Array<TextInput | null>>([]);
//   const submitLock = useRef(false);
//   const lastSubmittedCode = useRef<string | null>(null);
//
//   const setInputRef = (idx: number) => (el: TextInput | null) => {
//     inputsRef.current[idx] = el;
//   };
//
//   // Таймер повторной отправки
//   useEffect(() => {
//     if (resendIn <= 0) return;
//     const t = setInterval(() => setResendIn((s) => s - 1), 1000);
//     return () => clearInterval(t);
//   }, [resendIn]);
//
//   // Авто-вставка из буфера
//   useEffect(() => {
//     let active = true;
//     const poll = async () => {
//       try {
//         const text = await Clipboard.getStringAsync();
//         if (!active) return;
//         const cleaned = (text || '').replace(/\D/g, '').slice(0, CODE_LENGTH);
//         if (cleaned.length === CODE_LENGTH) {
//           setError(null);
//           setDigits(cleaned.split(''));
//         }
//       } catch {}
//     };
//     const id = setInterval(poll, 800);
//     return () => {
//       active = false;
//       clearInterval(id);
//     };
//   }, [CODE_LENGTH]);
//
//   const code = useMemo(() => digits.join(''), [digits]);
//   const canSubmit = code.length === CODE_LENGTH && !submitting;
//
//   const onChangeDigit = (idx: number, val: string) => {
//     setError(null);
//     const v = val.replace(/\D/g, '').slice(-1);
//     setDigits((prev) => {
//       const next = [...prev];
//       next[idx] = v || '';
//       return next;
//     });
//     if (v && idx < CODE_LENGTH - 1) {
//       inputsRef.current[idx + 1]?.focus();
//     }
//   };
//
//   const onKeyPress = (idx: number, e: any) => {
//     if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
//       inputsRef.current[idx - 1]?.focus();
//     }
//   };
//
//   const handleSubmit = async () => {
//     if (!canSubmit) return;
//
//     if (lastSubmittedCode.current === code) return;
//     if (submitLock.current) return;
//
//     submitLock.current = true;
//     lastSubmittedCode.current = code;
//
//     setSubmitting(true);
//     setError(null);
//     try {
//       // На всякий случай выходим из старой сессии, чтобы избежать конфликтов
//       try {
//         await supabase.auth.signOut();
//       } catch {}
//
//       // Основная попытка верификации 6-значного OTP
//       const { data, error } = await supabase.auth.verifyOtp({
//         type: 'email',
//         email: String(email).trim().toLowerCase(),
//         token: code,
//       });
//
//       if (error) {
//         // Обработка "истёк" / "неверный" — отправляем новый код автоматически
//         const msg = error?.message ?? '';
//         const codeName = (error?.code || '').toLowerCase();
//         const isExpired =
//           codeName === 'otp_expired' || /expired|invalid token/i.test(msg);
//
//         if (isExpired) {
//           // Переотправляем код немедленно
//           try {
//             const resend = await supabase.auth.signInWithOtp({
//               email: String(email).trim().toLowerCase(),
//               options: { shouldCreateUser },
//             });
//             if (resend.error) {
//               setError(
//                 resend.error.message ||
//                   'Код истёк. Не удалось отправить новый код.'
//               );
//             } else {
//               setError(
//                 'Код истёк. Мы отправили новый код на почту — введите его целиком.'
//               );
//               setDigits(Array(CODE_LENGTH).fill(''));
//               setResendIn(RESEND_SECONDS);
//               lastSubmittedCode.current = null;
//             }
//           } catch (reErr: any) {
//             setError(
//               reErr?.message ||
//                 'Код истёк. Не удалось отправить новый код, попробуйте ещё раз.'
//             );
//           }
//           return;
//         }
//
//         // Иные ошибки
//         throw error;
//       }
//
//       await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
//
//       // ✅ УСПЕХ — переход на экран загрузки данных
//       navigation.replace('UserDataLoader');
//     } catch (err: any) {
//       await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
//       const msg = err?.message ?? '';
//       const codeName = (err?.code || '').toLowerCase();
//
//       if (/rate limit/i.test(msg)) {
//         setError('Слишком много попыток. Подожди немного и попробуй снова.');
//         lastSubmittedCode.current = null;
//       } else {
//         setError(msg || 'Не удалось подтвердить код');
//       }
//     } finally {
//       setSubmitting(false);
//       submitLock.current = false;
//     }
//   };
//
//   const handleResend = async () => {
//     if (resendIn > 0) return;
//     setError(null);
//     try {
//       const { error } = await supabase.auth.signInWithOtp({
//         email,
//         options: { shouldCreateUser },
//       });
//       if (error) throw error;
//
//       setDigits(Array(CODE_LENGTH).fill(''));
//       setResendIn(RESEND_SECONDS);
//       lastSubmittedCode.current = null;
//     } catch (e: any) {
//       setError(e?.message ?? 'Не удалось отправить код');
//     }
//   };
//
//   return (
//     <View style={{ flex: 1 }}>
//       <CosmicBackground />
//       <KeyboardAvoidingView
//         style={styles.wrapper}
//         contentContainerStyle={{ flexGrow: 1 }}
//         behavior={Platform.select({ ios: 'padding', android: 'height' })}
//       >
//         <View style={styles.headerRow}>
//           <Pressable
//             onPress={() => navigation.goBack()}
//             hitSlop={12}
//             style={styles.backHit}
//           >
//             <ArrowBackSvg />
//           </Pressable>
//           <Text style={styles.title}>Регистрация</Text>
//           <View style={{ width: 45 }} />
//         </View>
//
//         <View style={{ height: 90, justifyContent: 'center' }}>
//           <Text style={styles.subtitle}>Отправили код{'\n'}на вашу почту</Text>
//           <Text style={styles.email}>{email}</Text>
//         </View>
//
//         <View style={styles.centerArea}>
//           <View style={styles.otpRow}>
//             {Array.from({ length: CODE_LENGTH }).map((_, i) => (
//               <TextInput
//                 key={i}
//                 ref={setInputRef(i)}
//                 value={digits[i]}
//                 onChangeText={(v) => onChangeDigit(i, v)}
//                 onKeyPress={(e) => onKeyPress(i, e)}
//                 keyboardType="number-pad"
//                 maxLength={1}
//                 textContentType="oneTimeCode"
//                 selectionColor="white"
//                 style={[styles.box, digits[i] ? styles.boxFilled : null]}
//                 returnKeyType={i === CODE_LENGTH - 1 ? 'done' : 'next'}
//                 autoFocus={i === 0}
//                 onSubmitEditing={() => {
//                   if (i === CODE_LENGTH - 1) handleSubmit();
//                 }}
//               />
//             ))}
//           </View>
//
//           {!!error && <Text style={styles.error}>{error}</Text>}
//         </View>
//
//         <View style={styles.resendRow}>
//           <Text style={styles.resendHint}>Не пришёл код?</Text>
//           <Pressable
//             disabled={resendIn > 0}
//             onPress={handleResend}
//             style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
//           >
//             <Text
//               style={[styles.resendLink, resendIn > 0 && styles.resendDisabled]}
//             >
//               {resendIn > 0
//                 ? `Отправить снова через ${resendIn}с`
//                 : 'Отправить снова'}
//             </Text>
//           </Pressable>
//         </View>
//
//         <Pressable
//           onPress={handleSubmit}
//           disabled={!canSubmit}
//           style={({ pressed }) => [
//             styles.cta,
//             !canSubmit ? styles.ctaDisabled : null,
//             pressed ? { opacity: 0.9 } : null,
//           ]}
//         >
//           {submitting ? (
//             <ActivityIndicator />
//           ) : (
//             <Text style={styles.ctaText}>далее</Text>
//           )}
//         </Pressable>
//       </KeyboardAvoidingView>
//     </View>
//   );
// };
//
// const styles = StyleSheet.create({
//   wrapper: {
//     flex: 1,
//     paddingHorizontal: 24,
//     paddingTop: 24,
//     paddingBottom: 120,
//     justifyContent: 'flex-start',
//   },
//   headerRow: {
//     height: 36,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//   },
//   backHit: { padding: 5 },
//   back: { color: '#fff', fontSize: 28, lineHeight: 28 },
//   title: {
//     color: '#fff',
//     fontSize: 24,
//     fontWeight: '600',
//   },
//   subtitle: {
//     color: 'rgba(255,255,255,0.9)',
//     fontSize: 20,
//     textAlign: 'center',
//     marginTop: 25,
//   },
//   email: {
//     marginTop: 8,
//     color: 'rgba(255,255,255,0.7)',
//     textAlign: 'center',
//   },
//   centerArea: {
//     flex: 1,
//     justifyContent: 'center',
//     marginTop: 8,
//     paddingTop: 40,
//   },
//   otpRow: {
//     marginTop: 0,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   box: {
//     width: 56,
//     height: 56,
//     borderRadius: 16,
//     borderWidth: 1.8,
//     borderColor: '#fff',
//     textAlign: 'center',
//     fontSize: 24,
//     color: '#fff',
//     padding: 0,
//   },
//   boxFilled: {
//     borderColor: '#fff',
//   },
//   error: {
//     marginTop: 16,
//     color: '#ff8080',
//     textAlign: 'center',
//   },
//   cta: {
//     position: 'absolute',
//     left: 24,
//     right: 24,
//     bottom: 45,
//     height: 60,
//     backgroundColor: '#6F1F86',
//     borderRadius: 58,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   ctaDisabled: {
//     opacity: 0.6,
//   },
//   ctaText: {
//     color: '#fff',
//     fontSize: 20,
//     textTransform: 'uppercase',
//   },
//   resendRow: {
//     marginTop: 24,
//     marginBottom: 12,
//     alignItems: 'center',
//   },
//   resendHint: { color: 'rgba(255,255,255,0.7)' },
//   resendLink: { marginTop: 6, color: '#ffffff' },
//   resendDisabled: { color: 'rgba(255,255,255,0.5)' },
// });
//
// export default OtpCodeScreen;

// src/screens/auth/OptCodeScreen.tsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { supabase } from '../../services/supabase';
import { authAPI } from '../../services/api';
import { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../../types/navigation';
import { AUTH_COLORS, AUTH_TYPOGRAPHY } from '../../constants/auth.constants';

type Props = StackScreenProps<RootStackParamList, 'OptCode'>;

const RESEND_SECONDS = 30;

const OtpCodeScreen: React.FC<Props> = ({ route, navigation }) => {
  const {
    email,
    codeLength = 6,
    shouldCreateUser: _shouldCreateUser = true,
  } = route.params;
  const CODE_LENGTH = codeLength;

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);

  const inputsRef = useRef<Array<TextInput | null>>([]);
  const submitLock = useRef(false);
  const lastSubmittedCode = useRef<string | null>(null);

  const setInputRef = (idx: number) => (el: TextInput | null) => {
    inputsRef.current[idx] = el;
  };

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const text = await Clipboard.getStringAsync();
        if (!active) return;
        const cleaned = (text || '').replace(/\D/g, '').slice(0, CODE_LENGTH);
        if (cleaned.length === CODE_LENGTH) {
          setError(null);
          setDigits(cleaned.split(''));
        }
      } catch {}
    };
    const id = setInterval(poll, 800);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [CODE_LENGTH]);

  const code = useMemo(() => digits.join(''), [digits]);
  const canSubmit = code.length === CODE_LENGTH && !submitting;

  const onChangeDigit = (idx: number, val: string) => {
    setError(null);
    const v = val.replace(/\D/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = v || '';
      return next;
    });
    if (v && idx < CODE_LENGTH - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const onKeyPress = (idx: number, e: any) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (lastSubmittedCode.current === code) return;
    if (submitLock.current) return;

    submitLock.current = true;
    lastSubmittedCode.current = code;
    setSubmitting(true);
    setError(null);

    try {
      try {
        await supabase.auth.signOut();
      } catch {}

      const { data, error } = await supabase.auth.verifyOtp({
        type: 'email',
        email: String(email).trim().toLowerCase(),
        token: code,
      });

      if (error) {
        const msg = error?.message ?? '';
        const codeName = (error?.code || '').toLowerCase();
        const isExpired =
          codeName === 'otp_expired' || /expired|invalid token/i.test(msg);

        if (isExpired) {
          try {
            await authAPI.sendVerificationCode(
              String(email).trim().toLowerCase()
            );

            setError(
              'Код истёк. Мы отправили новый код на почту – введите его целиком.'
            );
            setDigits(Array(CODE_LENGTH).fill(''));
            setResendIn(RESEND_SECONDS);
            lastSubmittedCode.current = null;
          } catch (reErr: any) {
            setError(
              reErr?.message ||
                'Код истёк. Не удалось отправить новый код, попробуйте ещё раз.'
            );
          }
          return;
        }

        throw error;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace('UserDataLoader');
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err?.message ?? '';

      if (/rate limit/i.test(msg)) {
        setError('Слишком много попыток. Подожди немного и попробуй снова.');
        lastSubmittedCode.current = null;
      } else {
        setError(msg || 'Не удалось подтвердить код');
      }
    } finally {
      setSubmitting(false);
      submitLock.current = false;
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    setError(null);
    try {
      await authAPI.sendVerificationCode(String(email).trim().toLowerCase());

      setDigits(Array(CODE_LENGTH).fill(''));
      setResendIn(RESEND_SECONDS);
      lastSubmittedCode.current = null;
    } catch (e: any) {
      setError(e?.message ?? 'Не удалось отправить код');
    }
  };

  return (
    <AuthLayout>
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
      >
        <AuthHeader title="Регистрация" onBack={() => navigation.goBack()} />

        <View style={styles.infoContainer}>
          <Text style={styles.subtitle}>Отправили код{'\n'}на вашу почту</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        <View style={styles.centerArea}>
          <View style={styles.otpRow}>
            {Array.from({ length: CODE_LENGTH }).map((_, i) => (
              <TextInput
                key={i}
                ref={setInputRef(i)}
                value={digits[i]}
                onChangeText={(v) => onChangeDigit(i, v)}
                onKeyPress={(e) => onKeyPress(i, e)}
                keyboardType="number-pad"
                maxLength={1}
                textContentType="oneTimeCode"
                selectionColor="white"
                style={[styles.box, digits[i] ? styles.boxFilled : null]}
                returnKeyType={i === CODE_LENGTH - 1 ? 'done' : 'next'}
                autoFocus={i === 0}
                onSubmitEditing={() => {
                  if (i === CODE_LENGTH - 1) handleSubmit();
                }}
              />
            ))}
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>

        <View style={styles.resendRow}>
          <Text style={styles.resendHint}>Не пришёл код?</Text>
          <Pressable disabled={resendIn > 0} onPress={handleResend}>
            <Text
              style={[styles.resendLink, resendIn > 0 && styles.resendDisabled]}
            >
              {resendIn > 0
                ? `Отправить снова через ${resendIn}с`
                : 'Отправить снова'}
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[styles.cta, !canSubmit && styles.ctaDisabled]}
        >
          {submitting ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.ctaText}>далее</Text>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  infoContainer: {
    height: 90,
    justifyContent: 'center',
  },
  subtitle: {
    ...AUTH_TYPOGRAPHY.subtitle,
    fontSize: 20,
    color: AUTH_COLORS.textDim70,
    textAlign: 'center',
    marginTop: 25,
  },
  email: {
    marginTop: 8,
    color: AUTH_COLORS.textDim70,
    textAlign: 'center',
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 40,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  box: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.8,
    borderColor: AUTH_COLORS.text,
    textAlign: 'center',
    fontSize: 24,
    color: AUTH_COLORS.text,
    padding: 0,
  },
  boxFilled: {
    borderColor: AUTH_COLORS.text,
  },
  error: {
    marginTop: 16,
    color: AUTH_COLORS.errorLight,
    textAlign: 'center',
  },
  cta: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 45,
    height: 60,
    backgroundColor: AUTH_COLORS.btnPrimary,
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    color: AUTH_COLORS.text,
    fontSize: 20,
    textTransform: 'uppercase',
  },
  resendRow: {
    marginTop: 24,
    marginBottom: 12,
    alignItems: 'center',
  },
  resendHint: {
    color: AUTH_COLORS.textDim70,
  },
  resendLink: {
    marginTop: 6,
    color: AUTH_COLORS.text,
  },
  resendDisabled: {
    color: AUTH_COLORS.textDim50,
  },
});

export default OtpCodeScreen;
