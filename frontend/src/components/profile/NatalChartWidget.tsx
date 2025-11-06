import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface NatalChartWidgetProps {
  chart: any;
}

const NatalChartWidget: React.FC<NatalChartWidgetProps> = ({ chart }) => {
  const centerX = width * 0.45;
  const centerY = 150;
  const outerRadius = 120;
  const planetsRadius = 100;

  // Знаки зодиака
  const zodiacSigns = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ];

  // Русские названия знаков
  const zodiacSignsRus = {
    Aries: 'Овен',
    Taurus: 'Телец',
    Gemini: 'Близнецы',
    Cancer: 'Рак',
    Leo: 'Лев',
    Virgo: 'Дева',
    Libra: 'Весы',
    Scorpio: 'Скорпион',
    Sagittarius: 'Стрелец',
    Capricorn: 'Козерог',
    Aquarius: 'Водолей',
    Pisces: 'Рыбы',
  };

  // Цвета планет
  const planetColors = {
    sun: '#FFD700',
    moon: '#C0C0C0',
    mercury: '#8C7853',
    venus: '#FFC649',
    mars: '#C1440E',
    jupiter: '#D8CA9D',
    saturn: '#FAD5A5',
    uranus: '#4FD0E7',
    neptune: '#4B70DD',
    pluto: '#8B5CF6',
  };

  // Сокращения планет
  const planetAbbr = {
    sun: '☉',
    moon: '☽',
    mercury: '☿',
    venus: '♀',
    mars: '♂',
    jupiter: '♃',
    saturn: '♄',
    uranus: '♅',
    neptune: '♆',
    pluto: '♇',
  };

  if (!chart?.data?.planets) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>Данные карты загружаются...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Svg width={width * 0.9} height={300}>
        {/* Внешний круг зодиака */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={outerRadius}
          stroke="rgba(139, 92, 246, 0.6)"
          strokeWidth="2"
          fill="none"
        />

        {/* Внутренний круг для планет */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={planetsRadius}
          stroke="rgba(139, 92, 246, 0.4)"
          strokeWidth="1"
          fill="none"
        />

        {/* Линии домов (разделение на 12 секций) */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = i * 30 * (Math.PI / 180);
          const x1 =
            centerX + Math.cos(angle - Math.PI / 2) * (outerRadius - 15);
          const y1 =
            centerY + Math.sin(angle - Math.PI / 2) * (outerRadius - 15);
          const x2 = centerX + Math.cos(angle - Math.PI / 2) * outerRadius;
          const y2 = centerY + Math.sin(angle - Math.PI / 2) * outerRadius;

          return (
            <Line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(139, 92, 246, 0.3)"
              strokeWidth="1"
            />
          );
        })}

        {/* Знаки зодиака */}
        {zodiacSigns.map((sign, i) => {
          const angle = (i * 30 + 15) * (Math.PI / 180); // По центру сектора
          const x =
            centerX + Math.cos(angle - Math.PI / 2) * (outerRadius + 20);
          const y =
            centerY + Math.sin(angle - Math.PI / 2) * (outerRadius + 20);

          return (
            <SvgText
              key={sign}
              x={x}
              y={y}
              textAnchor="middle"
              fontSize="10"
              fill="rgba(139, 92, 246, 0.8)"
              fontWeight="bold"
            >
              {zodiacSignsRus[sign]}
            </SvgText>
          );
        })}

        {/* Планеты на их натальных позициях */}
        {Object.entries(chart.data.planets).map(
          ([planetKey, planet]: [string, any]) => {
            if (!planet.longitude) return null;

            const angle = planet.longitude * (Math.PI / 180);
            const x = centerX + Math.cos(angle - Math.PI / 2) * planetsRadius;
            const y = centerY + Math.sin(angle - Math.PI / 2) * planetsRadius;
            const color = planetColors[planetKey] || '#8B5CF6';

            return (
              <G key={planetKey}>
                <Circle
                  cx={x}
                  cy={y}
                  r="8"
                  fill={color}
                  stroke="#fff"
                  strokeWidth="1"
                />
                <SvgText
                  x={x}
                  y={y + 3}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#fff"
                  fontWeight="bold"
                >
                  {planetAbbr[planetKey] || planetKey.charAt(0).toUpperCase()}
                </SvgText>
              </G>
            );
          }
        )}

        {/* Центральный круг */}
        <Circle
          cx={centerX}
          cy={centerY}
          r="20"
          stroke="rgba(139, 92, 246, 0.5)"
          strokeWidth="1"
          fill="rgba(139, 92, 246, 0.1)"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default NatalChartWidget;
