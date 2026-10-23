/* eslint-disable @typescript-eslint/unbound-method -- axios.get is replaced by a Jest mock. */
import axios from 'axios';
import { GeoService } from './geo.service';
import { RedisService } from '@/redis/redis.service';

jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn() } }));
const get = jest.mocked(axios.get);
describe('city lookup cache and accurate offline timezones', () => {
  const client = { set: jest.fn().mockResolvedValue('OK') };
  const cache = new Map<string, unknown>();
  const redis = {
    get: jest.fn(async (key: string) => cache.get(key) ?? null),
    set: jest.fn(async (key: string, value: unknown) => {
      cache.set(key, value);
      return true;
    }),
    getClient: jest.fn(() => client),
  };
  const service = new GeoService(redis as unknown as RedisService);
  beforeEach(() => {
    jest.clearAllMocks();
    cache.clear();
    redis.getClient.mockReturnValue(client);
  });

  it('uses a real IANA zone locally and caches city results for 24 hours', async () => {
    get.mockResolvedValueOnce({
      data: [
        {
          osm_id: 1,
          lat: '51.5074',
          lon: '-0.1278',
          address: { city: 'London', country_code: 'gb' },
        },
      ],
    });
    const result = await service.suggestCities('London', 'en');
    expect(result[0].tzid).toBe('Europe/London');
    await expect(service.suggestCities(' LONDON ', 'en')).resolves.toEqual(
      result,
    );
    expect(get).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining('geo:query:en:'),
      result,
      86400,
    );
    expect(client.set).toHaveBeenCalledWith(
      'geo:nominatim:request',
      '1',
      'PX',
      1100,
      'NX',
    );
  });
  it('does not bypass the global provider limit when Redis is unavailable', async () => {
    redis.getClient.mockReturnValueOnce(null as never);
    await expect(service.suggestCities('London')).rejects.toMatchObject({
      status: 503,
    });
    expect(get).not.toHaveBeenCalled();
  });
  it('returns no invented place or longitude-based timezone on an unknown city failure', async () => {
    get.mockRejectedValueOnce(new Error('Network unavailable'));
    await expect(service.suggestCities('zzzz-no-such-city')).resolves.toEqual(
      [],
    );
    expect(get).toHaveBeenCalledTimes(1);
  });
});
