import { Injectable, Logger } from '@nestjs/common';
import { EphemerisService } from '../../services/ephemeris.service';

@Injectable()
export class SwissService {
  private readonly logger = new Logger(SwissService.name);

  constructor(private readonly ephemerisService: EphemerisService) {}

  /**
   * Преобразует дату в юлианский день
   */
  dateToJulianDay(date: Date): number {
    return this.ephemerisService.dateToJulianDay(date);
  }

  /**
   * Рассчитывает позиции планет для заданного юлианского дня
   */
  async calculatePlanetPositions(
    julianDay: number,
  ): Promise<Record<string, any>> {
    // Use EphemerisService for planet calculations
    const planets = await this.ephemerisService.calculatePlanets(julianDay);

    // Transform the result to match the expected format
    const transformedPlanets: Record<string, any> = {};
    for (const [planetName, planetData] of Object.entries(planets)) {
      const data = planetData as any;
      transformedPlanets[planetName] = {
        longitude: data.longitude,
        sign: data.sign,
        degree: data.degree,
        speed: 0, // EphemerisService doesn't return speed, add if needed
      };
    }

    return transformedPlanets;
  }

  /**
   * Рассчитывает позиции домов
   */
  async calculateHouses(
    julianDay: number,
    latitude: number,
    longitude: number,
  ): Promise<Record<string, any>> {
    // Use EphemerisService for house calculations
    const location = { latitude, longitude, timezone: 0 };
    const houses = await (this.ephemerisService as any).calculateHouses(
      julianDay,
      location,
    );

    // Transform the result to match the expected format
    const transformedHouses: Record<string, any> = {};
    for (const [houseNum, houseData] of Object.entries(houses)) {
      const data = houseData as any;
      transformedHouses[houseNum] = {
        longitude: data.cusp,
        sign: data.sign,
        degree: data.cusp % 30,
      };
    }

    return transformedHouses;
  }

  /**
   * Рассчитывает аспекты между планетами
   */
  calculateAspects(planets: Record<string, any>): any[] {
    const aspects: any[] = [];
    const planetEntries = Object.entries(planets);

    for (let i = 0; i < planetEntries.length; i++) {
      for (let j = i + 1; j < planetEntries.length; j++) {
        const [planetA, dataA] = planetEntries[i];
        const [planetB, dataB] = planetEntries[j];

        const aspect = this.calculateAspect(dataA.longitude, dataB.longitude);
        if (aspect) {
          aspects.push({
            planet1: planetA,
            planet2: planetB,
            aspect: aspect.type,
            orb: aspect.orb,
            strength: aspect.strength,
          });
        }
      }
    }

    return aspects;
  }

  /**
   * Вычисляет аспект между двумя долготами
   */
  private calculateAspect(longitude1: number, longitude2: number): any | null {
    const diff = Math.abs(longitude1 - longitude2);
    const normalizedDiff = Math.min(diff, 360 - diff);

    const aspects = [
      { type: 'conjunction', angle: 0, orb: 8 },
      { type: 'sextile', angle: 60, orb: 6 },
      { type: 'square', angle: 90, orb: 8 },
      { type: 'trine', angle: 120, orb: 8 },
      { type: 'opposition', angle: 180, orb: 8 },
    ];

    for (const aspect of aspects) {
      const orb = Math.abs(normalizedDiff - aspect.angle);
      if (orb <= aspect.orb) {
        return {
          type: aspect.type,
          orb: orb,
          strength: 1 - orb / aspect.orb,
        };
      }
    }

    return null;
  }

  /**
   * Преобразует долготу в знак зодиака
   */
  private longitudeToSign(longitude: number): string {
    const signs = [
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
    const signIndex = Math.floor(longitude / 30);
    return signs[signIndex % 12];
  }
}
