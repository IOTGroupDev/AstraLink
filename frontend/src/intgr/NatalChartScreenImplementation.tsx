// Complete implementation example for AstraLink app

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import ChartDisplay from './ChartDisplay';
import type { ChartData, BirthData } from './astrology.types';
import { chartLogger } from '../services/logger';

interface NatalChartScreenProps {
  birthData: BirthData;
  userId?: string;
}

const NatalChartScreen: React.FC<NatalChartScreenProps> = ({
  birthData,
  userId,
}) => {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChart();
  }, [birthData]);

  const loadChart = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call your NestJS backend with Swiss Ephemeris
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/astrology/natal-chart`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Add auth token if needed
            // 'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            name: birthData.name,
            date: birthData.date,
            time: birthData.time,
            latitude: birthData.latitude,
            longitude: birthData.longitude,
            timezone: birthData.timezone,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to calculate natal chart');
      }

      const data = await response.json();
      setChartData(data);

      // Optionally save to database
      if (userId) {
        await saveChartToDatabase(userId, data);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const saveChartToDatabase = async (userId: string, data: ChartData) => {
    try {
      await fetch(`${process.env.EXPO_PUBLIC_API_URL}/charts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          chartData: data,
        }),
      });
    } catch (err) {
      chartLogger.error('Failed to save chart', err);
    }
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadChart}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {chartData ? (
        <ChartDisplay
          chartData={chartData}
          loading={loading}
          onRefresh={loadChart}
        />
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NatalChartScreen;

// USAGE EXAMPLE IN YOUR APP:

/*
import NatalChartScreen from './components/NatalChartScreen';

// In your navigation or screen component:
<NatalChartScreen
  birthData={{
    name: 'John Doe',
    date: '1990-05-15',
    time: '14:30',
    latitude: 40.7128,
    longitude: -74.0060,
    timezone: 'America/New_York',
  }}
  userId={user.id}
/>
*/

// API ENDPOINT STRUCTURE FOR YOUR NESTJS BACKEND:

/*
// src/astrology/astrology.controller.ts

@Controller('astrology')
export class AstrologyController {
  constructor(private readonly astrologyService: AstrologyService) {}

  @Post('natal-chart')
  async calculateNatalChart(@Body() birthData: BirthDataDto) {
    return this.astrologyService.calculateNatalChart(birthData);
  }

  @Post('planets')
  async calculatePlanets(@Body() data: { julianDay: number; flags?: number }) {
    return this.astrologyService.calculatePlanets(data.julianDay, data.flags);
  }

  @Post('houses')
  async calculateHouses(@Body() data: HousesDto) {
    return this.astrologyService.calculateHouses(
      data.julianDay,
      data.latitude,
      data.longitude,
      data.houseSystem,
    );
  }

  @Post('transits')
  async calculateTransits(@Body() data: TransitsDto) {
    return this.astrologyService.calculateTransits(
      data.natalPlanets,
      new Date(data.transitDate),
    );
  }
}
*/

// SWISS EPHEMERIS SERVICE EXAMPLE:

/*
// src/astrology/astrology.service.ts

import * as swisseph from 'swisseph';

@Injectable()
export class AstrologyService {
  constructor() {
    // Set ephemeris path
    swisseph.swe_set_ephe_path(__dirname + '/../../ephemeris');
  }

  async calculateNatalChart(birthData: BirthDataDto): Promise<ChartData> {
    const julianDay = this.dateToJulianDay(
      new Date(`${birthData.date}T${birthData.time}`)
    );

    const planets = await this.calculatePlanets(julianDay);
    const houses = await this.calculateHouses(
      julianDay,
      birthData.latitude,
      birthData.longitude,
      'P' // Placidus
    );

    const aspects = this.calculateAspects(planets);

    return {
      name: birthData.name,
      dateTime: new Date(`${birthData.date}T${birthData.time}`),
      julianDay,
      location: {
        latitude: birthData.latitude,
        longitude: birthData.longitude,
        timezone: birthData.timezone,
      },
      planets,
      houses: houses.cusps.map((cusp, index) => ({
        number: index + 1,
        cusp,
        sign: this.getSignFromLongitude(cusp),
        signIndex: Math.floor(cusp / 30),
        degree: Math.floor(cusp % 30),
        minute: Math.floor((cusp % 30 - Math.floor(cusp % 30)) * 60),
      })),
      ascendant: houses.ascendant,
      mc: houses.mc,
      descendant: (houses.ascendant + 180) % 360,
      ic: (houses.mc + 180) % 360,
      aspects,
      sunSign: planets[0].sign,
      moonSign: planets[1].sign,
      risingSign: this.getSignFromLongitude(houses.ascendant),
    };
  }

  calculatePlanets(julianDay: number, flags: number = swisseph.SEFLG_SWIEPH): any[] {
    const planets = [];
    const planetIds = [
      swisseph.SE_SUN,
      swisseph.SE_MOON,
      swisseph.SE_MERCURY,
      swisseph.SE_VENUS,
      swisseph.SE_MARS,
      swisseph.SE_JUPITER,
      swisseph.SE_SATURN,
      swisseph.SE_URANUS,
      swisseph.SE_NEPTUNE,
      swisseph.SE_PLUTO,
    ];

    planetIds.forEach((planetId, index) => {
      const result = swisseph.swe_calc_ut(julianDay, planetId, flags);
      
      if (result.flag !== flags) {
        throw new Error(`Failed to calculate planet ${index}`);
      }

      const longitude = result.longitude;
      const signIndex = Math.floor(longitude / 30);
      const degreeInSign = longitude % 30;

      planets.push({
        id: index,
        name: this.getPlanetName(index),
        symbol: this.getPlanetSymbol(index),
        longitude: result.longitude,
        latitude: result.latitude,
        distance: result.distance,
        speed: result.longitudeSpeed,
        speedLongitude: result.longitudeSpeed,
        sign: this.getSignName(signIndex),
        signIndex,
        degree: Math.floor(degreeInSign),
        minute: Math.floor((degreeInSign - Math.floor(degreeInSign)) * 60),
        second: Math.floor(((degreeInSign - Math.floor(degreeInSign)) * 60 - 
          Math.floor((degreeInSign - Math.floor(degreeInSign)) * 60)) * 60),
        isRetrograde: result.longitudeSpeed < 0,
        house: 0, // Will be calculated after houses
      });
    });

    return planets;
  }

  calculateHouses(
    julianDay: number,
    latitude: number,
    longitude: number,
    houseSystem: string = 'P'
  ): { cusps: number[]; ascendant: number; mc: number } {
    const result = swisseph.swe_houses(
      julianDay,
      latitude,
      longitude,
      houseSystem.charCodeAt(0)
    );

    return {
      cusps: result.house.slice(1, 13), // Houses 1-12
      ascendant: result.ascendant,
      mc: result.mc,
    };
  }

  private dateToJulianDay(date: Date): number {
    return swisseph.swe_julday(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours() + date.getUTCMinutes() / 60,
      swisseph.SE_GREG_CAL
    );
  }

  private getPlanetName(index: number): string {
    const names = [
      'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
      'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'
    ];
    return names[index];
  }

  private getSignName(index: number): string {
    const signs = [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];
    return signs[index];
  }
}
*/
