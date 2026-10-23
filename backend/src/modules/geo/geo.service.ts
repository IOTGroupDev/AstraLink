import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';
import { createHash } from 'crypto';
import { RedisService } from '@/redis/redis.service';
import { find as findTimezones } from 'geo-tz';

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

  constructor(private readonly redis: RedisService) {}

  async suggestCities(q: string, lang = 'ru'): Promise<CityOption[]> {
    const normalized = q.trim().toLowerCase();
    const key = `geo:query:${lang}:${createHash('sha256').update(normalized).digest('hex')}`;
    const cached = await this.redis.get<CityOption[]>(key);
    if (cached) return cached;
    const client = this.redis.getClient();
    if (!client)
      throw new ServiceUnavailableException(
        'City search is temporarily unavailable',
      );
    let lease = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      lease =
        (await client.set('geo:nominatim:request', '1', 'PX', 1100, 'NX')) ===
        'OK';
      if (lease) break;
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
    if (!lease)
      throw new ServiceUnavailableException(
        'City search is busy; please retry',
      );
    const options = await this.fetchCities(q, lang);
    await this.redis.set(key, options, options.length ? 86400 : 60);
    return options;
  }

  private readonly fallbackCities: CityOption[] = [
    {
      id: '1',
      display: 'Москва, Россия',
      city: 'Москва',
      country: 'RU',
      lat: 55.7558,
      lon: 37.6173,
      tzid: 'Europe/Moscow',
    },
    {
      id: '2',
      display: 'Санкт-Петербург, Россия',
      city: 'Санкт-Петербург',
      country: 'RU',
      lat: 59.9311,
      lon: 30.3609,
      tzid: 'Europe/Moscow',
    },
    {
      id: '3',
      display: 'Нью-Йорк, США',
      city: 'Нью-Йорк',
      country: 'US',
      lat: 40.7128,
      lon: -74.006,
      tzid: 'America/New_York',
    },
    {
      id: '4',
      display: 'Лондон, Великобритания',
      city: 'Лондон',
      country: 'GB',
      lat: 51.5074,
      lon: -0.1278,
      tzid: 'Europe/London',
    },
    {
      id: '5',
      display: 'Париж, Франция',
      city: 'Париж',
      country: 'FR',
      lat: 48.8566,
      lon: 2.3522,
      tzid: 'Europe/Paris',
    },
    {
      id: '6',
      display: 'Токио, Япония',
      city: 'Токио',
      country: 'JP',
      lat: 35.6762,
      lon: 139.6503,
      tzid: 'Asia/Tokyo',
    },
    {
      id: '7',
      display: 'Берлин, Германия',
      city: 'Берлин',
      country: 'DE',
      lat: 52.52,
      lon: 13.405,
      tzid: 'Europe/Berlin',
    },
    {
      id: '8',
      display: 'Рим, Италия',
      city: 'Рим',
      country: 'IT',
      lat: 41.9028,
      lon: 12.4964,
      tzid: 'Europe/Rome',
    },
  ];

  private async fetchCities(q: string, lang = 'ru'): Promise<CityOption[]> {
    try {
      const response = await axios.get(this.nominatimEndpoint, {
        params: {
          q,
          format: 'json',
          limit: 8,
          addressdetails: 1,
          'accept-language': lang,
        },
        headers: {
          'User-Agent': process.env.GEO_USER_AGENT || 'AstraLink/1.0',
        },
        timeout: 5000,
        // Axios will use HTTP_PROXY/HTTPS_PROXY env vars automatically
      });

      if (!response.data || !Array.isArray(response.data)) {
        this.logger.warn('Invalid response from Nominatim');
        return [];
      }

      this.logger.log(`Found ${response.data.length} results`);

      const options = response.data
        .map((place: any) => this.mapNominatimPlace(place))
        .filter((option: any): option is Omit<CityOption, 'tzid'> =>
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
    const display =
      displayParts.length > 0
        ? displayParts.join(', ')
        : place?.display_name || `${lat},${lon}`;

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
    const zones = findTimezones(lat, lon);
    if (zones.length !== 1)
      throw new Error(
        'Timezone boundary is ambiguous; select another city location',
      );
    return zones[0];
  }
}
