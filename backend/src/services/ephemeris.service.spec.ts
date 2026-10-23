import { RedisService } from '../redis/redis.service';
import { EphemerisService } from './ephemeris.service';
import type { ChartData } from '../dating/dating.types';

describe('Swiss Ephemeris calculation regression', () => {
  const cache = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
  let service: EphemerisService;

  beforeAll(async () => {
    service = new EphemerisService(cache as unknown as RedisService);
    await service.onModuleInit();
  });
  beforeEach(() => jest.clearAllMocks());

  it('includes cross-chart Sun/Sun aspects and applies the conjunction weight', async () => {
    const chart = {
      planets: { sun: { longitude: 10 } },
    } as unknown as ChartData;
    const result = await service.getSynastry(chart, chart);
    expect(result.aspects).toEqual([
      expect.objectContaining({
        planetA: 'sun',
        planetB: 'sun',
        aspect: 'conjunction',
      }),
    ]);
    expect(result.compatibility).toBe(80);
  });

  it('localizes synastry summaries and counts harmonious aspects using their actual field', async () => {
    const chart = {
      planets: { sun: { longitude: 10 } },
    } as unknown as ChartData;
    const english = await service.getSynastry(chart, chart, 'en');
    const spanish = await service.getSynastry(chart, chart, 'es');
    expect(english.summary).toContain('Harmonious aspects: 1');
    expect(spanish.summary).toContain('Aspectos armoniosos: 1');
  });

  it('places the descending mean node exactly opposite the ascending node', async () => {
    const planets = await service.calculatePlanets(2451545);
    expect(
      (planets.south_node.longitude - planets.north_node.longitude + 360) % 360,
    ).toBeCloseTo(180, 8);
    expect(planets.south_node.speed).toBe(planets.north_node.speed);
    expect(planets.sun.longitude).toBeCloseTo(280.3689, 2);
    expect(planets.sun.ephemerisSource).toBe('swisseph');
  });

  it('keeps distinct cache entries for instants one second apart', async () => {
    await service.calculatePlanets(2451545);
    await service.calculatePlanets(2451545 + 1 / 86400);
    expect(cache.get.mock.calls[0][0]).not.toBe(cache.get.mock.calls[1][0]);
  });

  it('calculates UTC+0 without introducing a Moscow offset', async () => {
    const chart = await service.calculateNatalChart('2000-01-01', '12:00', {
      latitude: 51.5074,
      longitude: -0.1278,
      timezone: 0,
    });
    expect(chart.birthDateTimeUtc).toBe('2000-01-01T12:00:00.000Z');
    expect(chart.planets.sun.longitude).toBeCloseTo(280.3689, 2);
    expect(chart.metadata.houseSystem).toBe('P');
    expect(chart.houses[1].cusp).toBeCloseTo(chart.ascendant.longitude, 8);
  });

  it('uses real Porphyry houses at polar latitudes and reports the system', async () => {
    const chart = await service.calculateNatalChart('2000-01-01', '12:00', {
      latitude: 68.97,
      longitude: 33.07,
      timezone: 0,
    });
    expect(chart.metadata.houseSystem).toBe('O');
    expect(Object.keys(chart.houses)).toHaveLength(12);
    expect(chart.houses[1].cusp).toBeCloseTo(chart.ascendant.longitude, 8);
    expect(chart.houses[1].cusp).not.toBe(0);
  });

  it('withholds houses and angles for unknown time and calculates a real lunar day range', async () => {
    const chart = await service.calculateNatalChart(
      '2000-01-01',
      '00:01',
      {
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: 0,
        timezoneId: 'Europe/London',
      },
      false,
    );
    expect(chart.birthTime).toBe('12:00');
    expect(chart.houses).toEqual({});
    expect(chart.ascendant).toBeNull();
    expect(chart.midheaven).toBeNull();
    expect(chart.partOfFortune).toBeNull();
    expect(chart.metadata.birthTimeKnown).toBe(false);
    const { from, to } = chart.metadata.moonLongitudeRange;
    const motion = (to.longitude - from.longitude + 360) % 360;
    expect(motion).toBeGreaterThan(10);
    expect(motion).toBeLessThan(16);
  });

  it('shares unpersonalized transit cache across users', async () => {
    const from = new Date('2000-01-01T12:00:00Z');
    await service.getTransits('one', from, from);
    const firstKey = cache.get.mock.calls.find(([key]) =>
      key.startsWith('ephe:transits:'),
    )?.[0];
    cache.get.mockClear();
    await service.getTransits('two', from, from);
    expect(cache.get.mock.calls[0][0]).toBe(firstKey);
  });
});
