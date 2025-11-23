// src/components/advisor/AdvisorResultWidget.tsx
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface AdvisorResultWidgetProps {
  verdict: 'good' | 'neutral' | 'challenging';
  score: number;
  color: string;
  explanation: string;
  topic: string;
  topicIcon: keyof typeof Ionicons.glyphMap;
}

const AdvisorResultWidget: React.FC<AdvisorResultWidgetProps> = ({
  verdict,
  score,
  color,
  explanation,
  topic,
  topicIcon,
}) => {
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
          label: 'Отлично',
          gradient: ['#10B981', '#059669'],
          emoji: '✨',
        };
      case 'neutral':
        return {
          icon: 'remove-circle',
          label: 'Умеренно',
          gradient: ['#F59E0B', '#D97706'],
          emoji: '⚖️',
        };
      case 'challenging':
        return {
          icon: 'close-circle',
          label: 'Сложно',
          gradient: ['#EF4444', '#DC2626'],
          emoji: '⚠️',
        };
      default:
        // На случай расширения типов в будущем — безопасное значение
        return {
          icon: 'remove-circle',
          label: 'Умеренно',
          gradient: ['#F59E0B', '#D97706'],
          emoji: '⚖️',
        };
    }
  };

  const verdictConfig = getVerdictConfig();

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
            <Text style={styles.scoreLabel}>из 100</Text>
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

      {/* Explanation */}
      <View style={styles.explanationContainer}>
        <Text style={styles.explanationEmoji}>{verdictConfig.emoji}</Text>
        <Text style={styles.explanationText}>{explanation}</Text>
      </View>

      {/* Energy Bar */}
      <View style={styles.energyBarContainer}>
        <Text style={styles.energyLabel}>Уровень благоприятности</Text>
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
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
  },
  scoreRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreInner: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0A0A0F',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 32,
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
  },
  topicText: {
    color: 'rgba(139, 92, 246, 1)',
    fontSize: 13,
    fontWeight: '600',
  },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verdictLabel: {
    fontSize: 24,
    fontWeight: '700',
  },
  explanationContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  explanationEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  explanationText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    lineHeight: 22,
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
