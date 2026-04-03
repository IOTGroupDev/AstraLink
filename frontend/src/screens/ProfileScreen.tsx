// frontend/src/screens/ProfileScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { UserProfile, Subscription, Chart, ZodiacSign } from '../types';
import CosmicBackground from '../components/shared/CosmicBackground';
import ZodiacAvatar from '../components/profile/ZodiacAvatar';
import SubscriptionCard from '../components/profile/SubscriptionCard';
import NatalChartWidget from '../components/profile/NatalChartWidget';
import DeleteAccountModal from '../components/modals/DeleteAccountModal';
import { useAuthStore } from '../stores';
import { userAPI, chartAPI } from '../services/api';
import { clearAllUserData } from '../services/cleanupService';
import { AuthEngine } from '../services/authEngine';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import {
  useSafeAreaInsets,
  SafeAreaView as SafeAreaViewSAC,
} from 'react-native-safe-area-context';
import { logger } from '../services/logger';
import LanguageSelector from '../components/settings/LanguageSelector';
import { ProfileSkeleton } from '../components/profile/ProfileSkeleton';
import { BottomTabFade } from '../components/shared/BottomTabFade';
import CompactScreenHeader from '../components/shared/CompactScreenHeader';
import { getBirthDateParts } from '../utils/birthDate';
import {
  getCachedPrimaryPhoto,
  setCachedPrimaryPhoto,
} from '../services/profile-photo-cache';

interface ProfileScreenProps {
  navigation: any;
}

