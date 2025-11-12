import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { datingAPI, chatAPI } from '../services/api';
import { supabase } from '../services/supabase';
import CosmicChat from '../components/dating/CosmicChat';

const { width, height } = Dimensions.get('window');

// Декоративные точки для фона
const DECORATIVE_DOTS = [
  { x: 35, y: 103 },
  { x: 395, y: 83 },
  { x: 68, y: 240 },
  { x: 362, y: 320 },
  { x: 38, y: 470 },
  { x: 392, y: 450 },
  { x: 70, y: 625 },
  { x: 360, y: 705 },
  { x: 42, y: 830 },
  { x: 388, y: 880 },
];

// API типы
type ApiCandidate = {
  userId: string;
  badge: 'high' | 'medium' | 'low';
  photoUrl?: string | null;
  avatarUrl?: string | null;
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
};

export default function DatingScreen() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [chatVisible, setChatVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    zodiacSign: string;
    compatibility: number;
  } | null>(null);

  const current = candidates[currentIndex] || null;

  // Анимация жестов
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  const { user } = useAuth();
  const navigation = useNavigation<any>();

  // ===============================
  // Helpers
  // ===============================
  const getBadgeLabel = (b?: 'high' | 'medium' | 'low') =>
    b === 'high' ? 'Высокая' : b === 'medium' ? 'Средняя' : 'Низкая';

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
    translateX.value = 0;
    translateY.value = 0;
    rotate.value = 0;
  }, [candidates.length]);

  // ===============================
  // Handlers
  // ===============================
  const handleLike = useCallback(async () => {
    if (!current) return;
    try {
      const res = await datingAPI.like?.(current.userId, 'like');
      if (res?.matchId) {
        Alert.alert('✨ Совпадение', 'У вас взаимная симпатия!', [
          { text: 'Закрыть', style: 'cancel' },
          {
            text: 'Открыть чат',
            onPress: () =>
              navigation.navigate('ChatDialog', {
                otherUserId: current.userId,
                displayName: current.name,
              }),
          },
        ]);
      }
    } catch (e) {
      console.log('❌ Ошибка лайка:', e);
    } finally {
      nextCard();
    }
  }, [current, navigation, nextCard]);

  const handlePass = useCallback(async () => {
    if (!current) return;
    try {
      await datingAPI.like?.(current.userId, 'pass');
    } catch (e) {
      console.log('❌ Ошибка pass:', e);
    } finally {
      nextCard();
    }
  }, [current, nextCard]);

  const handleMessage = useCallback(() => {
    if (!current) {
      Alert.alert('Ошибка', 'Нет данных о пользователе');
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
        Alert.alert('Ошибка', 'Пользователь не выбран');
        return;
      }

      try {
        // Отправляем первое сообщение
        await chatAPI.sendMessage(selectedUser.id, text);

        // Закрываем модалку
        setChatVisible(false);

        // Переходим на экран чата
        navigation.navigate('ChatDialog', {
          otherUserId: selectedUser.id,
          displayName: selectedUser.name,
        });

        // Сбрасываем выбранного пользователя
        setSelectedUser(null);
      } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
        Alert.alert('Ошибка', 'Не удалось отправить сообщение');
      }
    },
    [selectedUser, navigation]
  );

  const handleCloseChat = useCallback(() => {
    setChatVisible(false);
    setSelectedUser(null);
  }, []);

  // ===============================
  // Жесты
  // ===============================
  const onGestureEvent = (event: any) => {
    translateX.value = event.nativeEvent.translationX;
    translateY.value = event.nativeEvent.translationY;
    rotate.value = event.nativeEvent.translationX / 10;
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === 5) {
      const { translationX, velocityX } = event.nativeEvent;
      const left = translationX < -width * 0.3 || velocityX < -500;
      const right = translationX > width * 0.3 || velocityX > 500;

      if (left) {
        translateX.value = withTiming(-width * 1.5, { duration: 300 }, () => {
          runOnJS(handlePass)();
        });
      } else if (right) {
        translateX.value = withTiming(width * 1.5, { duration: 300 }, () => {
          runOnJS(handleLike)();
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotate.value = withSpring(0);
      }
    }
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  // Сброс анимации при смене карточки
  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    rotate.value = 0;
  }, [currentIndex]);

  // ===============================
  // Загрузка кандидатов
  // ===============================
  useEffect(() => {
    (async () => {
      try {
        const data: ApiCandidate[] =
          (await datingAPI.getCandidates?.(20)) || [];

        // Если API пуст — используем моки
        // if (!data || data.length === 0) {
        //   const mockData: Candidate[] = [
        //     {
        //       userId: 'mock-1',
        //       badge: 'high',
        //       photoUrl: 'https://randomuser.me/api/portraits/women/65.jpg',
        //       name: 'Елизавета',
        //       age: 26,
        //       zodiacSign: 'Весы',
        //       bio: 'UX-дизайнер. Люблю галереи и кофе без сахара.',
        //       interests: ['Искусство', 'Йога', 'Пешие прогулки'],
        //       distance: 3,
        //       city: 'Минск',
        //     },
        //     {
        //       userId: 'mock-2',
        //       badge: 'medium',
        //       photoUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
        //       name: 'София',
        //       age: 24,
        //       zodiacSign: 'Лев',
        //       bio: 'Маркетолог. Закаты, хайкинг и фильмы Нолана.',
        //       interests: ['Маркетинг', 'Кино', 'Путешествия'],
        //       distance: 7,
        //       city: 'Тбилиси',
        //     },
        //     {
        //       userId: 'mock-3',
        //       badge: 'low',
        //       photoUrl: 'https://randomuser.me/api/portraits/women/12.jpg',
        //       name: 'Анастасия',
        //       age: 27,
        //       zodiacSign: 'Рыбы',
        //       bio: 'Музыкант. Лофай и джаз по вечерам.',
        //       interests: ['Музыка', 'Книги', 'Кофе'],
        //       distance: 12,
        //       city: 'Ереван',
        //     },
        //     {
        //       userId: 'mock-4',
        //       badge: 'high',
        //       photoUrl: 'https://randomuser.me/api/portraits/women/81.jpg',
        //       name: 'Полина',
        //       age: 25,
        //       zodiacSign: 'Телец',
        //       bio: 'Фронтенд. React, походы и астрология.',
        //       interests: ['Кодинг', 'Походы', 'Астрология'],
        //       distance: 4,
        //       city: 'Минск',
        //     },
        //     {
        //       userId: 'mock-5',
        //       badge: 'medium',
        //       photoUrl: 'https://randomuser.me/api/portraits/women/30.jpg',
        //       name: 'Дарья',
        //       age: 29,
        //       zodiacSign: 'Козерог',
        //       bio: 'Фотограф. Охочусь за мягким светом.',
        //       interests: ['Фото', 'Кофейни', 'Путешествия'],
        //       distance: 9,
        //       city: 'Вильнюс',
        //     },
        //   ];
        //   setCandidates(mockData);
        //   setCurrentIndex(0);
        //   return;
        // }

        // API вернул кандидатов — обогащаем данными
        const enrichedData: Candidate[] = data.map(
          (candidate: ApiCandidate) => {
            const photo =
              candidate.photoUrl ||
              candidate.avatarUrl ||
              `https://randomuser.me/api/portraits/women/${Math.floor(Math.random() * 90)}.jpg`;

            return {
              ...candidate,
              photoUrl: photo,
              name: 'Пользователь',
              age: 25,
              zodiacSign: 'Лев',
              bio: 'Интересная личность',
              interests: ['Астрология', 'Путешествия'],
              distance: Math.floor(Math.random() * 20) + 1,
            };
          }
        );

        setCandidates(enrichedData);
        setCurrentIndex(0);
      } catch (e) {
        console.log('❌ Ошибка загрузки кандидатов:', e);
        // Фолбэк
        setCandidates([
          {
            userId: 'mock-fallback',
            badge: 'medium',
            photoUrl: 'https://randomuser.me/api/portraits/women/40.jpg',
            name: 'Ева',
            age: 25,
            zodiacSign: 'Дева',
            bio: 'Фолбэк-кандидат.',
            interests: ['Чтение', 'Прогулки'],
            distance: 4,
          },
        ]);
        setCurrentIndex(0);
      }
    })();
  }, []);

  // ===============================
  // Realtime match notifications
  // ===============================
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`matches-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        (payload) => {
          try {
            const m: any = (payload as any).new;
            if (!m) return;
            if (m.user_a_id === user.id || m.user_b_id === user.id) {
              const otherId =
                m.user_a_id === user.id ? m.user_b_id : m.user_a_id;
              Alert.alert('✨ Совпадение', 'У вас взаимная симпатия!', [
                { text: 'Закрыть', style: 'cancel' },
                {
                  text: 'Открыть чат',
                  onPress: () =>
                    navigation.navigate('ChatDialog', { otherUserId: otherId }),
                },
              ]);
            }
          } catch {}
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [user?.id, navigation]);

  // ===============================
  // UI
  // ===============================
  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        {/* Фон */}
        <LinearGradient
          colors={['rgba(167,114,181,0.3)', 'rgba(26,7,31,0.3)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Декоративные точки */}
        <View style={[StyleSheet.absoluteFillObject, styles.dotsContainer]}>
          {DECORATIVE_DOTS.map((dot, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { left: (dot.x / 430) * width, top: (dot.y / 932) * height },
              ]}
            />
          ))}
        </View>

        <LinearGradient
          colors={['rgba(167,114,181,0.3)', 'rgba(26,7,31,0.3)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bottomBlur}
        />

        {/* Контент */}
        <View style={styles.content}>
          {/* Заголовок */}
          <BlurView intensity={10} tint="dark" style={styles.header}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#6F1F87', '#2F0A37']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconCircle}
              >
                <Ionicons name="heart" size={28} color="#fff" />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Dating</Text>
            <Text style={styles.subtitle}>Найди свою звезду</Text>
          </BlurView>

          {/* Карточка */}
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <PanGestureHandler
              onGestureEvent={onGestureEvent}
              onHandlerStateChange={onHandlerStateChange}
            >
              <Animated.View style={[styles.card, animatedCardStyle]}>
                <LinearGradient
                  colors={['rgba(111,31,135,0.4)', 'rgba(47,10,55,0.4)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardInner}
                >
                  {/* Фото */}
                  {current?.photoUrl ? (
                    <Image
                      source={{ uri: current.photoUrl }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.photo} />
                  )}

                  {/* Градиент снизу */}
                  <LinearGradient
                    colors={[
                      'transparent',
                      'rgba(0,0,0,0.3)',
                      'rgba(0,0,0,0.8)',
                    ]}
                    style={styles.gradientOverlay}
                  />

                  {/* Информация */}
                  <ScrollView
                    style={styles.infoContainer}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                  >
                    <BlurView
                      intensity={20}
                      tint="dark"
                      style={styles.detailsBlock}
                    >
                      {/* Имя и возраст */}
                      <View style={styles.basicInfo}>
                        <Text style={styles.userName}>
                          {current?.name || 'Пользователь'},{' '}
                          {current?.age || '—'}
                        </Text>
                        <Text style={styles.zodiacSign}>
                          {current?.zodiacSign || '—'}
                        </Text>
                      </View>

                      {/* Расстояние */}
                      {current?.distance != null && (
                        <View style={styles.locationRow}>
                          <Ionicons
                            name="location"
                            size={14}
                            color="rgba(255,255,255,0.7)"
                          />
                          <Text style={styles.locationText}>
                            {current.distance} км от вас
                          </Text>
                        </View>
                      )}

                      {/* Био */}
                      <Text style={styles.bioText}>
                        {current?.bio || 'Нет описания'}
                      </Text>

                      {/* Совместимость */}
                      <View style={styles.compatibilitySection}>
                        <Text style={styles.compatibilityLabel}>
                          Совместимость
                        </Text>
                        <View style={styles.badgeRow}>
                          <View
                            style={[
                              styles.badgePill,
                              {
                                backgroundColor: getBadgeBg(
                                  current?.badge || 'low'
                                ),
                              },
                            ]}
                          >
                            <Text style={styles.badgeText}>
                              {getBadgeLabel(current?.badge || 'low')}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Интересы */}
                      {!!current?.interests?.length && (
                        <View style={styles.interestsContainer}>
                          {current.interests.map((int, idx) => (
                            <View key={idx} style={styles.interestTag}>
                              <Text style={styles.interestText}>{int}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </BlurView>
                  </ScrollView>
                </LinearGradient>
              </Animated.View>
            </PanGestureHandler>

            {/* Кнопки сверху справа */}
            <View style={styles.sideButtons}>
              <TouchableOpacity
                style={styles.sideButton}
                onPress={handleLike}
                activeOpacity={0.7}
              >
                <Ionicons name="heart" size={18} color="#6F1F87" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sideButton}
                onPress={handleMessage}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chatbubble-ellipses"
                  size={18}
                  color="#6F1F87"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101010' },

  dotsContainer: { opacity: 0.3 },
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D9D9D9',
  },

  bottomBlur: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 120,
    justifyContent: 'center',
  },

  header: {
    alignItems: 'center',
    paddingVertical: 24,
    borderRadius: 16,
    marginBottom: 32,
    overflow: 'hidden',
  },

  iconContainer: { marginBottom: 16 },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 39,
    marginBottom: 8,
  },
  subtitle: { fontSize: 20, color: 'rgba(255,255,255,0.7)', lineHeight: 24 },

  card: {
    height: 566,
    borderRadius: 20,
    overflow: 'hidden',
    width: width - 48,
  },
  cardInner: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    overflow: 'hidden',
  },

  photo: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(111, 31, 135, 0.3)',
  },

  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 379,
  },

  sideButtons: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 10,
    zIndex: 1000,
    elevation: 1000,
  },
  sideButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  infoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: 400,
    padding: 16,
  },

  basicInfo: { marginBottom: 12 },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 29,
    marginBottom: 4,
  },
  zodiacSign: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 24,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },

  bioText: { fontSize: 15, color: '#fff', lineHeight: 18, marginBottom: 12 },

  detailsBlock: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    overflow: 'hidden',
  },

  compatibilitySection: { marginBottom: 12 },
  compatibilityLabel: { fontSize: 16, fontWeight: '500', color: '#fff' },
  badgeRow: { alignItems: 'center', marginTop: 4, marginBottom: 4 },
  badgePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  interestsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 51,
    backgroundColor: 'rgba(111,31,135,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(111,31,135,1)',
  },
  interestText: { fontSize: 10, color: '#fff', fontWeight: '400' },
});
