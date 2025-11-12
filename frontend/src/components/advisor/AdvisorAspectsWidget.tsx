// src/components/advisor/AdvisorAspectsWidget.tsx
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Aspect {
  planetA: string;
  planetB: string;
  type: string;
  orb: number;
  impact: number;
  description?: string;
}

interface Factor {
  label: string;
  weight: number;
  value: number;
  contribution: number;
  description?: string;
}

interface AdvisorAspectsWidgetProps {
  aspects: Aspect[];
  factors: Factor[];
}

const AdvisorAspectsWidget: React.FC<AdvisorAspectsWidgetProps> = ({
  aspects,
  factors,
}) => {
  const [expandedAspect, setExpandedAspect] = useState<number | null>(null);

  const getAspectColor = (type: string): string[] => {
    switch (type) {
      case 'trine':
        return ['#10B981', '#059669'];
      case 'sextile':
        return ['#3B82F6', '#2563EB'];
      case 'conjunction':
        return ['#8B5CF6', '#6366F1'];
      case 'square':
        return ['#F59E0B', '#D97706'];
      case 'opposition':
        return ['#EF4444', '#DC2626'];
      default:
        return ['#6B7280', '#4B5563'];
    }
  };

  const getAspectIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'trine':
        return 'triangle';
      case 'sextile':
        return 'star';
      case 'conjunction':
        return 'ellipse';
      case 'square':
        return 'square';
      case 'opposition':
        return 'remove';
      default:
        return 'ellipse-outline';
    }
  };

  const getAspectNameRu = (type: string): string => {
    const names: Record<string, string> = {
      conjunction: 'Соединение',
      sextile: 'Секстиль',
      square: 'Квадрат',
      trine: 'Трин',
      opposition: 'Оппозиция',
    };
    return names[type] || type;
  };

  const getPlanetNameRu = (planet: string): string => {
    const names: Record<string, string> = {
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
    return names[planet] || planet;
  };

  const getPlanetIcon = (planet: string): keyof typeof Ionicons.glyphMap => {
    const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
      sun: 'sunny',
      moon: 'moon',
      mercury: 'chatbubbles',
      venus: 'heart',
      mars: 'flash',
      jupiter: 'gift',
      saturn: 'hourglass',
      uranus: 'thunderstorm',
      neptune: 'water',
      pluto: 'nuclear',
    };
    return icons[planet] || 'planet';
  };

  // Sort aspects by impact (absolute value)
  const sortedAspects = [...aspects].sort(
    (a, b) => Math.abs(b.impact) - Math.abs(a.impact)
  );

  // Top contributing factors
  const topFactors = [...factors]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 5);

  return (
    <BlurView intensity={10} tint="dark" style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="analytics" size={20} color="#8B5CF6" />
          <Text style={styles.title}>Детальный анализ</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{aspects.length} аспектов</Text>
        </View>
      </View>

      {/* Factors Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ключевые факторы</Text>
        <View style={styles.factorsList}>
          {topFactors.map((factor, index) => {
            const isPositive = factor.contribution > 0;
            const intensity = Math.min(1, Math.abs(factor.contribution) / 10);

            return (
              <View key={index} style={styles.factorCard}>
                <View style={styles.factorLeft}>
                  <View
                    style={[
                      styles.factorIndicator,
                      {
                        backgroundColor: isPositive
                          ? `rgba(16, 185, 129, ${intensity})`
                          : `rgba(239, 68, 68, ${intensity})`,
                      },
                    ]}
                  />
                  <View style={styles.factorInfo}>
                    <Text style={styles.factorLabel}>{factor.label}</Text>
                    {factor.description && (
                      <Text style={styles.factorDescription}>
                        {factor.description}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.factorRight}>
                  <Text
                    style={[
                      styles.factorContribution,
                      {
                        color: isPositive ? '#10B981' : '#EF4444',
                      },
                    ]}
                  >
                    {isPositive ? '+' : ''}
                    {Math.round(factor.contribution)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Aspects Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Транзитные аспекты</Text>
        <View style={styles.aspectsList}>
          {sortedAspects.map((aspect, index) => {
            const isExpanded = expandedAspect === index;
            const colors = getAspectColor(aspect.type);
            const icon = getAspectIcon(aspect.type);
            const isPositive = aspect.impact > 0;

            return (
              <TouchableOpacity
                key={index}
                onPress={() => setExpandedAspect(isExpanded ? null : index)}
                style={styles.aspectCard}
              >
                <LinearGradient
                  colors={[`${colors[0]}20`, 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.aspectCardGradient}
                >
                  <View style={styles.aspectHeader}>
                    <View style={styles.aspectLeft}>
                      <LinearGradient
                        colors={[colors[0], colors[1] ?? colors[0]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.aspectIcon}
                      >
                        <Ionicons name={icon} size={16} color="#FFFFFF" />
                      </LinearGradient>

                      <View style={styles.aspectInfo}>
                        <View style={styles.aspectTitleRow}>
                          <Ionicons
                            name={getPlanetIcon(aspect.planetA)}
                            size={14}
                            color="rgba(255,255,255,0.7)"
                          />
                          <Text style={styles.aspectTitle}>
                            {getPlanetNameRu(aspect.planetA)}
                          </Text>
                          <Ionicons
                            name="arrow-forward"
                            size={12}
                            color="rgba(255,255,255,0.5)"
                          />
                          <Text style={styles.aspectType}>
                            {getAspectNameRu(aspect.type)}
                          </Text>
                        </View>
                        <View style={styles.aspectDetails}>
                          <Text style={styles.aspectDetailText}>
                            Орб: {aspect.orb.toFixed(1)}°
                          </Text>
                          <Text style={styles.aspectDetailSeparator}>•</Text>
                          <Text
                            style={[
                              styles.aspectDetailText,
                              {
                                color: isPositive ? '#10B981' : '#EF4444',
                              },
                            ]}
                          >
                            {isPositive ? 'Гармоничный' : 'Напряженный'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.aspectRight}>
                      <Text
                        style={[
                          styles.impactValue,
                          { color: isPositive ? '#10B981' : '#EF4444' },
                        ]}
                      >
                        {isPositive ? '+' : ''}
                        {aspect.impact.toFixed(2)}
                      </Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="rgba(255,255,255,0.5)"
                      />
                    </View>
                  </View>

                  {isExpanded && aspect.description && (
                    <View style={styles.aspectExpanded}>
                      <View style={styles.divider} />
                      <View style={styles.descriptionContainer}>
                        <Ionicons
                          name="information-circle"
                          size={16}
                          color={colors[0]}
                        />
                        <Text style={styles.aspectDescription}>
                          {aspect.description}
                        </Text>
                      </View>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Info note */}
      <View style={styles.infoNote}>
        <Ionicons name="bulb-outline" size={14} color="rgba(255,255,255,0.5)" />
        <Text style={styles.infoNoteText}>
          Нажмите на аспект для подробной интерпретации
        </Text>
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
    marginBottom: 20,
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
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
  },

  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // Factors
  factorsList: {
    gap: 10,
  },
  factorCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 12,
  },
  factorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  factorIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
  },
  factorInfo: {
    flex: 1,
  },
  factorLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  factorDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  factorRight: {},
  factorContribution: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Aspects
  aspectsList: {
    gap: 12,
  },
  aspectCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  aspectCardGradient: {
    padding: 14,
  },
  aspectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aspectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  aspectIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aspectInfo: {
    flex: 1,
    gap: 4,
  },
  aspectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aspectTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  aspectType: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  aspectDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aspectDetailText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  aspectDetailSeparator: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  aspectRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  impactValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  aspectExpanded: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  aspectDescription: {
    flex: 1,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    lineHeight: 20,
  },

  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderRadius: 8,
  },
  infoNoteText: {
    flex: 1,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
});

export default AdvisorAspectsWidget;
