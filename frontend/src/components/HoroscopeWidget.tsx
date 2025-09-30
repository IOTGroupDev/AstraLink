// import React from 'react';
// import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
//
// interface Prediction {
//   general: string;
//   love: string;
//   career: string;
//   health: string;
//   advice: string;
// }
//
// interface HoroscopeWidgetProps {
//   predictions: {
//     day: Prediction;
//     tomorrow: Prediction;
//     week: Prediction;
//   };
//   currentPlanets: any;
//   isLoading?: boolean;
// }
//
// const HoroscopeWidget: React.FC<HoroscopeWidgetProps> = ({
//   predictions,
//   currentPlanets,
//   isLoading = false,
// }) => {
//   const [activePeriod, setActivePeriod] = React.useState<
//     'day' | 'tomorrow' | 'week'
//   >('day');
//
//   // Отладочная информация
//   React.useEffect(() => {
//     console.log('🔮 HoroscopeWidget получил данные:', {
//       predictions,
//       currentPlanets,
//       isLoading,
//     });
//   }, [predictions, currentPlanets, isLoading]);
//
//   const getPeriodTitle = (period: string) => {
//     switch (period) {
//       case 'day':
//         return 'Сегодня';
//       case 'tomorrow':
//         return 'Завтра';
//       case 'week':
//         return 'Неделя';
//       default:
//         return period;
//     }
//   };
//
//   const getPeriodIcon = (period: string) => {
//     switch (period) {
//       case 'day':
//         return 'sunny';
//       case 'tomorrow':
//         return 'moon';
//       case 'week':
//         return 'calendar';
//       default:
//         return 'star';
//     }
//   };
//
//   const getCurrentPrediction = () => {
//     if (!predictions) {
//       return {
//         general: 'Загрузка предсказаний...',
//         love: 'Загрузка предсказаний...',
//         career: 'Загрузка предсказаний...',
//         health: 'Загрузка предсказаний...',
//         advice: 'Загрузка предсказаний...',
//       };
//     }
//
//     switch (activePeriod) {
//       case 'day':
//         return predictions.day || {};
//       case 'tomorrow':
//         return predictions.tomorrow || {};
//       case 'week':
//         return predictions.week || {};
//       default:
//         return predictions.day || {};
//     }
//   };
//
//   if (isLoading) {
//     return (
//       <View style={styles.container}>
//         <View style={styles.loadingContainer}>
//           <Text style={styles.loadingText}>Загрузка гороскопа...</Text>
//         </View>
//       </View>
//     );
//   }
//
//   const currentPrediction = getCurrentPrediction();
//
//   return (
//     <Animated.View entering={SlideInUp.delay(500)} style={styles.container}>
//       <Text style={styles.title}>🔮 Астрологический прогноз 🔮</Text>
//
//       {/* Period Selector */}
//       <View style={styles.periodSelector}>
//         {(['day', 'tomorrow', 'week'] as const).map((period) => (
//           <TouchableOpacity
//             key={period}
//             style={[
//               styles.periodButton,
//               activePeriod === period && styles.activePeriodButton,
//             ]}
//             onPress={() => setActivePeriod(period)}
//           >
//             <Ionicons
//               name={getPeriodIcon(period) as any}
//               size={16}
//               color={
//                 activePeriod === period ? '#8B5CF6' : 'rgba(255, 255, 255, 0.6)'
//               }
//             />
//             <Text
//               style={[
//                 styles.periodText,
//                 activePeriod === period && styles.activePeriodText,
//               ]}
//             >
//               {getPeriodTitle(period)}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </View>
//
//       {/* Prediction Content */}
//       <View style={styles.content}>
//         <Animated.View
//           entering={FadeIn.delay(200)}
//           style={styles.predictionCard}
//         >
//           <View style={styles.cardHeader}>
//             <Ionicons name="star" size={20} color="#8B5CF6" />
//             <Text style={styles.cardTitle}>Общий прогноз</Text>
//           </View>
//           <Text style={styles.predictionText}>
//             {currentPrediction.general || 'Предсказание недоступно'}
//           </Text>
//         </Animated.View>
//
//         <Animated.View
//           entering={FadeIn.delay(300)}
//           style={styles.predictionCard}
//         >
//           <View style={styles.cardHeader}>
//             <Ionicons name="heart" size={20} color="#FF6B6B" />
//             <Text style={styles.cardTitle}>Любовь и отношения</Text>
//           </View>
//           <Text style={styles.predictionText}>
//             {currentPrediction.love || 'Предсказание недоступно'}
//           </Text>
//         </Animated.View>
//
//         <Animated.View
//           entering={FadeIn.delay(400)}
//           style={styles.predictionCard}
//         >
//           <View style={styles.cardHeader}>
//             <Ionicons name="briefcase" size={20} color="#4ECDC4" />
//             <Text style={styles.cardTitle}>Карьера и работа</Text>
//           </View>
//           <Text style={styles.predictionText}>
//             {currentPrediction.career || 'Предсказание недоступно'}
//           </Text>
//         </Animated.View>
//
//         <Animated.View
//           entering={FadeIn.delay(500)}
//           style={styles.predictionCard}
//         >
//           <View style={styles.cardHeader}>
//             <Ionicons name="fitness" size={20} color="#45B7D1" />
//             <Text style={styles.cardTitle}>Здоровье</Text>
//           </View>
//           <Text style={styles.predictionText}>
//             {currentPrediction.health || 'Предсказание недоступно'}
//           </Text>
//         </Animated.View>
//
//         <Animated.View
//           entering={FadeIn.delay(600)}
//           style={[styles.predictionCard, styles.adviceCard]}
//         >
//           <View style={styles.cardHeader}>
//             <Ionicons name="bulb" size={20} color="#FFD93D" />
//             <Text style={styles.cardTitle}>Совет дня</Text>
//           </View>
//           <Text style={styles.adviceText}>
//             {currentPrediction.advice || 'Совет недоступен'}
//           </Text>
//         </Animated.View>
//       </View>
//     </Animated.View>
//   );
// };
//
// const styles = StyleSheet.create({
//   container: {
//     backgroundColor: 'rgba(0, 0, 0, 0.8)',
//     borderRadius: 20,
//     padding: 15,
//     marginHorizontal: 15,
//     marginBottom: 15,
//     borderWidth: 1,
//     borderColor: 'rgba(139, 92, 246, 0.5)',
//     shadowColor: '#8B5CF6',
//     shadowOffset: { width: 0, height: 5 },
//     shadowOpacity: 0.5,
//     shadowRadius: 15,
//     elevation: 10,
//     zIndex: 10,
//   },
//   loadingContainer: {
//     padding: 40,
//     alignItems: 'center',
//   },
//   loadingText: {
//     color: 'rgba(255, 255, 255, 0.7)',
//     fontSize: 16,
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#FFFFFF',
//     textAlign: 'center',
//     marginBottom: 20,
//     textShadowColor: 'rgba(139, 92, 246, 0.7)',
//     textShadowOffset: { width: 0, height: 0 },
//     textShadowRadius: 10,
//   },
//   periodSelector: {
//     flexDirection: 'row',
//     backgroundColor: 'rgba(255, 255, 255, 0.1)',
//     borderRadius: 15,
//     padding: 4,
//     marginBottom: 20,
//   },
//   periodButton: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 10,
//     paddingHorizontal: 15,
//     borderRadius: 12,
//   },
//   activePeriodButton: {
//     backgroundColor: 'rgba(139, 92, 246, 0.2)',
//   },
//   periodText: {
//     fontSize: 12,
//     color: 'rgba(255, 255, 255, 0.6)',
//     marginLeft: 6,
//     fontWeight: '500',
//   },
//   activePeriodText: {
//     color: '#8B5CF6',
//     fontWeight: '600',
//   },
//   content: {
//     marginBottom: 10,
//   },
//   predictionCard: {
//     backgroundColor: 'rgba(255, 255, 255, 0.05)',
//     borderRadius: 15,
//     padding: 12,
//     marginBottom: 8,
//     borderWidth: 1,
//     borderColor: 'rgba(255, 255, 255, 0.1)',
//   },
//   adviceCard: {
//     backgroundColor: 'rgba(255, 211, 61, 0.1)',
//     borderColor: 'rgba(255, 211, 61, 0.3)',
//   },
//   cardHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 10,
//   },
//   cardTitle: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: '#FFFFFF',
//     marginLeft: 8,
//   },
//   predictionText: {
//     fontSize: 12,
//     color: 'rgba(255, 255, 255, 0.8)',
//     lineHeight: 16,
//   },
//   adviceText: {
//     fontSize: 14,
//     color: '#FFD93D',
//     lineHeight: 20,
//     fontWeight: '500',
//     fontStyle: 'italic',
//   },
// });
//
// export default HoroscopeWidget;

