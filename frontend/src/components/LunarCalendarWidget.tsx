import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MoonPhaseVisual } from './MoonPhaseVisual';
import { Text } from 'react-native';

const LunarCalendarWidget = () => {
  const moonPhase = 0.75; // 0-1 (0 = new, 0.5 = full, 1 = new)
  const moonSign = 'Скорпион';
  const nextFullMoon = '15 мая 2025';

  return (
    <View style={styles.lunarWidget}>
      <Text style={styles.widgetTitle}>🌙 Лунный календарь</Text>

      {/* Визуализация фазы Луны */}
      <View style={styles.moonPhaseContainer}>
        <MoonPhaseVisual phase={moonPhase} size={80} />
        <View style={styles.moonInfo}>
          <Text style={styles.moonPhaseText}>Убывающая Луна</Text>
          <Text style={styles.moonSignText}>в {moonSign}</Text>
          <Text style={styles.moonPercent}>{Math.round(moonPhase * 100)}%</Text>
        </View>
      </View>

      {/* Рекомендации */}
      <View style={styles.recommendations}>
        <View style={styles.recommendationItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.recommendationText}>
            Хорошо: медитация, интуитивная работа
          </Text>
        </View>
        <View style={styles.recommendationItem}>
          <Ionicons name="close-circle" size={20} color="#EF4444" />
          <Text style={styles.recommendationText}>
            Избегать: начало проектов, стрижки
          </Text>
        </View>
      </View>

      {/* Следующее важное событие */}
      <View style={styles.nextEvent}>
        <Text style={styles.nextEventLabel}>Следующее полнолуние:</Text>
        <Text style={styles.nextEventDate}>{nextFullMoon}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  lunarWidget: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  moonPhaseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  moonInfo: {
    marginLeft: 20,
    flex: 1,
  },
  moonPhaseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  moonSignText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  moonPercent: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#C0C0C0',
    marginTop: 8,
  },
  recommendations: {
    gap: 10,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  nextEvent: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  nextEventLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  nextEventDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C0C0C0',
    marginTop: 4,
  },
});

export { LunarCalendarWidget };
