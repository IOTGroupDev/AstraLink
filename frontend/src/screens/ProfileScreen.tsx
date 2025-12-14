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
  Image,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { UserProfile, Subscription, Chart, ZodiacSign } from '../types';
import LoadingIndicator from '../components/shared/LoadingIndicator';
import CosmicBackground from '../components/shared/CosmicBackground';
import ZodiacAvatar from '../components/profile/ZodiacAvatar';
import SubscriptionCard from '../components/profile/SubscriptionCard';
import NatalChartWidget from '../components/profile/NatalChartWidget';
import { useAuth } from '../hooks/useAuth';
import DeleteAccountModal from '../components/modals/DeleteAccountModal';
import { useAuthStore } from '../stores';
import { userAPI, chartAPI, userPhotosAPI } from '../services/api';
import { tokenService } from '../services/tokenService';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import {
  useSafeAreaInsets,
  SafeAreaView as SafeAreaViewSAC,
} from 'react-native-safe-area-context';
import { logger } from '../services/logger';
import LanguageSelector from '../components/settings/LanguageSelector';

const { width, height } = Dimensions.get('window');

interface ProfileScreenProps {
  navigation: any;
}

// Темы по стихиям (названия будут переведены в компоненте)
const ELEMENT_THEMES = {
  fire: {
    colors: ['#FF6B35', '#F7931E', '#FFD700'] as const,
    glow: '#FF6B35',
    key: 'fire',
  },
  water: {
    colors: ['#4ECDC4', '#44A08D', '#096B72'] as const,
    glow: '#4ECDC4',
    key: 'water',
  },
  earth: {
    colors: ['#8FBC8F', '#556B2F', '#2F4F2F'] as const,
    glow: '#8FBC8F',
    key: 'earth',
  },
  air: {
    colors: ['#FFD700', '#8B5CF6', '#DDA0DD'] as const,
    glow: '#FFD700',
    key: 'air',
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
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [chart, setChart] = useState<Chart | null>(null);
  const [primaryPhotoUrl, setPrimaryPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  // Animations
  const fadeAnim = useSharedValue(0);
  const glowAnim = useSharedValue(0);
  const orbAnim = useSharedValue(0);

  const {
    biometricAvailable,
    biometricEnabled,
    biometricType,
    setBiometricEnabled,
    logout,
  } = useAuthStore();

  useEffect(() => {
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
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchProfileData();
    }, [])
  );

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes, cRes] = await Promise.allSettled([
        userAPI.getProfile(),
        userAPI.getSubscription(), // может вернуть 401/404
        chartAPI.getNatalChart(), // может вернуть 404, если нет карты
      ]);

      // PROFILE (обязательно)
      if (pRes.status === 'fulfilled') {
        setProfile(pRes.value);
      } else {
        const st = pRes.reason?.response?.status;
        const data = pRes.reason?.response?.data;
        logger.warn('getProfile failed', st, data);

        if (st === 401) {
          // нет/протух токен — выходим в логин
          Alert.alert(
            t('common.errors.sessionExpired'),
            t('common.errors.pleaseLoginAgain')
          );
          logout?.(); // если есть из стора
          return;
        }

        // Любая другая ошибка профиля — это критично
        throw pRes.reason;
      }

      // SUBSCRIPTION (не критично для показа профиля)
      if (sRes.status === 'fulfilled') {
        setSubscription(sRes.value);
      } else {
        const st = sRes.reason?.response?.status;
        const data = sRes.reason?.response?.data;
        logger.info('getSubscription failed (игнорируем)', st, data);

        // Игнорируем 404 и прочее — поставим дефолт
        setSubscription({
          tier: 'free',
          isActive: false,
          isTrial: false,
          isTrialActive: false,
          features: [],
        } as any);
      }

      // CHART (опционально)
      if (cRes.status === 'fulfilled') {
        setChart(cRes.value);
      } else {
        const st = cRes.reason?.response?.status;
        const data = cRes.reason?.response?.data;
        logger.info('getNatalChart failed (опционально)', st, data);
        setChart(null);
      }

      // USER PHOTOS (опционально, для аватара)
      try {
        const photos = await userPhotosAPI.listPhotos();
        const primary = photos.find((p) => p.isPrimary) || photos[0];
        setPrimaryPhotoUrl(primary?.url || null);
      } catch (photoErr) {
        logger.info('listPhotos failed (опционально)', photoErr);
        setPrimaryPhotoUrl(null);
      }
    } catch (error: any) {
      // сюда попадём только если упал getProfile (критично)
      const st = error?.response?.status;
      const data = error?.response?.data;
      logger.error('Ошибка загрузки данных профиля', st, data, error?.message);
      Alert.alert(
        t('common.errors.generic'),
        data?.message || t('profile.errors.failedToLoad')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(t('profile.logout.title'), t('profile.logout.message'), [
      { text: t('common.buttons.cancel'), style: 'cancel' },
      {
        text: t('profile.logout.confirm'),
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    try {
      await userAPI.deleteAccount();
      Alert.alert(
        t('profile.deleteAccount.title'),
        t('profile.deleteAccount.message'),
        [
          {
            text: t('common.buttons.ok'),
            onPress: () => {
              tokenService.clearToken();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            },
          },
        ]
      );
    } catch (error: any) {
      logger.error('Ошибка удаления аккаунта', error);
      Alert.alert(
        t('common.errors.generic'),
        error.message || t('profile.errors.failedToDelete')
      );
    }
  };

  const handleUpgradeSubscription = () => {
    navigation.navigate('Subscription');
  };

  const handleViewPersonalCode = () => {
    navigation.navigate('PersonalCode' as never);
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
  }));

  if (loading) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <LoadingIndicator />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <Text style={styles.errorText}>
          {t('profile.errors.profileNotFound')}
        </Text>
      </View>
    );
  }

  const zodiacSignRaw =
    chart?.data?.planets?.sun?.sign || getZodiacSign(profile.birthDate);
  const zodiacSign = zodiacSignRaw || 'Aquarius';
  const elementTheme = getElementTheme(zodiacSign);
  const themePrimary = elementTheme.colors[0];

  return (
    <SafeAreaViewSAC style={styles.container} edges={['top', 'left', 'right']}>
      <CosmicBackground />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            // ключевая строка: чтобы контент не перекрывался таббаром
            paddingBottom: Math.max(40, tabBarHeight + insets.bottom + 16),
          },
        ]}
        // помогает на iOS корректно отрабатывать safe area
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, animatedContainerStyle]}>
          {/* Header with Blur */}
          <View style={styles.headerCard}>
            <Text style={styles.title}>{t('profile.title')}</Text>
          </View>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Animated.View style={[styles.avatarGlow, animatedGlowStyle]}>
                <View style={styles.avatarWrapper}>
                  {primaryPhotoUrl ? (
                    <Image
                      source={{ uri: primaryPhotoUrl }}
                      style={styles.avatarImage}
                      onError={() => setPrimaryPhotoUrl(null)}
                    />
                  ) : (
                    <ZodiacAvatar zodiacSign={zodiacSign} size={120} />
                  )}
                </View>
              </Animated.View>

              <TouchableOpacity
                style={styles.changePhotoButton}
                onPress={() => navigation.navigate('EditProfileScreen')}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={16} color="#fff" />
              </TouchableOpacity>

              {/* Premium Badge */}
              {subscription?.tier !== 'free' && (
                <View style={styles.premiumBadge}>
                  <Ionicons name="diamond" size={16} color="#fff" />
                </View>
              )}
            </View>

            <Text style={styles.userName}>
              {profile.name || authUser?.name || t('profile.defaults.userName')}
            </Text>

            <View style={styles.zodiacInfo}>
              <Text style={[styles.zodiacSign, { color: themePrimary }]}>
                {zodiacSign}
              </Text>
              <Text style={styles.elementName}>
                {t(`common.elements.${elementTheme.key}`)}
              </Text>
            </View>
          </View>

          {/* Subscription */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('profile.sections.subscription')}
            </Text>
            <SubscriptionCard
              subscription={subscription as any}
              onUpgrade={handleUpgradeSubscription}
              showUpgradeButton={subscription?.tier !== 'max'}
            />
          </View>

          {/* Natal Chart Section */}
          {chart && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('profile.sections.natalChart')}
              </Text>
              <View style={styles.chartCard}>
                <NatalChartWidget chart={chart} />

                <TouchableOpacity
                  style={styles.viewChartButton}
                  onPress={() => navigation.navigate('NatalChart' as never)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#701F86', '#701F86']}
                    style={styles.buttonGradient}
                  >
                    <Ionicons name="telescope" size={32} color="#fff" />
                    <Text style={styles.viewChartText}>
                      {t('profile.natalChart.viewChart')}
                    </Text>
                    <Ionicons name="chevron-forward" size={32} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.regenerateButton}
                  onPress={handleViewPersonalCode}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#6D28D9']}
                    style={styles.buttonGradient}
                  >
                    <Ionicons name="code-outline" size={24} color="#fff" />
                    <Text style={styles.regenerateButtonText}>
                      {t('profile.natalChart.viewPersonalCode', 'View Personal Code')}
                    </Text>
                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('profile.sections.settings')}
            </Text>

            <View style={styles.settingsCard}>
              {/* Edit Profile */}
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => navigation.navigate('EditProfileScreen')}
              >
                <View style={styles.settingIcon}>
                  <Ionicons name="person" size={32} color="#fff" />
                </View>
                <Text style={styles.settingText}>
                  {t('profile.settings.editProfile')}
                </Text>
                <Ionicons name="chevron-forward" size={32} color="#fff" />
              </TouchableOpacity>

              {/* Language Selector */}
              <View style={styles.settingItem}>
                <View style={styles.settingIcon}>
                  <Ionicons name="language" size={32} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <LanguageSelector
                    onLanguageChange={(lang) => {
                      logger.log('Language changed to:', lang);
                    }}
                  />
                </View>
              </View>

              {/* Logout */}
              <TouchableOpacity
                style={styles.settingItem}
                onPress={handleLogout}
              >
                <View style={styles.settingIcon}>
                  <Ionicons name="log-out-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.settingText}>
                  {t('profile.settings.logout')}
                </Text>
                <Ionicons name="chevron-forward" size={32} color="#fff" />
              </TouchableOpacity>

              {/* Delete Account */}
              <TouchableOpacity
                style={[styles.settingItem, styles.deleteItem]}
                onPress={() => setShowDeleteModal(true)}
              >
                <View style={styles.settingIcon}>
                  <Ionicons name="trash-outline" size={32} color="#E25140" />
                </View>
                <View style={styles.deleteTextContainer}>
                  <Text style={styles.deleteText}>
                    {t('profile.settings.deleteAccount')}
                  </Text>
                  <Text style={styles.deleteSubtext}>
                    {t('profile.settings.deleteAccountSubtitle')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={32} color="#E25140" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        userName={
          profile.name || authUser?.name || t('profile.defaults.userName')
        }
      />
    </SafeAreaViewSAC>
  );
};

