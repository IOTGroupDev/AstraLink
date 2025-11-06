// frontend/src/components/HoroscopeWidget.tsx (исправленная версия)
import React, { useEffect, useState, useMemo } from 'react';
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
} from 'react-native-reanimated';
import { chartAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

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
  const { isAuthenticated, isLoading: authLoading } = useAuth();
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
    if (isAuthenticated) {
      loadAllHoroscopes();
    }
  }, [isAuthenticated]);

  const loadAllHoroscopes = async () => {
    try {
      setLoading(true);
      console.log('🔮 Загрузка всех гороскопов...');

      const response = await chartAPI.getAllHoroscopes();

      console.log('📦 Получен ответ от API:', {
        hasToday: !!response.today,
        hasTomorrow: !!response.tomorrow,
        hasWeek: !!response.week,
        hasMonth: !!response.month,
      });

      // Нормализуем ключи с backend: today -> day
      const normalized = {
        day: response.today,
        tomorrow: response.tomorrow,
        week: response.week,
        month: response.month,
      };

      // Проверяем, что данные разные
      console.log('🔍 Проверка уникальности данных:');
      console.log('Day general:', normalized.day?.general?.substring(0, 50));
      console.log(
        'Tomorrow general:',
        normalized.tomorrow?.general?.substring(0, 50)
      );
      console.log('Week general:', normalized.week?.general?.substring(0, 50));
      console.log(
        'Month general:',
        normalized.month?.general?.substring(0, 50)
      );

      setAllHoroscopes(normalized);
      setIsPremium(response.isPremium || false);

      console.log('✅ Гороскопы загружены успешно');
    } catch (error) {
      console.error('❌ Ошибка загрузки гороскопов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (period: HoroscopePeriod) => {
    console.log('📅 Изменение периода на:', period);
    scaleAnim.value = withSequence(withSpring(0.95), withSpring(1));
    setActivePeriod(period);
  };

  // Используем useMemo для мемоизации текущего гороскопа
  const currentHoroscope = useMemo(() => {
    if (!allHoroscopes) {
      console.log('⚠️ allHoroscopes пока null');
      return null;
    }

    const horoscope = allHoroscopes[activePeriod];
    console.log(`🔮 Текущий гороскоп для ${activePeriod}:`, {
      hasGeneral: !!horoscope?.general,
      generalStart: horoscope?.general?.substring(0, 50),
    });

    return horoscope;
  }, [allHoroscopes, activePeriod]);

  // Отладка: отслеживание изменений
  useEffect(() => {
    console.log('🔄 Период изменился:', activePeriod);
    console.log('📊 Текущий гороскоп:', currentHoroscope ? 'загружен' : 'null');
  }, [activePeriod]);

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
  }));

  const animatedScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const animatedFadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

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

  if (authLoading || loading) {
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

  // Если пользователь не авторизован, не показываем компонент
  if (!isAuthenticated) {
    return null;
  }

  if (!currentHoroscope) {
    console.log('⚠️ Нет данных для отображения');
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
            {(['day', 'tomorrow', 'week', 'month'] as const).map((period) => (
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
            ))}
          </ScrollView>

          {/* Контент прогнозов */}
          <View style={styles.predictionsScroll} key={activePeriod}>
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

            {/* Энергия и настроение */}
            {(currentHoroscope.energy || currentHoroscope.mood) && (
              <View style={styles.energyMoodSection}>
                {currentHoroscope.energy && (
                  <View style={styles.energyItem}>
                    <Text style={styles.energyLabel}>Энергия дня</Text>
                    <View style={styles.energyBar}>
                      <View
                        style={[
                          styles.energyFill,
                          {
                            width: `${Math.min(currentHoroscope.energy, 100)}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.energyValue}>
                      {currentHoroscope.energy}/100
                    </Text>
                  </View>
                )}

                {currentHoroscope.mood && (
                  <View style={styles.moodItem}>
                    <Text style={styles.moodLabel}>Настроение</Text>
                    <Text style={styles.moodText}>{currentHoroscope.mood}</Text>
                  </View>
                )}
              </View>
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
          </View>

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
  predictionsScroll: {},
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
  energyMoodSection: {
    marginTop: 10,
    gap: 15,
  },
  energyItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  energyLabel: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  energyBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  energyFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
  },
  energyValue: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  moodItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.1)',
  },
  moodLabel: {
    color: '#EC4899',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  moodText: {
    color: '#fff',
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default HoroscopeWidget;
