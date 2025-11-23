// utils/ephemeris.utils.ts

import {
  SIGNS,
  PLANETS,
  ASPECT_ANGLES,
  AspectType,
} from '../types/astrology.types';
import type {
  PlanetPosition,
  Aspect,
  HousePosition,
} from '../types/astrology.types';

/**
 * Convert date to Julian Day Number
 */
export const dateToJulianDay = (date: Date): number => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;

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

/**
 * Convert Julian Day to Date
 */
export const julianDayToDate = (jd: number): Date => {
  const JD = jd + 0.5;
  const Z = Math.floor(JD);
  const F = JD - Z;

  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }

  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const day = B - D - Math.floor(30.6001 * E) + F;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;

  const hours = (day - Math.floor(day)) * 24;
  const minutes = (hours - Math.floor(hours)) * 60;
  const seconds = (minutes - Math.floor(minutes)) * 60;

  return new Date(
    Date.UTC(
      year,
      month - 1,
      Math.floor(day),
      Math.floor(hours),
      Math.floor(minutes),
      Math.floor(seconds)
    )
  );
};

/**
 * Normalize angle to 0-360 range
 */
export const normalizeAngle = (angle: number): number => {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
};

/**
 * Calculate the shortest distance between two angles
 */
export const angleDifference = (angle1: number, angle2: number): number => {
  let diff = Math.abs(angle1 - angle2);
  if (diff > 180) diff = 360 - diff;
  return diff;
};

/**
 * Convert longitude to zodiac sign info
 */
export const longitudeToSign = (longitude: number) => {
  const normalizedLong = normalizeAngle(longitude);
  const signIndex = Math.floor(normalizedLong / 30);
  const degreeInSign = normalizedLong % 30;
  const degree = Math.floor(degreeInSign);
  const minute = Math.floor((degreeInSign - degree) * 60);
  const second = Math.floor(((degreeInSign - degree) * 60 - minute) * 60);

  return {
    sign: SIGNS[signIndex].name,
    signIndex,
    signSymbol: SIGNS[signIndex].symbol,
    degree,
    minute,
    second,
    element: SIGNS[signIndex].element,
    quality: SIGNS[signIndex].quality,
  };
};

/**
 * Format position as string (e.g., "♈ 15°30'")
 */
export const formatPosition = (longitude: number): string => {
  const { signSymbol, degree, minute } = longitudeToSign(longitude);
  return `${signSymbol} ${degree}°${minute.toString().padStart(2, '0')}'`;
};

/**
 * Calculate aspects between planets
 */
export const calculateAspects = (planets: PlanetPosition[]): Aspect[] => {
  const aspects: Aspect[] = [];

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const planet1 = planets[i];
      const planet2 = planets[j];

      const angle = angleDifference(planet1.longitude, planet2.longitude);

      for (const [aspectType, config] of Object.entries(ASPECT_ANGLES)) {
        const orb = Math.abs(angle - config.angle);

        if (orb <= config.orb) {
          const isApplying = calculateIsApplying(
            planet1,
            planet2,
            config.angle
          );

          aspects.push({
            planet1: planet1.name,
            planet2: planet2.name,
            type: aspectType as AspectType,
            angle: config.angle,
            orb,
            isApplying,
          });
        }
      }
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb);
};

/**
 * Determine if an aspect is applying or separating
 */
const calculateIsApplying = (
  planet1: PlanetPosition,
  planet2: PlanetPosition,
  aspectAngle: number
): boolean => {
  const currentAngle = angleDifference(planet1.longitude, planet2.longitude);

  // Calculate where they'll be in 1 day
  const futureAngle1 = normalizeAngle(planet1.longitude + planet1.speed);
  const futureAngle2 = normalizeAngle(planet2.longitude + planet2.speed);
  const futureDistance = angleDifference(futureAngle1, futureAngle2);

  // If future distance to aspect is less than current, it's applying
  const currentDiff = Math.abs(currentAngle - aspectAngle);
  const futureDiff = Math.abs(futureDistance - aspectAngle);

  return futureDiff < currentDiff;
};

/**
 * Calculate house position for a planet
 */
export const calculateHousePosition = (
  planetLongitude: number,
  houses: HousePosition[]
): number => {
  const normalizedLong = normalizeAngle(planetLongitude);

  for (let i = 0; i < houses.length; i++) {
    const currentCusp = houses[i].cusp;
    const nextCusp = houses[(i + 1) % 12].cusp;

    if (nextCusp > currentCusp) {
      if (normalizedLong >= currentCusp && normalizedLong < nextCusp) {
        return i + 1;
      }
    } else {
      // Handle wrap-around at 360/0 degrees
      if (normalizedLong >= currentCusp || normalizedLong < nextCusp) {
        return i + 1;
      }
    }
  }

  return 1; // Default to first house
};

