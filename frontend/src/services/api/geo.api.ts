import { api } from './client';

export interface CityOption {
  id: string;
  display: string;
  city?: string;
  country?: string;
  lat: number;
  lon: number;
  tzid: string;
}

export interface CitySuggestParams {
  q: string;
  lang?: string;
}

export const geoApi = {
  suggestCities: async (params: CitySuggestParams): Promise<CityOption[]> => {
    const { q, lang = 'ru' } = params;
    const response = await api.get<CityOption[]>('/geo/cities', {
      params: { q, lang },
    });
    return response.data;
  },
};