const DEFAULT_SUBSCRIPTION = {
  tier: 'free',
  isActive: false,
  isTrial: false,
  isTrialActive: false,
  features: [],
} as any;

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
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isFocused = useIsFocused();
  const authProfile = useAuthStore((s) => s.profile);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(
    () => queryClient.getQueryData<Subscription>(['subscription']) ?? null
  );
  const [chart, setChart] = useState<Chart | null>(null);
  const [primaryPhotoUrl, setPrimaryPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const requestIdRef = useRef(0);
  const profileRef = useRef<UserProfile | null>(null);
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const profileHeaderTitle = React.useMemo(() => {
    const locale = String(i18n.language || 'en').toLowerCase();

    if (locale.startsWith('ru')) {
      return 'Мой профиль';
    }

    if (locale.startsWith('es')) {
      return 'Mi perfil';
    }

    return 'My profile';
  }, [i18n.language]);
  const profileHeaderSubtitle = React.useMemo(() => {
    const locale = String(i18n.language || 'en').toLowerCase();

    if (locale.startsWith('ru')) {
      return 'Профиль и карта';
    }

    if (locale.startsWith('es')) {
      return 'Perfil y carta';
    }

    return t('profile.headerSubtitle', {
      defaultValue: 'Profile and chart',
    });
  }, [i18n.language, t]);

  // Animations
  const fadeAnim = useSharedValue(0);
  const glowAnim = useSharedValue(0);
  const orbAnim = useSharedValue(0);

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

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const buildProfileFromAuth = React.useCallback((): UserProfile | null => {
    if (!authProfile?.id || !authProfile.email || !authProfile.birthDate) {
      return null;
    }

    return {
      id: authProfile.id,
      name: authProfile.name || '',
      email: authProfile.email,
      birthDate: authProfile.birthDate,
      birthTime: authProfile.birthTime || '12:00',
      birthPlace: authProfile.birthPlace || '',
      zodiacSign: 'Aquarius' as ZodiacSign,
      element: 'Air' as any,
      createdAt: new Date().toISOString(),
      isDarkMode: true,
    };
  }, [authProfile]);

  const fetchProfileData = React.useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const shouldBlockScreen = !profileRef.current;
    const fallbackUserId = authProfile?.id || profileRef.current?.id;

    if (shouldBlockScreen) {
      const fallbackProfile = buildProfileFromAuth();
      if (fallbackProfile) {
        setProfile((current) => current ?? fallbackProfile);
        setLoading(false);
      } else {
        setLoading(true);
      }
    }

    if (fallbackUserId) {
      void getCachedPrimaryPhoto(fallbackUserId).then((cachedPhoto) => {
        if (requestId !== requestIdRef.current || !cachedPhoto?.url) {
          return;
        }
        setPrimaryPhotoUrl((current) => current ?? cachedPhoto.url);
      });
    }

    try {
      const [profileRes, subscriptionRes, chartRes] = await Promise.allSettled([
        userAPI.getProfile(),
        userAPI.getSubscription(),
        chartAPI.getNatalChart(),
      ]);

      if (profileRes.status === 'rejected') {
        const profileError: any = profileRes.reason;
        const st = profileError?.response?.status;
        const data = profileError?.response?.data;
        logger.warn('getProfile failed', st, data);

        if (st === 401) {
          Alert.alert(
            t('common.errors.sessionExpired'),
            t('common.errors.pleaseLoginAgain')
          );
          await AuthEngine.signOut();
          return;
        }

        throw profileError;
      }

      if (requestId !== requestIdRef.current) {
        return;
      }

      const resolvedProfile = profileRes.value;
      const resolvedSubscription =
        subscriptionRes.status === 'fulfilled'
          ? subscriptionRes.value
          : (queryClient.getQueryData<Subscription>(['subscription']) ??
            DEFAULT_SUBSCRIPTION);
      const resolvedChart =
        chartRes.status === 'fulfilled' ? chartRes.value : null;
      const cachedPhoto = await getCachedPrimaryPhoto(resolvedProfile.id);
      const hasFreshServerPhoto =
        !!resolvedProfile.primaryPhotoUrl && !!resolvedProfile.primaryPhotoPath;
      const canReuseCachedPhoto =
        !!cachedPhoto?.url &&
        !!resolvedProfile.primaryPhotoPath &&
        cachedPhoto.path === resolvedProfile.primaryPhotoPath;
      const nextPrimaryPhotoUrl = canReuseCachedPhoto
        ? cachedPhoto?.url || null
        : resolvedProfile.primaryPhotoUrl || null;

      setProfile(resolvedProfile);
      setSubscription(resolvedSubscription);
      setChart(resolvedChart);
      setPrimaryPhotoUrl(nextPrimaryPhotoUrl);
      setLoading(false);
      queryClient.setQueryData(['subscription'], resolvedSubscription);

      if (hasFreshServerPhoto) {
        await setCachedPrimaryPhoto(resolvedProfile.id, {
          url: resolvedProfile.primaryPhotoUrl as string,
          path: resolvedProfile.primaryPhotoPath ?? null,
          expiresAt: resolvedProfile.primaryPhotoExpiresAt ?? null,
        });
      } else {
        await setCachedPrimaryPhoto(resolvedProfile.id, null);
      }

      if (subscriptionRes.status === 'rejected') {
        const st = subscriptionRes.reason?.response?.status;
        const data = subscriptionRes.reason?.response?.data;
        logger.info('getSubscription failed (ignoring)', st, data);
      }

      if (chartRes.status === 'rejected') {
        const st = chartRes.reason?.response?.status;
        const data = chartRes.reason?.response?.data;
        logger.info('getNatalChart failed (optional)', st, data);
      }
    } catch (error: any) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      // сюда попадём только если упал getProfile (критично)
      const st = error?.response?.status;
      const data = error?.response?.data;
      logger.error('Ошибка загрузки данных профиля', st, data, error?.message);
      Alert.alert(
        t('common.errors.generic'),
        data?.message || t('profile.errors.failedToLoad')
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [authProfile?.id, buildProfileFromAuth, queryClient, t]);

  useFocusEffect(
    React.useCallback(() => {
      void fetchProfileData();
    }, [fetchProfileData])
  );

  const handleDeleteAccount = async () => {
    try {
      await userAPI.deleteAccount();

      setShowDeleteModal(false);

      await clearAllUserData();
      await AuthEngine.signOut();

      navigation.reset({
        index: 0,
        routes: [{ name: 'SignUp' }],
      });
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

  const handleOpenCosmicSimulator = () => {
    navigation.navigate('CosmicSimulator' as never);
  };

  const handleOpenLearning = () => {
    navigation.navigate('Learning' as never, { source: 'profile' });
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
  }));

  if (loading) {
    return (
      <SafeAreaViewSAC
        style={styles.container}
        edges={['top', 'left', 'right']}
      >
        <CosmicBackground active={isFocused} />
        <ProfileSkeleton />
        <BottomTabFade />
      </SafeAreaViewSAC>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <CosmicBackground active={isFocused} />
        <Text style={styles.errorText}>
          {t('profile.errors.profileNotFound')}
        </Text>
        <BottomTabFade />
      </View>
    );
  }

  const zodiacSignRaw =
    chart?.data?.planets?.sun?.sign || getZodiacSign(profile.birthDate);
  const zodiacSign = zodiacSignRaw || 'Aquarius';
  const elementTheme = getElementTheme(zodiacSign);
  const themePrimary = elementTheme.colors[0];

  return (
    <SafeAreaViewSAC style={styles.container} edges={['left', 'right']}>
      <CosmicBackground active={isFocused} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            // ключевая строка: чтобы контент не перекрывался таббаром
            paddingTop: insets.top + 12,
            paddingBottom: Math.max(56, tabBarHeight + 28),
          },
        ]}
        // помогает на iOS корректно отрабатывать safe area
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, animatedContainerStyle]}>
          {/* Header with Blur */}
          <CompactScreenHeader
            style={styles.headerCard}
            title={profileHeaderTitle}
            description={profileHeaderSubtitle}
            icon={
              <Ionicons
                name="person-circle-outline"
                size={24}
                color="#FFFFFF"
              />
            }
          />

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
              {subscription != null && subscription.tier !== 'free' && (
                <View style={styles.premiumBadge}>
                  <Ionicons name="diamond" size={16} color="#fff" />
                </View>
              )}
            </View>

            <Text style={styles.userName}>
              {profile.name ||
                authProfile?.name ||
                t('profile.defaults.userName')}
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
              subscription={subscription}
              onUpgrade={handleUpgradeSubscription}
              showUpgradeButton={!!subscription && subscription.tier !== 'max'}
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

                <View style={styles.natalActionsGrid}>
                  <TouchableOpacity
                    style={styles.natalActionCard}
                    onPress={() => navigation.navigate('NatalChart' as never)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#701F86', '#5B1670']}
                      style={styles.natalActionGradient}
                    >
                      <Ionicons name="telescope" size={28} color="#fff" />
                      <Text style={styles.natalActionText}>
                        {t('profile.natalChart.viewChart')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.natalActionCard}
                    onPress={handleViewPersonalCode}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#8B5CF6', '#6D28D9']}
                      style={styles.natalActionGradient}
                    >
                      <Ionicons name="code-outline" size={28} color="#fff" />
                      <Text style={styles.natalActionText}>
                        {t('profile.natalChart.viewPersonalCode')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.natalActionCard}
                    onPress={handleOpenCosmicSimulator}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#4C1D95', '#312E81']}
                      style={styles.natalActionGradient}
                    >
                      <Ionicons name="planet-outline" size={28} color="#fff" />
                      <Text style={styles.natalActionText}>
                        {t('profile.natalChart.viewSimulator')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.natalActionCard}
                    onPress={handleOpenLearning}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['#1D4ED8', '#4338CA']}
                      style={styles.natalActionGradient}
                    >
                      <Ionicons name="school-outline" size={28} color="#fff" />
                      <Text style={styles.natalActionText}>
                        {t('profile.natalChart.viewLearning')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
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
      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(15, 23, 42, 0.98)',
          'rgba(15, 23, 42, 0.65)',
          'rgba(15, 23, 42, 0)',
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.topFade, { height: insets.top + 56 }]}
      />
      <BottomTabFade />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        userName={
          profile.name || authProfile?.name || t('profile.defaults.userName')
        }
      />
    </SafeAreaViewSAC>
  );
};

// Helper Functions
const getZodiacSign = (birthDate: string): string => {
  const birthDateParts = getBirthDateParts(birthDate);
  if (!birthDateParts) {
    return 'Pisces';
  }

  const { month, day } = birthDateParts;

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
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  headerCard: {
    marginBottom: 28,
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
  natalActionsGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  natalActionCard: {
    flexBasis: '48%',
    maxWidth: '48%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  natalActionGradient: {
    minHeight: 116,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    justifyContent: 'space-between',
    gap: 14,
  },
  natalActionText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
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
