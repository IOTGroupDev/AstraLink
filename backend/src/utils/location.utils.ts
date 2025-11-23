/**
 * Utility functions for location and timezone handling
 */

import type { LocationCoordinates } from '../types/connection';

/**
 * Database of major cities with their coordinates and timezones
 * Expandable to include more cities as needed
 */
export const CITY_COORDINATES: Record<string, LocationCoordinates> = {
  // Russia
  Москва: { latitude: 55.7558, longitude: 37.6176, timezone: 3 },
  'Санкт-Петербург': { latitude: 59.9311, longitude: 30.3609, timezone: 3 },
  Екатеринбург: { latitude: 56.8431, longitude: 60.6454, timezone: 5 },
  Новосибирск: { latitude: 55.0084, longitude: 82.9357, timezone: 7 },
  Казань: { latitude: 55.7887, longitude: 49.1221, timezone: 3 },
  'Нижний Новгород': { latitude: 56.2965, longitude: 43.9361, timezone: 3 },
  Челябинск: { latitude: 55.1644, longitude: 61.4368, timezone: 5 },
  Самара: { latitude: 53.1959, longitude: 50.1002, timezone: 4 },
  Омск: { latitude: 54.9885, longitude: 73.3242, timezone: 6 },
  'Ростов-на-Дону': { latitude: 47.2357, longitude: 39.7015, timezone: 3 },
  Уфа: { latitude: 54.7388, longitude: 55.9721, timezone: 5 },
  Красноярск: { latitude: 56.0153, longitude: 92.8932, timezone: 7 },
  Воронеж: { latitude: 51.672, longitude: 39.1843, timezone: 3 },
  Пермь: { latitude: 58.0105, longitude: 56.2502, timezone: 5 },
  Волгоград: { latitude: 48.708, longitude: 44.5133, timezone: 3 },

  // Europe
  London: { latitude: 51.5074, longitude: -0.1278, timezone: 0 },
  Paris: { latitude: 48.8566, longitude: 2.3522, timezone: 1 },
  Berlin: { latitude: 52.52, longitude: 13.405, timezone: 1 },
  Madrid: { latitude: 40.4168, longitude: -3.7038, timezone: 1 },
  Rome: { latitude: 41.9028, longitude: 12.4964, timezone: 1 },
  Amsterdam: { latitude: 52.3676, longitude: 4.9041, timezone: 1 },
  Vienna: { latitude: 48.2082, longitude: 16.3738, timezone: 1 },
  Prague: { latitude: 50.0755, longitude: 14.4378, timezone: 1 },
  Warsaw: { latitude: 52.2297, longitude: 21.0122, timezone: 1 },
  Athens: { latitude: 37.9838, longitude: 23.7275, timezone: 2 },

  // Americas
  'New York': { latitude: 40.7128, longitude: -74.006, timezone: -5 },
  'Los Angeles': { latitude: 34.0522, longitude: -118.2437, timezone: -8 },
  Chicago: { latitude: 41.8781, longitude: -87.6298, timezone: -6 },
  Toronto: { latitude: 43.6532, longitude: -79.3832, timezone: -5 },
  'Mexico City': { latitude: 19.4326, longitude: -99.1332, timezone: -6 },
  'São Paulo': { latitude: -23.5505, longitude: -46.6333, timezone: -3 },
  'Buenos Aires': { latitude: -34.6037, longitude: -58.3816, timezone: -3 },

  // Asia
  Tokyo: { latitude: 35.6762, longitude: 139.6503, timezone: 9 },
  Beijing: { latitude: 39.9042, longitude: 116.4074, timezone: 8 },
  Shanghai: { latitude: 31.2304, longitude: 121.4737, timezone: 8 },
  'Hong Kong': { latitude: 22.3193, longitude: 114.1694, timezone: 8 },
  Singapore: { latitude: 1.3521, longitude: 103.8198, timezone: 8 },
  Seoul: { latitude: 37.5665, longitude: 126.978, timezone: 9 },
  Mumbai: { latitude: 19.076, longitude: 72.8777, timezone: 5.5 },
  Delhi: { latitude: 28.7041, longitude: 77.1025, timezone: 5.5 },
  Bangkok: { latitude: 13.7563, longitude: 100.5018, timezone: 7 },
  Dubai: { latitude: 25.2048, longitude: 55.2708, timezone: 4 },
  Istanbul: { latitude: 41.0082, longitude: 28.9784, timezone: 3 },

  // Oceania
  Sydney: { latitude: -33.8688, longitude: 151.2093, timezone: 10 },
  Melbourne: { latitude: -37.8136, longitude: 144.9631, timezone: 10 },
  Auckland: { latitude: -36.8485, longitude: 174.7633, timezone: 12 },

  // Africa
  Cairo: { latitude: 30.0444, longitude: 31.2357, timezone: 2 },
  Johannesburg: { latitude: -26.2041, longitude: 28.0473, timezone: 2 },
  Lagos: { latitude: 6.5244, longitude: 3.3792, timezone: 1 },
};

// Default location (Moscow) for unknown cities
export const DEFAULT_LOCATION: LocationCoordinates = {
  latitude: 55.7558,
  longitude: 37.6176,
  timezone: 3,
};

/**
 * Get coordinates for a city by name
 * Returns default location (Moscow) if city is not found
 *
 * @param cityName - Name of the city
 * @returns Location coordinates with latitude, longitude, and timezone
 */
export function getLocationCoordinates(cityName: string): LocationCoordinates {
  // Try exact match first
  if (CITY_COORDINATES[cityName]) {
    return CITY_COORDINATES[cityName];
  }

  // Try case-insensitive match
  const normalizedCity = cityName.trim();
  const cityKey = Object.keys(CITY_COORDINATES).find(
    (key) => key.toLowerCase() === normalizedCity.toLowerCase(),
  );

  if (cityKey) {
    return CITY_COORDINATES[cityKey];
  }

  // Return default location if not found
  console.warn(
    `City "${cityName}" not found in database, using default location (Moscow)`,
  );
  return DEFAULT_LOCATION;
}

/**
 * Check if a city exists in the database
 *
 * @param cityName - Name of the city
 * @returns True if city exists in database
 */
export function isCitySupported(cityName: string): boolean {
  const normalizedCity = cityName.trim().toLowerCase();
  return Object.keys(CITY_COORDINATES).some(
    (key) => key.toLowerCase() === normalizedCity,
  );
}

/**
 * Get list of all supported cities
 *
 * @returns Array of city names
 */
export function getSupportedCities(): string[] {
  return Object.keys(CITY_COORDINATES).sort();
}

/**
 * Get location from birth data or city name
 * Prioritizes explicit coordinates from birth data
 *
 * @param birthPlace - City name or location string
 * @param latitude - Optional explicit latitude
 * @param longitude - Optional explicit longitude
 * @param timezone - Optional explicit timezone
 * @returns Location coordinates
 */
export function getLocationFromBirthData(
  birthPlace?: string,
  latitude?: number,
  longitude?: number,
  timezone?: number,
): LocationCoordinates {
  // If explicit coordinates are provided, use them
  if (
    latitude !== undefined &&
    longitude !== undefined &&
    timezone !== undefined
  ) {
    return { latitude, longitude, timezone };
  }

  // Otherwise, look up by city name
  return getLocationCoordinates(birthPlace || 'Москва');
}
