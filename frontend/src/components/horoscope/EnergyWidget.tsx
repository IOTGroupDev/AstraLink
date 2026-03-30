import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Defs, RadialGradient, Stop, G } from 'react-native-svg';

const ENERGY_CARD_GRADIENT_COLORS = [
  'rgba(138, 48, 186, 0.42)',
  'rgba(69, 13, 92, 0.92)',
  'rgba(35, 0, 45, 1)',
] as const;

interface EnergyWidgetProps {
  energy: number; // 0-100
  message: string; // Пожелание/описание
  isLoading?: boolean; // Показать лоадер
}

const EnergyWidget: React.FC<EnergyWidgetProps> = ({
  energy,
  message,
  isLoading,
}) => {
  const { t } = useTranslation();

  // Определение уровня энергии
  const getEnergyLevelKey = (value: number) => {
    if (value >= 80) return 'high';
    if (value >= 60) return 'good';
    if (value >= 40) return 'medium';
    if (value >= 20) return 'low';
    return 'veryLow';
  };

  const energyLevel = t(
    `horoscope.energyWidget.levels.${getEnergyLevelKey(energy)}`
  );

  // Параметры круга
  const size = 72;
  const center = size / 2;
  const radius = 28.8; // (57.6 / 2)
  const strokeWidth = 9.216;

  // Параметры для фонового свечения
  const glowSize = 72;
  const glowRadius = 36;

  if (isLoading) {
    return (
      <LinearGradient
        colors={ENERGY_CARD_GRADIENT_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.38, 1]}
        style={styles.container}
      >
        <View style={styles.innerContainer}>
          <Text style={styles.title}>
            ⚡️ {t('horoscope.energyWidget.title')}
          </Text>
          <View style={{ paddingVertical: 8 }}>
            <Text style={{ color: '#A78BFA' }}>
              {t('horoscope.energyWidget.loading')}
            </Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={ENERGY_CARD_GRADIENT_COLORS}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.38, 1]}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <Text style={styles.title}>
          ⚡️ {t('horoscope.energyWidget.title')}
        </Text>

        {/* Основной контент */}
        <View style={styles.content}>
          {/* Левая часть: Круговая диаграмма с свечением */}
          <View style={styles.circleContainer}>
            {/* Фоновое свечение */}
            <View style={styles.glowContainer}>
              <Svg width={glowSize} height={glowSize} style={styles.glowSvg}>
                {/*<Defs>*/}
                {/*  <RadialGradient id="glowGradient" cx="50%" cy="50%">*/}
                {/*    <Stop offset="11.06%" stopColor="rgba(230, 139, 255, 1)" />*/}
                {/*    <Stop*/}
                {/*      offset="100%"*/}
                {/*      stopColor="rgba(230, 139, 255, .1)"*/}
                {/*      stopOpacity={0.3}*/}
                {/*    />*/}
                {/*  </RadialGradient>*/}
                {/*</Defs>*/}
                <Circle
                  cx={glowRadius}
                  cy={glowRadius}
                  r={glowRadius}
                  fill="url(#glowGradient)"
                />
              </Svg>
            </View>

            {/* Круговая диаграмма */}
            <Svg width={size} height={size} style={styles.circleSvg}>
              <Defs>
                {/* Градиент для фронтальной части */}
                <RadialGradient id="frontGradient" cx="50%" cy="50%">
                  <Stop offset="0%" stopColor="#8D26A9" stopOpacity={1} />
                  <Stop offset="100%" stopColor="#8D26A9" stopOpacity={1} />
                </RadialGradient>
              </Defs>

              <G rotation="-90" originX={center} originY={center}>
                {/* Background Circle (полупрозрачный) */}
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke="rgba(243, 200, 255, 0.7)"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${2 * Math.PI * radius * 0.75} ${2 * Math.PI * radius}`}
                  strokeLinecap="butt"
                />

                {/* Front Circle (прогресс) */}
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke="#8D26A9"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${2 * Math.PI * radius * (energy / 100) * 0.78} ${2 * Math.PI * radius}`}
                  strokeLinecap="round"
                />
              </G>

              {/* Процент в центре */}
            </Svg>
            <View pointerEvents="none" style={styles.energyValueOverlay}>
              <View style={styles.energyValueRow}>
                <Text style={styles.energyValueText}>{energy}</Text>
                <Text style={styles.energyValuePercent}>%</Text>
              </View>
            </View>
          </View>

          {/* Правая часть: Текстовое содержимое */}
          <View style={styles.textContainer}>
            <Text style={styles.energyLevel}>{energyLevel}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(241, 196, 255, 0.1)',
    overflow: 'hidden',
  },
  innerContainer: {
    padding: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  circleContainer: {
    width: 72,
    height: 72,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowContainer: {
    position: 'absolute',
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowSvg: {
    position: 'absolute',
  },
  circleSvg: {
    position: 'absolute',
  },
  energyValueOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  energyValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 16,
  },
  energyValuePercent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 16,
    marginLeft: -1,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  energyLevel: {
    fontSize: 16,
    alignItems: 'center',
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  message: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 16,
  },
});

export default EnergyWidget;
