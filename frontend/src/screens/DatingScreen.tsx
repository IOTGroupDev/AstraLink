import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  type LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import {
  useNavigation,
  useIsFocused,
  type NavigationProp,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList } from '../types/navigation';
import { useAuth } from '../hooks/useAuth';
import { datingAPI, chatAPI, userAPI } from '../services/api';
import CosmicChat from '../components/dating/CosmicChat';
import DatingCard from '../components/dating/DatingCard';
import { TabScreenLayout } from '../components/layout/TabScreenLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CosmicBackground from '../components/shared/CosmicBackground';
import CompactScreenHeader from '../components/shared/CompactScreenHeader';
import { logger } from '../services/logger';
import { DatingCardSkeleton } from '../components/dating/DatingCardSkeleton';

const CARD_TOP_PADDING = 4;
const MAX_CARD_HEIGHT = 640;

// API типы
type ApiCandidate = {
  userId: string;
  badge: 'high' | 'medium' | 'low';
  photoUrl?: string | null;
  photos?: string[] | null;
  avatarUrl?: string | null;
  name?: string | null;
  age?: number | null;
  zodiacSign?: string | null;
  bio?: string | null;
  interests?: string[] | null;
  city?: string | null;
  lookingFor?: string | null;
  lastActive?: string | null;
};

// Расширенный тип для UI
type Candidate = ApiCandidate & {
  name: string;
  age?: number | null;
  zodiacSign?: string | null;
  bio?: string | null;
  interests: string[];
  city?: string;
  photos: string[];
  photoUrl?: string | null;
  lookingFor?: string | null;
  lastActive?: string | null;
};

