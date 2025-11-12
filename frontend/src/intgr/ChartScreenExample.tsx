// Example usage of SwissEphemerisChart component

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import SwissEphemerisChart from './SwissEphemerisChart';
import type { ChartData } from './astrology.types';

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
    console.log('Chart calculated:', chartData);

    // Access planetary positions
    chartData.planets.forEach((planet) => {
      console.log(
        `${planet.name}: ${planet.sign} ${planet.degree}°${planet.minute}'`
      );
      console.log(`  House: ${planet.house}`);
      console.log(`  Retrograde: ${planet.isRetrograde ? 'Yes' : 'No'}`);
    });

    // Access aspects
    chartData.aspects.forEach((aspect) => {
      console.log(
        `${aspect.planet1} ${aspect.type} ${aspect.planet2} (orb: ${aspect.orb.toFixed(2)}°)`
      );
    });

    // Access angles
    console.log(`Ascendant: ${chartData.ascendant}`);
    console.log(`MC: ${chartData.mc}`);
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
