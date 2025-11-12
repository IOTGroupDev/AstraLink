import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { ChartData } from './astrology.types';

interface PlanetListProps {
  chartData: ChartData;
  compact?: boolean;
}

const PLANET_SYMBOLS: Record<string, string> = {
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
  'North Node': '☊',
  'South Node': '☋',
  Chiron: '⚷',
  Lilith: '⚸',
};

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

const PlanetList: React.FC<PlanetListProps> = ({
  chartData,
  compact = false,
}) => {
  const formatPosition = (longitude: number) => {
    const signIndex = Math.floor(longitude / 30);
    const degreeInSign = longitude % 30;
    const degree = Math.floor(degreeInSign);
    const minute = Math.floor((degreeInSign - degree) * 60);

    return `${SIGN_SYMBOLS[signIndex]} ${degree}°${minute.toString().padStart(2, '0')}'`;
  };

  const formatSpeed = (speed: number) => {
    const absSpeed = Math.abs(speed).toFixed(4);
    return speed < 0 ? `℞ ${absSpeed}` : absSpeed;
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactGrid}>
          {chartData.planets.slice(0, 10).map((planet) => (
            <View key={planet.name} style={styles.compactItem}>
              <Text style={styles.compactSymbol}>
                {PLANET_SYMBOLS[planet.name] || planet.name[0]}
              </Text>
              <Text style={styles.compactPosition}>
                {formatPosition(planet.longitude)}
              </Text>
              {planet.isRetrograde && (
                <Text style={styles.retrogradeIndicator}>℞</Text>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Planet</Text>
        <Text style={styles.headerText}>Position</Text>
        <Text style={styles.headerText}>House</Text>
        <Text style={styles.headerText}>Speed</Text>
      </View>

      {chartData.planets.map((planet, index) => (
        <View
          key={planet.name}
          style={[styles.row, index % 2 === 0 && styles.rowEven]}
        >
          <View style={styles.planetCell}>
            <Text style={styles.planetSymbol}>
              {PLANET_SYMBOLS[planet.name] || '•'}
            </Text>
            <Text style={styles.planetName}>{planet.name}</Text>
          </View>

          <View style={styles.positionCell}>
            <Text style={styles.positionText}>
              {formatPosition(planet.longitude)}
            </Text>
            {planet.isRetrograde && <Text style={styles.retrograde}>℞</Text>}
          </View>

          <Text style={styles.houseText}>{planet.house}</Text>

          <Text
            style={[
              styles.speedText,
              planet.isRetrograde && styles.speedRetrograde,
            ]}
          >
            {formatSpeed(planet.speed)}
          </Text>
        </View>
      ))}

      {/* Angles section */}
      <View style={styles.anglesSection}>
        <Text style={styles.anglesSectionTitle}>Angles</Text>

        <View style={styles.angleRow}>
          <Text style={styles.angleName}>Ascendant (AC)</Text>
          <Text style={styles.angleValue}>
            {formatPosition(chartData.ascendant)}
          </Text>
        </View>

        <View style={styles.angleRow}>
          <Text style={styles.angleName}>Midheaven (MC)</Text>
          <Text style={styles.angleValue}>{formatPosition(chartData.mc)}</Text>
        </View>

        <View style={styles.angleRow}>
          <Text style={styles.angleName}>Descendant (DC)</Text>
          <Text style={styles.angleValue}>
            {formatPosition((chartData.ascendant + 180) % 360)}
          </Text>
        </View>

        <View style={styles.angleRow}>
          <Text style={styles.angleName}>Imum Coeli (IC)</Text>
          <Text style={styles.angleValue}>
            {formatPosition((chartData.mc + 180) % 360)}
          </Text>
        </View>
      </View>

      {/* Houses section */}
      {chartData.houses && chartData.houses.length > 0 && (
        <View style={styles.housesSection}>
          <Text style={styles.housesSectionTitle}>House Cusps</Text>
          <View style={styles.housesGrid}>
            {chartData.houses.map((house, index) => (
              <View key={index} style={styles.houseItem}>
                <Text style={styles.houseNumber}>{index + 1}</Text>
                <Text style={styles.houseCusp}>
                  {formatPosition(house.cusp)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  compactContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  compactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  compactSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  compactPosition: {
    fontSize: 12,
    color: '#495057',
  },
  retrogradeIndicator: {
    fontSize: 10,
    color: '#dc3545',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerText: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  rowEven: {
    backgroundColor: '#f8f9fa',
  },
  planetCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planetSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  planetName: {
    fontSize: 14,
    color: '#212529',
  },
  positionCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  positionText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  retrograde: {
    fontSize: 16,
    color: '#dc3545',
    fontWeight: 'bold',
  },
  houseText: {
    flex: 0.5,
    fontSize: 14,
    color: '#495057',
    textAlign: 'center',
  },
  speedText: {
    flex: 1,
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'right',
  },
  speedRetrograde: {
    color: '#dc3545',
  },
  anglesSection: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    marginTop: 16,
  },
  anglesSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  angleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  angleName: {
    fontSize: 14,
    color: '#495057',
  },
  angleValue: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  housesSection: {
    padding: 16,
    marginTop: 16,
  },
  housesSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  housesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  houseItem: {
    width: '30%',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  houseNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  houseCusp: {
    fontSize: 12,
    color: '#6c757d',
  },
});

export default PlanetList;