export default function DatingScreen() {
  const { t } = useTranslation();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [chatVisible, setChatVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    zodiacSign?: string | null;
    compatibility: number;
  } | null>(null);
  const [loadingCards, setLoadingCards] = useState<boolean>(true);
  const [moderationBusy, setModerationBusy] = useState(false);
  const [cardAreaHeight, setCardAreaHeight] = useState(0);

  const hasReachedEnd = currentIndex >= candidates.length;
  const current = hasReachedEnd ? null : candidates[currentIndex] || null;

  const { user, isLoading: authLoading } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const cardBottomPadding = Math.max(20, tabBarHeight + 12);
  const availableCardHeight = Math.max(
    0,
    cardAreaHeight - CARD_TOP_PADDING - cardBottomPadding
  );
  const measuredCardHeight =
    availableCardHeight > 0
      ? Math.min(MAX_CARD_HEIGHT, availableCardHeight)
      : undefined;
  const isFocused = useIsFocused();

  const getCompatibilityFromBadge = (b?: 'high' | 'medium' | 'low') =>
    b === 'high' ? 85 : b === 'medium' ? 65 : 45;

  const nextCard = useCallback(() => {
    setCurrentIndex((idx) => Math.min(idx + 1, candidates.length));
  }, [candidates.length]);

  const removeCandidateFromFeed = useCallback((userId: string) => {
    setCandidates((prev) =>
      prev.filter((candidate) => candidate.userId !== userId)
    );
  }, []);

  // ===============================
  // Handlers
  // ===============================
  const handleSwipe = useCallback(
    async (direction: 'left' | 'right') => {
      if (!current) return;

      try {
        if (direction === 'right') {
          const res = await datingAPI.like?.(current.userId, 'like');
          if (res?.matchId) {
            Alert.alert(t('dating.match.title'), t('dating.match.message'), [
              { text: t('common.buttons.close'), style: 'cancel' },
              {
                text: t('dating.match.openChat'),
                onPress: () =>
                  navigation.navigate('ChatDialog', {
                    otherUserId: current.userId,
                    displayName: current.name,
                  }),
              },
            ]);
          }
        } else {
          await datingAPI.like?.(current.userId, 'pass');
        }
      } catch (e) {
        logger.error('Ошибка свайпа', e);
      } finally {
        nextCard();
      }
    },
    [current, navigation, nextCard, t]
  );

  const handleChat = useCallback(() => {
    if (!current) {
      Alert.alert(t('common.errors.generic'), t('dating.errors.noUserData'));
      return;
    }

    const userData = {
      id: current.userId,
      name: current.name,
      zodiacSign: current.zodiacSign,
      compatibility: getCompatibilityFromBadge(current.badge),
    };

    setSelectedUser(userData);
    setChatVisible(true);
  }, [current]);

  const handleOpenProfile = useCallback(() => {
    if (!current) return;

    navigation.navigate('DatingProfile', {
      userId: current.userId,
      compatibility: getCompatibilityFromBadge(current.badge),
      name: current.name,
      age: current.age ?? null,
      zodiacSign: current.zodiacSign ?? null,
      bio: current.bio ?? null,
      interests: current.interests,
      city: current.city ?? null,
      photos: current.photos,
      photoUrl: current.photoUrl ?? null,
      lookingFor: current.lookingFor ?? null,
      lastActive: current.lastActive ?? null,
    });
  }, [current, navigation]);

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!selectedUser?.id) {
        Alert.alert(
          t('common.errors.generic'),
          t('dating.errors.userNotSelected')
        );
        return;
      }

      try {
        await chatAPI.sendMessage(selectedUser.id, text);
        setChatVisible(false);
        navigation.navigate('ChatDialog', {
          otherUserId: selectedUser.id,
          displayName: selectedUser.name,
        });
        setSelectedUser(null);
      } catch (error) {
        logger.error('Ошибка отправки сообщения', error);
        Alert.alert(
          t('common.errors.generic'),
          t('dating.errors.failedToSendMessage')
        );
      }
    },
    [selectedUser, navigation, t]
  );

  const handleCloseChat = useCallback(() => {
    setChatVisible(false);
    setSelectedUser(null);
  }, []);

  const reportCurrentUser = useCallback(
    async (targetUserId: string) => {
      try {
        setModerationBusy(true);
        await userAPI.reportUser(targetUserId, 'dating_profile_report');
        removeCandidateFromFeed(targetUserId);
      } catch (error) {
        logger.error('[Dating] Ошибка репорта пользователя', error);
        Alert.alert(
          t('common.errors.generic'),
          t('dating.actions.failedToReport')
        );
      } finally {
        setModerationBusy(false);
      }
    },
    [removeCandidateFromFeed, t]
  );

  const blockCurrentUser = useCallback(
    async (targetUserId: string) => {
      try {
        setModerationBusy(true);
        await userAPI.blockUser(targetUserId);
        removeCandidateFromFeed(targetUserId);
      } catch (error) {
        logger.error('[Dating] Ошибка блокировки пользователя', error);
        Alert.alert(
          t('common.errors.generic'),
          t('dating.actions.failedToBlock')
        );
      } finally {
        setModerationBusy(false);
      }
    },
    [removeCandidateFromFeed, t]
  );

  const handleOpenActions = useCallback(() => {
    if (!current || moderationBusy) return;

    Alert.alert(
      t('dating.actions.title'),
      t('dating.actions.subtitle', { name: current.name }),
      [
        {
          text: t('common.buttons.cancel'),
          style: 'cancel',
        },
        {
          text: t('dating.actions.report'),
          onPress: () => {
            Alert.alert(
              t('dating.actions.reportTitle'),
              t('dating.actions.reportMessage', { name: current.name }),
              [
                {
                  text: t('common.buttons.cancel'),
                  style: 'cancel',
                },
                {
                  text: t('dating.actions.report'),
                  style: 'destructive',
                  onPress: () => {
                    void reportCurrentUser(current.userId);
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
              t('dating.actions.blockMessage', { name: current.name }),
              [
                {
                  text: t('common.buttons.cancel'),
                  style: 'cancel',
                },
                {
                  text: t('dating.actions.block'),
                  style: 'destructive',
                  onPress: () => {
                    void blockCurrentUser(current.userId);
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [blockCurrentUser, current, moderationBusy, reportCurrentUser, t]);

  const handleCardAreaLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    setCardAreaHeight((prev) =>
      Math.abs(prev - nextHeight) > 1 ? nextHeight : prev
    );
  }, []);

  // ===============================
  // Загрузка кандидатов
  // ===============================
  useEffect(() => {
    if (authLoading || !user) return;

    (async () => {
      setLoadingCards(true);
      try {
        const data: ApiCandidate[] =
          (await datingAPI.getCandidates?.(20)) || [];
        logger.info('[Dating] candidates raw count', data.length);

        // Если совпадений нет — оставляем пусто, UI покажет заглушку (empty-state)
        if (data.length === 0) {
          logger.info('[Dating] Нет кандидатов от API');
        }

        const enriched: Candidate[] = data.map((c) => {
          return {
            ...c,
            name: c.name || t('dating.defaults.userName'),
            age: c.age ?? null,
            zodiacSign: c.zodiacSign ?? null,
            bio: c.bio ?? null,
            interests: Array.isArray(c.interests) ? c.interests : [],
            city: c.city ?? undefined,
            photos:
              Array.isArray(c.photos) && c.photos.length > 0
                ? c.photos
                : c.photoUrl
                  ? [c.photoUrl]
                  : [],
            photoUrl: c.photoUrl || c.avatarUrl || null,
            lookingFor: c.lookingFor
              ? t(`dating.lookingFor.${c.lookingFor}`, {
                  defaultValue: c.lookingFor,
                })
              : null,
            lastActive: c.lastActive ?? null,
          };
        });

        logger.info('[Dating] enriched candidates count', enriched.length);
        setCandidates(enriched);
        setCurrentIndex(0);
      } catch (err) {
        logger.error('[Dating] Ошибка загрузки', err);
        Alert.alert(
          t('common.errors.generic'),
          t('dating.errors.failedToLoad')
        );
      } finally {
        setLoadingCards(false);
      }
    })();
  }, [authLoading, user, t]);

  // ===============================
  // Render
  // ===============================
  return (
    <TabScreenLayout
      scrollable={false}
      edges={['left', 'right']}
      contentContainerStyle={styles.layoutContent}
    >
      <View style={styles.screen}>
        <GestureHandlerRootView style={styles.container}>
          {/* Космический фон */}
          <CosmicBackground active={isFocused} />

          <View style={styles.content}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
              <CompactScreenHeader
                title={t('dating.title')}
                description={t('dating.subtitle')}
                icon={<Ionicons name="heart" size={20} color="#FFFFFF" />}
              />
            </View>

            {/* Content */}
            {loadingCards ? (
              <View
                style={[
                  styles.cardContainer,
                  {
                    paddingTop: CARD_TOP_PADDING,
                    paddingBottom: cardBottomPadding,
                  },
                ]}
                onLayout={handleCardAreaLayout}
              >
                <DatingCardSkeleton cardHeight={measuredCardHeight} />
              </View>
            ) : !current ? (
              <View
                style={[
                  styles.emptyContainer,
                  {
                    paddingBottom: cardBottomPadding,
                    paddingTop: CARD_TOP_PADDING,
                  },
                ]}
              >
                <Ionicons name="planet-outline" size={64} color="#8B5CF6" />
                <Text style={styles.emptyTitle}>{t('dating.empty.title')}</Text>
                <Text style={styles.emptyText}>
                  {t('dating.empty.subtitle')}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.cardContainer,
                  {
                    paddingTop: CARD_TOP_PADDING,
                    paddingBottom: cardBottomPadding,
                  },
                ]}
                onLayout={handleCardAreaLayout}
              >
                <DatingCard
                  key={current.userId}
                  user={{
                    id: current.userId,
                    name: current.name,
                    age: current.age,
                    zodiacSign: current.zodiacSign,
                    compatibility: getCompatibilityFromBadge(current.badge),
                    bio: current.bio,
                    interests: current.interests,
                    city: current.city,
                    photos: current.photos,
                    photoUrl: current.photoUrl,
                    lookingFor: current.lookingFor,
                    lastActive: current.lastActive,
                  }}
                  cardHeight={measuredCardHeight}
                  onSwipe={handleSwipe}
                  onChat={handleChat}
                  onOpenProfile={handleOpenProfile}
                  onOpenActions={handleOpenActions}
                  actionsDisabled={moderationBusy}
                  isTop={true}
                />
              </View>
            )}

            {/* Модалка чата */}
            {chatVisible && selectedUser && (
              <CosmicChat
                visible={chatVisible}
                user={selectedUser}
                onClose={handleCloseChat}
                onSendMessage={handleSendMessage}
              />
            )}
          </View>
        </GestureHandlerRootView>
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(13, 6, 24, 0.98)',
            'rgba(13, 6, 24, 0.65)',
            'rgba(13, 6, 24, 0)',
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.topFade, { height: insets.top + 56 }]}
        />
      </View>
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  layoutContent: {
    flex: 1,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#0D0618',
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
});
