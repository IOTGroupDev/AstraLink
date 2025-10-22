import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import CosmicBackground from '../../components/CosmicBackground';
import { supabase } from '../../services/supabase';

interface RouteParams {
  email?: string;
}

const MagicLinkWaitingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { email } = (route.params as RouteParams) || {};
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Для мобильных платформ - подписываемся на изменения auth state
    if (Platform.OS !== 'web') {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔐 Auth state changed:', event);

          if (event === 'SIGNED_IN' && session) {
            console.log('✅ Пользователь вошел через magic link');
            // Переходим на callback screen для обработки
            // @ts-ignore
            navigation.replace('AuthCallback');
          }
        }
      );

      return () => {
        authListener?.subscription.unsubscribe();
      };
    }
  }, [navigation]);

  const handleCheckEmail = async () => {
    setIsChecking(true);

    // Проверяем текущую сессию
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      console.log('✅ Сессия найдена');
      // @ts-ignore
      navigation.replace('AuthCallback');
    } else {
      console.log('ℹ️ Сессия не найдена, ожидаем перехода по ссылке');
    }

    setIsChecking(false);
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

        {/* Кнопка проверки (только для web) */}
        {Platform.OS === 'web' && (
          <Animated.View
            entering={FadeInDown.duration(600).delay(600)}
            style={styles.buttonContainer}
          >
            <TouchableOpacity
              style={styles.checkButton}
              onPress={handleCheckEmail}
              disabled={isChecking}
              activeOpacity={0.8}
            >
              <Text style={styles.checkButtonText}>
                {isChecking ? 'Проверка...' : 'Я уже перешел по ссылке'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Кнопка назад */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(700)}
          style={styles.backButtonContainer}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color="rgba(255, 255, 255, 0.7)"
            />
            <Text style={styles.backButtonText}>Назад</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Hint */}
        <Animated.Text
          entering={FadeInDown.duration(600).delay(800)}
          style={styles.hint}
        >
          Не пришло письмо? Проверьте папку "Спам"
        </Animated.Text>
      </View>
    </View>
  );
};

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
    marginBottom: 32,
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
  buttonContainer: {
    width: '100%',
    marginBottom: 16,
  },
  checkButton: {
    width: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 58,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
    color: '#FFFFFF',
  },
  backButtonContainer: {
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 8,
  },
  hint: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});

export default MagicLinkWaitingScreen;
