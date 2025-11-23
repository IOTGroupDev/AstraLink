// src/components/advisor/AdvisorRecommendationsWidget.tsx
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Recommendation {
  text: string;
  priority: 'high' | 'medium' | 'low';
  category: 'action' | 'caution' | 'warning';
}

interface AdvisorRecommendationsWidgetProps {
  recommendations: Recommendation[];
  verdict: 'good' | 'neutral' | 'challenging';
}

const AdvisorRecommendationsWidget: React.FC<
  AdvisorRecommendationsWidgetProps
> = ({ recommendations, verdict }) => {
  type VerdictConfig = {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    gradient: string[];
  };

  const getVerdictConfig = (): VerdictConfig => {
    switch (verdict) {
      case 'good':
        return {
          icon: 'bulb',
          title: 'Рекомендации',
          gradient: ['#10B981', '#059669'],
        };
      case 'neutral':
        return {
          icon: 'warning',
          title: 'На что обратить внимание',
          gradient: ['#F59E0B', '#D97706'],
        };
      case 'challenging':
        return {
          icon: 'alert-circle',
          title: 'Важные предостережения',
          gradient: ['#EF4444', '#DC2626'],
        };
      default:
        return {
          icon: 'warning',
          title: 'На что обратить внимание',
          gradient: ['#F59E0B', '#D97706'],
        };
    }
  };

  const getCategoryConfig = (category: Recommendation['category']) => {
    switch (category) {
      case 'action':
        return {
          icon: 'checkmark-circle' as const,
          color: '#10B981',
          bgColor: 'rgba(16, 185, 129, 0.15)',
        };
      case 'caution':
        return {
          icon: 'information-circle' as const,
          color: '#F59E0B',
          bgColor: 'rgba(245, 158, 11, 0.15)',
        };
      case 'warning':
        return {
          icon: 'close-circle' as const,
          color: '#EF4444',
          bgColor: 'rgba(239, 68, 68, 0.15)',
        };
    }
  };

  const getPriorityIcon = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'high':
        return 'star';
      case 'medium':
        return 'star-half';
      case 'low':
        return 'star-outline';
    }
  };

  const verdictConfig = getVerdictConfig();
  const highPriorityRecs = recommendations.filter((r) => r.priority === 'high');
  const otherRecs = recommendations.filter((r) => r.priority !== 'high');

  return (
    <BlurView intensity={10} tint="dark" style={styles.container}>
      <LinearGradient
        colors={[
          verdictConfig.gradient[0],
          verdictConfig.gradient[1] ?? verdictConfig.gradient[0],
          'transparent',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name={verdictConfig.icon} size={24} color="#FFFFFF" />
            <Text style={styles.title}>{verdictConfig.title}</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{recommendations.length}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* High Priority Recommendations */}
      {highPriorityRecs.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Главное</Text>
          </View>
          <View style={styles.recommendationsList}>
            {highPriorityRecs.map((rec, index) => {
              const categoryConfig = getCategoryConfig(rec.category);
              return (
                <View
                  key={index}
                  style={[
                    styles.recommendationCard,
                    { backgroundColor: categoryConfig.bgColor },
                  ]}
                >
                  <View style={styles.recommendationIcon}>
                    <Ionicons
                      name={categoryConfig.icon}
                      size={20}
                      color={categoryConfig.color}
                    />
                  </View>
                  <Text style={styles.recommendationText}>{rec.text}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Other Recommendations */}
      {otherRecs.length > 0 && (
        <View style={styles.section}>
          {highPriorityRecs.length > 0 && (
            <View style={styles.sectionHeader}>
              <Ionicons name="list" size={16} color="rgba(255,255,255,0.6)" />
              <Text style={styles.sectionTitle}>Дополнительно</Text>
            </View>
          )}
          <View style={styles.recommendationsList}>
            {otherRecs.map((rec, index) => {
              const categoryConfig = getCategoryConfig(rec.category);
              return (
                <View key={index} style={styles.recommendationRow}>
                  <View style={styles.recommendationRowLeft}>
                    <Ionicons
                      name={categoryConfig.icon}
                      size={18}
                      color={categoryConfig.color}
                    />
                    <Text style={styles.recommendationRowText}>{rec.text}</Text>
                  </View>
                  <Ionicons
                    name={getPriorityIcon(rec.priority)}
                    size={14}
                    color="rgba(255,255,255,0.4)"
                  />
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Summary note */}
      <View style={styles.summaryNote}>
        <Ionicons
          name="information-circle-outline"
          size={16}
          color="rgba(255,255,255,0.5)"
        />
        <Text style={styles.summaryNoteText}>
          Следуйте рекомендациям для достижения лучшего результата
        </Text>
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerGradient: {
    padding: 20,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  recommendationsList: {
    gap: 12,
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  recommendationIcon: {
    marginTop: 2,
  },
  recommendationText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
  },

  recommendationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  recommendationRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 12,
  },
  recommendationRowText: {
    flex: 1,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
  },

  summaryNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 8,
  },
  summaryNoteText: {
    flex: 1,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    lineHeight: 18,
  },
});

export default AdvisorRecommendationsWidget;
