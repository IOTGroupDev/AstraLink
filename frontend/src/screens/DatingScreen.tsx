import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { datingAPI, chatAPI } from '../services/api';
import CosmicChat from '../components/dating/CosmicChat';
import DatingCard from '../components/dating/DatingCard';
import { TabScreenLayout } from '../components/layout/TabScreenLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getAllZodiacSigns,
  type ZodiacSign,
  type ElementType,
} from '../services/zodiac.service';
import CosmicBackground from '../components/shared/CosmicBackground';
import { logger } from '../services/logger';
import { DatingCardSkeleton } from '../components/dating/DatingCardSkeleton';

const { width, height } = Dimensions.get('window');

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

  const current = candidates[currentIndex] || null;

  const { user, isLoading: authLoading } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // ===============================
  // Helpers
  // ===============================
  const getBadgeLabel = (b?: 'high' | 'medium' | 'low') =>
    b === 'high'
      ? t('dating.compatibility.high')
      : b === 'medium'
        ? t('dating.compatibility.medium')
        : t('dating.compatibility.low');

  const getBadgeBg = (b?: 'high' | 'medium' | 'low') =>
    b === 'high'
      ? 'rgba(16,185,129,0.25)'
      : b === 'medium'
        ? 'rgba(245,158,11,0.25)'
        : 'rgba(239,68,68,0.25)';

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

        // ВРЕМЕННО: Если нет данных, создаем моковые для тестирования
        if (data.length === 0) {
          logger.info('[Dating] Нет данных от API, используем моковые данные');
          data = [
            {
              userId: 'mock-1',
              badge: 'high',
              name: 'Анна',
              age: 28,
              zodiacSign: 'Лев',
              bio: 'Люблю путешествия и астрологию ✨',
              interests: ['Путешествия', 'Йога', 'Музыка'],
              city: 'Москва',
              photoUrl: null,
            },
            {
              userId: 'mock-2',
              badge: 'medium',
              name: 'Мария',
              age: 25,
              zodiacSign: 'Весы',
              bio: 'Ищу гармонию и баланс в отношениях 💫',
              interests: ['Искусство', 'Медитация', 'Кино'],
              city: 'Санкт-Петербург',
              photoUrl: null,
            },
            {
              userId: 'mock-3',
              badge: 'high',
              name: 'Елена',
              age: 30,
              zodiacSign: 'Скорпион',
              bio: 'Страстная натура с глубоким внутренним миром 🌙',
              interests: ['Психология', 'Книги', 'Спорт'],
              city: 'Казань',
              photoUrl: null,
            },
            {
              userId: 'mock-4',
              badge: 'medium',
              name: 'Дарья',
              age: 26,
              zodiacSign: 'Близнецы',
              bio: 'Общительная и любознательная ⭐',
              interests: ['Творчество', 'Путешествия', 'Фотография'],
              city: 'Новосибирск',
              photoUrl: null,
            },
            {
              userId: 'mock-5',
              badge: 'low',
              name: 'Ольга',
              age: 29,
              zodiacSign: 'Телец',
              bio: 'Ценю стабильность и красоту 🌸',
              interests: ['Кулинария', 'Природа', 'Музыка'],
              city: 'Екатеринбург',
              photoUrl: null,
            },
          ] as ApiCandidate[];
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
            photos: c.photoUrl ? [c.photoUrl] : [],
            photoUrl: c.photoUrl || c.avatarUrl || null,
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
    <TabScreenLayout>
      <GestureHandlerRootView style={styles.container}>
        {/* Космический фон */}
        <CosmicBackground />

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#8B5CF6', '#A855F7']}
                style={styles.iconCircle}
              >
                <Ionicons name="heart" size={24} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.title}>{t('dating.title')}</Text>
            <Text style={styles.subtitle}>{t('dating.subtitle')}</Text>
          </View>

          {/* Content */}
          {loadingCards ? (
            <View style={styles.cardContainer}>
              <DatingCardSkeleton />
            </View>
          ) : !current ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="planet-outline" size={64} color="#8B5CF6" />
              <Text style={styles.emptyTitle}>{t('dating.empty.title')}</Text>
              <Text style={styles.emptyText}>{t('dating.empty.subtitle')}</Text>
            </View>
          ) : (
            <View style={styles.cardContainer}>
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
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0618',
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingTop: 20,
  },
  iconContainer: {
    marginBottom: 8,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 15,
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 80,
  },
});
