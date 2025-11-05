// src/screens/OtpCodeScreen.tsx
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

import CosmicBackground from '../../components/CosmicBackground';
import { supabase } from '../../services/supabase';
import { StackScreenProps } from '@react-navigation/stack';

type RootStackParamList = {
  OtpCode: {
    email: string;
    codeLength?: number;
    shouldCreateUser?: boolean;
  };
  UserDataLoader: undefined; // 👈 добавлен переход сюда
};

type Props = StackScreenProps<RootStackParamList, 'OtpCode'>;

const RESEND_SECONDS = 30;

const OtpCodeScreen: React.FC<Props> = ({ route, navigation }) => {
  const { email, codeLength = 6, shouldCreateUser = true } = route.params;
  const CODE_LENGTH = codeLength;

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);

  const inputsRef = useRef<Array<TextInput | null>>([]);
  const submitLock = useRef(false);
  const lastSubmittedCode = useRef<string | null>(null);

  // Таймер повторной отправки
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  // Авто-вставка из буфера
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
      const { error } = await supabase.auth.verifyOtp({
        type: 'email',
        email,
        token: code,
      });
      if (error) throw error;

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // ✅ УСПЕХ — переход на экран загрузки данных
      navigation.replace('UserDataLoader');
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err?.message ?? '';
      const codeName = (err?.code || '').toLowerCase();

      if (codeName === 'otp_expired' || /expired|invalid token/i.test(msg)) {
        setError('Код истёк. Запроси новый и введи его целиком.');
        setDigits(Array(CODE_LENGTH).fill(''));
        setResendIn(0);
        lastSubmittedCode.current = null;
      } else if (/rate limit/i.test(msg)) {
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
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser },
      });
      if (error) throw error;

      setDigits(Array(CODE_LENGTH).fill(''));
      setResendIn(RESEND_SECONDS);
      lastSubmittedCode.current = null;
    } catch (e: any) {
      setError(e?.message ?? 'Не удалось отправить код');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground />
      <KeyboardAvoidingView
        style={styles.wrapper}
        contentContainerStyle={{ flexGrow: 1 }}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.backHit}
          >
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={styles.title}>Регистрация</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={{ height: 90, justifyContent: 'center' }}>
          <Text style={styles.subtitle}>Отправили код{'\n'}на вашу почту</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        <View style={styles.centerArea}>
          <View style={styles.otpRow}>
            {Array.from({ length: CODE_LENGTH }).map((_, i) => (
              <TextInput
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
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

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.cta,
            !canSubmit ? styles.ctaDisabled : null,
            pressed ? { opacity: 0.9 } : null,
          ]}
        >
          {submitting ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.ctaText}>далее</Text>
          )}
        </Pressable>

        <View style={styles.resendRow}>
          <Text style={styles.resendHint}>Не пришёл код?</Text>
          <Pressable
            disabled={resendIn > 0}
            onPress={handleResend}
            style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}
          >
            <Text
              style={[styles.resendLink, resendIn > 0 && styles.resendDisabled]}
            >
              {resendIn > 0
                ? `Отправить снова через ${resendIn}с`
                : 'Отправить снова'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 24,
    justifyContent: 'flex-start',
  },
  headerRow: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backHit: { padding: 4 },
  back: { color: '#fff', fontSize: 28, lineHeight: 28 },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 22,
    textAlign: 'center',
  },
  email: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 40,
  },
  otpRow: {
    marginTop: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  box: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.8,
    borderColor: '#fff',
    textAlign: 'center',
    fontSize: 24,
    color: '#fff',
    padding: 0,
  },
  boxFilled: {
    borderColor: '#fff',
  },
  error: {
    marginTop: 16,
    color: '#ff8080',
    textAlign: 'center',
  },
  cta: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 24,
    height: 60,
    backgroundColor: '#6F1F86',
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    color: '#fff',
    fontSize: 20,
    textTransform: 'uppercase',
  },
  resendRow: {
    marginTop: 24,
    alignItems: 'center',
  },
  resendHint: { color: 'rgba(255,255,255,0.7)' },
  resendLink: { marginTop: 6, color: '#ffffff' },
  resendDisabled: { color: 'rgba(255,255,255,0.5)' },
});

export default OtpCodeScreen;
