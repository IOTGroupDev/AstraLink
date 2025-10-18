// frontend/src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import {
  userAPI,
  subscriptionAPI,
  chartAPI,
  removeStoredToken,
} from '../services/api';
import { UserProfile, Subscription, Chart, ZodiacSign } from '../types';
import ShimmerLoader from '../components/ShimmerLoader';
import CosmicBackground from '../components/CosmicBackground';
import ZodiacAvatar from '../components/ZodiacAvatar';
import SubscriptionCard from '../components/SubscriptionCard';
import NatalChartWidget from '../components/NatalChartWidget';
import { useAuth } from '../hooks/useAuth';
import DeleteAccountModal from '../components/DeleteAccountModal';

const { width, height } = Dimensions.get('window');

interface ProfileScreenProps {
  navigation: any;
}

// Темы по стихиям
const ELEMENT_THEMES = {
  fire: {
    colors: ['#FF6B35', '#F7931E', '#FFD700'] as const,
    glow: '#FF6B35',
    name: 'Огонь',
  },
  water: {
    colors: ['#4ECDC4', '#44A08D', '#096B72'] as const,
    glow: '#4ECDC4',
    name: 'Вода',
  },
  earth: {
    colors: ['#8FBC8F', '#556B2F', '#2F4F2F'] as const,
    glow: '#8FBC8F',
    name: 'Земля',
  },
  air: {
    colors: ['#FFD700', '#8B5CF6', '#DDA0DD'] as const,
    glow: '#FFD700',
    name: 'Воздух',
  },
};

