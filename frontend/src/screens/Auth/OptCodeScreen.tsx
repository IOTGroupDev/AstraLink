// src/screens/auth/OptCodeScreen.tsx
import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
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
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { AuthLayout } from '../../components/auth/AuthLayout';
import OnboardingHeader from '../../components/onboarding/OnboardingHeader';
import { supabase } from '../../services/supabase';
import { authAPI } from '../../services/api';
import { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../../types/navigation';
import {
  AUTH_COLORS,
  AUTH_TYPOGRAPHY,
  AUTH_LAYOUT,
} from '../../constants/auth.constants';

type Props = StackScreenProps<RootStackParamList, 'OptCode'>;

const RESEND_SECONDS = 30;

const OtpCodeScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = useTranslation();
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
    const cleaned = val.replace(/\D/g, '');

    // Handle full code paste (iOS QuickType autofill)
    if (idx === 0 && cleaned.length === CODE_LENGTH) {
      setDigits(cleaned.split(''));
      // Focus last input after paste
      setTimeout(() => {
        inputsRef.current[CODE_LENGTH - 1]?.focus();
      }, 0);
      return;
    }

    // Handle single digit input
    const v = cleaned.slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = v || '';
      return next;
    });
    if (v && idx < CODE_LENGTH - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const onKeyPress = useCallback(
    (idx: number, e: any) => {
      if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
        inputsRef.current[idx - 1]?.focus();
      }
    },
    [digits]
  );

  const handleSubmit = useCallback(async () => {
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

            setError(t('auth.otp.errors.expired'));
            setDigits(Array(CODE_LENGTH).fill(''));
            setResendIn(RESEND_SECONDS);
            lastSubmittedCode.current = null;
          } catch (reErr: any) {
            const reMsg =
              reErr?.message || t('auth.otp.errors.expiredResendFailed');

            // Handle rate limit when auto-resending expired code
            const isRateLimit =
              reErr?.code === 'email_rate_limit_exceeded' ||
              /rate limit/i.test(String(reMsg));

            if (isRateLimit && typeof reErr?.retryAfterSec === 'number') {
              setResendIn(reErr.retryAfterSec);
            }

            setError(reMsg);
          }
          return;
        }

        throw error;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Ensure user profile exists in public.users (workaround for missing DB trigger)
      if (data.user) {
        try {
          await authAPI.ensureUserProfile(
            data.user.id,
            data.user.email || email
          );
        } catch (ensureError) {
          // Non-critical - continue even if this fails
          // Silently skip
        }
      }

      navigation.replace('UserDataLoader');
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err?.message ?? '';

      if (/rate limit/i.test(msg)) {
        setError(t('auth.otp.errors.rateLimit'));
        lastSubmittedCode.current = null;
      } else {
        setError(msg || t('auth.otp.errors.verifyFailed'));
      }
    } finally {
      setSubmitting(false);
      submitLock.current = false;
    }
  }, [canSubmit, code, email, navigation, t, CODE_LENGTH]);

  const handleResend = useCallback(async () => {
    if (resendIn > 0) return;
    setError(null);
    try {
      await authAPI.sendVerificationCode(String(email).trim().toLowerCase());

      setDigits(Array(CODE_LENGTH).fill(''));
      setResendIn(RESEND_SECONDS);
      lastSubmittedCode.current = null;
    } catch (e: any) {
      const msg = e?.message ?? t('auth.otp.errors.resendFailed');

      // Handle rate limit: sync timer with Supabase retryAfterSec
      const isRateLimit =
        e?.code === 'email_rate_limit_exceeded' ||
        /rate limit/i.test(String(msg));

      if (isRateLimit && typeof e?.retryAfterSec === 'number') {
        // Set timer to the exact value from Supabase
        setResendIn(e.retryAfterSec);
      }

      setError(msg);
    }
  }, [resendIn, email, CODE_LENGTH, t]);

  return (
    <AuthLayout>
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
      >
        <OnboardingHeader
          title={t('auth.otp.title')}
          onBack={() => navigation.goBack()}
        />

        <View style={styles.content}>
          <View style={styles.infoContainer}>
            <Text style={styles.subtitle}>{t('auth.otp.subtitle')}</Text>
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
                  textContentType={i === 0 ? 'oneTimeCode' : 'none'}
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  selectionColor="white"
                  style={[styles.box, digits[i] ? styles.boxFilled : null]}
                  returnKeyType="next"
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
            <Text style={styles.resendHint}>{t('auth.otp.resendHint')}</Text>
            <Pressable disabled={resendIn > 0} onPress={handleResend}>
              <Text
                style={[
                  styles.resendLink,
                  resendIn > 0 && styles.resendDisabled,
                ]}
              >
                {resendIn > 0
                  ? t('auth.otp.resendTimer', { seconds: resendIn })
                  : t('auth.otp.resendButton')}
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
              <Text style={styles.ctaText}>{t('auth.otp.submitButton')}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: AUTH_LAYOUT.horizontalPadding,
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
    left: 0,
    right: 0,
    bottom: 0,
    height: AUTH_LAYOUT.buttonHeight,
    backgroundColor: AUTH_COLORS.btnPrimary,
    borderRadius: AUTH_LAYOUT.buttonRadius,
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
