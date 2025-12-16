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
        .map((place) => this.mapNominatimPlace(place))
        .filter(
          (option): option is Omit<CityOption, 'tzid'> => Boolean(option),
        );

      // Enrich with timezone in parallel, with fallback to UTC
      const enriched = await Promise.all(
        options.map(async (option) => ({
          ...option,
          tzid: await this.lookupTimezone(option.lat, option.lon),
        })),
      );

      return enriched;
    } catch (error) {
      this.logger.error(
        `Failed to fetch city suggestions: ${error.message}`,
        error.stack,
      );
      // Return empty array instead of throwing to gracefully handle API failures
      return [];
    }
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
    } catch (error) {
      // Swallow timezone lookup errors and fall back to UTC so suggestions still work
      this.logger.debug(`Timezone lookup failed for ${lat},${lon}: ${error.message}`);
    }

    return 'UTC';
  }
}
