import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, {
  Circle,
  Line,
  Text as SvgText,
  G,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg';

interface ChartVisualizationProps {
  natalPlanets: any;
  transitPlanets: any[];
  activeTransits: any[];
  size?: number;
  showTransits?: boolean;
  showAspects?: boolean;
  onPlanetPress?: (planet: any) => void;
}

export const ChartVisualization: React.FC<ChartVisualizationProps> = ({
  natalPlanets,
  transitPlanets,
  activeTransits,
  size = 320,
  showTransits = true,
  showAspects = true,
  onPlanetPress,
}) => {
  const center = size / 2;
  const natalRadius = size * 0.35;
  const transitRadius = size * 0.42;
  const zodiacRadius = size * 0.45;

  // Знаки зодиака
  const zodiacSigns = [
    { name: 'Aries', symbol: '♈', color: '#EF4444' },
    { name: 'Taurus', symbol: '♉', color: '#10B981' },
    { name: 'Gemini', symbol: '♊', color: '#F59E0B' },
    { name: 'Cancer', symbol: '♋', color: '#6366F1' },
    { name: 'Leo', symbol: '♌', color: '#FBBF24' },
    { name: 'Virgo', symbol: '♍', color: '#8B5CF6' },
    { name: 'Libra', symbol: '♎', color: '#EC4899' },
    { name: 'Scorpio', symbol: '♏', color: '#DC2626' },
    { name: 'Sagittarius', symbol: '♐', color: '#7C3AED' },
    { name: 'Capricorn', symbol: '♑', color: '#059669' },
    { name: 'Aquarius', symbol: '♒', color: '#06B6D4' },
    { name: 'Pisces', symbol: '♓', color: '#3B82F6' },
  ];

  // Символы планет
  const planetSymbols: Record<string, string> = {
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
    Sun: '☉',
    Moon: '☽',
    Mercury: '☿',
    Venus: '♀',
    Mars: '♂',
    Jupiter: '♃',
    Saturn: '♄',
    Uranus: '♅',
    Neptune: '♆',
    Pluto: '♇',
  };

  // Конвертация долготы в координаты
  const polarToCartesian = (longitude: number, radius: number) => {
    // Астрологические координаты начинаются с 0° Овна на 9 часов (270° обычных координат)
    const adjustedAngle = (270 - longitude) * (Math.PI / 180);
    return {
      x: center + radius * Math.cos(adjustedAngle),
      y: center + radius * Math.sin(adjustedAngle),
    };
  };

  // Отрисовка линий аспектов
  const renderAspects = () => {
    if (!showAspects || !activeTransits.length) return null;

    return activeTransits.slice(0, 10).map((transit, index) => {
      // Найти позиции планет
      const natalPlanet = Object.values(natalPlanets).find(
        (p: any) => planetSymbols[p.name] || false
      );
      const transitPlanet = transitPlanets.find(
        (p) => p.name === transit.planet
      );

      if (!natalPlanet || !transitPlanet) return null;

      const start = polarToCartesian(
        (natalPlanet as any).longitude,
        natalRadius
      );
      const end = polarToCartesian(transitPlanet.longitude, transitRadius);

      const color =
        transit.type === 'harmonious'
          ? '#10B981'
          : transit.type === 'challenging'
            ? '#EF4444'
            : '#6B7280';

      return (
        <Line
          key={index}
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke={color}
          strokeWidth="1"
          strokeOpacity="0.3"
          strokeDasharray="4,4"
        />
      );
    });
  };

  // Отрисовка натальных планет
  const renderNatalPlanets = () => {
    return Object.entries(natalPlanets).map(([key, planet]: [string, any]) => {
      const pos = polarToCartesian(planet.longitude, natalRadius);
      const symbol = planetSymbols[key] || '?';

      return (
        <G key={key}>
          <Circle cx={pos.x} cy={pos.y} r="12" fill="rgba(139,92,246,0.3)" />
          <SvgText
            x={pos.x}
            y={pos.y + 5}
            fontSize="16"
            fill="#8B5CF6"
            textAnchor="middle"
            fontWeight="bold"
          >
            {symbol}
          </SvgText>
        </G>
      );
    });
  };

  // Отрисовка транзитных планет
  const renderTransitPlanets = () => {
    if (!showTransits) return null;

    return transitPlanets.map((planet, index) => {
      const pos = polarToCartesian(planet.longitude, transitRadius);
      const symbol = planetSymbols[planet.name] || '?';

      return (
        <G key={index}>
          <Circle cx={pos.x} cy={pos.y} r="10" fill="rgba(99,102,241,0.3)" />
          <SvgText
            x={pos.x}
            y={pos.y + 4}
            fontSize="14"
            fill="#6366F1"
            textAnchor="middle"
            fontWeight="bold"
          >
            {symbol}
          </SvgText>
          {planet.isRetrograde && (
            <SvgText
              x={pos.x + 12}
              y={pos.y - 8}
              fontSize="10"
              fill="#EF4444"
              fontWeight="bold"
            >
              ℞
            </SvgText>
          )}
        </G>
      );
    });
  };

  // Отрисовка знаков зодиака
  const renderZodiacWheel = () => {
    return zodiacSigns.map((sign, index) => {
      const angle = index * 30; // 30° на знак
      const pos = polarToCartesian(angle + 15, zodiacRadius); // +15 для центрирования

      return (
        <G key={sign.name}>
          {/* Разделительная линия */}
          <Line
            x1={center}
            y1={center}
            x2={polarToCartesian(angle, zodiacRadius + 10).x}
            y2={polarToCartesian(angle, zodiacRadius + 10).y}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />

          {/* Символ знака */}
          <SvgText
            x={pos.x}
            y={pos.y + 4}
            fontSize="18"
            fill={sign.color}
            textAnchor="middle"
            fontWeight="bold"
            opacity="0.8"
          >
            {sign.symbol}
          </SvgText>
        </G>
      );
    });
  };

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="bgGradient" cx="50%" cy="50%">
            <Stop offset="0%" stopColor="rgba(139,92,246,0.1)" />
            <Stop offset="100%" stopColor="rgba(15,23,42,0.5)" />
          </RadialGradient>
        </Defs>

        {/* Фон */}
        <Circle cx={center} cy={center} r={size / 2} fill="url(#bgGradient)" />

        {/* Окружности */}
        <Circle
          cx={center}
          cy={center}
          r={natalRadius}
          fill="none"
          stroke="rgba(139,92,246,0.3)"
          strokeWidth="2"
        />
        {showTransits && (
          <Circle
            cx={center}
            cy={center}
            r={transitRadius}
            fill="none"
            stroke="rgba(99,102,241,0.3)"
            strokeWidth="2"
          />
        )}
        <Circle
          cx={center}
          cy={center}
          r={zodiacRadius}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />

        {/* Знаки зодиака */}
        {renderZodiacWheel()}

        {/* Аспекты (линии) */}
        {renderAspects()}

        {/* Натальные планеты */}
        {renderNatalPlanets()}

        {/* Транзитные планеты */}
        {renderTransitPlanets()}

        {/* Центральная точка */}
        <Circle cx={center} cy={center} r="4" fill="#8B5CF6" />
      </Svg>

      {/* Легенда */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
          <Text style={styles.legendText}>Натальные</Text>
        </View>
        {showTransits && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#6366F1' }]} />
            <Text style={styles.legendText}>Транзитные</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  legend: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
});
