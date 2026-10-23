import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { datingAPI, userAPI } from '../services/api';
import { logger } from '../services/logger';
import { getOnlineIds, subscribePresence } from '../services/presence';
import type { RootStackParamList } from '../types/navigation';
import advisorBackground from '../../assets/advisor-bg.png';
import LoadingIndicator from '../components/shared/LoadingIndicator';
import {
  DATING_GLASS_BORDER_COLORS,
  DATING_GLASS_BORDER_GRADIENT,
  DatingGlassFill,
  GradientBorderView,
} from '../components/shared';

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
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const [viewerZoomed, setViewerZoomed] = useState(false);
  const photoPagerRef = useRef<ScrollView>(null);
  const fullPhotoPagerRef = useRef<ScrollView>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [photoWidth, setPhotoWidth] = useState(Math.max(1, windowWidth - 50));
  const [moderationBusy, setModerationBusy] = useState(false);
  const [onlineIds, setOnlineIds] = useState<ReadonlySet<string>>(getOnlineIds);
  useEffect(() => subscribePresence(setOnlineIds), []);
  const headerTopPadding = insets.top + 10;
  const headerHeight = headerTopPadding + 48;

  useEffect(() => {
    let mounted = true;
    setPhotoIndex(0);
    setPhotoViewerOpen(false);
    setLoading(true);
    setProfile(getInitialProfile(route.params));
    void datingAPI
      .getProfile(route.params.userId)
      .then((fresh) => {
        if (!mounted) return;
        setProfile((current) => ({
          ...current,
          ...fresh,
          // Older API responses may omit the gallery. An explicit empty array
          // means deletion; a missing gallery must not erase discovery photos.
          photos: Array.isArray(fresh.photos) ? fresh.photos : current.photos,
        }));
        logger.debug('[DatingProfile] Gallery response', {
          photoCount: Array.isArray(fresh.photos) ? fresh.photos.length : null,
          hasPrimaryPhoto: Boolean(fresh.primaryPhotoUrl),
        });
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
  useEffect(() => {
    setPhotoIndex((index) => Math.min(index, Math.max(0, photos.length - 1)));
  }, [photos.length]);
  const movePhoto = useCallback(
    (direction: number) => {
      if (photos.length < 2) return;
      setPhotoIndex(
        (index) => (index + direction + photos.length) % photos.length
      );
    },
    [photos.length]
  );
  useEffect(() => {
    setPhotoLoadFailed(false);
    setViewerZoomed(false);
  }, [photoIndex, photoViewerOpen]);
  const alignFullPhoto = useCallback(() => {
    fullPhotoPagerRef.current?.scrollTo({
      x: photoIndex * windowWidth,
      animated: false,
    });
  }, [photoIndex, windowWidth]);
  useEffect(() => {
    if (photoViewerOpen) alignFullPhoto();
  }, [alignFullPhoto, photoViewerOpen]);
  useEffect(() => {
    photoPagerRef.current?.scrollTo({
      x: photoIndex * photoWidth,
      animated: false,
    });
  }, [photoIndex, photoWidth, photos.length]);
  const displayName = profile.name ?? t('dating.defaults.userName');
  const title =
    profile.age != null ? `${displayName}, ${profile.age}` : displayName;
  const online = onlineIds.has(route.params.userId);
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
        directionalLockEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + 17 },
        ]}
      >
        <View style={styles.hero}>
          {photos.length > 0 ? (
            <ScrollView
              ref={photoPagerRef}
              testID="dating-profile-gallery"
              horizontal
              pagingEnabled
              directionalLockEnabled
              nestedScrollEnabled
              bounces={false}
              showsHorizontalScrollIndicator={false}
              style={styles.photoGallery}
              contentContainerStyle={styles.photoGalleryContent}
              onLayout={(event) => {
                const width = event.nativeEvent.layout.width;
                if (width > 0) setPhotoWidth(width);
              }}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x / photoWidth
                );
                setPhotoIndex(Math.max(0, Math.min(photos.length - 1, index)));
              }}
            >
              {photos.map((photo, index) => (
                <View
                  key={`${photo}-${index}`}
                  style={{ width: photoWidth, height: '100%' }}
                  accessibilityElementsHidden={index !== photoIndex}
                  importantForAccessibility={
                    index !== photoIndex ? 'no-hide-descendants' : 'auto'
                  }
                >
                  <Image
                    testID={
                      index === photoIndex ? 'dating-profile-photo' : undefined
                    }
                    source={{ uri: photo }}
                    style={styles.heroPhoto}
                  />
                  {photos.length > 1 ? (
                    <View style={styles.photoTapZones}>
                      <Pressable
                        style={styles.photoTapZone}
                        accessibilityRole="button"
                        accessibilityLabel={t('dating.card.previousPhoto')}
                        onPress={() => movePhoto(-1)}
                        onLongPress={() => setPhotoViewerOpen(true)}
                      />
                      <Pressable
                        style={styles.photoTapZone}
                        accessibilityRole="button"
                        accessibilityLabel={t('dating.card.nextPhoto')}
                        onPress={() => movePhoto(1)}
                        onLongPress={() => setPhotoViewerOpen(true)}
                      />
                    </View>
                  ) : (
                    <Pressable
                      style={StyleSheet.absoluteFill}
                      accessibilityRole="button"
                      accessibilityLabel={t('dating.card.openPhoto')}
                      onPress={() => setPhotoViewerOpen(true)}
                    />
                  )}
                </View>
              ))}
            </ScrollView>
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
          {photos.length > 0 ? (
            <View style={styles.photoCounter} pointerEvents="none">
              <Text style={styles.photoCounterText}>
                {photoIndex + 1} / {photos.length}
              </Text>
            </View>
          ) : null}
          {photos.length > 1 ? (
            <View style={styles.photoPager}>
              {photos.map((photo, index) => (
                <Pressable
                  key={`${photo}-${index}`}
                  onPress={() => setPhotoIndex(index)}
                  hitSlop={{ top: 10, bottom: 10 }}
                  style={[
                    styles.photoDot,
                    index === photoIndex && styles.photoDotActive,
                  ]}
                />
              ))}
            </View>
          ) : null}
          {photos.length > 0 ? (
            <Pressable
              style={styles.expandPhotoButton}
              accessibilityRole="button"
              accessibilityLabel={t('dating.card.openPhoto')}
              onPress={() => setPhotoViewerOpen(true)}
            >
              <Ionicons name="expand-outline" size={24} color="#FFFFFF" />
            </Pressable>
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

      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(25,20,57,0.78)',
          'rgba(25,20,57,0.4)',
          'rgba(25,20,57,0)',
        ]}
        locations={[0, 0.62, 1]}
        style={[styles.headerFade, { height: headerHeight + 44 }]}
      />
      <View
        style={[
          styles.fixedHeader,
          { paddingTop: headerTopPadding, height: headerHeight },
        ]}
      >
        <Pressable
          style={styles.headerCirclePressable}
          onPress={() => navigation.goBack()}
        >
          <GradientBorderView
            colors={DATING_GLASS_BORDER_COLORS}
            gradientProps={DATING_GLASS_BORDER_GRADIENT}
            style={styles.headerCircleBorder}
            contentStyle={[styles.datingGlassContent, styles.backButton]}
          >
            <DatingGlassFill />
            <Ionicons name="chevron-back" size={30} color="#FFFFFF" />
          </GradientBorderView>
        </Pressable>
        <GradientBorderView
          colors={DATING_GLASS_BORDER_COLORS}
          gradientProps={DATING_GLASS_BORDER_GRADIENT}
          style={styles.titlePillBorder}
          contentStyle={[styles.datingGlassContent, styles.titlePill]}
        >
          <DatingGlassFill />
          <View style={styles.titlePillContent}>
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
        </GradientBorderView>
        <View style={styles.headerSpacer} />
      </View>
      <Modal
        visible={photoViewerOpen && Boolean(photos[photoIndex])}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setPhotoViewerOpen(false)}
      >
        <View style={styles.photoViewer} testID="dating-profile-photo-viewer">
          <ScrollView
            ref={fullPhotoPagerRef}
            testID="dating-profile-full-gallery"
            style={styles.photoViewer}
            horizontal
            pagingEnabled
            directionalLockEnabled
            nestedScrollEnabled
            bounces={false}
            scrollEnabled={!viewerZoomed}
            contentOffset={{ x: photoIndex * windowWidth, y: 0 }}
            onLayout={alignFullPhoto}
            onContentSizeChange={alignFullPhoto}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / windowWidth
              );
              setPhotoIndex(Math.max(0, Math.min(photos.length - 1, index)));
            }}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            {photos.map((photo, index) => (
              <ScrollView
                key={`${route.params.userId}-${index}-${index === photoIndex}`}
                testID={
                  index === photoIndex ? 'dating-profile-photo-zoom' : undefined
                }
                style={{ width: windowWidth, height: windowHeight }}
                contentContainerStyle={styles.photoViewerContent}
                minimumZoomScale={1}
                maximumZoomScale={4}
                centerContent
                directionalLockEnabled
                nestedScrollEnabled
                bounces={false}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                accessibilityElementsHidden={index !== photoIndex}
                importantForAccessibility={
                  index !== photoIndex ? 'no-hide-descendants' : 'auto'
                }
                scrollEventThrottle={16}
                onScroll={(event) => {
                  if (index === photoIndex) {
                    setViewerZoomed((event.nativeEvent.zoomScale ?? 1) > 1.01);
                  }
                }}
              >
                <Image
                  testID={
                    index === photoIndex
                      ? 'dating-profile-full-photo'
                      : undefined
                  }
                  source={{ uri: photo }}
                  resizeMode="contain"
                  style={{ width: windowWidth, height: windowHeight }}
                  onError={() => {
                    if (index === photoIndex) setPhotoLoadFailed(true);
                  }}
                />
              </ScrollView>
            ))}
          </ScrollView>
          {photoLoadFailed ? (
            <Text style={styles.photoViewerError}>
              {t('chat.media.failedToLoadPhoto')}
            </Text>
          ) : null}
          <Pressable
            style={[
              styles.viewerButton,
              styles.viewerClose,
              { top: insets.top + 12 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('common.buttons.close')}
            onPress={() => setPhotoViewerOpen(false)}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>
          {photos.length > 1 ? (
            <View
              style={[styles.viewerNavigation, { bottom: insets.bottom + 16 }]}
            >
              <Pressable
                style={styles.viewerButton}
                accessibilityRole="button"
                accessibilityLabel={t('dating.card.previousPhoto')}
                onPress={() => movePhoto(-1)}
              >
                <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.photoCounterText}>
                {photoIndex + 1} / {photos.length}
              </Text>
              <Pressable
                style={styles.viewerButton}
                accessibilityRole="button"
                accessibilityLabel={t('dating.card.nextPhoto')}
                onPress={() => movePhoto(1)}
              >
                <Ionicons name="chevron-forward" size={28} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  expandPhotoButton: {
    position: 'absolute',
    right: 10,
    bottom: 22,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  photoViewer: { flex: 1, backgroundColor: '#000000' },
  photoViewerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerError: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    color: '#FFFFFF',
  },
  viewerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(40,40,40,0.8)',
  },
  viewerClose: { position: 'absolute', right: 16 },
  viewerNavigation: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoTapZones: { ...StyleSheet.absoluteFill, flexDirection: 'row' },
  photoTapZone: { flex: 1 },
  photoGallery: { flex: 1 },
  photoGalleryContent: { height: '100%' },
  photoCounter: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  photoCounterText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  screen: { flex: 1, backgroundColor: '#080E1C' },
  backgroundImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    opacity: 0.3,
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
    top: 0,
    left: 0,
    right: 0,
    zIndex: 19,
  },
  headerCirclePressable: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  headerCircleBorder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.1,
  },
  datingGlassContent: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 45.8,
    height: 45.8,
    borderRadius: 22.9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { width: 48 },
  titlePillBorder: {
    minWidth: 137,
    maxWidth: 210,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.1,
  },
  titlePill: {
    height: 45.8,
    borderRadius: 22.9,
    paddingHorizontal: 20,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titlePillContent: { alignItems: 'center' },
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
