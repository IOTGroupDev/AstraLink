import { NatalChartService } from './natal-chart.service';

describe('NatalChartService locale handling', () => {
  const userId = 'user-1';
  const baseChartData = {
    birthDate: '1990-01-01',
    birthTime: '12:00',
    birthDateTimeUtc: '1990-01-01T09:00:00.000Z',
    interpretation: {
      summary: {
        overview: 'Русская интерпретация',
      },
    },
    interpretationVersion: 'v3',
    metadata: {
      calculationVersion: 'utc-fixed-v2',
    },
  };

  const createService = () => {
    const supabaseService = {
      getUserProfileAdmin: jest.fn().mockResolvedValue({ data: {} }),
    };
    const ephemerisService = {
      calculateNatalChart: jest.fn(),
    };
    const interpretationService = {
      generateNatalChartInterpretation: jest.fn(),
    };
    const aiService = {
      isAvailable: jest.fn().mockReturnValue(false),
    };
    const redis = {
      deleteByPattern: jest.fn().mockResolvedValue(undefined),
    };
    const chartRepository = {
      findByUserId: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    };
    const geoService = {
      suggestCities: jest.fn(),
    };

    const service = new NatalChartService(
      supabaseService as any,
      ephemerisService as any,
      interpretationService as any,
      aiService as any,
      redis as any,
      chartRepository as any,
      geoService as any,
    );

    return {
      service,
      interpretationService,
      chartRepository,
    };
  };

  it('regenerates legacy Russian interpretation when English locale is requested', async () => {
    const { service, interpretationService, chartRepository } = createService();
    const englishInterpretation = {
      summary: {
        overview: 'English interpretation',
      },
    };

    chartRepository.findByUserId.mockResolvedValue({
      id: 'chart-1',
      user_id: userId,
      data: baseChartData,
      created_at: '2026-04-02T00:00:00.000Z',
      updated_at: '2026-04-02T00:00:00.000Z',
    });
    interpretationService.generateNatalChartInterpretation.mockResolvedValue(
      englishInterpretation,
    );

    const result = await service.getNatalChartWithInterpretation(userId, 'en');

    expect(
      interpretationService.generateNatalChartInterpretation,
    ).toHaveBeenCalledWith(userId, baseChartData, 'en');
    expect(chartRepository.update).toHaveBeenCalledWith(
      'chart-1',
      expect.objectContaining({
        data: expect.objectContaining({
          interpretation: englishInterpretation,
          interpretationLocale: 'en',
          metadata: expect.objectContaining({
            interpretationLocale: 'en',
          }),
        }),
      }),
    );
    expect(result.data.interpretation).toEqual(englishInterpretation);
    expect(result.data.interpretationLocale).toBe('en');
  });

  it('does not regenerate legacy interpretation when Russian locale is requested', async () => {
    const { service, interpretationService, chartRepository } = createService();

    chartRepository.findByUserId.mockResolvedValue({
      id: 'chart-1',
      user_id: userId,
      data: baseChartData,
      created_at: '2026-04-02T00:00:00.000Z',
      updated_at: '2026-04-02T00:00:00.000Z',
    });

    const result = await service.getNatalChartWithInterpretation(userId, 'ru');

    expect(
      interpretationService.generateNatalChartInterpretation,
    ).not.toHaveBeenCalled();
    expect(chartRepository.update).not.toHaveBeenCalled();
    expect(result.data.interpretation).toEqual(baseChartData.interpretation);
  });
});
