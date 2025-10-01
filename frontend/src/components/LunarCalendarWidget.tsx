// frontend/src/components/LunarCalendarWidget.tsx (ПОЛНОСТЬЮ ОБНОВЛЕНО)
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { MoonPhaseVisual } from './MoonPhaseVisual';
import { chartAPI } from '../services/api';

/**
 * Виджет лунного календаря с РЕАЛЬНЫМИ данными Swiss Ephemeris
 */
export const LunarCalendarWidget: React.FC = () => {
  // Получаем реальные данные фазы луны через TanStack Query
  const {
    data: moonPhase,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['moonPhase'],
    queryFn: () => chartAPI.getMoonPhase(),
    staleTime: 1000 * 60 * 60, // 1 час - фаза луны меняется медленно
    gcTime: 1000 * 60 * 60 * 24, // Кэшируем на 24 часа
    retry: 2,
  });

  // Получаем лунный день
  const { data: lunarDay } = useQuery({
    queryKey: ['lunarDay'],
    queryFn: () => chartAPI.getLunarDay(),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 2,
  });

  if (isLoading) {
    return (
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.15)', 'rgba(236, 72, 153, 0.15)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Расчет лунных данных...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (isError) {
    return (
      <LinearGradient
        colors={['rgba(239, 68, 68, 0.15)', 'rgba(220, 38, 38, 0.15)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={40} color="#EF4444" />
          <Text style={styles.errorText}>Ошибка загрузки данных луны</Text>
          <Text style={styles.errorSubtext}>
            {error instanceof Error ? error.message : 'Попробуйте позже'}
          </Text>
        </View>
      </LinearGradient>
    );
  }

  if (!moonPhase) {
    return null;
  }

  const getEnergyColor = (energy?: string) => {
    switch (energy) {
      case 'positive':
        return '#10B981';
      case 'challenging':
        return '#EF4444';
      default:
        return '#8B5CF6';
    }
  };

  const getEnergyIcon = (energy?: string) => {
    switch (energy) {
      case 'positive':
        return 'trending-up';
      case 'challenging':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  return (
    <LinearGradient
      colors={['rgba(139, 92, 246, 0.15)', 'rgba(236, 72, 153, 0.15)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="moon" size={24} color="#C0C0C0" />
        <Text style={styles.title}>Лунный календарь</Text>
      </View>

      {/* Moon Phase Visual + Info */}
      <View style={styles.mainContent}>
        <View style={styles.moonPhaseContainer}>
          <MoonPhaseVisual phase={moonPhase.phase} size={100} />
          <View style={styles.phaseInfo}>
            <Text style={styles.phaseName}>{moonPhase.phaseName}</Text>
            <Text style={styles.illumination}>
              {moonPhase.illumination}% освещена
            </Text>
          </View>
        </View>

        {/* Moon Sign and House */}
        <View style={styles.detailsRow}>
          <View style={styles.detailCard}>
            <Ionicons name="star" size={20} color="#FFD700" />
            <Text style={styles.detailLabel}>Знак</Text>
            <Text style={styles.detailValue}>{moonPhase.sign}</Text>
          </View>

          {moonPhase.house && (
            <View style={styles.detailCard}>
              <Ionicons name="home" size={20} color="#8B5CF6" />
              <Text style={styles.detailLabel}>Дом</Text>
              <Text style={styles.detailValue}>{moonPhase.house}</Text>
            </View>
          )}

          {lunarDay && (
            <View style={styles.detailCard}>
              <Ionicons name="calendar" size={20} color="#EC4899" />
              <Text style={styles.detailLabel}>Лунный день</Text>
              <Text style={styles.detailValue}>{lunarDay.number}</Text>
            </View>
          )}
        </View>

        {/* Void of Course Warning */}
        {moonPhase.isVoidOfCourse && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={20} color="#FFA500" />
            <Text style={styles.warningText}>
              Луна без курса - избегайте важных решений
            </Text>
          </View>
        )}

        {/* Lunar Day Energy */}
        {lunarDay && (
          <View style={styles.energyCard}>
            <View style={styles.energyHeader}>
              <Ionicons
                name={getEnergyIcon(lunarDay.energy) as any}
                size={20}
                color={getEnergyColor(lunarDay.energy)}
              />
              <Text style={styles.energyTitle}>{lunarDay.name}</Text>
            </View>
            <Text style={styles.energyDescription}>
              {lunarDay.recommendations[0]}
            </Text>
          </View>
        )}

        {/* Recommendations */}
        <View style={styles.recommendationsSection}>
          <Text style={styles.sectionTitle}>Рекомендации на сегодня</Text>

          <View style={styles.recommendationCard}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.recommendationText}>
              {moonPhase.recommendations.practical}
            </Text>
          </View>

          <View style={styles.recommendationCard}>
            <Ionicons name="close-circle" size={18} color="#EF4444" />
            <Text style={styles.recommendationText}>
              {moonPhase.recommendations.avoid}
            </Text>
          </View>
        </View>

        {/* Next Phase */}
        <View style={styles.nextPhaseCard}>
          <Text style={styles.nextPhaseLabel}>Следующая фаза:</Text>
          <Text style={styles.nextPhaseDate}>
            {new Date(moonPhase.nextPhaseDate).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(139, 92, 246, 0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  mainContent: {
    gap: 15,
  },
  moonPhaseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  phaseInfo: {
    flex: 1,
    marginLeft: 20,
  },
  phaseName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  illumination: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  detailCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#FFA500',
    fontWeight: '600',
  },
  energyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  energyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  energyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  energyDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  recommendationsSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  nextPhaseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  nextPhaseLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  nextPhaseDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 15,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 10,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});