/**
 * Calculate decimal hours from time string
 */
export const timeToDecimal = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + minutes / 60;
};

/**
 * Convert local time to UTC
 */
export const localToUTC = (
  date: string,
  time: string,
  timezone: string
): Date => {
  const dateTimeString = `${date}T${time}`;
  const localDate = new Date(dateTimeString);

  // This is a simplified version - in production, use a proper timezone library
  const offsetMatch = timezone.match(/([+-]\d{2}):?(\d{2})?/);
  if (offsetMatch) {
    const hours = parseInt(offsetMatch[1]);
    const minutes = parseInt(offsetMatch[2] || '0');
    const offsetMinutes = hours * 60 + (hours < 0 ? -minutes : minutes);
    return new Date(localDate.getTime() - offsetMinutes * 60000);
  }

  return localDate;
};

/**
 * Calculate sidereal time
 */
export const calculateSiderealTime = (
  jd: number,
  longitude: number
): number => {
  const T = (jd - 2451545.0) / 36525.0;

  // Mean sidereal time at Greenwich
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    T * T * (0.000387933 - T / 38710000.0);

  gmst = normalizeAngle(gmst);

  // Local sidereal time
  const lst = normalizeAngle(gmst + longitude);

  return lst;
};

/**
 * Parse Swiss Ephemeris response
 */
export const parseSwissEphemerisResponse = (
  data: any,
  houses: HousePosition[]
): PlanetPosition[] => {
  return data.planets.map((planetData: any, index: number) => {
    const planet = PLANETS[index];
    const signInfo = longitudeToSign(planetData.longitude);
    const isRetrograde = planetData.speed < 0;
    const housePosition = calculateHousePosition(planetData.longitude, houses);

    return {
      id: planet.id,
      name: planet.name,
      symbol: planet.symbol,
      longitude: planetData.longitude,
      latitude: planetData.latitude,
      distance: planetData.distance,
      speed: planetData.speed,
      speedLongitude: planetData.speedLongitude,
      sign: signInfo.sign,
      signIndex: signInfo.signIndex,
      degree: signInfo.degree,
      minute: signInfo.minute,
      second: signInfo.second,
      isRetrograde,
      house: housePosition,
    };
  });
};

/**
 * Format degrees, minutes, seconds
 */
export const formatDMS = (
  degrees: number,
  minutes: number,
  seconds?: number
): string => {
  if (seconds !== undefined) {
    return `${degrees}°${minutes.toString().padStart(2, '0')}'${seconds.toString().padStart(2, '0')}"`;
  }
  return `${degrees}°${minutes.toString().padStart(2, '0')}'`;
};

/**
 * Get planet dignity (rulership, exaltation, detriment, fall)
 */
export const getPlanetDignity = (
  planetName: string,
  signName: string
): string | null => {
  const dignities: Record<string, Record<string, string>> = {
    Sun: {
      Leo: 'Ruler',
      Aries: 'Exaltation',
      Aquarius: 'Detriment',
      Libra: 'Fall',
    },
    Moon: {
      Cancer: 'Ruler',
      Taurus: 'Exaltation',
      Capricorn: 'Detriment',
      Scorpio: 'Fall',
    },
    Mercury: {
      Gemini: 'Ruler',
      Virgo: 'Ruler',
      Aquarius: 'Exaltation',
      Sagittarius: 'Detriment',
      Pisces: 'Fall',
    },
    Venus: {
      Taurus: 'Ruler',
      Libra: 'Ruler',
      Pisces: 'Exaltation',
      Aries: 'Detriment',
      Virgo: 'Fall',
    },
    Mars: {
      Aries: 'Ruler',
      Scorpio: 'Ruler',
      Capricorn: 'Exaltation',
      Libra: 'Detriment',
      Cancer: 'Fall',
    },
    Jupiter: {
      Sagittarius: 'Ruler',
      Pisces: 'Ruler',
      Cancer: 'Exaltation',
      Gemini: 'Detriment',
      Capricorn: 'Fall',
    },
    Saturn: {
      Capricorn: 'Ruler',
      Aquarius: 'Ruler',
      Libra: 'Exaltation',
      Cancer: 'Detriment',
      Aries: 'Fall',
    },
  };

  return dignities[planetName]?.[signName] || null;
};
