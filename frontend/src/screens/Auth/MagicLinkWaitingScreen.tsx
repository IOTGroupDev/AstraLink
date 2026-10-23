import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  TextInput,
} from 'react-native';
import LoadingIndicator from '../../components/shared/LoadingIndicator';
import {
  useNavigation,
  useRoute,
  useIsFocused,
} from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import CosmicBackground from '../../components/shared/CosmicBackground';
import { authAPI } from '../../services/api';
import { authLogger } from '../../services/logger';

type RouteParams = { email?: string };

export default function MagicLinkWaitingScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
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
      setError(t('auth.magicLinkWaiting.missingEmail'));
      return;
    }

    try {
      setResending(true);

      // Используем общий хендлер (с ретраем без shouldCreateUser при 23505/users_email_key)
      await authAPI.sendVerificationCode(String(email).trim().toLowerCase());

      authLogger.log('✅ OTP повторно отправлен');
    } catch (e: any) {
      authLogger.error('❌ Ошибка повторной отправки:', e);
      setError(e?.message ?? t('auth.magicLinkWaiting.resendFailed'));
    } finally {
      setResending(false);
    }
  };

  const onVerifyCode = async () => {
    try {
      setError(null);
      if (!email) {
        setError(t('auth.magicLinkWaiting.missingEmail'));
        return;
      }
      if (!code || code.trim().length < 6) {
        setError(t('auth.magicLinkWaiting.enterCode'));
        return;
      }
      setVerifying(true);

      // Проверяем OTP код — создаст session при успехе
      await authAPI.verifyCode(email, code.trim());
    } catch (e: any) {
      authLogger.error('❌ Ошибка подтверждения кода:', e);
      const msg = e?.message || t('auth.magicLinkWaiting.verifyFailed');
      setError(msg);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <View style={styles.container}>
      <CosmicBackground active={isFocused} />

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
          {t('auth.magicLinkWaiting.title')}
        </Animated.Text>

        {/* Описание */}
        <Animated.Text
          entering={FadeInDown.duration(600).delay(300)}
          style={styles.description}
        >
          {t('auth.magicLinkWaiting.sentTo')}
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
              {t('auth.magicLinkWaiting.openOnDevice')}
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.bulletPoint} />
            <Text style={styles.instructionText}>
              {t('auth.magicLinkWaiting.followLink')}
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.bulletPoint} />
            <Text style={styles.instructionText}>
              {t('auth.magicLinkWaiting.expiry')}
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
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            placeholder={t('auth.magicLinkWaiting.placeholder')}
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
              <LoadingIndicator size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {t('auth.magicLinkWaiting.verify')}
              </Text>
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
            <Text style={styles.primaryButtonText}>
              {t('auth.magicLinkWaiting.openMail')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onResend}
            style={styles.secondaryButton}
            disabled={resending}
            activeOpacity={0.8}
          >
            {resending ? (
              <LoadingIndicator size="small" />
            ) : (
              <Text style={styles.secondaryButtonText}>
                {t('auth.magicLinkWaiting.resend')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onChangeEmail}
            style={styles.ghostButton}
            activeOpacity={0.7}
          >
            <Text style={styles.ghostButtonText}>
              {t('auth.magicLinkWaiting.changeEmail')}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Подсказка */}
        <Animated.Text
          entering={FadeInDown.duration(600).delay(800)}
          style={styles.hint}
        >
          {t('auth.magicLinkWaiting.spam')}
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
