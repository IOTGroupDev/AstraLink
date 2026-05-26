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
  ImageBackground,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  Ellipse,
  FeGaussianBlur,
  Filter,
  RadialGradient,
  Stop,
  type SvgProps,
} from 'react-native-svg';
import { UserProfile, Subscription, Chart, ZodiacSign } from '../types';
import NatalChartWidget from '../components/profile/NatalChartWidget';
import DeleteAccountModal from '../components/modals/DeleteAccountModal';
import { useAuthStore } from '../stores';
import { userAPI, chartAPI } from '../services/api';
import { AuthEngine } from '../services/authEngine';
import { clearAllUserData } from '../services/cleanupService';
import { notificationService } from '../services/notifications';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import {
  useSafeAreaInsets,
  SafeAreaView as SafeAreaViewSAC,
} from 'react-native-safe-area-context';
import { logger } from '../services/logger';
import LanguageSelector from '../components/settings/LanguageSelector';
import { ProfileSkeleton } from '../components/profile/ProfileSkeleton';
import { BottomTabFade } from '../components/shared/BottomTabFade';
import { GradientBorderView } from '../components/shared';
import { getBirthDateParts } from '../utils/birthDate';
import {
  getCachedPrimaryPhoto,
  setCachedPrimaryPhoto,
} from '../services/profile-photo-cache';
import type { RootStackParamList } from '../types/navigation';
import premiumBackground from '@assets/premium-bg.png';
import premiumHero from '@assets/premium-hero.png';
import AriesProfileIcon from '@assets/zodiac-icons/aries.svg';
import TaurusProfileIcon from '@assets/zodiac-icons/taurus.svg';
import GeminiProfileIcon from '@assets/zodiac-icons/gemini.svg';
import CancerProfileIcon from '@assets/zodiac-icons/cancer.svg';
import LeoProfileIcon from '@assets/zodiac-icons/leo.svg';
import VirgoProfileIcon from '@assets/zodiac-icons/virgo.svg';
import LibraProfileIcon from '@assets/zodiac-icons/libra.svg';
import ScorpioProfileIcon from '@assets/zodiac-icons/scorpio.svg';
import SagittariusProfileIcon from '@assets/zodiac-icons/sagittarius.svg';
import CapricornProfileIcon from '@assets/zodiac-icons/capricorn.svg';
import AquariusProfileIcon from '@assets/zodiac-icons/aquarius.svg';
import PiscesProfileIcon from '@assets/zodiac-icons/pisces.svg';
import AriesAvatarIcon from '@assets/zodiac/aries.svg';
import TaurusAvatarIcon from '@assets/zodiac/taurus.svg';
import GeminiAvatarIcon from '@assets/zodiac/gemini.svg';
import CancerAvatarIcon from '@assets/zodiac/cancer.svg';
import LeoAvatarIcon from '@assets/zodiac/leo.svg';
import VirgoAvatarIcon from '@assets/zodiac/virgo.svg';
import LibraAvatarIcon from '@assets/zodiac/libra.svg';
import ScorpioAvatarIcon from '@assets/zodiac/scorpius.svg';
import SagittariusAvatarIcon from '@assets/zodiac/sagittarius.svg';
import CapricornAvatarIcon from '@assets/zodiac/capricorn.svg';
import AquariusAvatarIcon from '@assets/zodiac/aquarius.svg';
import PiscesAvatarIcon from '@assets/zodiac/pisces.svg';

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

const DELETE_ACCOUNT_MODAL_DISMISS_MS = 180;
const PROFILE_META_COLOR = 'rgba(255, 255, 255, 0.7)';

const PROFILE_ZODIAC_ICONS: Record<string, React.ComponentType<SvgProps>> = {
  aries: AriesProfileIcon,
  taurus: TaurusProfileIcon,
  gemini: GeminiProfileIcon,
  cancer: CancerProfileIcon,
  leo: LeoProfileIcon,
  virgo: VirgoProfileIcon,
  libra: LibraProfileIcon,
  scorpio: ScorpioProfileIcon,
  sagittarius: SagittariusProfileIcon,
  capricorn: CapricornProfileIcon,
  aquarius: AquariusProfileIcon,
  pisces: PiscesProfileIcon,
};

