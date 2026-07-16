import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useOptionalBottomTabBarHeight } from '../hooks/useOptionalBottomTabBarHeight';
import { datingAPI, userAPI } from '../services/api';
import { logger } from '../services/logger';
import type { RootStackParamList } from '../types/navigation';
import type { DatingCandidate, MutualDatingMatch } from '../types/dating';
import DatingCard from '../components/dating/DatingCard';
import {
  DatingTabBar,
  type DatingTab,
} from '../components/dating/DatingTabBar';
import ChatListScreen from './ChatListScreen';
import DatingCardBackdrop from '../../assets/dating-bg.svg';
import advisorBackground from '../../assets/advisor-bg.png';
import { GradientBorderView } from '../components/shared';
import LoadingIndicator from '../components/shared/LoadingIndicator';

const LAST_TAB_KEY_PREFIX = 'dating:last-tab:';
type MatchFilter = 'all' | 'new' | 'nearby' | 'online';

const DISCOVERY_CARD_MAX_HEIGHT = 530;
const DISCOVERY_CARD_MIN_HEIGHT = 410;
const DISCOVERY_CARD_STAGE_OFFSET = 24;
const DISCOVERY_CARD_TOP_OFFSET = 14;
const DISCOVERY_ACTIONS_HEIGHT = 106;
const DISCOVERY_ACTIONS_TOP_PADDING = 16;
const DISCOVERY_ACTIONS_BOTTOM_PADDING = 26;
const DISCOVERY_BACKDROP_EXTRA_HEIGHT = 30;

const matchFilters: Array<{ key: MatchFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'nearby', label: 'Nearby' },
  { key: 'online', label: 'Online' },
];

function DiscoveryActionButton({
  children,
  onPress,
  size,
}: {
  children: React.ReactNode;
  onPress: () => void;
  size: number;
}) {
  const borderWidth = size === 64 ? 1.6 : 1.4;
  return (
    <Pressable onPress={onPress} style={{ borderRadius: size / 2 }}>
      <GradientBorderView
        colors={['rgba(255,255,255,0.42)', 'rgba(124,119,153,0.26)']}
        gradientProps={{
          start: { x: 0.5, y: 0 },
          end: { x: 0.5, y: 1 },
        }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
        }}
        contentStyle={[
          styles.roundActionContent,
          {
            width: size - borderWidth * 2,
            height: size - borderWidth * 2,
          },
        ]}
      >
        <BlurView
          pointerEvents="none"
          intensity={30}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.roundActionTint} />
        {children}
      </GradientBorderView>
    </Pressable>
  );
}