// Helper Functions
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

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  headerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 39,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarGlow: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
  },
  avatarWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  premiumBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#701F86',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(112, 31, 134, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  zodiacInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zodiacSign: {
    fontSize: 16,
    fontWeight: '500',
  },
  elementName: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 24,
  },
  subscriptionCard: {
    backgroundColor: '#701F86',
    borderRadius: 12,
    padding: 16,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 47,
    gap: 6,
  },
  subscriptionBadgeText: {
    color: '#701F86',
    fontSize: 16,
    fontWeight: '500',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 47,
    gap: 6,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  maxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 47,
    gap: 6,
  },
  maxBadgeText: {
    color: '#701F86',
    fontSize: 16,
    fontWeight: '500',
  },
  subscriptionDate: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '300',
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 40,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 40,
  },
  chartCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(112, 31, 134, 0.3)',
  },
  viewChartButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 18,
  },
  viewChartText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 19.5,
  },
  regenerateButton: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  regenerateButtonText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    gap: 10,
  },
  settingIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  deleteItem: {
    backgroundColor: 'rgba(176, 66, 53, 0.15)',
    borderBottomWidth: 0,
  },
  deleteTextContainer: {
    flex: 1,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E25140',
  },
  deleteSubtext: {
    fontSize: 12,
    fontWeight: '400',
    color: '#E25140',
    marginTop: 2,
    letterSpacing: -0.24,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
});

export default ProfileScreen;