const PROFILE_AVATAR_ICONS: Record<string, React.ComponentType<SvgProps>> = {
  aries: AriesAvatarIcon,
  taurus: TaurusAvatarIcon,
  gemini: GeminiAvatarIcon,
  cancer: CancerAvatarIcon,
  leo: LeoAvatarIcon,
  virgo: VirgoAvatarIcon,
  libra: LibraAvatarIcon,
  scorpio: ScorpioAvatarIcon,
  sagittarius: SagittariusAvatarIcon,
  capricorn: CapricornAvatarIcon,
  aquarius: AquariusAvatarIcon,
  pisces: PiscesAvatarIcon,
};

const ProfileTopGlow = () => (
  <Svg
    pointerEvents="none"
    viewBox="0 0 1352 1352"
    preserveAspectRatio="none"
    style={styles.topGlow}
  >
    <Defs>
      <RadialGradient id="profileTopGlowGradient" cx="50%" cy="18%" r="72%">
        <Stop offset="0" stopColor="#6F38A6" stopOpacity="0.95" />
        <Stop offset="0.48" stopColor="#2E2457" stopOpacity="0.64" />
        <Stop offset="1" stopColor="#080E1C" stopOpacity="0" />
      </RadialGradient>
      <Filter
        id="profileTopGlowBlur"
        x="-35%"
        y="-35%"
        width="170%"
        height="170%"
      >
        <FeGaussianBlur stdDeviation="109" />
      </Filter>
    </Defs>
    <Ellipse
      cx="676"
      cy="676"
      rx="624"
      ry="624"
      fill="url(#profileTopGlowGradient)"
      filter="url(#profileTopGlowBlur)"
    />
  </Svg>
);

const NatalChartGlow = () => (
  <Svg pointerEvents="none" width={330} height={300} style={styles.chartGlow}>
    <Defs>
      <RadialGradient id="natalChartGlowGradient" cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor="#8D26A9" stopOpacity="0.44" />
        <Stop offset="0.42" stopColor="#8D26A9" stopOpacity="0.17" />
        <Stop offset="1" stopColor="#8D26A9" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Ellipse
      cx="165"
      cy="150"
      rx="160"
      ry="146"
      fill="url(#natalChartGlowGradient)"
    />
  </Svg>
);

const waitForDeleteAccountModalDismiss = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, DELETE_ACCOUNT_MODAL_DISMISS_MS);
  });

const normalizeZodiacKey = (sign: string): string => {
  const map: Record<string, string> = {
    aries: 'aries',
    taurus: 'taurus',
    gemini: 'gemini',
    cancer: 'cancer',
    leo: 'leo',
    virgo: 'virgo',
    libra: 'libra',
    scorpio: 'scorpio',
    sagittarius: 'sagittarius',
    capricorn: 'capricorn',
    aquarius: 'aquarius',
    pisces: 'pisces',
  };

  return (
    map[
      String(sign || '')
        .trim()
        .toLowerCase()
    ] ?? String(sign || '')
  );
};