export default function DatingScreen() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const bottomTabHeight = useOptionalBottomTabBarHeight();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const [tab, setTab] = useState<DatingTab>('discovery');
  const [tabReady, setTabReady] = useState(false);
  const [candidates, setCandidates] = useState<DatingCandidate[]>([]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [matches, setMatches] = useState<MutualDatingMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [refreshingMatches, setRefreshingMatches] = useState(false);
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all');
  const [moderationBusy, setModerationBusy] = useState(false);
  const backgroundOpacity = useSharedValue(0.9);

  const storageKey = `${LAST_TAB_KEY_PREFIX}${user?.id ?? 'anonymous'}`;
  const headerHeight = insets.top + 68;
  const discoveryCardWidth = Math.min(382, screenWidth - 48);
  const discoveryBackdropWidth = discoveryCardWidth + 32;
  const discoveryBackdropLeft =
    (discoveryCardWidth - discoveryBackdropWidth) / 2;
  const bottomTabOffset = Math.max(14, Math.round(insets.bottom * 0.5) + 12);
  const bottomNavigationClearance = bottomTabHeight + bottomTabOffset;
  const cardHeight = Math.max(
    DISCOVERY_CARD_MIN_HEIGHT,
    Math.min(
      DISCOVERY_CARD_MAX_HEIGHT,
      screenHeight -
        headerHeight -
        bottomNavigationClearance -
        DISCOVERY_ACTIONS_HEIGHT -
        DISCOVERY_CARD_STAGE_OFFSET
    )
  );
  const discoveryBackdropHeight = cardHeight + DISCOVERY_BACKDROP_EXTRA_HEIGHT;

  useEffect(() => {
    backgroundOpacity.value = withTiming(tab === 'discovery' ? 0.9 : 0.45, {
      duration: 360,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [backgroundOpacity, tab]);

  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  useEffect(() => {
    let mounted = true;
    setTabReady(false);
    void AsyncStorage.getItem(storageKey)
      .then((saved) => {
        if (
          mounted &&
          (saved === 'discovery' || saved === 'matched' || saved === 'messages')
        ) {
          setTab(saved);
        }
      })
      .finally(() => {
        if (mounted) setTabReady(true);
      });
    return () => {
      mounted = false;
    };
  }, [storageKey]);

  const selectTab = useCallback(
    (nextTab: DatingTab) => {
      setTab(nextTab);
      void AsyncStorage.setItem(storageKey, nextTab);
    },
    [storageKey]
  );

  const loadCandidates = useCallback(async () => {
    if (!user || authLoading) return;
    setLoadingCandidates(true);
    try {
      const result = await datingAPI.getCandidates(20);
      setCandidates(result);
      setCandidateIndex(0);
    } catch (error) {
      logger.error('[Dating] Failed to load candidates', error);
      Alert.alert(t('common.errors.generic'), t('dating.errors.failedToLoad'));
    } finally {
      setLoadingCandidates(false);
    }
  }, [authLoading, t, user]);

  const loadMatches = useCallback(
    async (refresh = false) => {
      if (!user || authLoading) return;
      refresh ? setRefreshingMatches(true) : setLoadingMatches(true);
      try {
        setMatches(await datingAPI.getMutualMatches(50));
      } catch (error) {
        logger.error('[Dating] Failed to load mutual matches', error);
      } finally {
        setRefreshingMatches(false);
        setLoadingMatches(false);
      }
    },
    [authLoading, user]
  );

  useEffect(() => {
    if (tabReady && user && candidates.length === 0) void loadCandidates();
  }, [candidates.length, loadCandidates, tabReady, user]);

  useEffect(() => {
    if (tab === 'matched' && matches.length === 0) void loadMatches();
  }, [loadMatches, matches.length, tab]);

  const current = candidates[candidateIndex] ?? null;

  const openProfile = useCallback(
    (profile: DatingCandidate | MutualDatingMatch) => {
      const photoUrl =
        'primaryPhotoUrl' in profile
          ? profile.primaryPhotoUrl
          : profile.photoUrl;
      navigation.navigate('DatingProfile', {
        userId: profile.userId,
        compatibility: profile.compatibility,
        compatibilitySummary: profile.compatibilitySummary,
        name: profile.name,
        age: profile.age,
        zodiacSign: profile.zodiacSign,
        bio: profile.bio,
        interests: profile.interests,
        city: profile.city,
        photos: profile.photos,
        photoUrl,
        lookingFor: profile.lookingFor,
        lastActive: profile.lastActive,
      });
    },
    [navigation]
  );

  const handleSwipe = useCallback(
    async (direction: 'left' | 'right') => {
      if (!current) return;
      try {
        const result = await datingAPI.like(
          current.userId,
          direction === 'right' ? 'like' : 'pass'
        );
        if (direction === 'right' && result.matchId) {
          Alert.alert(t('dating.match.title'), t('dating.match.message'), [
            { text: t('common.buttons.close'), style: 'cancel' },
            {
              text: t('dating.match.openChat'),
              onPress: () =>
                navigation.navigate('ChatDialog', {
                  otherUserId: current.userId,
                  displayName: current.name,
                  primaryPhotoUrl: current.photoUrl,
                }),
            },
          ]);
        }
      } catch (error) {
        logger.error('[Dating] Swipe failed', error);
      } finally {
        setCandidateIndex((index) => index + 1);
      }
    },
    [current, navigation, t]
  );

  const removeCandidate = useCallback((userId: string) => {
    setCandidates((items) => items.filter((item) => item.userId !== userId));
  }, []);

  const openActions = useCallback(() => {
    if (!current || moderationBusy) return;
    Alert.alert(
      t('dating.actions.title'),
      t('dating.actions.subtitle', {
        name: current.name ?? t('dating.defaults.userName'),
      }),
      [
        { text: t('common.buttons.cancel'), style: 'cancel' },
        {
          text: t('dating.actions.report'),
          onPress: async () => {
            try {
              setModerationBusy(true);
              await userAPI.reportUser(current.userId, 'dating_profile_report');
              removeCandidate(current.userId);
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
              await userAPI.blockUser(current.userId);
              removeCandidate(current.userId);
            } finally {
              setModerationBusy(false);
            }
          },
        },
      ]
    );
  }, [current, moderationBusy, removeCandidate, t]);

  const filteredMatches = useMemo(() => {
    if (matchFilter === 'new') return matches.filter((item) => item.isNew);
    if (matchFilter === 'nearby')
      return matches.filter((item) => item.isNearby);
    if (matchFilter === 'online')
      return matches.filter((item) => item.isOnline);
    return matches;
  }, [matchFilter, matches]);

  const filterCount = useCallback(
    (filter: MatchFilter) => {
      if (filter === 'new') return matches.filter((item) => item.isNew).length;
      if (filter === 'nearby')
        return matches.filter((item) => item.isNearby).length;
      if (filter === 'online')
        return matches.filter((item) => item.isOnline).length;
      return matches.length;
    },
    [matches]
  );

  const renderDiscovery = () => {
    if (loadingCandidates || authLoading) {
      return (
        <View style={[styles.center, { paddingTop: headerHeight }]}>
          <LoadingIndicator size="large" />
        </View>
      );
    }
    if (!current) {
      return (
        <View style={[styles.center, { paddingTop: headerHeight }]}>
          <Ionicons name="planet-outline" size={58} color="#8D62A6" />
          <Text style={styles.emptyTitle}>{t('dating.empty.title')}</Text>
          <Text style={styles.emptyText}>{t('dating.empty.subtitle')}</Text>
          <Pressable style={styles.retryButton} onPress={loadCandidates}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.discovery,
          {
            paddingTop: headerHeight,
            paddingBottom: bottomNavigationClearance,
          },
        ]}
      >
        <View
          style={[
            styles.cardStage,
            {
              width: discoveryCardWidth,
              height: cardHeight + DISCOVERY_CARD_STAGE_OFFSET,
            },
          ]}
        >
          <MaskedView
            pointerEvents="none"
            style={[
              styles.cardBackdrop,
              {
                width: discoveryBackdropWidth,
                height: discoveryBackdropHeight,
                left: discoveryBackdropLeft,
              },
            ]}
            maskElement={
              <LinearGradient
                colors={['#FFFFFF', '#FFFFFF', 'rgba(255,255,255,0)']}
                locations={[0, 0.38, 0.74]}
                style={StyleSheet.absoluteFillObject}
              />
            }
          >
            <DatingCardBackdrop
              width={discoveryBackdropWidth}
              height={discoveryBackdropHeight}
              preserveAspectRatio="none"
            />
          </MaskedView>
          <View style={styles.cardForeground}>
            <DatingCard
              key={current.userId}
              cardHeight={cardHeight}
              user={{
                id: current.userId,
                name: current.name ?? t('dating.defaults.userName'),
                age: current.age,
                zodiacSign: current.zodiacSign,
                compatibility: current.compatibility,
                compatibilitySummary: current.compatibilitySummary,
                badge: current.badge,
                bio: current.bio,
                interests: current.interests ?? [],
                city: current.city,
                photos: current.photos,
                photoUrl: current.photoUrl,
                lookingFor: current.lookingFor,
                lastActive: current.lastActive,
              }}
              onSwipe={handleSwipe}
              onChat={() => undefined}
              onOpenProfile={() => openProfile(current)}
              onOpenActions={openActions}
              actionsDisabled={moderationBusy}
              isTop
            />
          </View>
        </View>
        <View style={styles.discoveryActions}>
          <DiscoveryActionButton size={56} onPress={() => handleSwipe('left')}>
            <Ionicons name="close" size={34} color="#FF1E2D" />
          </DiscoveryActionButton>
          <DiscoveryActionButton size={64} onPress={() => handleSwipe('right')}>
            <Ionicons name="heart" size={37} color="#FF293E" />
          </DiscoveryActionButton>
          <DiscoveryActionButton
            size={56}
            onPress={() =>
              navigation.navigate('ChatDialog', {
                otherUserId: current.userId,
                displayName: current.name,
                primaryPhotoUrl: current.photoUrl,
              })
            }
          >
            <Ionicons name="chatbubble-ellipses" size={27} color="#F1F1F1" />
          </DiscoveryActionButton>
        </View>
      </View>
    );
  };

  const renderMatchCard = ({ item }: { item: MutualDatingMatch }) => {
    const title =
      item.age != null
        ? `${item.name ?? t('dating.defaults.userName')}, ${item.age}`
        : item.name;
    return (
      <Pressable style={styles.matchCard} onPress={() => openProfile(item)}>
        {item.primaryPhotoUrl ? (
          <Image
            source={{ uri: item.primaryPhotoUrl }}
            style={StyleSheet.absoluteFillObject}
          />
        ) : (
          <LinearGradient
            colors={['#B58BCB', '#76518E']}
            style={styles.matchPhotoFallback}
          >
            <Ionicons name="person" size={70} color="rgba(255,255,255,0.28)" />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(8,14,28,0.08)', 'rgba(8,14,28,0.96)']}
          locations={[0.46, 0.64, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        {item.isOnline ? <View style={styles.onlineDot} /> : null}
        <View style={styles.matchInfo}>
          <Text numberOfLines={1} style={styles.matchName}>
            {title}
          </Text>
          {item.zodiacSign ? (
            <Text style={styles.matchZodiac}>{item.zodiacSign}</Text>
          ) : null}
          <View style={styles.compatibilityRow}>
            <Ionicons name="sparkles-outline" size={12} color="#FFFFFF" />
            <Text style={styles.compatibilityText}>
              {item.compatibility != null
                ? `${t('dating.card.compatibilityLabel')} ${item.compatibility}%`
                : t('dating.compatibility.pending', { defaultValue: 'Match' })}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderMatched = () => (
    <FlatList
      data={filteredMatches}
      keyExtractor={(item) => item.id}
      numColumns={2}
      renderItem={renderMatchCard}
      columnWrapperStyle={styles.matchRow}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: headerHeight + 26,
        paddingHorizontal: 23,
        paddingBottom: bottomTabHeight + 42,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshingMatches}
          onRefresh={() => loadMatches(true)}
          tintColor="#A93BE2"
        />
      }
      ListHeaderComponent={
        <View style={styles.filtersRow}>
          <Pressable style={styles.filterIcon}>
            <Ionicons name="filter" size={20} color="#FFFFFF" />
          </Pressable>
          {matchFilters.map((filter) => {
            const active = filter.key === matchFilter;
            return (
              <Pressable
                key={filter.key}
                onPress={() => setMatchFilter(filter.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text
                  style={[styles.filterText, active && styles.filterTextActive]}
                >
                  {filter.label} {filterCount(filter.key)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      }
      ListEmptyComponent={
        loadingMatches ? (
          <View style={styles.listCenter}>
            <LoadingIndicator />
          </View>
        ) : (
          <View style={styles.listCenter}>
            <Text style={styles.emptyTitle}>
              {t('dating.matched.empty', { defaultValue: 'No matches yet' })}
            </Text>
          </View>
        )
      }
    />
  );

  return (
    <GestureHandlerRootView style={styles.screen}>
      <Animated.Image
        source={advisorBackground}
        resizeMode="cover"
        style={[styles.backgroundImage, animatedBackgroundStyle]}
      />

      {tabReady ? (
        tab === 'discovery' ? (
          renderDiscovery()
        ) : tab === 'matched' ? (
          renderMatched()
        ) : (
          <ChatListScreen embedded topInset={headerHeight + 14} />
        )
      ) : null}

      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(20,17,48,0.72)',
          'rgba(20,17,48,0.36)',
          'rgba(20,17,48,0)',
        ]}
        locations={[0, 0.62, 1]}
        style={[styles.topFade, { height: headerHeight + 44 }]}
      />
      <View style={[styles.fixedHeader, { paddingTop: insets.top + 10 }]}>
        <DatingTabBar value={tab} onChange={selectTab} />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080E1C', overflow: 'hidden' },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    zIndex: 20,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 19,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 14,
    textAlign: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 14,
    marginTop: 7,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4B1B6A',
  },
  discovery: { flex: 1, alignItems: 'center' },
  cardStage: { position: 'relative' },
  cardBackdrop: { position: 'absolute', top: 4 },
  cardForeground: {
    position: 'absolute',
    top: DISCOVERY_CARD_TOP_OFFSET,
    left: 0,
    right: 0,
  },
  discoveryActions: {
    height: DISCOVERY_ACTIONS_HEIGHT,
    paddingTop: DISCOVERY_ACTIONS_TOP_PADDING,
    paddingBottom: DISCOVERY_ACTIONS_BOTTOM_PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  roundActionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  roundActionTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,14,28,0.2)',
  },
  filtersRow: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
  },
  filterIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(126,123,163,0.58)',
    backgroundColor: 'rgba(46,44,79,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChip: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(126,123,163,0.58)',
    backgroundColor: 'rgba(46,44,79,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: 'rgba(104,99,135,0.85)' },
  filterText: { color: '#AAA5B6', fontSize: 15 },
  filterTextActive: { color: '#FFFFFF' },
  matchRow: { gap: 13, marginBottom: 14 },
  matchCard: {
    flex: 1,
    aspectRatio: 0.72,
    maxWidth: '49%',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(95,88,132,0.8)',
    backgroundColor: '#221B3B',
  },
  matchPhotoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#21D6B1',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  matchInfo: { position: 'absolute', left: 11, right: 8, bottom: 8 },
  matchName: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  matchZodiac: { color: '#E7DFE9', fontSize: 12, marginTop: 1 },
  compatibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  compatibilityText: { color: '#E7DFE9', fontSize: 10 },
  listCenter: {
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
