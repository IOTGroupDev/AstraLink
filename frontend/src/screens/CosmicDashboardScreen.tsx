import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { chartAPI } from '../services/api';
import SolarSystem from '../components/SolarSystem';
import PredictionsCard from '../components/PredictionsCard';

const { width, height } = Dimensions.get('window');

const CosmicDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const [currentPlanets, setCurrentPlanets] = useState<any>(null);
  const [predictions, setPredictions] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('day');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const periods = [
    { key: 'day', label: 'День', icon: 'sunny' },
    { key: 'week', label: 'Неделя', icon: 'calendar' },
    { key: 'month', label: 'Месяц', icon: 'time' },
  ];

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Загружаем текущие позиции планет и предсказания параллельно
      const [planetsData, predictionsData] = await Promise.all([
        chartAPI.getCurrentPlanets(),
        chartAPI.getPredictions(selectedPeriod)
      ]);

      setCurrentPlanets(planetsData);
      setPredictions(predictionsData);
    } catch (error) {
      console.error('Ошибка загрузки космических данных:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePeriodChange = async (period: string) => {
    setSelectedPeriod(period);
    try {
      const predictionsData = await chartAPI.getPredictions(period);
      setPredictions(predictionsData);
    } catch (error) {
      console.error('Ошибка загрузки предсказаний:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#8B5CF6"
        />
      }
    >
      {/* Заголовок */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="planet" size={28} color="#8B5CF6" />
          <Text style={styles.title}>Космический Дашборд</Text>
        </View>
        <Text style={styles.subtitle}>Текущие позиции планет и предсказания</Text>
      </Animated.View>

      {/* Солнечная система */}
      <Animated.View entering={FadeInUp.delay(200)} style={styles.solarSystemContainer}>
        <View style={styles.sectionHeader}>
          <Ionicons name="solar" size={20} color="#8B5CF6" />
          <Text style={styles.sectionTitle}>Солнечная система</Text>
        </View>
        <View style={styles.solarSystemWrapper}>
          <SolarSystem 
            currentPlanets={currentPlanets} 
            isLoading={isLoading}
          />
        </View>
      </Animated.View>

      {/* Переключатель периодов */}
      <Animated.View entering={FadeInUp.delay(300)} style={styles.periodSelector}>
        <Text style={styles.selectorTitle}>Период предсказаний:</Text>
        <View style={styles.periodButtons}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodButton,
                selectedPeriod === period.key && styles.periodButtonActive
              ]}
              onPress={() => handlePeriodChange(period.key)}
            >
              <Ionicons 
                name={period.icon as any} 
                size={16} 
                color={selectedPeriod === period.key ? '#FFFFFF' : '#8B5CF6'} 
              />
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period.key && styles.periodButtonTextActive
              ]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Предсказания */}
      {predictions && (
        <PredictionsCard 
          predictions={predictions.predictions}
          period={selectedPeriod}
          isLoading={isLoading}
        />
      )}

      {/* Кнопка натальной карты */}
      <Animated.View entering={FadeInUp.delay(400)} style={styles.natalChartContainer}>
        <TouchableOpacity 
          style={styles.natalChartButton}
          onPress={() => navigation.navigate('MyChart' as never)}
        >
          <Ionicons name="star" size={24} color="#FFFFFF" />
          <View style={styles.natalChartContent}>
            <Text style={styles.natalChartTitle}>Моя Натальная Карта</Text>
            <Text style={styles.natalChartSubtitle}>Посмотреть детальную карту</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.6)" />
        </TouchableOpacity>
      </Animated.View>

      {/* Дополнительная информация */}
      <Animated.View entering={FadeInUp.delay(500)} style={styles.infoContainer}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#8B5CF6" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Как это работает?</Text>
            <Text style={styles.infoText}>
              Астрологические предсказания основаны на анализе текущих позиций планет 
              относительно вашей натальной карты. Каждая планета влияет на разные сферы жизни.
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Отступ внизу */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 12,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  solarSystemContainer: {
    margin: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  solarSystemWrapper: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodSelector: {
    margin: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectorTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  periodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  periodButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  periodButtonText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  natalChartContainer: {
    margin: 15,
  },
  natalChartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  natalChartContent: {
    flex: 1,
    marginLeft: 15,
  },
  natalChartTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  natalChartSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  infoContainer: {
    margin: 15,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  infoText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 50,
  },
});

export default CosmicDashboardScreen;