// Темы по стихиям (названия будут переведены в компоненте)
const isMissingProfileSessionError = (error: any): boolean => {
  const status = Number(error?.response?.status ?? error?.status ?? 0);
  const raw = JSON.stringify({
    message: error?.message,
    data: error?.response?.data,
  }).toLowerCase();

  return (
    status === 401 ||
    status === 403 ||
    status === 404 ||
    raw.includes('unauthorized') ||
    raw.includes('session expired') ||
    raw.includes('сессия истекла') ||
    raw.includes('user not found') ||
    raw.includes('profile not found') ||
    raw.includes('пользователь не найден') ||
    raw.includes('профиль не найден')
  );
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
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
  const isDeletingAccountRef = useRef(false);
  const isSigningOutRef = useRef(false);
  const profileRef = useRef<UserProfile | null>(null);
  const subscriptionRef = useRef<Subscription | null>(subscription);
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const navigateToRootScreen = React.useCallback(
    <T extends keyof RootStackParamList>(
      screen: T,
      params?: RootStackParamList[T]
    ) => {
      const parentNavigation = navigation.getParent?.();

      if (parentNavigation?.navigate) {
        parentNavigation.navigate(screen, params);
        return;
      }

      navigation.navigate(screen, params);
    },
    [navigation]
  );

  const clearProfileAndRouteToAuth = React.useCallback(async () => {
    isSigningOutRef.current = true;
    requestIdRef.current += 1;
    setShowDeleteModal(false);
    setProfile(null);
    setSubscription(null);
    setChart(null);
    setPrimaryPhotoUrl(null);
    setLoading(false);
    queryClient.clear();

    try {
      await AuthEngine.clearLocalSession();
    } catch (cleanupError) {
      logger.warn('Local auth cleanup failed', cleanupError);
      useAuthStore.getState().resetAuth();
    }
  }, [queryClient]);

  const finishAccountDeletionLocally = React.useCallback(async () => {
    isDeletingAccountRef.current = true;
    isSigningOutRef.current = true;
    requestIdRef.current += 1;
    setShowDeleteModal(false);
    setProfile(null);
    setSubscription(null);
    setChart(null);
    setPrimaryPhotoUrl(null);
    setLoading(false);
    queryClient.clear();

    await waitForDeleteAccountModalDismiss();

    useAuthStore.getState().resetAuth();

    try {
      await notificationService.clearCachedPushToken();
      await clearAllUserData();
    } catch (cleanupError) {
      logger.warn('Local cleanup after account deletion failed', cleanupError);
    }
  }, [queryClient]);

  // Animations
  const fadeAnim = useSharedValue(0);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 800 });
  }, []);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    subscriptionRef.current = subscription;
  }, [subscription]);

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
    if (isDeletingAccountRef.current || isSigningOutRef.current) {
      return;
    }

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
        if (
          isDeletingAccountRef.current ||
          isSigningOutRef.current ||
          requestId !== requestIdRef.current ||
          !cachedPhoto?.url
        ) {
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

      if (isDeletingAccountRef.current || isSigningOutRef.current) {
        return;
      }

      if (profileRes.status === 'rejected') {
        const profileError: any = profileRes.reason;
        const st = profileError?.response?.status;
        const data = profileError?.response?.data;
        logger.warn('getProfile failed', st, data);

        if (isMissingProfileSessionError(profileError)) {
          await clearProfileAndRouteToAuth();
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
          : (subscriptionRef.current ??
            queryClient.getQueryData<Subscription>(['subscription']) ??
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

      if (subscriptionRes.status === 'fulfilled') {
        queryClient.setQueryData(['subscription'], resolvedSubscription);
      }

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
      if (isDeletingAccountRef.current || isSigningOutRef.current) {
        return;
      }

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (isMissingProfileSessionError(error)) {
        await clearProfileAndRouteToAuth();
        return;
      }

      // сюда попадём только если упал getProfile (критично)
      const st = error?.response?.status;
      const data = error?.response?.data;
      logger.error('Ошибка загрузки данных профиля', st, data, error?.message);
      Alert.alert(
        i18n.t('common.errors.generic'),
        data?.message || i18n.t('profile.errors.failedToLoad')
      );
    } finally {
      if (isDeletingAccountRef.current || isSigningOutRef.current) {
        return;
      }

      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [
    authProfile?.id,
    buildProfileFromAuth,
    clearProfileAndRouteToAuth,
    i18n,
    queryClient,
  ]);

  useFocusEffect(
    React.useCallback(() => {
      void fetchProfileData();
    }, [fetchProfileData])
  );

  const handleDeleteAccount = async () => {
    isDeletingAccountRef.current = true;
    requestIdRef.current += 1;

    try {
      await userAPI.deleteAccount();
    } catch (error: any) {
      if (isMissingProfileSessionError(error)) {
        logger.warn(
          'Account delete returned missing auth/profile; routing to auth',
          error
        );
        await finishAccountDeletionLocally();
        return;
      }

      isDeletingAccountRef.current = false;
      logger.error('Ошибка удаления аккаунта', error);
      Alert.alert(
        t('common.errors.generic'),
        error.message || t('profile.errors.failedToDelete')
      );
      return;
    }

    await finishAccountDeletionLocally();
  };

  const handleUpgradeSubscription = () => {
    navigateToRootScreen('Subscription');
  };

  const handleViewPersonalCode = () => {
    navigateToRootScreen('PersonalCode');
  };

  const handleOpenCompatibility = () => {
    navigateToRootScreen('Compatibility');
  };

  const handleOpenCosmicSimulator = () => {
    navigateToRootScreen('CosmicSimulator');
  };

  const handleOpenLearning = () => {
    navigateToRootScreen('Learning', { source: 'profile' });
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  if (loading) {
    return (
      <SafeAreaViewSAC
        style={styles.container}
        edges={['top', 'left', 'right']}
      >
        <ProfileTopGlow />
        <ProfileSkeleton />
        <BottomTabFade />
      </SafeAreaViewSAC>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <ProfileTopGlow />
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
  const zodiacSignLabel = t(
    `common.zodiacSigns.${normalizeZodiacKey(zodiacSign)}`,
    { defaultValue: zodiacSign }
  );
  const ProfileZodiacIcon =
    PROFILE_ZODIAC_ICONS[normalizeZodiacKey(zodiacSign)] ?? AquariusProfileIcon;
  const ProfileAvatarIcon =
    PROFILE_AVATAR_ICONS[normalizeZodiacKey(zodiacSign)] ?? AquariusAvatarIcon;
  const rawPremiumFeatures = t('subscription.tiers.premium.features', {
    returnObjects: true,
  });
  const premiumFeatures = Array.isArray(rawPremiumFeatures)
    ? rawPremiumFeatures.filter(
        (feature): feature is string => typeof feature === 'string'
      )
    : [];
  const compatibilityLabel = i18n.language.toLowerCase().startsWith('ru')
    ? 'Совместимость'
    : i18n.language.toLowerCase().startsWith('es')
      ? 'Compatibilidad'
      : 'Compatibility';
  const natalActions: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    featured?: boolean;
  }> = [
    {
      icon: 'telescope-outline',
      label: t('profile.natalChart.viewChart'),
      onPress: () => navigateToRootScreen('NatalChart'),
      featured: true,
    },
    {
      icon: 'code-outline',
      label: t('profile.natalChart.viewPersonalCode'),
      onPress: handleViewPersonalCode,
    },
    {
      icon: 'heart-outline',
      label: compatibilityLabel,
      onPress: handleOpenCompatibility,
    },
    {
      icon: 'planet-outline',
      label: t('profile.natalChart.viewSimulator'),
      onPress: handleOpenCosmicSimulator,
    },
    {
      icon: 'school-outline',
      label: t('profile.natalChart.viewLearning'),
      onPress: handleOpenLearning,
    },
  ];

  return (
    <SafeAreaViewSAC style={styles.container} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            // ключевая строка: чтобы контент не перекрывался таббаром
            paddingTop: insets.top + 24,
            paddingBottom: Math.max(56, tabBarHeight + 28),
          },
        ]}
        // помогает на iOS корректно отрабатывать safe area
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <ProfileTopGlow />
        <Animated.View style={[styles.content, animatedContainerStyle]}>
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={() => navigateToRootScreen('EditProfileScreen')}
              activeOpacity={0.88}
            >
              <GradientBorderView
                colors={['rgba(165, 47, 255, 0)', 'rgba(165, 47, 255, 0.5)']}
                gradientProps={{
                  start: { x: 0, y: 0.5 },
                  end: { x: 1, y: 0.5 },
                }}
                style={styles.avatarBorder}
                contentStyle={styles.avatarWrapper}
              >
                {primaryPhotoUrl ? (
                  <Image
                    source={{ uri: primaryPhotoUrl }}
                    style={styles.avatarImage}
                    onError={() => setPrimaryPhotoUrl(null)}
                  />
                ) : (
                  <LinearGradient
                    colors={['#422070', '#241046', '#10091E']}
                    start={{ x: 0.2, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                    style={styles.avatarFallback}
                  >
                    <ProfileAvatarIcon
                      width={88}
                      height={92}
                      style={styles.avatarFallbackIcon}
                    />
                  </LinearGradient>
                )}
              </GradientBorderView>
            </TouchableOpacity>

            <Text style={styles.userName}>
              {profile.name ||
                authProfile?.name ||
                t('profile.defaults.userName')}
            </Text>

            <View style={styles.zodiacInfo}>
              <ProfileZodiacIcon
                width={19}
                height={19}
                color={PROFILE_META_COLOR}
                style={styles.zodiacIcon}
              />
              <Text style={styles.zodiacSign}>{zodiacSignLabel}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.premiumTouchable}
            onPress={handleUpgradeSubscription}
            activeOpacity={0.9}
          >
            <View style={styles.premiumBorder}>
              <ImageBackground
                source={premiumBackground}
                imageStyle={styles.premiumBackgroundImage}
                style={styles.premiumCard}
                resizeMode="cover"
              >
                <View style={styles.premiumHero}>
                  <Image
                    source={premiumHero}
                    resizeMode="contain"
                    style={styles.premiumHeroImage}
                  />
                  <Text style={styles.premiumTitle}>Premium</Text>
                  <View style={styles.premiumLink}>
                    <Text style={styles.premiumLinkText}>
                      {subscription == null || subscription.tier === 'free'
                        ? t('subscription.buttons.upgrade')
                        : t(`subscription.tiers.${subscription?.tier}.name`)}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="rgba(255, 255, 255, 0.65)"
                    />
                  </View>
                </View>
                <View style={styles.premiumFeatures}>
                  {premiumFeatures.slice(0, 8).map((feature) => (
                    <GradientBorderView
                      key={feature}
                      colors={[
                        'rgba(124, 119, 153, 0.7)',
                        'rgba(124, 119, 153, 0.05)',
                      ]}
                      gradientProps={{
                        locations: [0.29, 1],
                        start: { x: 0.49, y: 0 },
                        end: { x: 0.51, y: 1 },
                      }}
                      style={styles.premiumFeatureBorder}
                      contentStyle={styles.premiumFeatureBorderContent}
                    >
                      <BlurView
                        intensity={15}
                        tint="dark"
                        experimentalBlurMethod="dimezisBlurView"
                        style={styles.premiumFeatureBlur}
                      >
                        <Text style={styles.premiumFeatureText}>{feature}</Text>
                      </BlurView>
                    </GradientBorderView>
                  ))}
                </View>
              </ImageBackground>
            </View>
          </TouchableOpacity>

          {/* Natal Chart Section */}
          {chart && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('profile.sections.natalChart')}
              </Text>
              <View style={styles.chartWidget}>
                <NatalChartGlow />
                <NatalChartWidget chart={chart} />
              </View>

              <View style={styles.natalActions}>
                {natalActions.map((action) => (
                  <TouchableOpacity
                    key={action.label}
                    style={styles.natalActionButton}
                    onPress={action.onPress}
                    activeOpacity={0.85}
                  >
                    <GradientBorderView
                      colors={
                        action.featured
                          ? [
                              'rgba(210, 164, 255, 0.55)',
                              'rgba(109, 45, 150, 0.3)',
                            ]
                          : [
                              'rgba(135, 98, 154, 0.35)',
                              'rgba(135, 98, 154, 0.08)',
                            ]
                      }
                      style={styles.natalActionBorder}
                      contentStyle={styles.natalActionBorderContent}
                    >
                      <LinearGradient
                        colors={
                          action.featured
                            ? [
                                'rgba(97, 32, 129, 0.22)',
                                'rgba(173, 58, 231, 0.34)',
                              ]
                            : [
                                'rgba(97, 32, 129, 0.07)',
                                'rgba(173, 58, 231, 0.13)',
                              ]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.natalActionGradient}
                      >
                        <Ionicons
                          name={action.icon}
                          size={24}
                          color="#FFFFFF"
                        />
                        <Text style={styles.natalActionText}>
                          {action.label}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={22}
                          color="#FFFFFF"
                        />
                      </LinearGradient>
                    </GradientBorderView>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('profile.sections.settings')}
            </Text>

            <View style={styles.settingsList}>
              <TouchableOpacity
                style={styles.settingTouchable}
                onPress={() => navigation.navigate('EditProfileScreen')}
              >
                <GradientBorderView
                  colors={[
                    'rgba(135, 98, 154, 0.3)',
                    'rgba(135, 98, 154, 0.08)',
                  ]}
                  style={styles.settingBorder}
                  contentStyle={styles.settingBorderContent}
                >
                  <LinearGradient
                    colors={[
                      'rgba(97, 32, 129, 0.05)',
                      'rgba(173, 58, 231, 0.1)',
                    ]}
                    style={styles.settingItem}
                  >
                    <Ionicons name="person" size={22} color="#fff" />
                    <Text style={styles.settingText}>
                      {t('profile.settings.editProfile')}
                    </Text>
                    <Ionicons name="chevron-forward" size={22} color="#fff" />
                  </LinearGradient>
                </GradientBorderView>
              </TouchableOpacity>

              <GradientBorderView
                colors={['rgba(135, 98, 154, 0.3)', 'rgba(135, 98, 154, 0.08)']}
                style={styles.settingBorder}
                contentStyle={styles.settingBorderContent}
              >
                <LinearGradient
                  colors={[
                    'rgba(97, 32, 129, 0.05)',
                    'rgba(173, 58, 231, 0.1)',
                  ]}
                  style={styles.settingItem}
                >
                  <Ionicons name="language" size={22} color="#fff" />
                  <LanguageSelector
                    compact
                    label={t('profile.settings.language')}
                    onLanguageChange={(lang) => {
                      logger.log('Language changed to:', lang);
                    }}
                  />
                </LinearGradient>
              </GradientBorderView>

              <TouchableOpacity
                style={styles.settingTouchable}
                onPress={() => setShowDeleteModal(true)}
              >
                <GradientBorderView
                  colors={[
                    'rgba(154, 98, 98, 0.34)',
                    'rgba(154, 98, 98, 0.08)',
                  ]}
                  style={styles.settingBorder}
                  contentStyle={styles.settingBorderContent}
                >
                  <LinearGradient
                    colors={[
                      'rgba(129, 32, 32, 0.06)',
                      'rgba(231, 58, 58, 0.11)',
                    ]}
                    style={styles.settingItem}
                  >
                    <Ionicons name="trash-outline" size={22} color="#FF8888" />
                    <Text style={styles.deleteText}>
                      {t('profile.settings.deleteAccount')}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={22}
                      color="#FFFFFF"
                    />
                  </LinearGradient>
                </GradientBorderView>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
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

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080E1C',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
    position: 'relative',
    overflow: 'visible',
  },
  topGlow: {
    position: 'absolute',
    top: -499,
    left: -250,
    right: -250,
    height: 1352,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 4,
  },
  avatarBorder: {
    borderRadius: 50,
    borderWidth: 2,
    marginBottom: 8,
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#16122E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarFallbackIcon: {
    opacity: 0.96,
  },
  userName: {
    fontSize: 28,
    fontWeight: '500',
    color: '#fff',
  },
  zodiacInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zodiacIcon: {
    color: PROFILE_META_COLOR,
    alignSelf: 'center',
  },
  zodiacSign: {
    fontSize: 17,
    lineHeight: 19,
    color: PROFILE_META_COLOR,
    fontWeight: '300',
  },
  section: {
    marginBottom: 26,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '500',
    letterSpacing: -0.8,
    color: '#fff',
    marginBottom: 18,
  },
  premiumTouchable: {
    marginBottom: 26,
  },
  premiumBorder: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    borderColor: 'rgba(135, 98, 154, 0.15)',
    overflow: 'hidden',
  },
  premiumBackgroundImage: {
    borderRadius: 11,
    opacity: 0.7,
  },
  premiumCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#130545',
    borderRadius: 11,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 18,
    minHeight: 256,
  },
  premiumHero: {
    alignItems: 'center',
    marginBottom: 14,
  },
  premiumHeroImage: {
    width: 115,
    height: 92,
  },
  premiumTitle: {
    marginTop: 2,
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  premiumLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  premiumLinkText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.62)',
    fontWeight: '500',
  },
  premiumFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  premiumFeatureBorder: {
    borderWidth: 1,
    borderRadius: 24,
  },
  premiumFeatureBorderContent: {
    borderRadius: 23,
    overflow: 'hidden',
  },
  premiumFeatureBlur: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  premiumFeatureText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  chartWidget: {
    marginHorizontal: -16,
    marginBottom: 8,
    position: 'relative',
    alignItems: 'center',
  },
  chartGlow: {
    position: 'absolute',
    top: 0,
    opacity: 0.9,
  },
  natalActions: {
    gap: 10,
  },
  natalActionButton: {
    width: '100%',
  },
  natalActionBorder: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
  },
  natalActionBorderContent: {
    backgroundColor: '#0D1223',
  },
  natalActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    borderRadius: 11,
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 18,
  },
  natalActionText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
  settingsList: {
    gap: 10,
  },
  settingTouchable: {
    width: '100%',
  },
  settingBorder: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
  },
  settingBorderContent: {
    backgroundColor: '#0C1121',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    borderRadius: 11,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 18,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  deleteText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#FF8888',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
});

export default ProfileScreen;
