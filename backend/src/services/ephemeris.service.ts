import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

let swisseph: any;

@Injectable()
export class EphemerisService implements OnModuleInit {
  private readonly logger = new Logger(EphemerisService.name);
  private hasSE = false;
  private initializationAttempted = false;

  async onModuleInit() {
    await this.initializeSwissEphemeris();
  }

  /**
   * Инициализация Swiss Ephemeris
   */
  private async initializeSwissEphemeris(): Promise<boolean> {
    if (this.initializationAttempted && this.hasSE) {
      return true;
    }

    this.initializationAttempted = true;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      swisseph = require('swisseph');

      if (!swisseph || typeof swisseph !== 'object') {
        this.logger.error('Swiss Ephemeris модуль загружен некорректно');
        return false;
      }

      // Проверяем наличие необходимых методов
      const requiredMethods = [
        'swe_set_ephe_path',
        'swe_calc_ut',
        'swe_julday',
        'swe_houses',
      ];
      const missingMethods = requiredMethods.filter(
        (method) => typeof swisseph[method] !== 'function',
      );

      if (missingMethods.length > 0) {
        this.logger.error(
          `Swiss Ephemeris: отсутствуют методы: ${missingMethods.join(', ')}`,
        );
        return false;
      }

      // Устанавливаем путь к эфемеридам
      const paths = ['./ephe', __dirname + '/../../ephe', '/app/ephe'];
      let pathSet = false;

      for (const path of paths) {
        try {
          swisseph.swe_set_ephe_path(path);
          this.logger.log(`Установлен путь к эфемерисным файлам: ${path}`);
          pathSet = true;
          break;
        } catch (error) {
          this.logger.debug(`Не удалось установить путь ${path}`);
        }
      }

      if (!pathSet) {
        this.logger.warn('Используем встроенные данные Swiss Ephemeris');
      }

      this.hasSE = true;
      this.logger.log('✓ Swiss Ephemeris успешно инициализирован');
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Не удалось загрузить Swiss Ephemeris:', errorMessage);
      this.hasSE = false;
      return false;
    }
  }

  /**
   * Проверка и реинициализация Swiss Ephemeris при необходимости
   */
  private async ensureSwissEphemeris(): Promise<void> {
    if (this.hasSE && swisseph) {
      return;
    }

    this.logger.warn('Попытка реинициализации Swiss Ephemeris...');
    const success = await this.initializeSwissEphemeris();

    if (!success) {
      throw new Error(
        'Swiss Ephemeris недоступен. Убедитесь, что модуль swisseph установлен корректно.',
      );
    }
  }

  /**
   * Преобразует дату в юлианский день
   */
  dateToJulianDay(date: Date): number {
    if (!this.hasSE || !swisseph) {
      throw new Error(
        'Swiss Ephemeris не инициализирован. Перезапустите сервис.',
      );
    }

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    const second = date.getUTCSeconds();

    return swisseph.swe_julday(
      year,
      month,
      day,
      hour + minute / 60 + second / 3600,
      swisseph.SE_GREG_CAL,
    );
  }

  /**
   * Рассчитывает натальную карту
   */
  async calculateNatalChart(
    date: string,
    time: string,
    location: { latitude: number; longitude: number; timezone: number },
  ): Promise<any> {
    await this.ensureSwissEphemeris();

    if (!date || !time) {
      throw new Error('Дата и время рождения обязательны');
    }

    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);

    if (
      isNaN(year) ||
      isNaN(month) ||
      isNaN(day) ||
      isNaN(hours) ||
      isNaN(minutes)
    ) {
      throw new Error('Некорректный формат даты или времени');
    }

    const julianDay = swisseph.swe_julday(
      year,
      month,
      day,
      hours + minutes / 60,
      swisseph.SE_GREG_CAL,
    );

    const planets = await this.calculatePlanets(julianDay);
    const houses = await this.calculateHouses(julianDay, location);
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
  }

  /**
   * Получает транзиты для пользователя
   */
  async getTransits(userId: string, from: Date, to: Date): Promise<any[]> {
    await this.ensureSwissEphemeris();

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
  }

  /**
   * Рассчитывает синастрию между двумя картами
   */
  async getSynastry(chartA: any, chartB: any): Promise<any> {
    const aspects: any[] = [];
    const planetsA = chartA.planets;
    const planetsB = chartB.planets;

    for (const [planetA, dataA] of Object.entries(planetsA)) {
      for (const [planetB, dataB] of Object.entries(planetsB)) {
        if (planetA !== planetB) {
          const aspect = this.calculateAspect(
            (dataA as any).longitude,
            (dataB as any).longitude,
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

    const compatibility = this.calculateCompatibility(aspects);

    return {
      aspects,
      compatibility,
      summary: this.generateSynastrySummary(aspects, compatibility),
    };
  }

  /**
   * Рассчитывает композитную карту
   */
  async getComposite(chartA: any, chartB: any): Promise<any> {
    const compositePlanets: any = {};
    const planetsA = chartA.planets;
    const planetsB = chartB.planets;

    for (const [planet, dataA] of Object.entries(planetsA)) {
      if (planetsB[planet]) {
        const dataB = planetsB[planet];
        const compositeLongitude = this.averageLongitude(
          (dataA as any).longitude,
          dataB.longitude,
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
  }

  /**
   * Рассчитывает позиции планет
   */
  async calculatePlanets(julianDay: number): Promise<any> {
    await this.ensureSwissEphemeris();

    if (isNaN(julianDay) || !isFinite(julianDay)) {
      throw new Error('Некорректная дата для расчёта планет');
    }

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

    for (const [planetId, planetName] of Object.entries(planetNames)) {
      const result = swisseph.swe_calc_ut(
        julianDay,
        parseInt(planetId),
        swisseph.SEFLG_SWIEPH | swisseph.SEFLG_SPEED,
      );

      if (result && result.longitude !== undefined && !result.error) {
        const longitude = result.longitude;
        const speed =
          (typeof result.speedLong === 'number' ? result.speedLong : undefined) ??
          (typeof result.longitudeSpeed === 'number' ? result.longitudeSpeed : undefined) ??
          (typeof result.speed === 'number' ? result.speed : 0);
        const isRetrograde = typeof speed === 'number' ? speed < 0 : false;

        planets[planetName] = {
          longitude: longitude,
          sign: this.longitudeToSign(longitude),
          degree: longitude % 30,
          speed,
          isRetrograde,
        };
      } else {
        throw new Error(
          `Ошибка расчёта ${planetName}: ${result?.error || 'Неизвестная ошибка'}`,
        );
      }
    }

    if (Object.keys(planets).length === 0) {
      throw new Error('Не удалось рассчитать ни одной планеты');
    }

    return planets;
  }

  /**
   * Рассчитывает дома
   */
  private async calculateHouses(
    julianDay: number,
    location: { latitude: number; longitude: number; timezone: number },
  ): Promise<any> {
    await this.ensureSwissEphemeris();

    const houses: any = {};

    try {
      const rawHouses = swisseph.swe_houses(
        julianDay,
        location.latitude,
        location.longitude,
        'P',
      );

      let cuspsArray: number[] | null = null;

      if (Array.isArray(rawHouses) && rawHouses.length >= 13) {
        cuspsArray = rawHouses;
      } else if (rawHouses?.cusps && Array.isArray(rawHouses.cusps)) {
        cuspsArray = rawHouses.cusps;
      } else if (Array.isArray(rawHouses?.[0])) {
        cuspsArray = rawHouses[0];
      } else if (rawHouses?.house && Array.isArray(rawHouses.house)) {
        cuspsArray = [null, ...rawHouses.house];
      }

      if (cuspsArray) {
        for (let i = 1; i <= 12; i++) {
          const cusp = cuspsArray[i];
          if (
            typeof cusp === 'number' &&
            !isNaN(cusp) &&
            cusp >= 0 &&
            cusp < 360
          ) {
            houses[i] = {
              cusp: cusp,
              sign: this.longitudeToSign(cusp),
            };
          } else {
            houses[i] = {
              cusp: (i - 1) * 30,
              sign: this.longitudeToSign((i - 1) * 30),
            };
          }
        }
      } else {
        throw new Error('Не удалось распарсить результат swe_houses');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Используем упрощённый расчёт домов:', errorMessage);
      for (let i = 1; i <= 12; i++) {
        houses[i] = {
          cusp: (i - 1) * 30,
          sign: this.longitudeToSign((i - 1) * 30),
        };
      }
    }

    return houses;
  }

  private calculateAspects(planets: any): any[] {
    const aspects: any[] = [];
    const planetEntries = Object.entries(planets);

    for (let i = 0; i < planetEntries.length; i++) {
      for (let j = i + 1; j < planetEntries.length; j++) {
        const [planetA, dataA] = planetEntries[i];
        const [planetB, dataB] = planetEntries[j];

        const aspect = this.calculateAspect(
          (dataA as any).longitude,
          (dataB as any).longitude,
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

    return aspects;
  }

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

  private longitudeToHouse(longitude: number, houses: any): number {
    for (let i = 1; i <= 12; i++) {
      const nextHouse = i === 12 ? 1 : i + 1;
      const currentCusp = houses[i]?.cusp || 0;
      const nextCusp = houses[nextHouse]?.cusp || 0;

      if (this.isInHouse(longitude, currentCusp, nextCusp)) {
        return i;
      }
    }
    return 1;
  }

  private isInHouse(longitude: number, cusp1: number, cusp2: number): boolean {
    if (cusp1 <= cusp2) {
      return longitude >= cusp1 && longitude < cusp2;
    } else {
      return longitude >= cusp1 || longitude < cusp2;
    }
  }

  private averageLongitude(longitude1: number, longitude2: number): number {
    let avg = (longitude1 + longitude2) / 2;
    if (Math.abs(longitude1 - longitude2) > 180) {
      avg += 180;
    }
    return avg % 360;
  }

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

  private getAspectWeight(aspectType: string): number {
    const weights: Record<string, number> = {
      conjunction: 0.8,
      sextile: 0.9,
      square: 0.3,
      trine: 1.0,
      opposition: 0.5,
    };
    return weights[aspectType] || 0.5;
  }

  private generateSynastrySummary(
    aspects: any[],
    compatibility: number,
  ): string {
    const positiveAspects = aspects.filter((a) =>
      ['sextile', 'trine', 'conjunction'].includes(a.type),
    );
    const challengingAspects = aspects.filter((a) =>
      ['square', 'opposition'].includes(a.type),
    );

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
