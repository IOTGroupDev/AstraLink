// src/components/advisor/BestWindowsWidget.tsx
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface TimeWindow {
  startISO: string;
  endISO: string;
  score: number;
}

interface BestWindowsWidgetProps {
  windows?: TimeWindow[]; // допускаем undefined, чтобы безопасно принимать данные из API
  verdict: 'good' | 'neutral' | 'challenging';
}

const BestWindowsWidget: React.FC<BestWindowsWidgetProps> = ({
  windows,
  verdict,
}) => {
  // Возвращаем строго кортеж из двух цветов (для типов expo-linear-gradient)
  const getScoreColor = (score: number): readonly [string, string] => {
    if (score >= 70) return ['#10B981', '#059669'] as const;
    if (score >= 50) return ['#F59E0B', '#D97706'] as const;
    return ['#EF4444', '#DC2626'] as const;
  };

  const formatTime = (value?: string | number | Date | null) => {
    if (value == null) return '--:--';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const safeWindows = Array.isArray(windows) ? windows : [];
  const topWindows = safeWindows.slice(0, 5);

  return (
    <BlurView intensity={10} tint="dark" style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="time" size={20} color="#8B5CF6" />
          <Text style={styles.title}>Лучшие временные окна</Text>
        </View>
        <View style={styles.badge}>
          <Ionicons name="star" size={14} color="#F59E0B" />
          <Text style={styles.badgeText}>Топ-{topWindows.length}</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Наиболее благоприятные часы для выбранной темы
      </Text>

      <View style={styles.windowsList}>
        {topWindows.map((window, index) => {
          const scoreColors = getScoreColor(window.score);
          const isTop = index === 0;

          return (
            <View
              key={index}
              style={[styles.windowCard, isTop && styles.windowCardTop]}
            >
              <View style={styles.windowLeft}>
                <View style={[styles.rankBadge, isTop && styles.rankBadgeTop]}>
                  <Text style={[styles.rankText, isTop && styles.rankTextTop]}>
                    {index + 1}
                  </Text>
                </View>

                <View style={styles.windowInfo}>
                  <View style={styles.timeRow}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color="rgba(255,255,255,0.7)"
                    />
                    <Text style={styles.timeText}>
                      {formatTime(window.startISO)} -{' '}
                      {formatTime(window.endISO)}
                    </Text>
                  </View>

                  {isTop && (
                    <View style={styles.bestBadge}>
                      <Ionicons name="trophy" size={12} color="#F59E0B" />
                      <Text style={styles.bestBadgeText}>Лучшее время</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.windowRight}>
                <LinearGradient
                  colors={[scoreColors[0], scoreColors[1]]}
                  style={styles.scoreCircle}
                >
                  <Text style={styles.scoreText}>{window.score}</Text>
                </LinearGradient>
              </View>
            </View>
          );
        })}
      </View>

      {/* Timeline visualization */}
      <View style={styles.timeline}>
        <Text style={styles.timelineLabel}>График дня</Text>
        <View style={styles.timelineBar}>
          {safeWindows.slice(0, 24).map((window, index) => {
            const scoreColors = getScoreColor(window.score);
            const opacity = Math.max(0.3, window.score / 100);

            return (
              <View
                key={index}
                style={[
                  styles.timelineSegment,
                  {
                    backgroundColor: scoreColors[0],
                    opacity,
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={styles.timelineLabels}>
          <Text style={styles.timelineTime}>00:00</Text>
          <Text style={styles.timelineTime}>06:00</Text>
          <Text style={styles.timelineTime}>12:00</Text>
          <Text style={styles.timelineTime}>18:00</Text>
          <Text style={styles.timelineTime}>24:00</Text>
        </View>
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginBottom: 16,
  },
  windowsList: {
    gap: 12,
    marginBottom: 20,
  },
  windowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  windowCardTop: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  windowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeTop: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  rankText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '700',
  },
  rankTextTop: {
    color: '#FFFFFF',
  },
  windowInfo: {
    flex: 1,
    gap: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bestBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
  },
  windowRight: {},
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Timeline
  timeline: {
    marginTop: 8,
    gap: 8,
  },
  timelineLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  timelineBar: {
    flexDirection: 'row',
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    gap: 1,
  },
  timelineSegment: {
    flex: 1,
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
});

export default BestWindowsWidget;
