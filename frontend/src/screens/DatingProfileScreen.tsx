import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CosmicBackground from '../components/shared/CosmicBackground';
import CosmicChat from '../components/dating/CosmicChat';
import { chatAPI, datingAPI, userAPI } from '../services/api';
import { logger } from '../services/logger';
import type { RootStackParamList } from '../types/navigation';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HERO_HEIGHT = Math.min(Dimensions.get('window').height * 0.54, 430);

type Props = NativeStackScreenProps<RootStackParamList, 'DatingProfile'>;
type DatingPublicProfile = Awaited<ReturnType<typeof datingAPI.getProfile>>;

const getZodiacTranslationKey = (sign: string): string => {
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

const buildPreviewProfile = (
  params: RootStackParamList['DatingProfile']
): DatingPublicProfile => ({
  userId: params.userId,
  name: params.name ?? null,
  age: params.age ?? null,
  zodiacSign: params.zodiacSign ?? null,
  bio: params.bio ?? null,
  interests: params.interests ?? null,
  city: params.city ?? null,
  lookingFor: params.lookingFor ?? null,
  lastActive: params.lastActive ?? null,
  primaryPhotoUrl: params.photoUrl ?? null,
  photos: params.photos ?? null,
});

export default function DatingProfileScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const previewProfile = useMemo(
    () => buildPreviewProfile(route.params),
    [route.params]
  );
  const [profile, setProfile] = useState<DatingPublicProfile | null>(
    previewProfile
  );
  const [loading, setLoading] = useState(true);
  const [chatVisible, setChatVisible] = useState(false);
  const [moderationBusy, setModerationBusy] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const freshProfile = await datingAPI.getProfile(route.params.userId);
        if (!mounted) return;

        setProfile((current) => ({
          ...current,
          ...freshProfile,
          photos:
            Array.isArray(freshProfile.photos) && freshProfile.photos.length > 0
              ? freshProfile.photos
              : (current?.photos ?? null),
          primaryPhotoUrl:
            freshProfile.primaryPhotoUrl ??
            current?.primaryPhotoUrl ??
            route.params.photoUrl ??
            null,
        }));
      } catch (error) {
        logger.error('[DatingProfile] Ошибка загрузки профиля', error);
        if (mounted && !previewProfile.name) {
          Alert.alert(
            t('common.errors.generic'),
            t('dating.profile.failedToLoad')
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [previewProfile.name, route.params.photoUrl, route.params.userId, t]);

  const resolvedPhotos = useMemo(() => {
    if (Array.isArray(profile?.photos) && profile.photos.length > 0) {
      return profile.photos.filter((photo): photo is string => !!photo);
    }

    if (profile?.primaryPhotoUrl) {
      return [profile.primaryPhotoUrl];
    }

    if (Array.isArray(route.params.photos) && route.params.photos.length > 0) {
      return route.params.photos.filter((photo): photo is string => !!photo);
    }

    return route.params.photoUrl ? [route.params.photoUrl] : [];
  }, [
    profile?.photos,
    profile?.primaryPhotoUrl,
    route.params.photoUrl,
    route.params.photos,
  ]);

  const displayName =
    profile?.name ?? route.params.name ?? t('dating.defaults.userName');
  const displayTitle =
    profile?.age != null ? `${displayName}, ${profile.age}` : displayName;
  const zodiacLabel = profile?.zodiacSign
    ? t(`common.zodiacSigns.${getZodiacTranslationKey(profile.zodiacSign)}`, {
        defaultValue: profile.zodiacSign,
      })
    : null;
  const cityLabel = profile?.city ?? route.params.city ?? null;
  const lookingForLabel = profile?.lookingFor
    ? t(`dating.lookingFor.${profile.lookingFor}`, {
        defaultValue: profile.lookingFor,
      })
    : (route.params.lookingFor ?? null);
  const lastActiveValue =
    profile?.lastActive ?? route.params.lastActive ?? null;
  const lastActiveLabel = (() => {
    if (!lastActiveValue) return null;
    const parsed = new Date(lastActiveValue);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString();
  })();
  const interests = Array.isArray(profile?.interests)
    ? profile.interests
    : (route.params.interests ?? []);

  const handlePhotoScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / SCREEN_WIDTH
    );
    setActivePhotoIndex(nextIndex);
  };

  const reportUserFromProfile = useCallback(async () => {
    try {
      setModerationBusy(true);
      await userAPI.reportUser(route.params.userId, 'dating_profile_report');
      navigation.goBack();
    } catch (error) {
      logger.error('[DatingProfile] Ошибка репорта пользователя', error);
      Alert.alert(
        t('common.errors.generic'),
        t('dating.actions.failedToReport')
      );
    } finally {
      setModerationBusy(false);
    }
  }, [navigation, route.params.userId, t]);

  const blockUserFromProfile = useCallback(async () => {
    try {
      setModerationBusy(true);
      await userAPI.blockUser(route.params.userId);
      navigation.goBack();
    } catch (error) {
      logger.error('[DatingProfile] Ошибка блокировки пользователя', error);
      Alert.alert(
        t('common.errors.generic'),
        t('dating.actions.failedToBlock')
      );
    } finally {
      setModerationBusy(false);
    }
  }, [navigation, route.params.userId, t]);

  const handleOpenActions = useCallback(() => {
    if (moderationBusy) return;

    Alert.alert(
      t('dating.actions.title'),
      t('dating.actions.subtitle', { name: displayName }),
      [
        { text: t('common.buttons.cancel'), style: 'cancel' },
        {
          text: t('dating.actions.report'),
          onPress: () => {
            Alert.alert(
              t('dating.actions.reportTitle'),
              t('dating.actions.reportMessage', { name: displayName }),
              [
                { text: t('common.buttons.cancel'), style: 'cancel' },
                {
                  text: t('dating.actions.report'),
                  style: 'destructive',
                  onPress: () => {
                    void reportUserFromProfile();
                  },
                },
              ]
            );
          },
        },
        {
          text: t('dating.actions.block'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('dating.actions.blockTitle'),
              t('dating.actions.blockMessage', { name: displayName }),
              [
                { text: t('common.buttons.cancel'), style: 'cancel' },
                {
                  text: t('dating.actions.block'),
                  style: 'destructive',
                  onPress: () => {
                    void blockUserFromProfile();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [
    blockUserFromProfile,
    displayName,
    moderationBusy,
    reportUserFromProfile,
    t,
  ]);

  const handleSendMessage = useCallback(
    async (text: string) => {
      try {
        await chatAPI.sendMessage(route.params.userId, text);
        setChatVisible(false);
        navigation.navigate('ChatDialog', {
          otherUserId: route.params.userId,
          displayName,
          primaryPhotoUrl:
            profile?.primaryPhotoUrl ?? route.params.photoUrl ?? null,
        });
      } catch (error) {
        logger.error('[DatingProfile] Ошибка отправки сообщения', error);
        Alert.alert(
          t('common.errors.generic'),
          t('dating.errors.failedToSendMessage')
        );
      }
    },
    [
      displayName,
      navigation,
      profile?.primaryPhotoUrl,
      route.params.photoUrl,
      route.params.userId,
      t,
    ]
  );

  const renderSection = (
    title: string,
    content: React.ReactNode,
    icon: keyof typeof Ionicons.glyphMap
  ) => (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color="#F5B942" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {content}
    </View>
  );

  return (
    <View style={styles.screen}>
      <CosmicBackground active={isFocused} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          {resolvedPhotos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              onMomentumScrollEnd={handlePhotoScroll}
              showsHorizontalScrollIndicator={false}
            >
              {resolvedPhotos.map((photo, index) => (
                <Image
                  key={`${photo}-${index}`}
                  source={{ uri: photo }}
                  style={styles.heroPhoto}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <LinearGradient
              colors={['#8B5CF6', '#6F1F87', '#31124D']}
              style={styles.heroPhoto}
            >
              <Ionicons
                name="person"
                size={112}
                color="rgba(255,255,255,0.24)"
              />
            </LinearGradient>
          )}

          <LinearGradient
            colors={['rgba(9, 12, 26, 0.08)', 'rgba(9, 12, 26, 0.82)']}
            style={styles.heroOverlay}
          />

          <View style={[styles.heroHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.82}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleOpenActions}
              activeOpacity={0.82}
              disabled={moderationBusy}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroFooter}>
            <View style={styles.compatibilityBadge}>
              <Ionicons name="sparkles" size={14} color="#0F172A" />
              <Text style={styles.compatibilityBadgeText}>
                {route.params.compatibility}%
              </Text>
            </View>

            <Text style={styles.heroTitle}>{displayTitle}</Text>

            {(zodiacLabel || cityLabel) && (
              <View style={styles.heroMetaRow}>
                {zodiacLabel ? (
                  <Text style={styles.heroMetaText}>{zodiacLabel}</Text>
                ) : null}
                {zodiacLabel && cityLabel ? (
                  <Text style={styles.heroMetaDivider}>{'\u00B7'}</Text>
                ) : null}
                {cityLabel ? (
                  <Text style={styles.heroMetaText}>{cityLabel}</Text>
                ) : null}
              </View>
            )}

            {resolvedPhotos.length > 1 ? (
              <View style={styles.pagination}>
                {resolvedPhotos.map((photo, index) => (
                  <View
                    key={`${photo}-${index}`}
                    style={[
                      styles.paginationDot,
                      index === activePhotoIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{t('dating.profile.title')}</Text>
            <Text style={styles.summarySubtitle}>
              {t('dating.profile.subtitle')}
            </Text>

            <View style={styles.compatibilityBlock}>
              <Text style={styles.compatibilityLabel}>
                {t('dating.card.compatibilityLabel')}
              </Text>
              <View style={styles.compatibilityTrack}>
                <LinearGradient
                  colors={['#F5B942', '#F97316']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[
                    styles.compatibilityFill,
                    { width: `${route.params.compatibility}%` },
                  ]}
                />
              </View>
            </View>
          </View>

          {renderSection(
            t('dating.profile.aboutTitle'),
            <Text style={styles.sectionBodyText}>
              {profile?.bio?.trim() || t('dating.profile.emptyBio')}
            </Text>,
            'person-outline'
          )}

          {renderSection(
            t('dating.profile.interestsTitle'),
            <View style={styles.tagsWrap}>
              {interests.length > 0 ? (
                interests.map((interest, index) => (
                  <View key={`${interest}-${index}`} style={styles.tag}>
                    <Text style={styles.tagText}>
                      {t(`dating.interests.${String(interest).toLowerCase()}`, {
                        defaultValue: interest,
                      })}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.sectionMutedText}>
                  {t('dating.profile.emptyInterests')}
                </Text>
              )}
            </View>,
            'planet-outline'
          )}

          {cityLabel
            ? renderSection(
                t('dating.profile.locationTitle'),
                <Text style={styles.sectionBodyText}>{cityLabel}</Text>,
                'location-outline'
              )
            : null}

          {lookingForLabel
            ? renderSection(
                t('dating.profile.lookingForTitle'),
                <Text style={styles.sectionBodyText}>{lookingForLabel}</Text>,
                'heart-outline'
              )
            : null}

          {lastActiveLabel
            ? renderSection(
                t('dating.profile.lastActiveTitle'),
                <Text style={styles.sectionBodyText}>{lastActiveLabel}</Text>,
                'time-outline'
              )
            : null}

          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => setChatVisible(true)}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#F5B942', '#F97316']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.messageButtonGradient}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="#111827"
              />
              <Text style={styles.messageButtonText}>
                {t('dating.profile.sendMessage')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#F5B942" />
              <Text style={styles.loadingText}>
                {t('dating.profile.loading')}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <CosmicChat
        visible={chatVisible}
        user={{
          id: route.params.userId,
          name: displayName,
          zodiacSign: profile?.zodiacSign ?? route.params.zodiacSign ?? null,
          compatibility: route.params.compatibility,
        }}
        onClose={() => setChatVisible(false)}
        onSendMessage={handleSendMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#090C1A',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  hero: {
    height: HERO_HEIGHT,
  },
  heroPhoto: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.66)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroFooter: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 22,
  },
  compatibilityBadge: {
    alignSelf: 'flex-start',
    minHeight: 28,
    borderRadius: 999,
    backgroundColor: '#F5B942',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  compatibilityBadgeText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroMetaText: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 15,
    fontWeight: '500',
  },
  heroMetaDivider: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
    marginHorizontal: 8,
  },
  pagination: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 16,
  },
  paginationDot: {
    width: 24,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  paginationDotActive: {
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 14,
  },
  summaryCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  summarySubtitle: {
    color: 'rgba(226, 232, 240, 0.78)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  compatibilityBlock: {
    gap: 10,
  },
  compatibilityLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  compatibilityTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  compatibilityFill: {
    height: '100%',
    borderRadius: 999,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionBodyText: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 15,
    lineHeight: 22,
  },
  sectionMutedText: {
    color: 'rgba(226, 232, 240, 0.58)',
    fontSize: 14,
    lineHeight: 20,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tagText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  messageButton: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 4,
  },
  messageButtonGradient: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  messageButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    color: 'rgba(226, 232, 240, 0.78)',
    fontSize: 14,
  },
});
