import { ASPECT_ANGLES, PlanetKey, TRANSIT_ORBS } from './types';

/**
 * Получить допустимый орбис (°) для транзитной планеты и аспекта.
 * Сейчас аспект-специфика не учитывается (все аспекты для планеты = один орбис),
 * при необходимости легко расширить до матрицы [planet][aspect].
 */
export function getTransitOrb(transitPlanet: PlanetKey, _aspect?: keyof typeof ASPECT_ANGLES): number {
  return TRANSIT_ORBS[transitPlanet] ?? 1;
}

/**
 * Определить дом (1..12) по долготе планеты и структуре домов (с cusp).
 * Работает с wrap-around (дом 12 -> 1).
 */
export function getHouseForLongitude(longitude: number, houses: Record<number, { cusp: number }> | any): number {
  for (let i = 1; i <= 12; i++) {
    const next = i === 12 ? 1 : i + 1;
    const currentCusp = houses?.[i]?.cusp ?? 0;
    const nextCusp = houses?.[next]?.cusp ?? 0;

    if (currentCusp <= nextCusp) {
      if (longitude >= currentCusp && longitude < nextCusp) return i;
    } else {
      // сектор через 0°
      if (longitude >= currentCusp || longitude < nextCusp) return i;
    }
  }
  return 1;
}

/**
 * Простой детерминированный хеш для выбора фраз по сигнатуре транзита.
 */
export function hashSignature(parts: Array<string | number | boolean>): number {
  const str = parts.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    // простая rolling-сумма
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}
