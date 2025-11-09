import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
  G,
  Text as SvgText,
} from 'react-native-svg';

interface EnergyWidgetProps {
  energy: number; // 0-100
  message: string; // Пожелание/описание
}

const EnergyWidget: React.FC<EnergyWidgetProps> = ({ energy, message }) => {
  // Определение уровня энергии
  const getEnergyLevel = (value: number): string => {
    if (value >= 80) return 'Высокая';
    if (value >= 60) return 'Хорошая';
    if (value >= 40) return 'Средняя';
    if (value >= 20) return 'Низкая';
    return 'Очень низкая';
  };

  const energyLevel = getEnergyLevel(energy);

  // Вычисление угла дуги для круговой диаграммы (в радианах)
  // Начинаем с нижней точки (270°) и идем по часовой
  const startAngle = (270 * Math.PI) / 180; // 4.712 радиан
  const progressAngle = (energy / 100) * 2 * Math.PI;
  const endAngle = startAngle + progressAngle;

  // Параметры круга
  const size = 72;
  const center = size / 2;
  const radius = 28.8; // (57.6 / 2)
  const strokeWidth = 9.216;

  // Параметры для фонового свечения
  const glowSize = 72;
  const glowRadius = 36;

  return (
    <LinearGradient
      colors={['rgba(35, 0, 45, 0.4)', 'rgba(89, 1, 114, 0.4)']}
      start={{ x: 0.5, y: 1 }}
      end={{ x: 0.5, y: 0 }}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        {/* Заголовок */}
        <Text style={styles.title}>⚡️ Энергия дня</Text>

        {/* Основной контент */}
        <View style={styles.content}>
          {/* Левая часть: Круговая диаграмма с свечением */}
          <View style={styles.circleContainer}>
            {/* Фоновое свечение */}
            <View style={styles.glowContainer}>
              <Svg width={glowSize} height={glowSize} style={styles.glowSvg}>
                <Defs>
                  <RadialGradient id="glowGradient" cx="50%" cy="50%">
                    <Stop offset="11.06%" stopColor="rgba(230, 139, 255, 0)" />
                    <Stop
                      offset="100%"
                      stopColor="rgba(230, 139, 255, 1)"
                      stopOpacity={0.3}
                    />
                  </RadialGradient>
                </Defs>
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

              <G rotation="-90" origin={`${center}, ${center}`}>
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
              <SvgText
                x={center}
                y={center + 4}
                fontSize="13"
                fontWeight="700"
                fontFamily="Montserrat-Bold"
                fill="white"
                textAnchor="middle"
              >
                {energy}%
              </SvgText>
            </Svg>
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
    fontFamily: 'Montserrat-Bold',
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
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  energyLevel: {
    fontSize: 16,
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
