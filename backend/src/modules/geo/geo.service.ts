import { Injectable, InternalServerErrorException } from '@nestjs/common';

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
  private readonly photonEndpoint = 'https://photon.komoot.io/api/';
  private readonly timezoneEndpoint = 'https://api.open-meteo.com/v1/timezone';

  async suggestCities(q: string, lang = 'ru'): Promise<CityOption[]> {
    const url =
      `${this.photonEndpoint}?q=${encodeURIComponent(q)}` +
      `&limit=8&lang=${encodeURIComponent(lang)}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new InternalServerErrorException(
        'Failed to fetch city suggestions',
      );
    }

    const data: any = await res.json();
    const features: any[] = Array.isArray(data?.features) ? data.features : [];

    const options = features
      .map((feature) => this.mapFeature(feature))
      .filter((option): option is Omit<CityOption, 'tzid'> => Boolean(option));

    const enriched = await Promise.all(
      options.map(async (option) => ({
        ...option,
        tzid: await this.lookupTimezone(option.lat, option.lon),
      })),
    );

    return enriched;
  }

  private mapFeature(feature: any): Omit<CityOption, 'tzid'> | null {
    const props = feature?.properties ?? {};
    const [lon, lat] = feature?.geometry?.coordinates ?? [];

    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return null;
    }

    const city = props.city || props.name;
    const country = props.countrycode?.toUpperCase();
    const state = props.state;

    const display = [city, state, props.country].filter(Boolean).join(', ');

    return {
      id: String(props.osm_id ?? props.osm_key ?? display ?? `${lat},${lon}`),
      display,
      city,
      country,
      lat,
      lon,
    };
  }

  private async lookupTimezone(lat: number, lon: number): Promise<string> {
    try {
      const url = `${this.timezoneEndpoint}?latitude=${lat}&longitude=${lon}`;
      const response = await fetch(url);

      if (!response.ok) {
        return 'UTC';
      }

      const data: any = await response.json();
      const tzid = data?.timezone;

      if (typeof tzid === 'string' && tzid.length > 0) {
        return tzid;
      }
    } catch (error) {
      // Swallow timezone lookup errors and fall back to UTC so suggestions still work
      void error;
    }

    return 'UTC';
  }
}
