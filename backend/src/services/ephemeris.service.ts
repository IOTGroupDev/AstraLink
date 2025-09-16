import { Injectable, Logger } from '@nestjs/common';
import * as swisseph from 'swisseph';

@Injectable()
export class EphemerisService {
  private readonly logger = new Logger(EphemerisService.name);

  constructor() {
    // Инициализация Swiss Ephemeris
    this.logger.log('Swiss Ephemeris инициализирован');
  }

  /**
   * Рассчитывает натальную карту
   */
  async calculateNatalChart(
    date: string,
    time: string,
    location: { latitude: number; longitude: number; timezone: number }
  ): Promise<any> {
    try {
      // Парсим дату и время правильно
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = time.split(':').map(Number);
      
      const julianDay = swisseph.swe_julday(year, month, day, hours + minutes / 60, swisseph.SE_GREG_CAL);
      
      // Рассчитываем позиции планет
      const planets = await this.calculatePlanets(julianDay);
      
      // Рассчитываем дома
      const houses = await this.calculateHouses(julianDay, location);
      
      // Рассчитываем аспекты
      const aspects = this.calculateAspects(planets);

      return {
        type: 'natal',
        birthDate: new Date(`${date}T${time}`).toISOString(),
        location,
        planets,
        houses,
        aspects,
        calculatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Ошибка при расчёте натальной карты:', error);
      throw new Error('Не удалось рассчитать натальную карту');
    }
  }

  /**
   * Получает транзиты для пользователя
   */
  async getTransits(
    userId: number,
    from: Date,
    to: Date
  ): Promise<any[]> {
    try {
      const transits: any[] = [];
      const currentDate = new Date(from);
      
      while (currentDate <= to) {
        const julianDay = this.dateToJulianDay(currentDate);
        const planets = await this.calculatePlanets(julianDay);
        
        transits.push({
          date: currentDate.toISOString().split('T')[0],
          planets: planets,
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return transits;
    } catch (error) {
      this.logger.error('Ошибка при расчёте транзитов:', error);
      throw new Error('Не удалось рассчитать транзиты');
    }
  }

  /**
   * Рассчитывает синастрию между двумя картами
   */
  async getSynastry(chartA: any, chartB: any): Promise<any> {
    try {
      const aspects: any[] = [];
      const planetsA = chartA.planets;
      const planetsB = chartB.planets;
      
      // Рассчитываем аспекты между планетами
      for (const [planetA, dataA] of Object.entries(planetsA)) {
        for (const [planetB, dataB] of Object.entries(planetsB)) {
          if (planetA !== planetB) {
            const aspect = this.calculateAspect(
              (dataA as any).longitude,
              (dataB as any).longitude
            );
            if (aspect) {
              aspects.push({
                planetA,
                planetB,
                aspect: aspect.type,
                orb: aspect.orb,
                strength: aspect.strength,
              });
            }
          }
        }
      }
      
      // Рассчитываем общую совместимость
      const compatibility = this.calculateCompatibility(aspects);
      
      return {
        aspects,
        compatibility,
        summary: this.generateSynastrySummary(aspects, compatibility),
      };
    } catch (error) {
      this.logger.error('Ошибка при расчёте синастрии:', error);
      throw new Error('Не удалось рассчитать синастрию');
    }
  }

  /**
   * Рассчитывает композитную карту
   */
  async getComposite(chartA: any, chartB: any): Promise<any> {
    try {
      const compositePlanets: any = {};
      const planetsA = chartA.planets;
      const planetsB = chartB.planets;
      
      // Рассчитываем средние позиции планет
      for (const [planet, dataA] of Object.entries(planetsA)) {
        if (planetsB[planet]) {
          const dataB = planetsB[planet];
          const compositeLongitude = this.averageLongitude(
            (dataA as any).longitude,
            (dataB as any).longitude
          );
          
          compositePlanets[planet] = {
            longitude: compositeLongitude,
            sign: this.longitudeToSign(compositeLongitude),
            house: this.longitudeToHouse(compositeLongitude, chartA.houses),
          };
        }
      }
      
      return {
        type: 'composite',
        planets: compositePlanets,
        summary: 'Композитная карта показывает общую энергию пары',
        calculatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Ошибка при расчёте композитной карты:', error);
      throw new Error('Не удалось рассчитать композитную карту');
    }
  }

  /**
   * Преобразует дату в юлианский день
   */
  private dateToJulianDay(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    
    return swisseph.swe_julday(year, month, day, hour + minute / 60 + second / 3600, swisseph.SE_GREG_CAL);
  }

  /**
   * Рассчитывает позиции планет
   */
  private async calculatePlanets(julianDay: number): Promise<any> {
    const planets: any = {};
    const planetNames = {
      0: 'sun',
      1: 'moon',
      2: 'mercury',
      3: 'venus',
      4: 'mars',
      5: 'jupiter',
      6: 'saturn',
      7: 'uranus',
      8: 'neptune',
      9: 'pluto',
    };

    this.logger.log(`Расчёт планет для юлианского дня: ${julianDay}`);

    for (const [planetId, planetName] of Object.entries(planetNames)) {
      try {
        this.logger.log(`Расчёт ${planetName} (ID: ${planetId})`);
        const result = swisseph.swe_calc_ut(
          julianDay,
          parseInt(planetId),
          swisseph.SEFLG_SWIEPH
        ) as any;
        
        this.logger.log(`Результат для ${planetName}:`, result);
        
        if (result && result.longitude !== undefined) {
          const longitude = result.longitude;
          planets[planetName] = {
            longitude: longitude,
            sign: this.longitudeToSign(longitude),
            degree: longitude % 30,
          };
          this.logger.log(`${planetName}: ${longitude}° (${this.longitudeToSign(longitude)})`);
        } else {
          this.logger.warn(`Нет данных о долготе для ${planetName}`);
        }
      } catch (error) {
        this.logger.warn(`Не удалось рассчитать позицию ${planetName}:`, error);
      }
    }

    this.logger.log(`Рассчитано планет: ${Object.keys(planets).length}`);
    return planets;
  }

  /**
   * Рассчитывает дома
   */
  private async calculateHouses(
    julianDay: number,
    location: { latitude: number; longitude: number; timezone: number }
  ): Promise<any> {
    try {
      const result = swisseph.swe_houses(
        julianDay,
        location.latitude,
        location.longitude,
        'P' // Placidus system
      );
      
      const houses: any = {};
      
      // Проверяем, есть ли cusps в результате
      if (result && 'cusps' in result && Array.isArray(result.cusps)) {
        for (let i = 1; i <= 12; i++) {
          const cusp = result.cusps[i];
          houses[i] = {
            cusp: cusp,
            sign: this.longitudeToSign(cusp),
          };
        }
      } else {
        // Fallback - создаём упрощённые дома
        for (let i = 1; i <= 12; i++) {
          houses[i] = {
            cusp: (i - 1) * 30,
            sign: this.longitudeToSign((i - 1) * 30),
          };
        }
      }
      
      return houses;
    } catch (error) {
      this.logger.warn('Не удалось рассчитать дома:', error);
      return {};
    }
  }

  /**
   * Рассчитывает аспекты между планетами
   */
  private calculateAspects(planets: any): any[] {
    const aspects: any[] = [];
    const planetEntries = Object.entries(planets);
    
    for (let i = 0; i < planetEntries.length; i++) {
      for (let j = i + 1; j < planetEntries.length; j++) {
        const [planetA, dataA] = planetEntries[i];
        const [planetB, dataB] = planetEntries[j];
        
        const aspect = this.calculateAspect((dataA as any).longitude, (dataB as any).longitude);
        if (aspect) {
          aspects.push({
            planetA,
            planetB,
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
   * Рассчитывает аспект между двумя долготами
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
          strength: 1 - (orb / aspect.orb),
        };
      }
    }
    
    return null;
  }

  /**
   * Преобразует долготу в знак зодиака
   */
  private longitudeToSign(longitude: number): string {
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const signIndex = Math.floor(longitude / 30);
    return signs[signIndex % 12];
  }

  /**
   * Преобразует долготу в дом
   */
  private longitudeToHouse(longitude: number, houses: any): number {
    for (let i = 1; i <= 12; i++) {
      const nextHouse = i === 12 ? 1 : i + 1;
      const currentCusp = houses[i]?.cusp || 0;
      const nextCusp = houses[nextHouse]?.cusp || 0;
      
      if (this.isInHouse(longitude, currentCusp, nextCusp)) {
        return i;
      }
    }
    return 1; // Fallback
  }

  /**
   * Проверяет, находится ли долгота в доме
   */
  private isInHouse(longitude: number, cusp1: number, cusp2: number): boolean {
    if (cusp1 <= cusp2) {
      return longitude >= cusp1 && longitude < cusp2;
    } else {
      return longitude >= cusp1 || longitude < cusp2;
    }
  }

  /**
   * Рассчитывает среднюю долготу
   */
  private averageLongitude(longitude1: number, longitude2: number): number {
    let avg = (longitude1 + longitude2) / 2;
    if (Math.abs(longitude1 - longitude2) > 180) {
      avg += 180;
    }
    return avg % 360;
  }

  /**
   * Рассчитывает совместимость на основе аспектов
   */
  private calculateCompatibility(aspects: any[]): number {
    let totalScore = 0;
    let aspectCount = 0;
    
    for (const aspect of aspects) {
      const weight = this.getAspectWeight(aspect.type);
      totalScore += aspect.strength * weight;
      aspectCount++;
    }
    
    return aspectCount > 0 ? Math.round((totalScore / aspectCount) * 100) : 0;
  }

  /**
   * Возвращает вес аспекта для совместимости
   */
  private getAspectWeight(aspectType: string): number {
    const weights = {
      'conjunction': 0.8,
      'sextile': 0.9,
      'square': 0.3,
      'trine': 1.0,
      'opposition': 0.5,
    };
    return weights[aspectType] || 0.5;
  }

  /**
   * Генерирует краткое описание синастрии
   */
  private generateSynastrySummary(aspects: any[], compatibility: number): string {
    const positiveAspects = aspects.filter(a => ['sextile', 'trine', 'conjunction'].includes(a.type));
    const challengingAspects = aspects.filter(a => ['square', 'opposition'].includes(a.type));
    
    let summary = `Совместимость: ${compatibility}%`;
    
    if (positiveAspects.length > 0) {
      summary += `\nГармоничные аспекты: ${positiveAspects.length}`;
    }
    
    if (challengingAspects.length > 0) {
      summary += `\nСложные аспекты: ${challengingAspects.length}`;
    }
    
    return summary;
  }
}
