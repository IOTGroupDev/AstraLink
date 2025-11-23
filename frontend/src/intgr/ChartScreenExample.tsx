// Example usage of SwissEphemerisChart component

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import SwissEphemerisChart from './SwissEphemerisChart';
import type { ChartData } from './astrology.types';
import { chartLogger } from '../services/logger';

const ChartScreen = () => {
  // Example data based on your chart image
  const birthData = {
    name: 'Swiss Ephemeris Release',
    date: '1997-09-30',
    time: '16:00',
    latitude: 47.3769, // Zurich coordinates
    longitude: 8.5417,
    timezone: '+02:00',
  };

  const handleChartCalculated = (chartData: ChartData) => {
    chartLogger.log('Chart calculated', chartData);

    // Access planetary positions
    chartData.planets.forEach((planet) => {
      chartLogger.log(
        `${planet.name}: ${planet.sign} ${planet.degree}°${planet.minute}'`
      );
      chartLogger.log(`  House: ${planet.house}`);
      chartLogger.log(`  Retrograde: ${planet.isRetrograde ? 'Yes' : 'No'}`);
    });

    // Access aspects
    chartData.aspects.forEach((aspect) => {
      chartLogger.log(
        `${aspect.planet1} ${aspect.type} ${aspect.planet2} (orb: ${aspect.orb.toFixed(2)}°)`
      );
    });

    // Access angles
    chartLogger.log(`Ascendant: ${chartData.ascendant}`);
    chartLogger.log(`MC: ${chartData.mc}`);
  };

  return (
    <ScrollView style={styles.container}>
      <SwissEphemerisChart
        birthData={birthData}
        onCalculated={handleChartCalculated}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
});

export default ChartScreen;
