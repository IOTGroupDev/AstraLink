import { ArchetypeService } from './archetype.service';

describe('ArchetypeService', () => {
  const createService = () => {
    const chartRepository = {
      findByUserId: jest.fn(),
    };
    const supabaseService = {
      getUserProfileAdmin: jest.fn(),
    };

    const service = new ArchetypeService(
      chartRepository as any,
      supabaseService as any,
    );

    return {
      service,
      chartRepository,
      supabaseService,
    };
  };

  it('returns natal archetype when chart contains Sun, Moon, and Ascendant', async () => {
    const { service, chartRepository, supabaseService } = createService();

    chartRepository.findByUserId.mockResolvedValue({
      id: 'chart-1',
      user_id: 'user-1',
      data: {
        birthDate: '1984-01-06',
        planets: {
          sun: { sign: 'Capricorn' },
          moon: { sign: 'Pisces' },
          mercury: { sign: 'Capricorn' },
          venus: { sign: 'Aquarius' },
          mars: { sign: 'Scorpio' },
          jupiter: { sign: 'Sagittarius' },
          saturn: { sign: 'Scorpio' },
        },
        ascendant: { sign: 'Taurus' },
      },
    });
    supabaseService.getUserProfileAdmin.mockResolvedValue({ data: null });

    const result = await service.getUserArchetype('user-1', 'ru');

    expect(result.source).toBe('natal');
    expect(result.title).toBe('Стратег-Строитель');
    expect(result.blueprint.sunSign).toBe('Capricorn');
    expect(result.blueprint.moonSign).toBe('Pisces');
    expect(result.blueprint.ascendantSign).toBe('Taurus');
    expect(result.blueprint.lifePathNumber).toBe(11);
    expect(result.note).toContain('Солнце, Луну, Асцендент');
  });

  it('falls back to date-only archetype when chart is missing', async () => {
    const { service, chartRepository, supabaseService } = createService();

    chartRepository.findByUserId.mockResolvedValue(null);
    supabaseService.getUserProfileAdmin.mockResolvedValue({
      data: {
        id: 'user-2',
        birth_date: '1984-01-06T00:00:00.000Z',
      },
    });

    const result = await service.getUserArchetype('user-2', 'en');

    expect(result.source).toBe('date_only');
    expect(result.title).toBe('The Strategic Builder');
    expect(result.blueprint.sunSign).toBe('Capricorn');
    expect(result.blueprint.moonSign).toBeNull();
    expect(result.blueprint.ascendantSign).toBeNull();
    expect(result.blueprint.lifePathNumber).toBe(11);
    expect(result.subtitle).toContain('Life Path 11');
    expect(result.note).toContain('date-only archetype');
  });
});
