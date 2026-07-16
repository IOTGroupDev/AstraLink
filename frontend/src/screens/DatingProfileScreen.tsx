import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { datingAPI, userAPI } from '../services/api';
import { logger } from '../services/logger';
import type { RootStackParamList } from '../types/navigation';
import advisorBackground from '../../assets/advisor-bg.png';
import LoadingIndicator from '../components/shared/LoadingIndicator';

type Props = NativeStackScreenProps<RootStackParamList, 'DatingProfile'>;
type PublicProfile = Awaited<ReturnType<typeof datingAPI.getProfile>>;

const getInitialProfile = (
  params: Props['route']['params']
): PublicProfile => ({
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
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PublicProfile>(() =>
    getInitialProfile(route.params)
  );
  const [loading, setLoading] = useState(true);
  const [moderationBusy, setModerationBusy] = useState(false);
  const headerHeight = insets.top + 83;

  useEffect(() => {
    let mounted = true;
    void datingAPI
      .getProfile(route.params.userId)
      .then((fresh) => {
        if (!mounted) return;
        setProfile((current) => ({
          ...current,
          ...fresh,
          primaryPhotoUrl: fresh.primaryPhotoUrl ?? current.primaryPhotoUrl,
          photos:
            fresh.photos && fresh.photos.length > 0
              ? fresh.photos
              : current.photos,
        }));
      })
      .catch((error) =>
        logger.error('[DatingProfile] Failed to load profile', error)
      )
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [route.params.userId]);

  const photos = useMemo(() => {
    const result = (profile.photos ?? []).filter((photo): photo is string =>
      Boolean(photo)
    );
    if (profile.primaryPhotoUrl && !result.includes(profile.primaryPhotoUrl)) {
      result.unshift(profile.primaryPhotoUrl);
    }
    return result;
  }, [profile.photos, profile.primaryPhotoUrl]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const displayName = profile.name ?? t('dating.defaults.userName');
  const title =
    profile.age != null ? `${displayName}, ${profile.age}` : displayName;
  const online = useMemo(() => {
    if (!profile.lastActive) return false;
    const value = new Date(profile.lastActive).getTime();
    return Number.isFinite(value) && Date.now() - value < 5 * 60 * 1000;
  }, [profile.lastActive]);
  const zodiac = profile.zodiacSign
    ? t(`common.zodiacSigns.${profile.zodiacSign.toLowerCase()}`, {
        defaultValue: profile.zodiacSign,
      })
    : null;

  const openChat = useCallback(() => {
    navigation.navigate('ChatDialog', {
      otherUserId: route.params.userId,
      displayName,
      primaryPhotoUrl: profile.primaryPhotoUrl,
    });
  }, [displayName, navigation, profile.primaryPhotoUrl, route.params.userId]);

  const openSafetyActions = useCallback(() => {
    if (moderationBusy) return;
    Alert.alert(t('dating.actions.title'), undefined, [
      { text: t('common.buttons.cancel'), style: 'cancel' },
      {
        text: t('dating.actions.report'),
        onPress: async () => {
          try {
            setModerationBusy(true);
            await userAPI.reportUser(
              route.params.userId,
              'dating_profile_report'
            );
            navigation.goBack();
          } catch (error) {
            logger.error('[DatingProfile] Report failed', error);
          } finally {
            setModerationBusy(false);
          }
        },
      },
      {
        text: t('dating.actions.block'),
        style: 'destructive',
        onPress: async () => {
          try {
            setModerationBusy(true);
            await userAPI.blockUser(route.params.userId);
            navigation.goBack();
          } catch (error) {
            logger.error('[DatingProfile] Block failed', error);
          } finally {
            setModerationBusy(false);
          }
        },
      },
    ]);
  }, [moderationBusy, navigation, route.params.userId, t]);

  return (
    <View style={styles.screen}>
      <Image
        source={advisorBackground}
        resizeMode="cover"
        style={styles.backgroundImage}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + 17 },
        ]}
      >
        <View style={styles.hero}>
          {photos[photoIndex] ? (
            <Image
              source={{ uri: photos[photoIndex] }}
              style={styles.heroPhoto}
            />
          ) : (
            <LinearGradient
              colors={['#B58BCB', '#76518E']}
              style={styles.heroFallback}
            >
              <Ionicons
                name="person"
                size={118}
                color="rgba(255,255,255,0.28)"
              />
            </LinearGradient>
          )}
          {photos.length > 1 ? (
            <View style={styles.photoPager}>
              {photos.map((photo, index) => (
                <Pressable
                  key={`${photo}-${index}`}
                  onPress={() => setPhotoIndex(index)}
                  style={[
                    styles.photoDot,
                    index === photoIndex && styles.photoDotActive,
                  ]}
                />
              ))}
            </View>
          ) : null}
          {loading ? <LoadingIndicator style={styles.photoLoader} /> : null}
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.actionCard} onPress={openChat}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={33}
              color="#FFFFFF"
            />
            <Text style={styles.actionText}>
              {t('dating.profile.message', { defaultValue: 'Message' })}
            </Text>
          </Pressable>
          <View style={styles.actionCard}>
            <Ionicons name="sparkles-outline" size={37} color="#FFFFFF" />
            <Text style={styles.actionText}>
              {t('dating.profile.astrologyMatch', {
                defaultValue: 'Astrology Match',
              })}
            </Text>
          </View>
        </View>

        {route.params.compatibility != null ? (
          <View style={styles.section}>
            <View style={styles.matchTitleRow}>
              <View style={styles.matchRing} />
              <Text style={styles.matchLabel}>MATCH</Text>
              <Text style={styles.matchPercent}>
                {route.params.compatibility}%
              </Text>
            </View>
            {route.params.compatibilitySummary ? (
              <Text style={styles.bodyText}>
                {route.params.compatibilitySummary}
              </Text>
            ) : (
              <Text style={styles.bodyText}>
                {t('dating.profile.compatibilityReady', {
                  defaultValue:
                    'Your natal charts show a meaningful compatibility pattern.',
                })}
              </Text>
            )}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <Text style={styles.bodyText}>
            {profile.bio?.trim() || t('dating.profile.emptyBio')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INTERESTS</Text>
          <View style={styles.tags}>
            {(profile.interests ?? []).length > 0 ? (
              (profile.interests ?? []).map((interest) => (
                <View style={styles.tag} key={interest}>
                  <Text style={styles.tagText}>{interest}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.mutedText}>
                {t('dating.profile.emptyInterests')}
              </Text>
            )}
          </View>
        </View>

        <Pressable
          onPress={openSafetyActions}
          disabled={moderationBusy}
          style={styles.safetyButton}
        >
          <Ionicons name="shield-outline" size={17} color="#8E899B" />
          <Text style={styles.safetyText}>{t('dating.actions.title')}</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.fixedHeader, { paddingTop: insets.top + 10 }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={30} color="#FFFFFF" />
        </Pressable>
        <View style={styles.titlePill}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {title}
          </Text>
          <Text style={styles.headerSubtitle}>
            {zodiac ?? ''}
            {zodiac ? ' · ' : ''}
            <Text style={online ? styles.onlineText : styles.offlineText}>
              {online ? t('chat.header.online') : t('chat.header.offline')}
            </Text>
          </Text>
        </View>
        <View style={styles.headerSpacer} />
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(25,20,57,0.98)',
            'rgba(25,20,57,0.72)',
            'rgba(25,20,57,0)',
          ]}
          style={styles.headerFade}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080E1C' },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  content: { paddingHorizontal: 23, paddingBottom: 44 },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  headerFade: {
    position: 'absolute',
    top: 63,
    left: -24,
    right: -24,
    height: 45,
    zIndex: -1,
  },
  backButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(124,124,157,0.42)',
    backgroundColor: 'rgba(45,45,78,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { width: 45 },
  titlePill: {
    minWidth: 137,
    maxWidth: 210,
    minHeight: 45,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52,51,86,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(129,126,163,0.48)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '500',
  },
  headerSubtitle: { color: '#C5BECE', fontSize: 11, lineHeight: 14 },
  onlineText: { color: '#14D1AA' },
  offlineText: { color: '#8E899B' },
  hero: {
    height: 329,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(112,103,148,0.85)',
    backgroundColor: '#8A67A1',
  },
  heroPhoto: { width: '100%', height: '100%' },
  heroFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoPager: {
    position: 'absolute',
    left: 70,
    right: 70,
    bottom: 12,
    flexDirection: 'row',
    gap: 5,
  },
  photoDot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  photoDotActive: { backgroundColor: '#FFFFFF' },
  photoLoader: { position: 'absolute', right: 12, top: 12 },
  actionRow: { flexDirection: 'row', gap: 13, marginTop: 13 },
  actionCard: {
    flex: 1,
    height: 82,
    borderRadius: 22,
    backgroundColor: 'rgba(39,43,61,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(107,108,139,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionText: { color: '#FFFFFF', fontSize: 13 },
  section: { marginTop: 23 },
  matchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  matchRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#21D6B1',
    marginRight: 5,
  },
  matchLabel: { color: '#F0C9F4', fontSize: 12 },
  matchPercent: { color: '#FFFFFF', fontSize: 12 },
  sectionTitle: { color: '#F0C9F4', fontSize: 12, marginBottom: 8 },
  bodyText: { color: '#C7C3CE', fontSize: 15, lineHeight: 19 },
  mutedText: { color: '#8E899B', fontSize: 13 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  tag: {
    minWidth: 88,
    borderRadius: 17,
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignItems: 'center',
    backgroundColor: 'rgba(40,43,57,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(91,94,116,0.7)',
  },
  tagText: { color: '#C9C5CE', fontSize: 12 },
  safetyButton: {
    marginTop: 28,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  safetyText: { color: '#8E899B', fontSize: 13 },
});
