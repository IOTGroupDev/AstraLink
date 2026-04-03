// src/components/advisor/AdvisorResultWidget.tsx
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

interface AdvisorResultWidgetProps {
  verdict: 'good' | 'neutral' | 'challenging';
  score: number;
  color: string;
  directAnswer?: string;
  explanation: string;
  risks?: string[];
  clarifyingQuestion?: string;
  alternativeDate?: {
    date: string;
    score: number;
    bestWindow?: string;
    reason: string;
  };
  topic: string;
  topicIcon: keyof typeof Ionicons.glyphMap;
}

const AdvisorResultWidget: React.FC<AdvisorResultWidgetProps> = ({
  verdict,
  score,
  color,
  directAnswer,
  explanation,
  risks,
  clarifyingQuestion,
  alternativeDate,
  topic,
  topicIcon,
}) => {
  const { t, i18n } = useTranslation();
  const formattedAlternativeDate = React.useMemo(() => {
    if (!alternativeDate?.date) {
      return '';
    }

    try {
      return new Intl.DateTimeFormat(i18n.language || 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(`${alternativeDate.date}T12:00:00`));
    } catch {
      return alternativeDate.date;
    }
  }, [alternativeDate?.date, i18n.language]);
  type VerdictConfig = {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    gradient: string[];
    emoji: string;
  };

  const getVerdictConfig = (): VerdictConfig => {
    switch (verdict) {
      case 'good':
        return {
          icon: 'checkmark-circle',
          label: t('advisor.resultWidget.verdict.good'),
          gradient: ['#10B981', '#059669'],
          emoji: '✨',
        };
      case 'neutral':
        return {
          icon: 'remove-circle',
          label: t('advisor.resultWidget.verdict.neutral'),
          gradient: ['#F59E0B', '#D97706'],
          emoji: '⚖️',
        };
      case 'challenging':
        return {
          icon: 'close-circle',
          label: t('advisor.resultWidget.verdict.challenging'),
          gradient: ['#EF4444', '#DC2626'],
          emoji: '⚠️',
        };
      default:
        // На случай расширения типов в будущем — безопасное значение
        return {
          icon: 'remove-circle',
          label: t('advisor.resultWidget.verdict.neutral'),
          gradient: ['#F59E0B', '#D97706'],
          emoji: '⚖️',
        };
    }
  };

  const verdictConfig = getVerdictConfig();
  const visibleRisks = (risks || []).filter(Boolean).slice(0, 4);

  return (
    <BlurView intensity={10} tint="dark" style={styles.container}>
      {/* Score Ring */}
      <View style={styles.header}>
        <LinearGradient
          colors={[
            verdictConfig.gradient[0],
            verdictConfig.gradient[1] ?? verdictConfig.gradient[0],
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.scoreRing}
        >
          <View style={styles.scoreInner}>
            <Text style={styles.scoreNumber}>{score}</Text>
            <Text style={styles.scoreLabel}>
              {t('advisor.resultWidget.outOf')}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.headerInfo}>
          <View style={styles.topicBadge}>
            <Ionicons
              name={topicIcon}
              size={16}
              color="rgba(139, 92, 246, 1)"
            />
            <Text style={styles.topicText}>{topic}</Text>
          </View>

          <View style={styles.verdictBadge}>
            <Ionicons name={verdictConfig.icon} size={24} color={color} />
            <Text style={[styles.verdictLabel, { color }]}>
              {verdictConfig.label}
            </Text>
          </View>
        </View>
      </View>

      {directAnswer ? (
        <View style={styles.directAnswerContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="navigate" size={16} color="#FDE68A" />
            <Text style={styles.sectionTitle}>
              {t('advisor.resultWidget.sections.directAnswer')}
            </Text>
          </View>
          <Text style={styles.directAnswerText}>{directAnswer}</Text>
        </View>
      ) : null}

      <View style={styles.explanationContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.explanationEmoji}>{verdictConfig.emoji}</Text>
          <Text style={styles.sectionTitle}>
            {t('advisor.resultWidget.sections.why')}
          </Text>
        </View>
        <Text style={styles.explanationText}>{explanation}</Text>
      </View>

      {visibleRisks.length > 0 ? (
        <View style={styles.risksContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning" size={16} color="#FCA5A5" />
            <Text style={styles.sectionTitle}>
              {t('advisor.resultWidget.sections.risks')}
            </Text>
          </View>
          {visibleRisks.map((risk, index) => (
            <View key={`${risk}-${index}`} style={styles.riskRow}>
              <View style={styles.riskDot} />
              <Text style={styles.riskText}>{risk}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {alternativeDate ? (
        <View style={styles.altDateContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-clear" size={16} color="#93C5FD" />
            <Text style={styles.sectionTitle}>
              {t('advisor.resultWidget.sections.alternativeDate')}
            </Text>
          </View>
          <Text style={styles.altDateTitle}>
            {formattedAlternativeDate || alternativeDate.date}
            {alternativeDate.bestWindow
              ? ` • ${alternativeDate.bestWindow}`
              : ''}
          </Text>
          <Text style={styles.altDateMeta}>
            {t('advisor.resultWidget.alternativeScore', {
              score: alternativeDate.score,
            })}
          </Text>
          <Text style={styles.altDateReason}>{alternativeDate.reason}</Text>
        </View>
      ) : null}

      {clarifyingQuestion ? (
        <View style={styles.questionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle" size={16} color="#A5B4FC" />
            <Text style={styles.sectionTitle}>
              {t('advisor.resultWidget.sections.clarifyingQuestion')}
            </Text>
          </View>
          <Text style={styles.questionText}>{clarifyingQuestion}</Text>
        </View>
      ) : null}

      {/* Energy Bar */}
      <View style={styles.energyBarContainer}>
        <Text style={styles.energyLabel}>
          {t('advisor.resultWidget.energyLabel')}
        </Text>
        <View style={styles.energyBarBackground}>
          <LinearGradient
            colors={[
              verdictConfig.gradient[0],
              verdictConfig.gradient[1] ?? verdictConfig.gradient[0],
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.energyBarFill, { width: `${score}%` }]}
          />
        </View>
        <View style={styles.energyMarkers}>
          <Text style={styles.energyMarker}>0</Text>
          <Text style={styles.energyMarker}>25</Text>
          <Text style={styles.energyMarker}>50</Text>
          <Text style={styles.energyMarker}>75</Text>
          <Text style={styles.energyMarker}>100</Text>
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
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 20,
  },
  scoreRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scoreInner: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0A0A0F',
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  headerInfo: {
    flex: 1,
    gap: 12,
    minWidth: 0,
    paddingTop: 4,
  },
  topicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  topicText: {
    color: 'rgba(139, 92, 246, 1)',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
  },
  verdictLabel: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    flexShrink: 1,
  },
  explanationContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  directAnswerContainer: {
    backgroundColor: 'rgba(250, 204, 21, 0.09)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.22)',
  },
  directAnswerText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  explanationEmoji: {
    fontSize: 24,
  },
  explanationText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    lineHeight: 22,
  },
  risksContainer: {
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.18)',
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FCA5A5',
    marginTop: 8,
  },
  riskText: {
    flex: 1,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 20,
  },
  altDateContainer: {
    backgroundColor: 'rgba(96, 165, 250, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.18)',
  },
  altDateTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  altDateMeta: {
    color: 'rgba(191, 219, 254, 0.84)',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
  },
  altDateReason: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 20,
  },
  questionContainer: {
    backgroundColor: 'rgba(129, 140, 248, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.18)',
  },
  questionText: {
    color: '#E9D5FF',
    fontSize: 14,
    lineHeight: 21,
  },
  energyBarContainer: {
    gap: 8,
  },
  energyLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  energyBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  energyBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  energyMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  energyMarker: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
});

export default AdvisorResultWidget;