// Соответствие знаков зодиака стихиям
const ZODIAC_ELEMENTS = {
  Aries: 'fire',
  Leo: 'fire',
  Sagittarius: 'fire',
  Cancer: 'water',
  Scorpio: 'water',
  Pisces: 'water',
  Taurus: 'earth',
  Virgo: 'earth',
  Capricorn: 'earth',
  Gemini: 'air',
  Libra: 'air',
  Aquarius: 'air',
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [chart, setChart] = useState<Chart | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState<boolean>(true); // ✅ Явно указан тип boolean
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Animations
  const fadeAnim = useSharedValue(0);
  const glowAnim = useSharedValue(0);
  const orbAnim = useSharedValue(0);
  const buttonGlowAnim = useSharedValue(0);
  const buttonScaleAnim = useSharedValue(1);

  useEffect(() => {
    // Animations
    fadeAnim.value = withTiming(1, { duration: 800 });
    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0.4, { duration: 2000 })
      ),
      -1,
      true
    );
    orbAnim.value = withRepeat(withTiming(360, { duration: 20000 }), -1, false);
    buttonGlowAnim.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchProfileData();
    }, [])
  );

  const fetchProfileData = async () => {
    try {
      const [profileData, subscriptionData, chartData] = await Promise.all([
        userAPI.getProfile(),
        subscriptionAPI.getStatus(),
        chartAPI.getNatalChart().catch(() => null),
      ]);

      setProfile(profileData);
      setSubscription(subscriptionData);
      setChart(chartData);
    } catch (error) {
      console.error('Ошибка загрузки данных профиля:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные профиля');
    } finally {
      setLoading(false);
    }
  };

  const refreshProfileData = async () => {
    try {
      const chartData = await chartAPI.getNatalChart();
      setChart(chartData);
    } catch (error) {
      console.error('Ошибка обновления натальной карты:', error);
    }
  };

  const handleLogout = async () => {
    try {
      removeStoredToken();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Ошибка при выходе:', error);
      removeStoredToken();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      console.log('🗑️ Начинаем удаление аккаунта');
      await userAPI.deleteAccount();

      Alert.alert(
        'Аккаунт удален',
        'Ваш аккаунт и все данные были безвозвратно удалены.',
        [
          {
            text: 'OK',
            onPress: () => {
              removeStoredToken();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Ошибка удаления аккаунта:', error);
      Alert.alert(
        'Ошибка',
        error.message || 'Не удалось удалить аккаунт. Попробуйте позже.'
      );
    }
  };

  const handleUpgradeSubscription = () => {
    navigation.navigate('Subscription');
  };

  // ✅ Обработчик для Switch - гарантирует boolean
  const handleDarkModeChange = (value: boolean) => {
    setDarkMode(value);
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
  }));

  const animatedOrbStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbAnim.value}deg` }],
  }));

  const animatedButtonGlowStyle = useAnimatedStyle(() => ({
    opacity: buttonGlowAnim.value,
  }));

  const animatedButtonScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScaleAnim.value }],
  }));

  const handleButtonPress = () => {
    buttonScaleAnim.value = withSpring(0.95, { damping: 10, stiffness: 300 });
    setTimeout(() => {
      buttonScaleAnim.value = withSpring(1, { damping: 10, stiffness: 300 });
      navigation.navigate('ChartStack', { screen: 'NatalChart' });
    }, 100);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <ShimmerLoader />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <Text style={styles.errorText}>Профиль не найден</Text>
      </View>
    );
  }

  // ✅ Безопасное определение знака зодиака с fallback
  const zodiacSignRaw =
    chart?.data?.planets?.sun?.sign || getZodiacSign(profile.birthDate);
  const zodiacSign = zodiacSignRaw || 'Aquarius'; // ✅ Fallback если undefined
  const elementTheme = getElementTheme(zodiacSign);
  const themePrimary = elementTheme.colors[0];

  return (
    <View style={styles.container}>
      <CosmicBackground />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.content, animatedContainerStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Мой космический профиль</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[
                  styles.settingsButton,
                  { backgroundColor: hexToRgba(themePrimary, 0.2) },
                ]}
                onPress={() => navigation.navigate('EditProfileScreen')}
              >
                <Ionicons name="settings-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <Animated.View style={[styles.orbContainer, animatedOrbStyle]}>
              <Animated.View
                style={[
                  styles.orbGlow,
                  { shadowColor: elementTheme.glow },
                  animatedGlowStyle,
                ]}
              >
                <LinearGradient
                  colors={elementTheme.colors}
                  style={styles.orbGradient}
                >
                  <ZodiacAvatar zodiacSign={zodiacSign} size={80} />
                </LinearGradient>
              </Animated.View>
            </Animated.View>

            <Text style={styles.userName}>
              {profile.name || authUser?.name || 'Пользователь'}
            </Text>
            <View style={styles.zodiacContainer}>
              <Text style={[styles.zodiacSign, { color: themePrimary }]}>
                {zodiacSign}
              </Text>
              <Text style={styles.elementName}>{elementTheme.name}</Text>
            </View>
          </View>

          {/* Subscription Card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Моя подписка</Text>
            <SubscriptionCard
              subscription={subscription}
              onUpgrade={handleUpgradeSubscription}
            />
          </View>

          {/* Natal Chart Widget */}
          {chart && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Натальная карта</Text>
              <View
                style={[
                  styles.chartCard,
                  { borderColor: hexToRgba(themePrimary, 0.3) },
                ]}
              >
                <NatalChartWidget chart={chart} />
                <Animated.View
                  style={[
                    styles.viewFullChartButtonContainer,
                    animatedButtonScaleStyle,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.viewFullChartButton}
                    onPress={handleButtonPress}
                    activeOpacity={0.8}
                  >
                    <Animated.View
                      style={[
                        styles.buttonGlow,
                        { backgroundColor: themePrimary },
                        animatedButtonGlowStyle,
                      ]}
                    />
                    <LinearGradient
                      colors={elementTheme.colors as any}
                      style={styles.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.buttonContent}>
                        <Ionicons name="planet" size={24} color="#fff" />
                        <Text style={styles.viewFullChartText}>
                          Посмотреть натальную карту с расшифровкой
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color="#fff"
                        />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>
          )}

          {/* Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Настройки</Text>

            <View
              style={[
                styles.settingsCard,
                { borderColor: hexToRgba(themePrimary, 0.3) },
              ]}
            >
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => navigation.navigate('EditProfileScreen')}
              >
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: hexToRgba(themePrimary, 0.1) },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={24}
                    color={themePrimary}
                  />
                </View>
                <Text style={styles.settingText}>Редактировать профиль</Text>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>

              <View style={styles.settingItem}>
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: hexToRgba(themePrimary, 0.1) },
                  ]}
                >
                  <Ionicons
                    name="moon-outline"
                    size={24}
                    color={themePrimary}
                  />
                </View>
                <Text style={styles.settingText}>Тёмная тема</Text>
                {/* ✅ Исправлен Switch */}
                <Switch
                  value={darkMode === true}
                  onValueChange={handleDarkModeChange}
                  trackColor={{ false: '#767577', true: themePrimary }}
                  thumbColor={darkMode ? '#fff' : '#f4f3f4'}
                />
              </View>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={handleLogout}
              >
                <View style={styles.settingIcon}>
                  <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
                </View>
                <Text style={[styles.settingText, { color: '#FF6B6B' }]}>
                  Выйти
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>

              {/* Разделитель */}
              <View style={styles.dangerZoneDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dangerZoneLabel}>Опасная зона</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Кнопка удаления аккаунта */}
              <TouchableOpacity
                style={[styles.settingItem, styles.deleteAccountItem]}
                onPress={() => setShowDeleteModal(true)}
              >
                <View style={styles.settingIcon}>
                  <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingText, { color: '#FF6B6B' }]}>
                    Удалить аккаунт
                  </Text>
                  <Text style={styles.deleteAccountSubtext}>
                    Удалит все ваши данные навсегда
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>

            {/* Delete Account Modal */}
            <DeleteAccountModal
              visible={showDeleteModal}
              onClose={() => setShowDeleteModal(false)}
              onConfirm={handleDeleteAccount}
              userName={
                profile.name || authUser?.user_metadata?.name || 'Пользователь'
              }
            />
          </View>

          {/* Registration Info */}
          <View style={styles.footer}>
            <Text style={styles.registrationText}>
              С нами с{' '}
              {profile.createdAt
                ? formatRegistrationDate(profile.createdAt)
                : 'начала времён'}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

// ========================================
// HELPER FUNCTIONS
// ========================================

const getZodiacSign = (birthDate: string): string => {
  const date = new Date(birthDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
    return 'Scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21))
    return 'Sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
    return 'Capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
    return 'Aquarius';
  return 'Pisces';
};

const getElementTheme = (zodiacSign: string) => {
  const element = (
    ZODIAC_ELEMENTS[zodiacSign as ZodiacSign] || 'air'
  ).toLowerCase();
  return (
    ELEMENT_THEMES[element as keyof typeof ELEMENT_THEMES] || ELEMENT_THEMES.air
  );
};

const hexToRgba = (hex: string, alpha: number) => {
  const clean = hex.replace('#', '');
  const bigint = parseInt(
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean,
    16
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatRegistrationDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
  });
};

// ========================================
// STYLES
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
  },
  settingsButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  orbContainer: {
    marginBottom: 20,
  },
  orbGlow: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  orbGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  zodiacContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zodiacSign: {
    fontSize: 18,
    color: '#8B5CF6',
    fontWeight: '600',
    marginRight: 8,
  },
  elementName: {
    fontSize: 16,
    color: '#B0B0B0',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  chartCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  viewFullChartButtonContainer: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  viewFullChartButton: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  viewFullChartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  settingsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 20,
  },
  registrationText: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  dangerZoneDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
  },
  dangerZoneLabel: {
    fontSize: 12,
    color: 'rgba(255, 107, 107, 0.7)',
    fontWeight: '600',
    marginHorizontal: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  deleteAccountItem: {
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
  },
  deleteAccountSubtext: {
    fontSize: 12,
    color: 'rgba(255, 107, 107, 0.6)',
    marginTop: 2,
  },
});

export default ProfileScreen;
