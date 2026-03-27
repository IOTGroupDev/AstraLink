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
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { datingAPI, chatAPI } from '../services/api';
import CosmicChat from '../components/dating/CosmicChat';
import DatingCard from '../components/dating/DatingCard';
import { TabScreenLayout } from '../components/layout/TabScreenLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAllZodiacSigns } from '../services/zodiac.service';
import CosmicBackground from '../components/shared/CosmicBackground';
import { logger } from '../services/logger';
import { DatingCardSkeleton } from '../components/dating/DatingCardSkeleton';

const CARD_TOP_PADDING = 4;
const MAX_CARD_HEIGHT = 640;

// API типы
type ApiCandidate = {
  userId: string;
  badge: 'high' | 'medium' | 'low';
  photoUrl?: string | null;
  avatarUrl?: string | null;
  name?: string | null;
  age?: number | null;
  zodiacSign?: string | null;
  bio?: string | null;
  interests?: string[] | null;
  city?: string | null;
};

// Расширенный тип для UI
type Candidate = ApiCandidate & {
  name: string;
  age: number;
  zodiacSign: string;
  bio: string;
  interests: string[];
  distance: number;
  city?: string;
  photos?: string[];
  photoUrl?: string;
  height?: number;
  lookingFor?: string;
};

export default function DatingScreen() {
  const { t } = useTranslation();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [chatVisible, setChatVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    zodiacSign: string;
    compatibility: number;
  } | null>(null);
  const [loadingCards, setLoadingCards] = useState<boolean>(true);
  const [cardAreaHeight, setCardAreaHeight] = useState(0);

  const current = candidates[currentIndex] || null;

  const { user, isLoading: authLoading } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const cardBottomPadding = Math.max(20, tabBarHeight + insets.bottom + 8);
  const availableCardHeight = Math.max(
    0,
    cardAreaHeight - CARD_TOP_PADDING - cardBottomPadding
  );
  const measuredCardHeight =
    availableCardHeight > 0
      ? Math.min(MAX_CARD_HEIGHT, availableCardHeight)
      : undefined;

  const getCompatibilityFromBadge = (b?: 'high' | 'medium' | 'low') =>
    b === 'high' ? 85 : b === 'medium' ? 65 : 45;

  const nextCard = useCallback(() => {
    setCurrentIndex((idx) => (idx + 1 < candidates.length ? idx + 1 : idx));
  }, [candidates.length]);

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
        let data: ApiCandidate[] = (await datingAPI.getCandidates?.(20)) || [];
        logger.info('[Dating] candidates raw count', data.length);

        // Если совпадений нет — оставляем пусто, UI покажет заглушку (empty-state)
        if (data.length === 0) {
          logger.info('[Dating] Нет кандидатов от API');
        }

        const allZodiacSigns = getAllZodiacSigns();
        const randomInterests = [
          t('dating.interests.music'),
          t('dating.interests.sports'),
          t('dating.interests.travel'),
          t('dating.interests.books'),
          t('dating.interests.movies'),
          t('dating.interests.art'),
          t('dating.interests.cooking'),
          t('dating.interests.yoga'),
          t('dating.interests.meditation'),
          t('dating.interests.nature'),
        ];
        const lookingForOptions = [
          t('dating.lookingFor.relationship'),
          t('dating.lookingFor.friendship'),
          t('dating.lookingFor.communication'),
          t('dating.lookingFor.somethingNew'),
        ];

        const enriched: Candidate[] = data.map((c) => {
          // Используем знак из API или выбираем случайный
          let zodiacName = c.zodiacSign;
          if (!zodiacName) {
            const randomSign =
              allZodiacSigns[Math.floor(Math.random() * allZodiacSigns.length)];
            zodiacName = randomSign.nameRu;
          }

          return {
            ...c,
            name: c.name || t('dating.defaults.userName'),
            age: c.age || Math.floor(Math.random() * 15) + 25,
            zodiacSign: zodiacName,
            bio: c.bio || t('dating.defaults.userBio'),
            interests:
              c.interests ||
              randomInterests.slice(0, Math.floor(Math.random() * 3) + 2),
            distance: Math.floor(Math.random() * 50) + 1,
            city: c.city ?? undefined,
            photos: c.photoUrl ? [c.photoUrl] : [],
            photoUrl: c.photoUrl || c.avatarUrl || undefined,
            height: Math.floor(Math.random() * 25) + 160, // 160-185 см
            lookingFor:
              lookingForOptions[
                Math.floor(Math.random() * lookingForOptions.length)
              ],
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
          <CosmicBackground />

          <View style={styles.content}>
            {/* Header */}
            <View
              style={[
                styles.header,
                { paddingTop: insets.top + 14, paddingBottom: 24 },
              ]}
            >
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={['#8B5CF6', '#A855F7']}
                  style={styles.iconCircle}
                >
                  <Ionicons name="heart" size={20} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.title}>{t('dating.title')}</Text>
              <Text style={styles.subtitle}>{t('dating.subtitle')}</Text>
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
                  user={{
                    id: current.userId,
                    name: current.name,
                    age: current.age,
                    zodiacSign: current.zodiacSign,
                    compatibility: getCompatibilityFromBadge(current.badge),
                    bio: current.bio,
                    interests: current.interests,
                    distance: current.distance,
                    photoUrl: current.photoUrl,
                    height: current.height,
                    lookingFor: current.lookingFor,
                  }}
                  cardHeight={measuredCardHeight}
                  onSwipe={handleSwipe}
                  onChat={handleChat}
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
    alignItems: 'center',
    paddingBottom: 6,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  iconContainer: {
    marginBottom: 6,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 1,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
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
