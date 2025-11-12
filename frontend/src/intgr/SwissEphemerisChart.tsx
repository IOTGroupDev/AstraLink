import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

// Types for planetary data
interface PlanetPosition {
  name: string;
  longitude: number;
  latitude: number;
  distance: number;
  speed: number;
  sign: string;
  degree: number;
  minute: number;
}

interface ChartData {
  name: string;
  dateTime: Date;
  location: {
    latitude: number;
    longitude: number;
    timezone: string;
  };
  planets: PlanetPosition[];
  houses: number[];
  ascendant: number;
  mc: number;
}

interface SwissEphemerisChartProps {
  birthData: {
    name: string;
    date: string; // ISO format
    time: string; // HH:mm
    latitude: number;
    longitude: number;
    timezone: string;
  };
  onCalculated?: (data: ChartData) => void;
}

const PLANETS = [
  { id: 0, name: 'Sun', symbol: '☉' },
  { id: 1, name: 'Moon', symbol: '☽' },
  { id: 2, name: 'Mercury', symbol: '☿' },
  { id: 3, name: 'Venus', symbol: '♀' },
  { id: 4, name: 'Mars', symbol: '♂' },
  { id: 5, name: 'Jupiter', symbol: '♃' },
  { id: 6, name: 'Saturn', symbol: '♄' },
  { id: 7, name: 'Uranus', symbol: '♅' },
  { id: 8, name: 'Neptune', symbol: '♆' },
  { id: 9, name: 'Pluto', symbol: '♇' },
];

const SIGNS = [
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

const SIGN_SYMBOLS = [
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

const SwissEphemerisChart: React.FC<SwissEphemerisChartProps> = ({
  birthData,
  onCalculated,
}) => {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    calculateChart();
  }, [birthData]);

  const calculateChart = async () => {
    try {
      setLoading(true);
      setError(null);

      // Parse date and time
      const dateTime = new Date(`${birthData.date}T${birthData.time}`);

      // Calculate Julian Day
      const julianDay = dateToJulianDay(dateTime);

      // Calculate planets positions
      const planets = await calculatePlanets(julianDay);

      // Calculate houses and angles
      const houses = await calculateHouses(
        julianDay,
        birthData.latitude,
        birthData.longitude
      );

      const data: ChartData = {
        name: birthData.name,
        dateTime,
        location: {
          latitude: birthData.latitude,
          longitude: birthData.longitude,
          timezone: birthData.timezone,
        },
        planets,
        houses: houses.cusps,
        ascendant: houses.ascendant,
        mc: houses.mc,
      };

      setChartData(data);
      onCalculated?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation error');
    } finally {
      setLoading(false);
    }
  };

  const dateToJulianDay = (date: Date): number => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour =
      date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;

    let a = Math.floor((14 - month) / 12);
    let y = year + 4800 - a;
    let m = month + 12 * a - 3;

    let jdn =
      day +
      Math.floor((153 * m + 2) / 5) +
      365 * y +
      Math.floor(y / 4) -
      Math.floor(y / 100) +
      Math.floor(y / 400) -
      32045;

    return jdn + (hour - 12) / 24;
  };

  const calculatePlanets = async (
    julianDay: number
  ): Promise<PlanetPosition[]> => {
    // This would call your backend API with Swiss Ephemeris
    // For now, returning mock data based on your chart
    const response = await fetch('YOUR_BACKEND_URL/calculate-planets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ julianDay }),
    });

    if (!response.ok) throw new Error('Failed to calculate planets');

    const data = await response.json();
    return parsePlanetData(data);
  };

  const calculateHouses = async (
    julianDay: number,
    latitude: number,
    longitude: number
  ) => {
    const response = await fetch('YOUR_BACKEND_URL/calculate-houses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ julianDay, latitude, longitude }),
    });

    if (!response.ok) throw new Error('Failed to calculate houses');

    return await response.json();
  };

  const parsePlanetData = (data: any[]): PlanetPosition[] => {
    return data.map((planet, index) => {
      const longitude = planet.longitude;
      const signIndex = Math.floor(longitude / 30);
      const degreeInSign = longitude % 30;
      const degree = Math.floor(degreeInSign);
      const minute = Math.floor((degreeInSign - degree) * 60);

      return {
        name: PLANETS[index].name,
        longitude,
        latitude: planet.latitude,
        distance: planet.distance,
        speed: planet.speed,
        sign: SIGNS[signIndex],
        degree,
        minute,
      };
    });
  };

  const formatPosition = (planet: PlanetPosition): string => {
    const signSymbol = SIGN_SYMBOLS[SIGNS.indexOf(planet.sign)];
    return `${signSymbol} ${planet.degree}°${planet.minute}'`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Calculating chart...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!chartData) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{chartData.name}</Text>
        <Text style={styles.subtitle}>
          {chartData.dateTime.toLocaleString()}
        </Text>
        <Text style={styles.subtitle}>
          {chartData.location.latitude.toFixed(2)}°,{' '}
          {chartData.location.longitude.toFixed(2)}°
        </Text>
      </View>

      <View style={styles.planetsContainer}>
        <Text style={styles.sectionTitle}>Planetary Positions</Text>
        {chartData.planets.map((planet, index) => (
          <View key={index} style={styles.planetRow}>
            <Text style={styles.planetName}>
              {PLANETS[index].symbol} {planet.name}
            </Text>
            <Text style={styles.planetPosition}>{formatPosition(planet)}</Text>
            <Text style={styles.planetSpeed}>
              {planet.speed > 0 ? '→' : '←'} {Math.abs(planet.speed).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.anglesContainer}>
        <Text style={styles.sectionTitle}>Angles</Text>
        <View style={styles.angleRow}>
          <Text style={styles.angleName}>Ascendant (AC)</Text>
          <Text style={styles.angleValue}>
            {SIGN_SYMBOLS[Math.floor(chartData.ascendant / 30)]}{' '}
            {(chartData.ascendant % 30).toFixed(2)}°
          </Text>
        </View>
        <View style={styles.angleRow}>
          <Text style={styles.angleName}>Midheaven (MC)</Text>
          <Text style={styles.angleValue}>
            {SIGN_SYMBOLS[Math.floor(chartData.mc / 30)]}{' '}
            {(chartData.mc % 30).toFixed(2)}°
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  planetsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  planetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  planetName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    flex: 2,
  },
  planetPosition: {
    fontSize: 16,
    color: '#6366f1',
    flex: 2,
    textAlign: 'center',
  },
  planetSpeed: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    textAlign: 'right',
  },
  anglesContainer: {
    marginTop: 16,
  },
  angleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  angleName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  angleValue: {
    fontSize: 16,
    color: '#6366f1',
  },
});

export default SwissEphemerisChart;
