import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';

interface Prediction {
  general: string;
  love: string;
  career: string;
  health: string;
  advice: string;
}

interface HoroscopeWidgetProps {
  predictions: {
    day: Prediction;
    tomorrow: Prediction;
    week: Prediction;
  };
  currentPlanets: any;
  isLoading?: boolean;
}

const HoroscopeWidget: React.FC<HoroscopeWidgetProps> = ({ 
  predictions, 
  currentPlanets, 
  isLoading = false 
}) => {
  const [activePeriod, setActivePeriod] = React.useState<'day' | 'tomorrow' | 'week'>('day');

  // Отладочная информация
  React.useEffect(() => {
    console.log('🔮 HoroscopeWidget получил данные:', {
      predictions,
      currentPlanets,
      isLoading
    });
  }, [predictions, currentPlanets, isLoading]);

  const getPeriodTitle = (period: string) => {
    switch (period) {
      case 'day': return 'Сегодня';
      case 'tomorrow': return 'Завтра';
      case 'week': return 'Неделя';
      default: return period;
    }
  };

  const getPeriodIcon = (period: string) => {
    switch (period) {
      case 'day': return 'sunny';
      case 'tomorrow': return 'moon';
      case 'week': return 'calendar';
      default: return 'star';
    }
  };

  const getCurrentPrediction = () => {
    if (!predictions) {
      return {
        general: 'Загрузка предсказаний...',
        love: 'Загрузка предсказаний...',
        career: 'Загрузка предсказаний...',
        health: 'Загрузка предсказаний...',
        advice: 'Загрузка предсказаний...',
      };
    }

    switch (activePeriod) {
      case 'day': return predictions.day || {};
      case 'tomorrow': return predictions.tomorrow || {};
      case 'week': return predictions.week || {};
      default: return predictions.day || {};
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Загрузка гороскопа...</Text>
        </View>
      </View>
    );
  }

  const currentPrediction = getCurrentPrediction();

  return (
    <Animated.View entering={SlideInUp.delay(500)} style={styles.container}>
      <Text style={styles.title}>Астрологический прогноз</Text>
      
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['day', 'tomorrow', 'week'] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              activePeriod === period && styles.activePeriodButton
            ]}
            onPress={() => setActivePeriod(period)}
          >
            <Ionicons 
              name={getPeriodIcon(period) as any} 
              size={16} 
              color={activePeriod === period ? '#8B5CF6' : 'rgba(255, 255, 255, 0.6)'} 
            />
            <Text style={[
              styles.periodText,
              activePeriod === period && styles.activePeriodText
            ]}>
              {getPeriodTitle(period)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Prediction Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.delay(200)} style={styles.predictionCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="star" size={20} color="#8B5CF6" />
            <Text style={styles.cardTitle}>Общий прогноз</Text>
          </View>
          <Text style={styles.predictionText}>{currentPrediction.general || 'Предсказание недоступно'}</Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(300)} style={styles.predictionCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="heart" size={20} color="#FF6B6B" />
            <Text style={styles.cardTitle}>Любовь и отношения</Text>
          </View>
          <Text style={styles.predictionText}>{currentPrediction.love || 'Предсказание недоступно'}</Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(400)} style={styles.predictionCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="briefcase" size={20} color="#4ECDC4" />
            <Text style={styles.cardTitle}>Карьера и работа</Text>
          </View>
          <Text style={styles.predictionText}>{currentPrediction.career || 'Предсказание недоступно'}</Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(500)} style={styles.predictionCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="fitness" size={20} color="#45B7D1" />
            <Text style={styles.cardTitle}>Здоровье</Text>
          </View>
          <Text style={styles.predictionText}>{currentPrediction.health || 'Предсказание недоступно'}</Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(600)} style={[styles.predictionCard, styles.adviceCard]}>
          <View style={styles.cardHeader}>
            <Ionicons name="bulb" size={20} color="#FFD93D" />
            <Text style={styles.cardTitle}>Совет дня</Text>
          </View>
          <Text style={styles.adviceText}>{currentPrediction.advice || 'Совет недоступен'}</Text>
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(139, 92, 246, 0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
  },
  activePeriodButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  periodText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 6,
    fontWeight: '500',
  },
  activePeriodText: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  content: {
    maxHeight: 400,
  },
  predictionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  adviceCard: {
    backgroundColor: 'rgba(255, 211, 61, 0.1)',
    borderColor: 'rgba(255, 211, 61, 0.3)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  predictionText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  adviceText: {
    fontSize: 14,
    color: '#FFD93D',
    lineHeight: 20,
    fontWeight: '500',
    fontStyle: 'italic',
  },
});

export default HoroscopeWidget;
