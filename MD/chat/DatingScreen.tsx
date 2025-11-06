import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
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
import { useAuth } from '../contexts/AuthContext';
import { datingAPI } from '../services/api';
import { supabase } from '../services/supabase';
import CosmicChat from '../components/CosmicChat';

const { width, height } = Dimensions.get('window');

// Декоративные точки из Figma
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

export default function DatingScreen() {
  const [candidates, setCandidates] = useState<
    Array<{
      userId: string;
      name: string;
      age: number;
      zodiacSign: string;
      bio: string;
      interests: string[];
      distance?: number;
      badge: 'high' | 'medium' | 'low';
      photoUrl: string | null;
    }>
  >([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [chatVisible, setChatVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    name: string;
    zodiacSign: string;
    compatibility: number;
  } | null>(null);

  const current = candidates[currentIndex] || null;
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  // Загрузка кандидатов при монтировании
  useEffect(() => {
    (async () => {
      try {
        const data = await datingAPI.getCandidates(20);
        setCandidates(data);
        setCurrentIndex(0);
      } catch (e) {
        console.log('❌ Ошибка загрузки кандидатов:', e);
      }
    })();
  }, []);

  // Realtime: уведомление о взаимной симпатии (match)
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
  }, [user?.id]);

  // Helpers
  const getBadgeLabel = (b?: 'high' | 'medium' | 'low'): string =>
    b === 'high' ? 'Высокая' : b === 'medium' ? 'Средняя' : 'Низкая';

  const getBadgeBg = (b?: 'high' | 'medium' | 'low'): string =>
    b === 'high'
      ? 'rgba(16,185,129,0.25)'
      : b === 'medium'
        ? 'rgba(245,158,11,0.25)'
        : 'rgba(239,68,68,0.25)';

  const getCompatibilityFromBadge = (b?: 'high' | 'medium' | 'low'): number =>
    b === 'high' ? 85 : b === 'medium' ? 65 : 45;

  const goNext = () => {
    setCurrentIndex((idx) => (idx + 1 < candidates.length ? idx + 1 : idx));
    translateX.value = 0;
    translateY.value = 0;
    rotate.value = 0;
  };

  const handleLike = async () => {
    if (!current) return;
    try {
      const res = await datingAPI.like(current.userId, 'like');
      console.log('💜 Лайк:', current.userId, res);
      if (res?.matchId) {
        Alert.alert('✨ Совпадение', 'У вас взаимная симпатия!', [
          { text: 'Закрыть', style: 'cancel' },
          {
            text: 'Открыть чат',
            onPress: () =>
              navigation.navigate('ChatDialog', {
                otherUserId: current.userId,
              }),
          },
        ]);
      }
    } catch (e) {
      console.log('❌ Ошибка лайка:', e);
    } finally {
      goNext();
    }
  };

  const handlePass = async () => {
    if (!current) return;
    try {
      await datingAPI.like(current.userId, 'pass');
    } catch (e) {
      console.log('❌ Ошибка pass:', e);
    } finally {
      goNext();
    }
  };

  const handleMessage = () => {
    if (!current) return;

    // Открываем CosmicChat как модальное окно
    setSelectedUser({
      name: current.name,
      zodiacSign: current.zodiacSign,
      compatibility: getCompatibilityFromBadge(current.badge),
    });
    setChatVisible(true);
  };

  const handleCloseChat = () => {
    setChatVisible(false);
    setSelectedUser(null);
  };

  const onGestureEvent = (event: any) => {
    translateX.value = event.nativeEvent.translationX;
    translateY.value = event.nativeEvent.translationY;
    rotate.value = event.nativeEvent.translationX / 10;
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === 5) {
      const { translationX, velocityX } = event.nativeEvent;

      if (translationX < -width * 0.3 || velocityX < -500) {
        translateX.value = withTiming(-width * 1.5, { duration: 300 }, () => {
          runOnJS(handlePass)();
        });
      } else if (translationX > width * 0.3 || velocityX > 500) {
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

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    rotate.value = 0;
  }, [currentIndex]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        {/* Фоновый градиент из Figma */}
        <LinearGradient
          colors={['rgba(167, 114, 181, 0.3)', 'rgba(26, 7, 31, 0.3)']}
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
                {
                  left: (dot.x / 430) * width,
                  top: (dot.y / 932) * height,
                },
              ]}
            />
          ))}
        </View>

        {/* Размытый градиент снизу */}
        <LinearGradient
          colors={['rgba(167, 114, 181, 0.3)', 'rgba(26, 7, 31, 0.3)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bottomBlur}
        />

        {/* Контент */}
        <View style={styles.content}>
          {/* Заголовок с backdrop-blur */}
          <BlurView intensity={10} tint="dark" style={styles.header}>
            {/* Иконка Dating */}
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
                  colors={['rgba(111, 31, 135, 0.4)', 'rgba(47, 10, 55, 0.4)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardInner}
                >
                  {/* Фото (заглушка) */}
                  <View style={styles.photo} />

                  {/* Градиент снизу */}
                  <LinearGradient
                    colors={[
                      'transparent',
                      'rgba(0,0,0,0.3)',
                      'rgba(0,0,0,0.8)',
                    ]}
                    style={styles.gradientOverlay}
                  />

                  {/* Боковые кнопки (лайк, сообщение) */}
                  <View style={styles.sideButtons}>
                    <TouchableOpacity
                      style={styles.sideButton}
                      onPress={handleLike}
                    >
                      <Ionicons name="heart" size={18} color="#6F1F87" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.sideButton}
                      onPress={handleMessage}
                    >
                      <Ionicons
                        name="chatbubble-ellipses"
                        size={18}
                        color="#6F1F87"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Информационный блок снизу */}
                  <ScrollView
                    style={styles.infoContainer}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                  >
                    {/* Детальный блок с темным фоном */}
                    <BlurView
                      intensity={20}
                      tint="dark"
                      style={styles.detailsBlock}
                    >
                      {/* Имя и возраст */}
                      <View style={styles.basicInfo}>
                        <Text style={styles.userName}>
                          {current?.name || '—'}, {current?.age || 0}
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

                      {/* Совместимость — бейдж без чисел */}
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
                      {current && current.interests.length > 0 && (
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
          </View>
        </View>

        {/* Модальное окно чата */}
        {chatVisible && selectedUser && (
          <CosmicChat
            visible={chatVisible}
            user={selectedUser}
            onClose={handleCloseChat}
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010',
  },
  dotsContainer: {
    opacity: 0.3,
  },
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
  iconContainer: {
    marginBottom: 16,
  },
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
  subtitle: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 24,
  },
  card: {
    height: 566,
    borderRadius: 20,
    overflow: 'hidden',
    width: width - 48,
  },
  cardInner: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  basicInfo: {
    marginBottom: 12,
  },
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
  bioText: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 18,
    marginBottom: 12,
  },
  detailsBlock: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
  },
  compatibilitySection: {
    marginBottom: 12,
  },
  compatibilityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  badgeRow: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  badgePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 51,
    backgroundColor: 'rgba(111, 31, 135, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(111, 31, 135, 1)',
  },
  interestText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '400',
  },
});
