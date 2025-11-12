import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Circle,
  Line,
  Path,
  Text as SvgText,
  G,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import type { ChartData, PlanetPosition } from './astrology.types';

interface NatalChartWheelProps {
  chartData: ChartData;
  size?: number;
  showAspects?: boolean;
  showHouseNumbers?: boolean;
}

const SIGNS = [
  '♈',
  '♉',
  '♊',
  '♋',
  '♌',
  '♍',
  '♎',
  '♏',
  '♐',
  '♑',
  '♒',
  '♓',
];
const SIGN_COLORS = [
  '#FF4757',
  '#4ECDC4',
  '#FFD93D',
  '#6BCB77',
  '#FFB142',
  '#845EC2',
  '#FF6B9D',
  '#C34A36',
  '#F368E0',
  '#5F27CD',
  '#00D2FF',
  '#A29BFE',
];

const PLANET_COLORS: Record<string, string> = {
  Sun: '#FFD700',
  Moon: '#C0C0C0',
  Mercury: '#FFA500',
  Venus: '#FF69B4',
  Mars: '#FF0000',
  Jupiter: '#9370DB',
  Saturn: '#8B4513',
  Uranus: '#00CED1',
  Neptune: '#4169E1',
  Pluto: '#8B0000',
};

const NatalChartWheel: React.FC<NatalChartWheelProps> = ({
  chartData,
  size = Dimensions.get('window').width - 32,
  showAspects = true,
  showHouseNumbers = true,
}) => {
  const center = size / 2;
  const outerRadius = size / 2 - 10;
  const signRadius = outerRadius - 30;
  const planetRadius = signRadius - 60;
  const houseRadius = planetRadius - 40;
  const innerRadius = houseRadius - 60;

  const degreeToRadian = (degree: number) => ((degree - 90) * Math.PI) / 180;

  const polarToCartesian = (angle: number, radius: number) => {
    const rad = degreeToRadian(angle);
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  const getAspectColor = (aspectType: string): string => {
    const colors: Record<string, string> = {
      Conjunction: '#FF0000',
      Opposition: '#0000FF',
      Trine: '#00FF00',
      Square: '#FF00FF',
      Sextile: '#00FFFF',
      Quincunx: '#808080',
    };
    return colors[aspectType] || '#999999';
  };

  const getAspectWidth = (aspectType: string): number => {
    const widths: Record<string, number> = {
      Conjunction: 3,
      Opposition: 2.5,
      Trine: 2,
      Square: 2,
      Sextile: 1.5,
    };
    return widths[aspectType] || 1;
  };

  const renderOuterCircle = () => (
    <Circle
      cx={center}
      cy={center}
      r={outerRadius}
      stroke="#333"
      strokeWidth="2"
      fill="none"
    />
  );

  const renderZodiacSigns = () => {
    const signs = [];
    for (let i = 0; i < 12; i++) {
      const startAngle = i * 30;
      const endAngle = (i + 1) * 30;
      const middleAngle = startAngle + 15;

      // Sign arc
      const start = polarToCartesian(startAngle, outerRadius);
      const end = polarToCartesian(endAngle, outerRadius);
      const startInner = polarToCartesian(startAngle, signRadius);
      const endInner = polarToCartesian(endAngle, signRadius);

      const pathData = [
        `M ${start.x} ${start.y}`,
        `A ${outerRadius} ${outerRadius} 0 0 1 ${end.x} ${end.y}`,
        `L ${endInner.x} ${endInner.y}`,
        `A ${signRadius} ${signRadius} 0 0 0 ${startInner.x} ${startInner.y}`,
        'Z',
      ].join(' ');

      signs.push(
        <Path
          key={`sign-${i}`}
          d={pathData}
          fill={SIGN_COLORS[i]}
          opacity="0.15"
          stroke="#666"
          strokeWidth="1"
        />
      );

      // Sign symbol
      const symbolPos = polarToCartesian(
        middleAngle,
        (outerRadius + signRadius) / 2
      );
      signs.push(
        <SvgText
          key={`sign-symbol-${i}`}
          x={symbolPos.x}
          y={symbolPos.y}
          fontSize="20"
          fill="#333"
          fontWeight="bold"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {SIGNS[i]}
        </SvgText>
      );

      // Dividing lines
      signs.push(
        <Line
          key={`sign-line-${i}`}
          x1={start.x}
          y1={start.y}
          x2={startInner.x}
          y2={startInner.y}
          stroke="#666"
          strokeWidth="1"
        />
      );
    }
    return signs;
  };

  const renderHouses = () => {
    if (!chartData.houses || chartData.houses.length === 0) return null;

    const houses = [];
    for (let i = 0; i < chartData.houses.length; i++) {
      const cusp = chartData.houses[i].cusp;
      const nextCusp = chartData.houses[(i + 1) % 12].cusp;

      const start = polarToCartesian(cusp, signRadius);
      const end = polarToCartesian(cusp, houseRadius);

      // House cusp line
      houses.push(
        <Line
          key={`house-line-${i}`}
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke={i % 3 === 0 ? '#000' : '#999'}
          strokeWidth={i % 3 === 0 ? '2' : '1'}
          strokeDasharray={i % 3 === 0 ? '0' : '4,4'}
        />
      );

      // House number
      if (showHouseNumbers) {
        const middleAngle =
          cusp +
          (nextCusp > cusp ? nextCusp - cusp : nextCusp + 360 - cusp) / 2;
        const numPos = polarToCartesian(
          middleAngle,
          (signRadius + houseRadius) / 2
        );
        houses.push(
          <SvgText
            key={`house-num-${i}`}
            x={numPos.x}
            y={numPos.y}
            fontSize="14"
            fill="#666"
            fontWeight="600"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {i + 1}
          </SvgText>
        );
      }
    }

    // House circle
    houses.push(
      <Circle
        key="house-circle"
        cx={center}
        cy={center}
        r={houseRadius}
        stroke="#666"
        strokeWidth="1.5"
        fill="none"
      />
    );

    return houses;
  };

  const renderAngles = () => {
    const angles = [];

    // Ascendant (AC)
    const ac = polarToCartesian(chartData.ascendant, signRadius);
    const acInner = polarToCartesian(chartData.ascendant, innerRadius);
    angles.push(
      <Line
        key="ac"
        x1={ac.x}
        y1={ac.y}
        x2={acInner.x}
        y2={acInner.y}
        stroke="#FF0000"
        strokeWidth="3"
      />
    );
    const acLabel = polarToCartesian(chartData.ascendant, innerRadius - 20);
    angles.push(
      <SvgText
        key="ac-label"
        x={acLabel.x}
        y={acLabel.y}
        fontSize="12"
        fill="#FF0000"
        fontWeight="bold"
        textAnchor="middle"
      >
        AC
      </SvgText>
    );

    // Descendant (DC)
    const dc = (chartData.ascendant + 180) % 360;
    const dcPoint = polarToCartesian(dc, signRadius);
    const dcInner = polarToCartesian(dc, innerRadius);
    angles.push(
      <Line
        key="dc"
        x1={dcPoint.x}
        y1={dcPoint.y}
        x2={dcInner.x}
        y2={dcInner.y}
        stroke="#FF0000"
        strokeWidth="3"
      />
    );

    // Midheaven (MC)
    const mc = polarToCartesian(chartData.mc, signRadius);
    const mcInner = polarToCartesian(chartData.mc, innerRadius);
    angles.push(
      <Line
        key="mc"
        x1={mc.x}
        y1={mc.y}
        x2={mcInner.x}
        y2={mcInner.y}
        stroke="#0000FF"
        strokeWidth="3"
      />
    );
    const mcLabel = polarToCartesian(chartData.mc, innerRadius - 20);
    angles.push(
      <SvgText
        key="mc-label"
        x={mcLabel.x}
        y={mcLabel.y}
        fontSize="12"
        fill="#0000FF"
        fontWeight="bold"
        textAnchor="middle"
      >
        MC
      </SvgText>
    );

    // IC
    const ic = (chartData.mc + 180) % 360;
    const icPoint = polarToCartesian(ic, signRadius);
    const icInner = polarToCartesian(ic, innerRadius);
    angles.push(
      <Line
        key="ic"
        x1={icPoint.x}
        y1={icPoint.y}
        x2={icInner.x}
        y2={icInner.y}
        stroke="#0000FF"
        strokeWidth="3"
      />
    );

    // Inner circle
    angles.push(
      <Circle
        key="inner-circle"
        cx={center}
        cy={center}
        r={innerRadius}
        stroke="#333"
        strokeWidth="1.5"
        fill="white"
      />
    );

    return angles;
  };

  const renderPlanets = () => {
    const planets = [];
    const planetPositions: { [key: number]: number } = {};

    // Sort planets by longitude for better placement
    const sortedPlanets = [...chartData.planets].sort(
      (a, b) => a.longitude - b.longitude
    );

    sortedPlanets.forEach((planet, index) => {
      let angle = planet.longitude;

      // Adjust angle if planets are too close
      const closeThreshold = 8; // degrees
      for (const prevAngle of Object.values(planetPositions)) {
        const diff = Math.abs(angle - prevAngle);
        if (diff < closeThreshold || diff > 360 - closeThreshold) {
          angle += closeThreshold;
        }
      }
      planetPositions[index] = angle;

      const pos = polarToCartesian(angle, planetRadius);
      const lineEnd = polarToCartesian(planet.longitude, planetRadius + 30);

      // Connection line to actual position
      if (Math.abs(angle - planet.longitude) > 2) {
        planets.push(
          <Line
            key={`planet-line-${planet.name}`}
            x1={pos.x}
            y1={pos.y}
            x2={lineEnd.x}
            y2={lineEnd.y}
            stroke={PLANET_COLORS[planet.name] || '#666'}
            strokeWidth="1"
            opacity="0.5"
          />
        );
      }

      // Planet circle
      planets.push(
        <Circle
          key={`planet-circle-${planet.name}`}
          cx={pos.x}
          cy={pos.y}
          r="12"
          fill={PLANET_COLORS[planet.name] || '#666'}
          stroke="#fff"
          strokeWidth="2"
        />
      );

      // Planet symbol
      planets.push(
        <SvgText
          key={`planet-${planet.name}`}
          x={pos.x}
          y={pos.y}
          fontSize="14"
          fill="white"
          fontWeight="bold"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {planet.symbol}
        </SvgText>
      );

      // Retrograde indicator
      if (planet.isRetrograde) {
        planets.push(
          <SvgText
            key={`retro-${planet.name}`}
            x={pos.x + 10}
            y={pos.y - 10}
            fontSize="10"
            fill="#FF0000"
            fontWeight="bold"
          >
            ℞
          </SvgText>
        );
      }
    });

    return planets;
  };

  const renderAspects = () => {
    if (!showAspects || !chartData.aspects) return null;

    return chartData.aspects.map((aspect, index) => {
      const planet1 = chartData.planets.find((p) => p.name === aspect.planet1);
      const planet2 = chartData.planets.find((p) => p.name === aspect.planet2);

      if (!planet1 || !planet2) return null;

      const pos1 = polarToCartesian(planet1.longitude, innerRadius - 10);
      const pos2 = polarToCartesian(planet2.longitude, innerRadius - 10);

      return (
        <Line
          key={`aspect-${index}`}
          x1={pos1.x}
          y1={pos1.y}
          x2={pos2.x}
          y2={pos2.y}
          stroke={getAspectColor(aspect.type)}
          strokeWidth={getAspectWidth(aspect.type)}
          opacity="0.4"
        />
      );
    });
  };

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="chartBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#f8f9fa" />
            <Stop offset="100%" stopColor="#e9ecef" />
          </LinearGradient>
        </Defs>

        {/* Background */}
        <Circle cx={center} cy={center} r={outerRadius} fill="url(#chartBg)" />

        {/* Aspects (drawn first, behind everything) */}
        {renderAspects()}

        {/* Zodiac signs */}
        {renderZodiacSigns()}

        {/* Houses */}
        {renderHouses()}

        {/* Angles (AC, DC, MC, IC) */}
        {renderAngles()}

        {/* Planets */}
        {renderPlanets()}

        {/* Outer circle */}
        {renderOuterCircle()}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NatalChartWheel;