// frontend/src/components/HoroscopeWidget.tsx (обновленная версия)
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { chartAPI } from '../services/api';

const { width } = Dimensions.get('window');

interface HoroscopeWidgetProps {
  predictions: any;
  currentPlanets: any;
  isLoading: boolean;
}

type HoroscopePeriod = 'day' | 'tomorrow' | 'week' | 'month';

const HoroscopeWidget: React.FC<HoroscopeWidgetProps> = ({
  predictions: initialPredictions,
  currentPlanets,
  isLoading: initialLoading,
}) => {
  const [activePeriod, setActivePeriod] = useState<HoroscopePeriod>('day');
  const [allHoroscopes, setAllHoroscopes] = useState<any>(null);
  const [loading, setLoading] = useState(initialLoading);
  const [isPremium, setIsPremium] = useState(false);

  // Анимации
  const glowAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(1);
  const fadeAnim = useSharedValue(0);

  useEffect(() => {
    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0.3, { duration: 2000 })
      ),
      -1,
      true
    );

    fadeAnim.value = withTiming(1, { duration: 800 });
  }, []);

  useEffect(() => {
    loadAllHoroscopes();
  }, []);

  const loadAllHoroscopes = async () => {
    try {
      setLoading(true);
      const response = await chartAPI.getAllHoroscopes();
      // Нормализуем ключи с backend: today -> day
      const normalized = {
        day: response.today,
        tomorrow: response.tomorrow,
        week: response.week,
        month: response.month,
      };
      setAllHoroscopes(normalized);
      setIsPremium(response.isPremium || false);
    } catch (error) {
      console.error('Ошибка загрузки гороскопов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (period: HoroscopePeriod) => {
    scaleAnim.value = withSequence(withSpring(0.95), withSpring(1));
    setActivePeriod(period);
  };

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
  }));

  const animatedScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const animatedFadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const getCurrentHoroscope = () => {
    if (!allHoroscopes) return null;
    return allHoroscopes[activePeriod];
  };

  const currentHoroscope = getCurrentHoroscope();

  const getPeriodTitle = (period: HoroscopePeriod): string => {
    const titles = {
      day: 'Сегодня',
      tomorrow: 'Завтра',
      week: 'Эта неделя',
      month: 'Этот месяц',
    };
    return titles[period];
  };

  const getPeriodIcon = (period: HoroscopePeriod): string => {
    const icons = {
      day: 'sunny',
      tomorrow: 'moon',
      week: 'calendar',
      month: 'calendar-outline',
    };
    return icons[period];
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.1)', 'rgba(236, 72, 153, 0.1)']}
          style={styles.loadingCard}
        >
          <Text style={styles.loadingText}>Загрузка гороскопа...</Text>
        </LinearGradient>
      </View>
    );
  }

  if (!currentHoroscope) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, animatedFadeStyle]}>
      {/* Фоновое свечение */}
      <Animated.View style={[styles.backgroundGlow, animatedGlowStyle]}>
        <LinearGradient
          colors={[
            'rgba(139, 92, 246, 0.3)',
            'rgba(236, 72, 153, 0.3)',
            'transparent',
          ]}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Карточка гороскопа */}
      <Animated.View style={[styles.card, animatedScaleStyle]}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.15)', 'rgba(236, 72, 153, 0.15)']}
          style={styles.cardGradient}
        >
          {/* Заголовок */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="sparkles" size={24} color="#8B5CF6" />
              <Text style={styles.title}>Гороскоп</Text>
              {isPremium && (
                <View style={styles.premiumBadge}>
                  <Ionicons name="diamond" size={12} color="#FFD700" />
                  <Text style={styles.premiumText}>AI</Text>
                </View>
              )}
            </View>
          </View>

          {/* Табы периодов */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.periodTabs}
            contentContainerStyle={styles.periodTabsContent}
          >
            {(['day', 'tomorrow', 'week', 'month'] as HoroscopePeriod[]).map(
              (period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodTab,
                    activePeriod === period && styles.activePeriodTab,
                  ]}
                  onPress={() => handlePeriodChange(period)}
                >
                  <Ionicons
                    name={getPeriodIcon(period) as any}
                    size={16}
                    color={activePeriod === period ? '#fff' : '#999'}
                  />
                  <Text
                    style={[
                      styles.periodTabText,
                      activePeriod === period && styles.activePeriodTabText,
                    ]}
                  >
                    {getPeriodTitle(period)}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </ScrollView>

          {/* Энергия дня */}
          <View style={styles.energySection}>
            <View style={styles.energyBar}>
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                style={[
                  styles.energyFill,
                  { width: `${currentHoroscope.energy || 75}%` },
                ]}
              />
            </View>
            <View style={styles.energyInfo}>
              <Text style={styles.energyLabel}>Энергия</Text>
              <Text style={styles.energyValue}>
                {currentHoroscope.energy || 75}%
              </Text>
              <Text style={styles.moodText}>
                {currentHoroscope.mood || 'Позитивное'}
              </Text>
            </View>
          </View>

          {/* Основные предсказания */}
          <ScrollView
            style={styles.predictionsScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Общее */}
            {currentHoroscope.general && (
              <View style={styles.predictionSection}>
                <View style={styles.predictionHeader}>
                  <Ionicons name="star" size={18} color="#8B5CF6" />
                  <Text style={styles.predictionTitle}>Общее</Text>
                </View>
                <Text style={styles.predictionText}>
                  {currentHoroscope.general}
                </Text>
              </View>
            )}

            {/* Любовь */}
            {currentHoroscope.love && (
              <View style={styles.predictionSection}>
                <View style={styles.predictionHeader}>
                  <Ionicons name="heart" size={18} color="#EC4899" />
                  <Text style={styles.predictionTitle}>Любовь</Text>
                </View>
                <Text style={styles.predictionText}>
                  {currentHoroscope.love}
                </Text>
              </View>
            )}

            {/* Карьера */}
            {currentHoroscope.career && (
              <View style={styles.predictionSection}>
                <View style={styles.predictionHeader}>
                  <Ionicons name="briefcase" size={18} color="#10B981" />
                  <Text style={styles.predictionTitle}>Карьера</Text>
                </View>
                <Text style={styles.predictionText}>
                  {currentHoroscope.career}
                </Text>
              </View>
            )}

            {/* Здоровье */}
            {currentHoroscope.health && (
              <View style={styles.predictionSection}>
                <View style={styles.predictionHeader}>
                  <Ionicons name="fitness" size={18} color="#F59E0B" />
                  <Text style={styles.predictionTitle}>Здоровье</Text>
                </View>
                <Text style={styles.predictionText}>
                  {currentHoroscope.health}
                </Text>
              </View>
            )}

            {/* Финансы (для премиум) */}
            {isPremium && currentHoroscope.finance && (
              <View style={styles.predictionSection}>
                <View style={styles.predictionHeader}>
                  <Ionicons name="cash" size={18} color="#10B981" />
                  <Text style={styles.predictionTitle}>Финансы</Text>
                  <View style={styles.premiumLabel}>
                    <Ionicons name="diamond" size={10} color="#FFD700" />
                  </View>
                </View>
                <Text style={styles.predictionText}>
                  {currentHoroscope.finance}
                </Text>
              </View>
            )}

            {/* Совет */}
            {currentHoroscope.advice && (
              <View style={[styles.predictionSection, styles.adviceSection]}>
                <View style={styles.predictionHeader}>
                  <Ionicons name="bulb" size={18} color="#F59E0B" />
                  <Text style={styles.predictionTitle}>Совет дня</Text>
                </View>
                <Text style={styles.adviceText}>{currentHoroscope.advice}</Text>
              </View>
            )}

            {/* Вызовы и возможности (для премиум) */}
            {isPremium && (
              <>
                {currentHoroscope.challenges &&
                  currentHoroscope.challenges.length > 0 && (
                    <View style={styles.listSection}>
                      <View style={styles.predictionHeader}>
                        <Ionicons
                          name="alert-circle"
                          size={18}
                          color="#EF4444"
                        />
                        <Text style={styles.predictionTitle}>Вызовы</Text>
                      </View>
                      {currentHoroscope.challenges.map(
                        (challenge: string, index: number) => (
                          <View key={index} style={styles.listItem}>
                            <View style={styles.listDot} />
                            <Text style={styles.listText}>{challenge}</Text>
                          </View>
                        )
                      )}
                    </View>
                  )}

                {currentHoroscope.opportunities &&
                  currentHoroscope.opportunities.length > 0 && (
                    <View style={styles.listSection}>
                      <View style={styles.predictionHeader}>
                        <Ionicons name="rocket" size={18} color="#10B981" />
                        <Text style={styles.predictionTitle}>Возможности</Text>
                      </View>
                      {currentHoroscope.opportunities.map(
                        (opportunity: string, index: number) => (
                          <View key={index} style={styles.listItem}>
                            <View
                              style={[styles.listDot, styles.opportunityDot]}
                            />
                            <Text style={styles.listText}>{opportunity}</Text>
                          </View>
                        )
                      )}
                    </View>
                  )}
              </>
            )}

            {/* Счастливые числа и цвета */}
            <View style={styles.luckySection}>
              {currentHoroscope.luckyNumbers && (
                <View style={styles.luckyItem}>
                  <Text style={styles.luckyLabel}>Счастливые числа</Text>
                  <View style={styles.luckyNumbersContainer}>
                    {currentHoroscope.luckyNumbers.map(
                      (num: number, index: number) => (
                        <View key={index} style={styles.luckyNumber}>
                          <Text style={styles.luckyNumberText}>{num}</Text>
                        </View>
                      )
                    )}
                  </View>
                </View>
              )}

              {currentHoroscope.luckyColors && (
                <View style={styles.luckyItem}>
                  <Text style={styles.luckyLabel}>Счастливые цвета</Text>
                  <View style={styles.luckyColorsContainer}>
                    {currentHoroscope.luckyColors.map(
                      (color: string, index: number) => (
                        <View key={index} style={styles.luckyColor}>
                          <Text style={styles.luckyColorText}>{color}</Text>
                        </View>
                      )
                    )}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Кнопка обновления */}
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadAllHoroscopes}
          >
            <Ionicons name="refresh" size={16} color="#8B5CF6" />
            <Text style={styles.refreshText}>Обновить</Text>
          </TouchableOpacity>

          {/* Баннер для бесплатных пользователей */}
          {!isPremium && (
            <TouchableOpacity style={styles.upgradeBanner}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.2)', 'rgba(236, 72, 153, 0.2)']}
                style={styles.upgradeBannerGradient}
              >
                <Ionicons name="diamond" size={20} color="#FFD700" />
                <View style={styles.upgradeTextContainer}>
                  <Text style={styles.upgradeTitle}>Получите AI-прогноз</Text>
                  <Text style={styles.upgradeSubtitle}>
                    Детальный анализ с персонализированными рекомендациями
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8B5CF6" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    marginHorizontal: 15,
  },
  backgroundGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 30,
  },
  loadingCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  cardGradient: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(139, 92, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  premiumText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
  },
  periodTabs: {
    marginBottom: 20,
  },
  periodTabsContent: {
    gap: 10,
  },
  periodTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 6,
  },
  activePeriodTab: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  periodTabText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  activePeriodTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  energySection: {
    marginBottom: 20,
  },
  energyBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  energyFill: {
    height: '100%',
    borderRadius: 4,
  },
  energyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  energyLabel: {
    color: '#999',
    fontSize: 12,
  },
  energyValue: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  moodText: {
    color: '#fff',
    fontSize: 12,
    fontStyle: 'italic',
  },
  predictionsScroll: {
    maxHeight: 400,
  },
  predictionSection: {
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  predictionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  predictionText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  adviceSection: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  adviceText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  premiumLabel: {
    marginLeft: 'auto',
  },
  listSection: {
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    gap: 10,
  },
  listDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginTop: 6,
  },
  opportunityDot: {
    backgroundColor: '#10B981',
  },
  listText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    lineHeight: 18,
  },
  luckySection: {
    marginTop: 10,
    gap: 15,
  },
  luckyItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
  },
  luckyLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 10,
    fontWeight: '600',
  },
  luckyNumbersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  luckyNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  luckyNumberText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  luckyColorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  luckyColor: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  luckyColorText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 15,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    gap: 8,
  },
  refreshText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
  },
  upgradeBanner: {
    marginTop: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  upgradeBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    gap: 12,
  },
  upgradeTextContainer: {
    flex: 1,
  },
  upgradeTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  upgradeSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
  },
});

export default HoroscopeWidget;
