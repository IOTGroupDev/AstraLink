import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios from 'axios';

export type CityOption = {
  id: string;
  display: string;
  city?: string;
  country?: string;
  lat: number;
  lon: number;
  tzid: string;
};

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly nominatimEndpoint =
    'https://nominatim.openstreetmap.org/search';

  // Fallback cities for development/testing when external API is unavailable
  private readonly fallbackCities: CityOption[] = [
    { id: '1', display: 'Москва, Россия', city: 'Москва', country: 'RU', lat: 55.7558, lon: 37.6173, tzid: 'Europe/Moscow' },
    { id: '2', display: 'Санкт-Петербург, Россия', city: 'Санкт-Петербург', country: 'RU', lat: 59.9311, lon: 30.3609, tzid: 'Europe/Moscow' },
    { id: '3', display: 'Нью-Йорк, США', city: 'Нью-Йорк', country: 'US', lat: 40.7128, lon: -74.0060, tzid: 'America/New_York' },
    { id: '4', display: 'Лондон, Великобритания', city: 'Лондон', country: 'GB', lat: 51.5074, lon: -0.1278, tzid: 'Europe/London' },
    { id: '5', display: 'Париж, Франция', city: 'Париж', country: 'FR', lat: 48.8566, lon: 2.3522, tzid: 'Europe/Paris' },
    { id: '6', display: 'Токио, Япония', city: 'Токио', country: 'JP', lat: 35.6762, lon: 139.6503, tzid: 'Asia/Tokyo' },
    { id: '7', display: 'Берлин, Германия', city: 'Берлин', country: 'DE', lat: 52.5200, lon: 13.4050, tzid: 'Europe/Berlin' },
    { id: '8', display: 'Рим, Италия', city: 'Рим', country: 'IT', lat: 41.9028, lon: 12.4964, tzid: 'Europe/Rome' },
  ];

  async suggestCities(q: string, lang = 'ru'): Promise<CityOption[]> {
    try {
      this.logger.log(`Searching cities for: "${q}"`);

      const response = await axios.get(this.nominatimEndpoint, {
        params: {
          q,
          format: 'json',
          limit: 8,
          addressdetails: 1,
          'accept-language': lang,
        },
        headers: {
          'User-Agent': 'AstraLink/1.0 (Astrology App)',
        },
        timeout: 10000,
        // Axios will use HTTP_PROXY/HTTPS_PROXY env vars automatically
      });

      if (!response.data || !Array.isArray(response.data)) {
        this.logger.warn('Invalid response from Nominatim');
        return [];
      }

      this.logger.log(`Found ${response.data.length} results`);

      const options = response.data
        .map((place: any) => this.mapNominatimPlace(place))
        .filter(
          (option: any): option is Omit<CityOption, 'tzid'> =>
            Boolean(option),
        );

      // Enrich with timezone in parallel, with fallback to UTC
      const enriched = await Promise.all(
        options.map(async (option: Omit<CityOption, 'tzid'>) => ({
          ...option,
          tzid: await this.lookupTimezone(option.lat, option.lon),
        })),
      );

      return enriched;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch city suggestions: ${error.message}`,
        error.stack,
      );
      // Fallback to static city list for development/testing
      this.logger.warn('Using fallback city list');
      return this.filterFallbackCities(q);
    }
  }

  private filterFallbackCities(query: string): CityOption[] {
    const q = query.toLowerCase();
    return this.fallbackCities.filter(
      (city) =>
        city.city?.toLowerCase().includes(q) ||
        city.display.toLowerCase().includes(q),
    );
  }

  private mapNominatimPlace(place: any): Omit<CityOption, 'tzid'> | null {
    const lat = parseFloat(place?.lat);
    const lon = parseFloat(place?.lon);

    if (isNaN(lat) || isNaN(lon)) {
      return null;
    }

    const address = place?.address ?? {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      place?.name;
    const country = address.country;
    const countryCode = address.country_code?.toUpperCase();
    const state = address.state || address.region;

    // Build display name prioritizing: city, state, country
    const displayParts = [city, state, country].filter(Boolean);
    const display = displayParts.length > 0 ? displayParts.join(', ') : place?.display_name || `${lat},${lon}`;

    return {
      id: String(place?.osm_id ?? place?.place_id ?? `${lat},${lon}`),
      display,
      city: city || display,
      country: countryCode || '',
      lat,
      lon,
    };
  }

  private async lookupTimezone(lat: number, lon: number): Promise<string> {
    try {
      // Try to get timezone using timeapi.io (free, no key required)
      const response = await axios.get(
        `https://timeapi.io/api/TimeZone/coordinate`,
        {
          params: { latitude: lat, longitude: lon },
          timeout: 3000,
        },
      );

      const tzid = response.data?.timeZone;
      if (typeof tzid === 'string' && tzid.length > 0) {
        return tzid;
      }
    } catch (error: any) {
      // Swallow timezone lookup errors and fall back to UTC so suggestions still work
      this.logger.debug(
        `Timezone lookup failed for ${lat},${lon}: ${error.message}`,
      );
    }

    return 'UTC';
  }
}
