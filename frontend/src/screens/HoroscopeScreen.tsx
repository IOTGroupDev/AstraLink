// src/screens/HoroscopeScreen.tsx - Refactored with data fetching
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import HoroscopeSvg from '../components/svg/tabs/HoroscopeSvg';
import { LunarCalendarWidget } from '../components/horoscope/LunarCalendarWidget';
import EnergyWidget from '../components/horoscope/EnergyWidget';
import { TabScreenLayout } from '../components/layout/TabScreenLayout';
import MainTransitWidget from '../components/horoscope/MainTransitWidget';
import BiorhythmsWidget from '../components/horoscope/BiorhythmsWidget';
import HoroscopeWidget from '../components/horoscope/HoroscopeWidget';
import PlanetaryRecommendationWidget from '../components/horoscope/PlanetRecommendationWidget';
import { chartAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Chart, TransitsResponse } from '../types/index';
import NatalChartWheel from '../intgr/NatalChartWheel';
import NatalChartScreenImplementation from '../intgr/NatalChartScreenImplementation';
import ChartScreenExample from '../intgr/ChartScreenExample';

const HoroscopeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // State для данных
  const [chart, setChart] = useState<Chart | null>(null);
  const [transits, setTransits] = useState<TransitsResponse | null>(null);
  const [currentPlanets, setCurrentPlanets] = useState<any>(null);
  const [predictions, setPredictions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [biorhythms, setBiorhythms] = useState<{
    physical: number;
    emotional: number;
    intellectual: number;
  } | null>(null);

  // Клиентский расчёт биоритмов (fallback), если сервер вернул плоские 50/50/50
  const computeClientBiorhythms = (
    birthDateISO?: string,
    targetDateISO?: string
  ) => {
    try {
      if (!birthDateISO) return null;
      const birth = new Date(birthDateISO);
      if (isNaN(birth.getTime())) return null;

      // Целевая дата = сегодня (локальная) либо переданная
      const now = targetDateISO ? new Date(targetDateISO) : new Date();

      // Используем «полдень по UTC» для обеих дат, чтобы исключить сдвиги по часовым поясам
      const toUTCNoon = (d: Date) =>
        new Date(
          Date.UTC(
            d.getUTCFullYear(),
            d.getUTCMonth(),
            d.getUTCDate(),
            12,
            0,
            0
          )
        );

      const birthNoonUTC = toUTCNoon(birth);
      const targetNoonUTC = toUTCNoon(now);

      const dayMs = 24 * 60 * 60 * 1000;
      const days = Math.max(
        0,
        Math.floor((targetNoonUTC.getTime() - birthNoonUTC.getTime()) / dayMs)
      );

      const cycle = (period: number) =>
        Math.round(((Math.sin((2 * Math.PI * days) / period) + 1) / 2) * 100);

      const clamp = (v: number) => Math.min(100, Math.max(0, v));

      return {
        physical: clamp(cycle(23)),
        emotional: clamp(cycle(28)),
        intellectual: clamp(cycle(33)),
      };
    } catch {
      return null;
    }
  };

  // Загрузка основных данных
  const loadData = async () => {
    try {
      setLoading(true);

      if (!isAuthenticated) {
        console.log('❌ Пользователь не авторизован, перенаправление на вход');
        navigation.navigate('Login' as never);
        return;
      }

      try {
        console.log('🔍 Загружаю данные для HoroscopeScreen...');

        const [chartData, transitsData, planetsData] = await Promise.all([
          chartAPI.getNatalChart(),
          chartAPI.getTransits(
            new Date().toISOString().split('T')[0],
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0]
          ),
          chartAPI.getCurrentPlanets(),
        ]);

        console.log('✅ Получены данные карты:', chartData);
        console.log('✅ Получены транзиты:', transitsData);
        console.log('✅ Получены текущие планеты:', planetsData);

        setChart(chartData);
        setTransits(transitsData);
        setCurrentPlanets(planetsData.planets);

        // Загружаем биоритмы
        try {
          // Локальная дата пользователя (YYYY-MM-DD), чтобы избежать смещения по UTC на бэкенде
          const now = new Date();
          const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
            now.getDate()
          ).padStart(2, '0')}`;

          const b = await chartAPI.getBiorhythms(localDateStr);

          // Если значения "плоские" около 50% (из-за даты/часового пояса), пересчитываем на клиенте из даты рождения
          const isNum = (v: any) => typeof v === 'number' && Number.isFinite(v);
          const near50 = (v: number) => Math.abs(v - 50) <= 1;
          const looksFlat =
            isNum(b?.physical) &&
            isNum(b?.emotional) &&
            isNum(b?.intellectual) &&
            near50(b.physical) &&
            near50(b.emotional) &&
            near50(b.intellectual);

          const birthISO =
            (chartData?.data as any)?.birthDate ||
            (chartData?.data as any)?.birth_date ||
            chartData?.birthDate ||
            (chartData as any)?.birth_date;

          const clientCalc = looksFlat
            ? computeClientBiorhythms(birthISO, localDateStr)
            : null;

          const finalValues = clientCalc ?? {
            physical: b.physical,
            emotional: b.emotional,
            intellectual: b.intellectual,
          };

          setBiorhythms(finalValues);

          console.log('✅ Биоритмы:', {
            api: b,
            clientFallbackUsed: !!clientCalc,
            client: clientCalc,
            requestedDate: localDateStr,
            birthDateUsed: birthISO,
          });
        } catch (e) {
          console.error('❌ Ошибка загрузки биоритмов:', e);
          // Попробуем хотя бы клиентский расчёт, если есть дата рождения
          try {
            const now = new Date();
            const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
              now.getDate()
            ).padStart(2, '0')}`;
            const birthISO =
              (chartData?.data as any)?.birthDate ||
              (chartData?.data as any)?.birth_date ||
              chartData?.birthDate ||
              (chartData as any)?.birth_date;

            const clientCalc = computeClientBiorhythms(birthISO, localDateStr);
            if (clientCalc) {
              setBiorhythms(clientCalc);
              console.log(
                'ℹ️ Поставлены клиентские биоритмы (fallback):',
                clientCalc
              );
            }
          } catch {
            // ignore
          }
        }
      } catch (error: any) {
        console.error('❌ Ошибка загрузки данных карты:', error);

        if (error.response?.status === 401) {
          console.log(
            '🔄 Перенаправление на страницу входа из-за отсутствия токена'
          );
          navigation.navigate('Login' as never);
          return;
        }

        if (error.response?.status === 404) {
          console.log('📋 Карта не найдена, создаю новую карту');
          try {
            const newChart = await chartAPI.createNatalChart({});
            setChart(newChart);
            console.log('✅ Карта успешно создана');
          } catch (createError) {
            console.error('❌ Ошибка создания карты:', createError);
            Alert.alert(
              'Необходимо создать натальную карту',
              'Пожалуйста, заполните данные о рождении в профиле для создания астрологической карты.',
              [{ text: 'OK' }]
            );
          }
        }
      }
    } catch (error) {
      console.error('❌ Общая ошибка в loadData:', error);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка прогнозов
  const loadAllPredictions = async () => {
    try {
      console.log('🔮 Загружаю прогнозы...');

      const [dayResponse, tomorrowResponse, weekResponse] = await Promise.all([
        chartAPI.getHoroscope('day'),
        chartAPI.getHoroscope('tomorrow'),
        chartAPI.getHoroscope('week'),
      ]);

      console.log('✅ Получены прогнозы:', {
        day: dayResponse,
        tomorrow: tomorrowResponse,
        week: weekResponse,
      });

      const extractPredictions = (response: any) => {
        if (response.predictions && typeof response.predictions === 'object') {
          return response.predictions;
        }
        return {
          general: response.general || '',
          love: response.love || '',
          career: response.career || '',
          health: response.health || '',
          finance: response.finance || '',
          advice: response.advice || '',
          luckyNumbers: response.luckyNumbers || [],
          luckyColors: response.luckyColors || [],
          energy: response.energy || 50,
          mood: response.mood || '',
          challenges: response.challenges || [],
          opportunities: response.opportunities || [],
        };
      };

      const newPredictions = {
        day: extractPredictions(dayResponse),
        tomorrow: extractPredictions(tomorrowResponse),
        week: extractPredictions(weekResponse),
      };

      console.log('🔮 Устанавливаю прогнозы:', newPredictions);
      console.log('🔮 Структура predictions.day:', {
        hasPredictions: !!newPredictions.day,
        general: newPredictions.day?.general?.substring(0, 50) + '...',
        keys: Object.keys(newPredictions.day || {}),
      });
      setPredictions(newPredictions);
    } catch (error) {
      console.error('❌ Ошибка загрузки прогнозов:', error);
      Alert.alert(
        'Ошибка',
        'Не удалось загрузить прогнозы. Попробуйте обновить страницу.',
        [{ text: 'OK' }]
      );
    }
  };

  // Обработчик обновления (pull to refresh)
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await loadAllPredictions();
    setRefreshing(false);
  };

  // Вычисление энергии из карты
  const getCurrentEnergy = () => {
    if (!chart?.data?.aspects) return 50;

    let energy = 40; // Базовая энергия ниже
    const aspectCount = chart.data.aspects.length;

    // Меньший бонус за количество аспектов
    energy += Math.min(aspectCount * 1, 15);

    const harmoniousAspects = chart.data.aspects.filter((aspect) =>
      ['trine', 'sextile', 'conjunction'].includes(aspect.aspect)
    );

    const challengingAspects = chart.data.aspects.filter((aspect) =>
      ['square', 'opposition'].includes(aspect.aspect)
    );

    // Гармоничные аспекты добавляют энергию
    const harmonyBonus = harmoniousAspects.reduce(
      (sum, aspect) => sum + (aspect.strength || 0.5) * 8, // Уменьшил множитель
      0
    );

    // Напряженные аспекты немного снижают энергию
    const challengePenalty = challengingAspects.reduce(
      (sum, aspect) => sum + (aspect.strength || 0.5) * 3,
      0
    );

    energy += harmonyBonus;
    energy -= challengePenalty;

    // Добавляем случайность ±5% для реализма
    const randomFactor = (Math.random() - 0.5) * 10;
    energy += randomFactor;

    return Math.min(95, Math.max(20, Math.round(energy)));
  };

  // Получение главного транзита
  const getMainTransit = () => {
    if (
      chart &&
      chart.data &&
      chart.data.aspects &&
      chart.data.aspects.length > 0
    ) {
      const strongestAspect = chart.data.aspects.reduce((strongest, current) =>
        (current.strength || 0) > (strongest.strength || 0)
          ? current
          : strongest
      );

      const planetNames: Record<string, string> = {
        sun: 'Солнце',
        moon: 'Луна',
        mercury: 'Меркурий',
        venus: 'Венера',
        mars: 'Марс',
        jupiter: 'Юпитер',
        saturn: 'Сатурн',
        uranus: 'Уран',
        neptune: 'Нептун',
        pluto: 'Плутон',
      };

      const aspectNames: Record<string, string> = {
        conjunction: 'соединение',
        opposition: 'оппозиция',
        trine: 'трин',
        square: 'квадрат',
        sextile: 'секстиль',
      };

      const planetA =
        planetNames[strongestAspect.planetA] || strongestAspect.planetA;
      const planetB =
        planetNames[strongestAspect.planetB] || strongestAspect.planetB;
      const aspectName =
        aspectNames[strongestAspect.aspect] || strongestAspect.aspect;

      return {
        name: `${planetA} - ${aspectName} - ${planetB}`,
        aspect: aspectName,
        targetPlanet: planetB,
        strength: strongestAspect.strength || 0.8,
        description: `${planetA} формирует ${aspectName} с ${planetB}`,
      };
    }

    return null;
  };

  // Получение сообщения об энергии (по значению)
  const getEnergyMessage = (energy: number) => {
    if (energy >= 80) return 'Сегодня отличный день для активности!';
    if (energy >= 60) return 'Хорошая энергия для достижения целей';
    if (energy >= 40) return 'Умеренная энергия, сохраняйте баланс';
    if (energy >= 20) return 'Низкая энергия, отдохните';
    return 'Очень низкая энергия, берегите силы';
  };

  // Загрузка данных при монтировании
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadData();
    }
  }, [isAuthenticated, authLoading]);

  // Загрузка прогнозов после получения основных данных
  useEffect(() => {
    if (currentPlanets && chart) {
      console.log('🚀 Вызываю loadAllPredictions...');
      loadAllPredictions();
    }
  }, [currentPlanets, chart]);

  // Формирование данных для виджетов
  const energyValue =
    (predictions?.day?.energy as number | undefined) ?? getCurrentEnergy();
  const energyMessage = getEnergyMessage(energyValue);
  const mainTransit = getMainTransit();

  // Нормализация данных для PlanetaryRecommendationWidget
  const natalPlanetsObj = React.useMemo(() => {
    return chart?.data?.planets || chart?.planets || null;
  }, [chart]);

  const transitPlanetsArr = React.useMemo(() => {
    try {
      if (!currentPlanets) return [];
      if (Array.isArray(currentPlanets)) {
        return currentPlanets.filter(
          (p: any) =>
            p && typeof p.longitude === 'number' && typeof p.name === 'string'
        );
      }
      // Преобразуем объект вида { sun: { longitude, ... }, ... } в массив
      return Object.entries(currentPlanets)
        .map(([name, p]: any) => ({
          name: String(name),
          longitude: Number(p?.longitude),
          sign: p?.sign,
          degree: p?.degree,
        }))
        .filter((p) => Number.isFinite(p.longitude));
    } catch {
      return [];
    }
  }, [currentPlanets]);

  // Логирование для отладки
  console.log('📊 Данные виджетов:', {
    energyValue,
    energyMessage,
    mainTransit: mainTransit?.name,
    hasPredictions: !!predictions,
    predictionsDayExists: !!predictions?.day,
  });

  return (
    <>
      <StatusBar barStyle="light-content" />
      <TabScreenLayout>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="rgba(191, 158, 207, 1)"
              colors={['rgba(191, 158, 207, 1)']}
            />
          }
        >
          {/* Заголовок с размытием */}
          <BlurView intensity={20} tint="dark" style={styles.headerContainer}>
            <View style={styles.headerIconContainer}>
              <HoroscopeSvg size={60} />
            </View>
            <Text style={styles.headerTitle}>Гороскоп</Text>
            <Text style={styles.headerSubtitle}>Астрологический дашборд</Text>
            <Text style={styles.headerDate}>
              Позиции на{' '}
              {new Date().toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </BlurView>

          {/* Основной контент */}
          <View style={styles.contentContainer}>
            {/* Виджет лунного календаря (прокидываем знак Луны из текущих планет) */}
            <LunarCalendarWidget sign={currentPlanets?.moon?.sign} />

            {/* Рекомендация дня (нормализованные данные для виджета) */}
            {natalPlanetsObj && transitPlanetsArr.length > 0 && (
              <PlanetaryRecommendationWidget
                natalPlanets={natalPlanetsObj}
                transitPlanets={transitPlanetsArr}
              />
            )}

            {/* Виджет энергии */}
            {!loading && (
              <EnergyWidget energy={energyValue} message={energyMessage} />
            )}

            {/* Виджет главный транзит */}
            {!loading && mainTransit && (
              <MainTransitWidget transitData={mainTransit} />
            )}

            {/* Гороскоп виджет */}
            {predictions && <HoroscopeWidget predictions={predictions} />}

            {/* Виджет Биоритмы */}
            {biorhythms && (
              <BiorhythmsWidget
                physical={biorhythms.physical}
                emotional={biorhythms.emotional}
                intellectual={biorhythms.intellectual}
              />
            )}

            {/* Placeholder для будущих виджетов */}
            {loading && (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>Загрузка данных...</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </TabScreenLayout>
    </>
  );
};

const styles = StyleSheet.create({
  // Заголовок
  headerContainer: {
    marginHorizontal: 8,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerIconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 10,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 20,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 10,
    textAlign: 'center',
  },
  headerDate: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 10,
    textAlign: 'center',
  },

  // Контент
  contentContainer: {
    marginTop: 20,
    gap: 20,
  },
  placeholder: {
    padding: 32,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});

export default HoroscopeScreen;
