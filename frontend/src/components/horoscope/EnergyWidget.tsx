import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';

interface EnergyWidgetProps {
  energy: number;
  message: string;
  isLoading?: boolean;
}

const EnergyWidget: React.FC<EnergyWidgetProps> = ({
  energy,
  message,
  isLoading,
}) => {
  const { t } = useTranslation();

  const getEnergyLevelKey = (value: number) => {
    if (value >= 80) return 'high';
    if (value >= 60) return 'good';
    if (value >= 40) return 'medium';
    if (value >= 20) return 'low';
    return 'veryLow';
  };

  const clampedEnergy = Math.max(0, Math.min(100, energy));
  const energyLevel = t(
    `horoscope.energyWidget.levels.${getEnergyLevelKey(clampedEnergy)}`
  );

  const size = 88;
  const center = size / 2;
  const trackStrokeWidth = 10;
  const progressStrokeWidth = 10;
  const radius = 37;
  const circumference = 2 * Math.PI * radius;
  const progressArc = circumference * (clampedEnergy / 100);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingCircle} />
        <Text style={styles.caption}>{t('horoscope.energyWidget.title')}</Text>
        <Text style={styles.message}>
          {t('horoscope.energyWidget.loading')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.circleContainer}>
        <Svg width={150} height={150} style={styles.glowSvg}>
          <Defs>
            <RadialGradient id="energyGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#8D26A9" stopOpacity="0.55" />
              <Stop offset="0.36" stopColor="#8D26A9" stopOpacity="0.22" />
              <Stop offset="1" stopColor="#8D26A9" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="75" cy="75" r="75" fill="url(#energyGlow)" />
        </Svg>
        <Svg width={size} height={size} style={styles.circleSvg}>
          <Defs>
            <LinearGradient id="energyProgress" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#B533D8" stopOpacity="1" />
              <Stop offset="1" stopColor="#8D26A9" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(243, 200, 255, 0.7)"
            strokeWidth={trackStrokeWidth}
          />
          <G rotation="-90" originX={center} originY={center}>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="url(#energyProgress)"
              strokeWidth={progressStrokeWidth}
              strokeDasharray={`${progressArc} ${circumference}`}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        <View pointerEvents="none" style={styles.energyValueOverlay}>
          <Text style={styles.energyValueText}>
            {Math.round(clampedEnergy)}%
          </Text>
        </View>
      </View>

      <Text style={styles.caption}>{t('horoscope.energyWidget.title')}</Text>

      <View style={styles.textContainer}>
        <Text style={styles.energyLevel}>{energyLevel}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  loadingCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  circleContainer: {
    width: 100,
    height: 100,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowSvg: {
    position: 'absolute',
    top: -25,
    left: -25,
    opacity: 0.9,
  },
  circleSvg: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  energyValueOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyValueText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
  },
  caption: {
    marginTop: -10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  energyLevel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
  },
  message: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default EnergyWidget;
