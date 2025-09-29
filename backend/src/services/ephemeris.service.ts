// import { Injectable, Logger } from '@nestjs/common';
// // Динамическая загрузка swisseph, чтобы не падать при отсутствии нативного аддона
// let swisseph: any;
//
// @Injectable()
// export class EphemerisService {
//   private readonly logger = new Logger(EphemerisService.name);
//   private hasSE = false;
//
//   constructor() {
//     // Инициализация Swiss Ephemeris (динамически)
//     try {
//       // eslint-disable-next-line @typescript-eslint/no-require-imports
//       swisseph = require('swisseph');
//       if (
//         swisseph &&
//         typeof swisseph === 'object' &&
//         swisseph.swe_set_ephe_path
//       ) {
//         // Пробуем разные пути к эфемерисным файлам
//         try {
//           swisseph.swe_set_ephe_path('./ephe');
//           this.logger.log('Установлен путь к эфемерисным файлам: ./ephe');
//         } catch (_pathError) {
//           try {
//             swisseph.swe_set_ephe_path(__dirname + '/../../ephe');
//             this.logger.log(
//               'Установлен альтернативный путь к эфемерисным файлам',
//             );
//           } catch (_altPathError) {
//             this.logger.warn(
//               'Не удалось установить путь к эфемерисным файлам, используем встроенные данные',
//             );
//           }
//         }
//         // Проверяем основные методы
//         if (
//           swisseph.swe_calc_ut &&
//           swisseph.swe_julday &&
//           swisseph.swe_houses
//         ) {
//           this.hasSE = true;
//           this.logger.log('Swiss Ephemeris инициализирован успешно');
//         } else {
//           this.hasSE = false;
//           this.logger.warn(
//             'Swiss Ephemeris загружен, но некоторые методы недоступны',
//           );
//         }
//       } else {
//         this.hasSE = false;
//         this.logger.warn(
//           'Swiss Ephemeris не найден или имеет неправильную структуру',
//         );
//       }
//     } catch (_error) {
//       this.hasSE = false;
//       this.logger.warn(
//         'Swiss Ephemeris не доступен. Будут использованы упрощенные расчеты (fallback).',
//       );
//     }
//   }
//
//   /**
//    * Рассчитывает натальную карту
//    */
//   async calculateNatalChart(
//     date: string,
//     time: string,
//     location: { latitude: number; longitude: number; timezone: number },
//   ): Promise<any> {
//     try {
//       // Валидируем и парсим дату и время
//       if (!date || !time) {
//         throw new Error('Дата и время рождения обязательны');
//       }
//
//       const [year, month, day] = date.split('-').map(Number);
//       const [hours, minutes] = time.split(':').map(Number);
//
//       // Проверяем корректность данных
//       if (
//         isNaN(year) ||
//         isNaN(month) ||
//         isNaN(day) ||
//         isNaN(hours) ||
//         isNaN(minutes)
//       ) {
//         throw new Error('Некорректный формат даты или времени');
//       }
//
//       // Рассчитываем юлианский день
//       let julianDay: number;
//       if (this.hasSE && swisseph?.swe_julday) {
//         julianDay = swisseph.swe_julday(
//           year,
//           month,
//           day,
//           hours + minutes / 60,
//           swisseph.SE_GREG_CAL,
//         );
//       } else {
//         // Fallback calculation
//         julianDay =
//           2440587.5 +
//           new Date(Date.UTC(year, month - 1, day, hours, minutes)).getTime() /
//             86400000;
//       }
//
//       // Рассчитываем позиции планет
//       const planets = await this.calculatePlanets(julianDay);
//
//       // Рассчитываем дома
//       const houses = await this.calculateHouses(julianDay, location);
//
//       // Рассчитываем аспекты
//       const aspects = this.calculateAspects(planets);
//
//       return {
//         type: 'natal',
//         birthDate: new Date(`${date}T${time}`).toISOString(),
//         location,
//         planets,
//         houses,
//         aspects,
//         calculatedAt: new Date().toISOString(),
//       };
//     } catch (error) {
//       this.logger.warn(
//         'Ошибка при расчёте натальной карты, используем упрощённый fallback:',
//         error,
//       );
//       try {
//         // Fallback: пересчитываем с упрощённой логикой без Swiss Ephemeris
//         const [year, month, day] = date.split('-').map(Number);
//         const [hours, minutes] = (time || '00:00').split(':').map(Number);
//         const jd =
//           2440587.5 +
//           new Date(
//             Date.UTC(
//               year,
//               (month || 1) - 1,
//               day || 1,
//               hours || 0,
//               minutes || 0,
//             ),
//           ).getTime() /
//             86400000;
//
//         const planets = await this.calculatePlanets(jd);
//         const houses = await this.calculateHouses(jd, location);
//         const aspects = this.calculateAspects(planets);
//
//         return {
//           type: 'natal',
//           birthDate: new Date(`${date}T${time || '00:00'}`).toISOString(),
//           location,
//           planets,
//           houses,
//           aspects,
//           calculatedAt: new Date().toISOString(),
//         };
//       } catch (fallbackError) {
//         this.logger.error(
//           'Fallback расчёт натальной карты также не удался:',
//           fallbackError,
//         );
//         throw new Error('Не удалось рассчитать натальную карту');
//       }
//     }
//   }
//
//   /**
//    * Получает транзиты для пользователя
//    */
//   async getTransits(userId: string, from: Date, to: Date): Promise<any[]> {
//     try {
//       const transits: any[] = [];
//       const currentDate = new Date(from);
//
//       while (currentDate <= to) {
//         const julianDay = this.dateToJulianDay(currentDate);
//         const planets = await this.calculatePlanets(julianDay);
//
//         transits.push({
//           date: currentDate.toISOString().split('T')[0],
//           planets: planets,
//         });
//
//         currentDate.setDate(currentDate.getDate() + 1);
//       }
//
//       return transits;
//     } catch (error) {
//       this.logger.error('Ошибка при расчёте транзитов:', error);
//       throw new Error('Не удалось рассчитать транзиты');
//     }
//   }
//
//   /**
//    * Рассчитывает синастрию между двумя картами
//    */
//   async getSynastry(chartA: any, chartB: any): Promise<any> {
//     try {
//       const aspects: any[] = [];
//       const planetsA = chartA.planets;
//       const planetsB = chartB.planets;
//
//       // Рассчитываем аспекты между планетами
//       for (const [planetA, dataA] of Object.entries(planetsA)) {
//         for (const [planetB, dataB] of Object.entries(planetsB)) {
//           if (planetA !== planetB) {
//             const aspect = this.calculateAspect(
//               (dataA as any).longitude,
//               (dataB as any).longitude,
//             );
//             if (aspect) {
//               aspects.push({
//                 planetA,
//                 planetB,
//                 aspect: aspect.type,
//                 orb: aspect.orb,
//                 strength: aspect.strength,
//               });
//             }
//           }
//         }
//       }
//
//       // Рассчитываем общую совместимость
//       const compatibility = this.calculateCompatibility(aspects);
//
//       return {
//         aspects,
//         compatibility,
//         summary: this.generateSynastrySummary(aspects, compatibility),
//       };
//     } catch (error) {
//       this.logger.error('Ошибка при расчёте синастрии:', error);
//       throw new Error('Не удалось рассчитать синастрию');
//     }
//   }
//
//   /**
//    * Рассчитывает композитную карту
//    */
//   async getComposite(chartA: any, chartB: any): Promise<any> {
//     try {
//       const compositePlanets: any = {};
//       const planetsA = chartA.planets;
//       const planetsB = chartB.planets;
//
//       // Рассчитываем средние позиции планет
//       for (const [planet, dataA] of Object.entries(planetsA)) {
//         if (planetsB[planet]) {
//           const dataB = planetsB[planet];
//           const compositeLongitude = this.averageLongitude(
//             (dataA as any).longitude,
//             dataB.longitude,
//           );
//
//           compositePlanets[planet] = {
//             longitude: compositeLongitude,
//             sign: this.longitudeToSign(compositeLongitude),
//             house: this.longitudeToHouse(compositeLongitude, chartA.houses),
//           };
//         }
//       }
//
//       return {
//         type: 'composite',
//         planets: compositePlanets,
//         summary: 'Композитная карта показывает общую энергию пары',
//         calculatedAt: new Date().toISOString(),
//       };
//     } catch (error) {
//       this.logger.error('Ошибка при расчёте композитной карты:', error);
//       throw new Error('Не удалось рассчитать композитную карту');
//     }
//   }
//
//   /**
//    * Преобразует дату в юлианский день
//    */
//   dateToJulianDay(date: Date): number {
//     // Попытка доинициализации Swiss Ephemeris на лету
//     if (!this.hasSE) {
//       try {
//         if (!swisseph) {
//           swisseph = require('swisseph'); // eslint-disable-line @typescript-eslint/no-require-imports
//         }
//         if (
//           swisseph &&
//           typeof swisseph === 'object' &&
//           swisseph.swe_set_ephe_path
//         ) {
//           try {
//             swisseph.swe_set_ephe_path('./ephe');
//           } catch (_pathError) {
//             try {
//               swisseph.swe_set_ephe_path(__dirname + '/../../ephe');
//             } catch (_altPathError) {
//               // ignore
//             }
//           }
//         }
//         if (
//           swisseph &&
//           swisseph.swe_calc_ut &&
//           swisseph.swe_julday &&
//           swisseph.swe_houses
//         ) {
//           this.hasSE = true;
//           this.logger.log(
//             'Swiss Ephemeris был повторно инициализирован на лету (dateToJulianDay)',
//           );
//         }
//       } catch (_e) {
//         // ignore
//       }
//     }
//
//     if (this.hasSE && swisseph) {
//       const year = date.getFullYear();
//       const month = date.getMonth() + 1;
//       const day = date.getDate();
//       const hour = date.getHours();
//       const minute = date.getMinutes();
//       const second = date.getSeconds();
//
//       return swisseph.swe_julday(
//         year,
//         month,
//         day,
//         hour + minute / 60 + second / 3600,
//         swisseph.SE_GREG_CAL,
//       );
//     } else {
//       throw new Error(
//         'Swiss Ephemeris required but not initialized in dateToJulianDay',
//       );
//     }
//   }
//
//   /**
//    * Рассчитывает позиции планет
//    */
//   async calculatePlanets(julianDay: number): Promise<any> {
//     const planets: any = {};
//     const planetNames = {
//       0: 'sun',
//       1: 'moon',
//       2: 'mercury',
//       3: 'venus',
//       4: 'mars',
//       5: 'jupiter',
//       6: 'saturn',
//       7: 'uranus',
//       8: 'neptune',
//       9: 'pluto',
//     };
//
//     this.logger.log(`Расчёт планет для юлианского дня: ${julianDay}`);
//
//     // Attempt runtime re-init if SE is not available
//     if (!this.hasSE) {
//       try {
//         if (!swisseph) {
//           swisseph = require('swisseph'); // eslint-disable-line @typescript-eslint/no-require-imports
//         }
//         if (
//           swisseph &&
//           typeof swisseph === 'object' &&
//           swisseph.swe_set_ephe_path
//         ) {
//           try {
//             swisseph.swe_set_ephe_path('./ephe');
//           } catch (_pathError) {
//             try {
//               swisseph.swe_set_ephe_path(__dirname + '/../../ephe');
//             } catch (_altPathError) {
//               // ignore
//             }
//           }
//         }
//         if (
//           swisseph &&
//           swisseph.swe_calc_ut &&
//           swisseph.swe_julday &&
//           swisseph.swe_houses
//         ) {
//           this.hasSE = true;
//           this.logger.log(
//             'Swiss Ephemeris был повторно инициализирован на лету',
//           );
//         }
//       } catch (_e) {
//         // ignore
//       }
//     }
//
//     // Fallback disabled: enforce Swiss Ephemeris only
//     if (!this.hasSE) {
//       throw new Error(
//         'Swiss Ephemeris required but not initialized in calculatePlanets',
//       );
//     }
//
//     // Проверяем валидность julianDay
//     if (isNaN(julianDay) || !isFinite(julianDay)) {
//       this.logger.error('Некорректный юлианский день:', julianDay);
//       throw new Error('Некорректная дата для расчёта планет');
//     }
//
//     for (const [planetId, planetName] of Object.entries(planetNames)) {
//       try {
//         this.logger.log(`Расчёт ${planetName} (ID: ${planetId})`);
//
//         // Используем Swiss Ephemeris с правильными флагами
//         const result = swisseph.swe_calc_ut(
//           julianDay,
//           parseInt(planetId),
//           swisseph.SEFLG_SWIEPH | swisseph.SEFLG_SPEED,
//         );
//
//         this.logger.log(`Результат для ${planetName}:`, result);
//
//         this.logger.log(`Результат для ${planetName}:`, result);
//
//         if (result && result.longitude !== undefined && !result.error) {
//           const longitude = result.longitude;
//           planets[planetName] = {
//             longitude: longitude,
//             sign: this.longitudeToSign(longitude),
//             degree: longitude % 30,
//           };
//           this.logger.log(
//             `${planetName}: ${longitude}° (${this.longitudeToSign(longitude)})`,
//           );
//         } else {
//           this.logger.error(`Ошибка расчёта ${planetName}:`, result?.error);
//           throw new Error(
//             `Не удалось рассчитать позицию ${planetName}: ${result?.error || 'Неизвестная ошибка'}`,
//           );
//         }
//       } catch (error) {
//         this.logger.error(`Критическая ошибка расчёта ${planetName}:`, error);
//         throw new Error(
//           `Критическая ошибка расчёта ${planetName}: ${error.message}`,
//         );
//       }
//     }
//
//     this.logger.log(`Рассчитано планет: ${Object.keys(planets).length}`);
//
//     // Если ни одной планеты не рассчитано, выбрасываем ошибку
//     if (Object.keys(planets).length === 0) {
//       this.logger.error('Не удалось рассчитать ни одной планеты');
//       throw new Error('Ошибка расчёта планет через Swiss Ephemeris');
//     }
//
//     return planets;
//   }
//
//   /**
//    * Рассчитывает дома
//    */
//   private async calculateHouses(
//     julianDay: number,
//     location: { latitude: number; longitude: number; timezone: number },
//   ): Promise<any> {
//     try {
//       // Попытка доинициализации Swiss Ephemeris на лету
//       if (!this.hasSE) {
//         try {
//           if (!swisseph) {
//             swisseph = require('swisseph'); // eslint-disable-line @typescript-eslint/no-require-imports
//           }
//           if (
//             swisseph &&
//             typeof swisseph === 'object' &&
//             swisseph.swe_set_ephe_path
//           ) {
//             try {
//               swisseph.swe_set_ephe_path('./ephe');
//             } catch (_pathError) {
//               try {
//                 swisseph.swe_set_ephe_path(__dirname + '/../../ephe');
//               } catch (_altPathError) {
//                 // ignore
//               }
//             }
//           }
//           if (
//             swisseph &&
//             swisseph.swe_calc_ut &&
//             swisseph.swe_julday &&
//             swisseph.swe_houses
//           ) {
//             this.hasSE = true;
//             this.logger.log(
//               'Swiss Ephemeris был повторно инициализирован на лету (houses)',
//             );
//           }
//         } catch (_e) {
//           // ignore
//         }
//       }
//
//       // Проверяем, доступен ли Swiss Ephemeris
//       if (!this.hasSE) {
//         throw new Error(
//           'Swiss Ephemeris required but not initialized in calculateHouses',
//         );
//       }
//
//       // Используем Swiss Ephemeris для расчёта домов — расширенный парсер и двойная попытка вызова
//       let rawHouses: any = null;
//       try {
//         // Попытка 1: (julianDay, latitude, longitude, system)
//         try {
//           rawHouses = swisseph.swe_houses(
//             julianDay,
//             location.latitude,
//             location.longitude,
//             'P', // Placidus system
//           );
//           this.logger.log('swe_houses result (lat,lon):', rawHouses);
//         } catch (e1) {
//           this.logger.warn('swe_houses (lat,lon) failed:', e1);
//           rawHouses = null;
//         }
//
//         // Попытка 2: (julianDay, longitude, latitude, system) — на случай отличий биндинга
//         if (!rawHouses) {
//           try {
//             rawHouses = swisseph.swe_houses(
//               julianDay,
//               location.longitude,
//               location.latitude,
//               'P',
//             );
//             this.logger.log('swe_houses result (lon,lat):', rawHouses);
//           } catch (e2) {
//             this.logger.warn('swe_houses (lon,lat) failed:', e2);
//           }
//         }
//       } catch (error) {
//         this.logger.warn('Ошибка при вызове swe_houses:', error);
//         rawHouses = null;
//       }
//
//       const houses: any = {};
//
//       // Пытаемся извлечь массив cusps из разных форматов возврата
//       let cuspsArray: number[] | null = null;
//
//       // Вариант A: напрямую массив длиной >= 13
//       if (Array.isArray(rawHouses) && rawHouses.length >= 13) {
//         cuspsArray = rawHouses as number[];
//       }
//       // Вариант B: объект с полем cusps (массив)
//       else if (
//         rawHouses &&
//         Array.isArray(rawHouses.cusps) &&
//         rawHouses.cusps.length >= 13
//       ) {
//         cuspsArray = rawHouses.cusps as number[];
//       }
//       // Вариант C: вложенный массив [cusps, ...]
//       else if (
//         rawHouses &&
//         Array.isArray(rawHouses[0]) &&
//         rawHouses[0].length >= 13
//       ) {
//         cuspsArray = rawHouses[0] as number[];
//       }
//       // Вариант D: объект с полем house (массив из 12 значений)
//       else if (
//         rawHouses &&
//         Array.isArray(rawHouses.house) &&
//         rawHouses.house.length >= 12
//       ) {
//         const h = rawHouses.house as number[];
//         const tmp: number[] = [];
//         for (let i = 1; i <= 12; i++) {
//           const v = Number(h[i - 1]);
//           if (!isNaN(v)) {
//             tmp[i] = v;
//           }
//         }
//         cuspsArray = tmp;
//       }
//       // Вариант E: объект с числовыми ключами "1".."12"
//       else if (rawHouses && typeof rawHouses === 'object') {
//         const maybe: number[] = [];
//         let found = false;
//         for (let i = 1; i <= 12; i++) {
//           const key = String(i);
//           if (Object.prototype.hasOwnProperty.call(rawHouses, key)) {
//             const v = Number(rawHouses[key]);
//             if (!isNaN(v)) {
//               maybe[i] = v;
//               found = true;
//             }
//           }
//         }
//         if (found) {
//           cuspsArray = maybe;
//         }
//       }
//
//       if (cuspsArray) {
//         // Заполняем дома значениями cuspsArray[1..12]
//         for (let i = 1; i <= 12; i++) {
//           const cusp = cuspsArray[i];
//           if (
//             typeof cusp === 'number' &&
//             !isNaN(cusp) &&
//             cusp >= 0 &&
//             cusp < 360
//           ) {
//             houses[i] = {
//               cusp: cusp,
//               sign: this.longitudeToSign(cusp),
//             };
//           } else {
//             this.logger.warn(
//               `Некорректный или отсутствующий cusp для дома ${i}:`,
//               cusp,
//             );
//             houses[i] = {
//               cusp: (i - 1) * 30,
//               sign: this.longitudeToSign((i - 1) * 30),
//             };
//           }
//         }
//         this.logger.log('Дома рассчитаны через Swiss Ephemeris (parsed cusps)');
//       } else {
//         this.logger.warn(
//           'Не удалось распарсить результат swe_houses — используем fallback. rawHouses:',
//           rawHouses,
//         );
//         // Fallback - создаём упрощённые дома
//         for (let i = 1; i <= 12; i++) {
//           houses[i] = {
//             cusp: (i - 1) * 30,
//             sign: this.longitudeToSign((i - 1) * 30),
//           };
//         }
//       }
//
//       return houses;
//     } catch (error) {
//       this.logger.warn(
//         'Ошибка при расчёте домов через Swiss Ephemeris:',
//         error,
//       );
//       // Fallback - создаём упрощённые дома
//       const houses: any = {};
//       for (let i = 1; i <= 12; i++) {
//         houses[i] = {
//           cusp: (i - 1) * 30,
//           sign: this.longitudeToSign((i - 1) * 30),
//         };
//       }
//       return houses;
//     }
//   }
//
//   /**
//    * Рассчитывает аспекты между планетами
//    */
//   private calculateAspects(planets: any): any[] {
//     const aspects: any[] = [];
//     const planetEntries = Object.entries(planets);
//
//     for (let i = 0; i < planetEntries.length; i++) {
//       for (let j = i + 1; j < planetEntries.length; j++) {
//         const [planetA, dataA] = planetEntries[i];
//         const [planetB, dataB] = planetEntries[j];
//
//         const aspect = this.calculateAspect(
//           (dataA as any).longitude,
//           (dataB as any).longitude,
//         );
//         if (aspect) {
//           aspects.push({
//             planetA,
//             planetB,
//             aspect: aspect.type,
//             orb: aspect.orb,
//             strength: aspect.strength,
//           });
//         }
//       }
//     }
//
//     return aspects;
//   }
//
//   /**
//    * Рассчитывает аспект между двумя долготами
//    */
//   private calculateAspect(longitude1: number, longitude2: number): any | null {
//     const diff = Math.abs(longitude1 - longitude2);
//     const normalizedDiff = Math.min(diff, 360 - diff);
//
//     const aspects = [
//       { type: 'conjunction', angle: 0, orb: 8 },
//       { type: 'sextile', angle: 60, orb: 6 },
//       { type: 'square', angle: 90, orb: 8 },
//       { type: 'trine', angle: 120, orb: 8 },
//       { type: 'opposition', angle: 180, orb: 8 },
//     ];
//
//     for (const aspect of aspects) {
//       const orb = Math.abs(normalizedDiff - aspect.angle);
//       if (orb <= aspect.orb) {
//         return {
//           type: aspect.type,
//           orb: orb,
//           strength: 1 - orb / aspect.orb,
//         };
//       }
//     }
//
//     return null;
//   }
//
//   /**
//    * Преобразует долготу в знак зодиака
//    */
//   private longitudeToSign(longitude: number): string {
//     const signs = [
//       'Aries',
//       'Taurus',
//       'Gemini',
//       'Cancer',
//       'Leo',
//       'Virgo',
//       'Libra',
//       'Scorpio',
//       'Sagittarius',
//       'Capricorn',
//       'Aquarius',
//       'Pisces',
//     ];
//     const signIndex = Math.floor(longitude / 30);
//     return signs[signIndex % 12];
//   }
//
//   /**
//    * Преобразует долготу в дом
//    */
//   private longitudeToHouse(longitude: number, houses: any): number {
//     for (let i = 1; i <= 12; i++) {
//       const nextHouse = i === 12 ? 1 : i + 1;
//       const currentCusp = houses[i]?.cusp || 0;
//       const nextCusp = houses[nextHouse]?.cusp || 0;
//
//       if (this.isInHouse(longitude, currentCusp, nextCusp)) {
//         return i;
//       }
//     }
//     return 1; // Fallback
//   }
//
//   /**
//    * Проверяет, находится ли долгота в доме
//    */
//   private isInHouse(longitude: number, cusp1: number, cusp2: number): boolean {
//     if (cusp1 <= cusp2) {
//       return longitude >= cusp1 && longitude < cusp2;
//     } else {
//       return longitude >= cusp1 || longitude < cusp2;
//     }
//   }
//
//   /**
//    * Рассчитывает среднюю долготу
//    */
//   private averageLongitude(longitude1: number, longitude2: number): number {
//     let avg = (longitude1 + longitude2) / 2;
//     if (Math.abs(longitude1 - longitude2) > 180) {
//       avg += 180;
//     }
//     return avg % 360;
//   }
//
//   /**
//    * Рассчитывает совместимость на основе аспектов
//    */
//   private calculateCompatibility(aspects: any[]): number {
//     let totalScore = 0;
//     let aspectCount = 0;
//
//     for (const aspect of aspects) {
//       const weight = this.getAspectWeight(aspect.type);
//       totalScore += aspect.strength * weight;
//       aspectCount++;
//     }
//
//     return aspectCount > 0 ? Math.round((totalScore / aspectCount) * 100) : 0;
//   }
//
//   /**
//    * Возвращает вес аспекта для совместимости
//    */
//   private getAspectWeight(aspectType: string): number {
//     const weights = {
//       conjunction: 0.8,
//       sextile: 0.9,
//       square: 0.3,
//       trine: 1.0,
//       opposition: 0.5,
//     };
//     return weights[aspectType] || 0.5;
//   }
//
//   /**
//    * Генерирует краткое описание синастрии
//    */
//   private generateSynastrySummary(
//     aspects: any[],
//     compatibility: number,
//   ): string {
//     const positiveAspects = aspects.filter((a) =>
//       ['sextile', 'trine', 'conjunction'].includes(a.type),
//     );
//     const challengingAspects = aspects.filter((a) =>
//       ['square', 'opposition'].includes(a.type),
//     );
//
//     let summary = `Совместимость: ${compatibility}%`;
//
//     if (positiveAspects.length > 0) {
//       summary += `\nГармоничные аспекты: ${positiveAspects.length}`;
//     }
//
//     if (challengingAspects.length > 0) {
//       summary += `\nСложные аспекты: ${challengingAspects.length}`;
//     }
//
//     return summary;
//   }
// }

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
      this.logger.error('Не удалось загрузить Swiss Ephemeris:', error.message);
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
        planets[planetName] = {
          longitude: longitude,
          sign: this.longitudeToSign(longitude),
          degree: longitude % 30,
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
      this.logger.warn('Используем упрощённый расчёт домов:', error.message);
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
    const weights = {
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
