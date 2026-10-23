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
      calculationVersion: 'nodes-utc-houses-v3',
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
      generatePremiumNatalSummaryInterpretation: jest.fn(),
      generateStructuredChartInterpretation: jest.fn(),
      generateChartInterpretation: jest.fn(),
      getProvider: jest.fn().mockReturnValue('test'),
    };
    const redis = {
      deleteByPattern: jest.fn().mockResolvedValue(undefined),
      getClient: jest.fn().mockReturnValue(null),
    };
    const chartRepository = {
      findByUserId: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    };
    const geoService = {
      suggestCities: jest.fn(),
    };
    const prisma = {
      aiContentCache: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue(undefined),
      },
    };

    const service = new NatalChartService(
      supabaseService as any,
      ephemerisService as any,
      interpretationService as any,
      aiService as any,
      redis as any,
      chartRepository as any,
      geoService as any,
      prisma as any,
    );

    return {
      service,
      interpretationService,
      aiService,
      chartRepository,
      prisma,
      redis,
      supabaseService,
      ephemerisService,
      geoService,
    };
  };

  it('preserves the profile unknown-time flag when a parallel bootstrap creates the first chart', async () => {
    const {
      service,
      supabaseService,
      ephemerisService,
      chartRepository,
      geoService,
      interpretationService,
    } = createService();
    chartRepository.findByUserId.mockResolvedValue(null);
    supabaseService.getUserProfileAdmin.mockResolvedValue({
      data: {
        birth_date: '1990-01-01',
        birth_time: '12:00',
        birth_place: 'Москва',
        birth_time_known: false,
      },
    });
    geoService.suggestCities.mockRejectedValue(new Error('Offline'));
    ephemerisService.calculateNatalChart.mockResolvedValue({
      planets: {},
      houses: {},
      metadata: { birthTimeKnown: false },
    });
    chartRepository.create.mockImplementation(async (value) => ({
      id: 'chart-1',
      ...value,
    }));
    const result = await service.createNatalChart(userId, {}, 'en');
    expect(ephemerisService.calculateNatalChart.mock.calls[0][3]).toBe(false);
    expect(result.data.metadata.birthTimeKnown).toBe(false);
    expect(
      interpretationService.generateNatalChartInterpretation,
    ).not.toHaveBeenCalled();
  });

  it('uses persisted selection during bootstrap and recalculation without geocoding again', async () => {
    const h = createService();
    const birthPlace = 'Springfield, Illinois, United States';
    const selected = {
      latitude: 39.8,
      longitude: -89.65,
      timezone: 'America/Chicago',
    };
    h.supabaseService.getUserProfileAdmin.mockResolvedValue({
      data: {
        birth_date: '1990-01-01',
        birth_time: '12:00',
        birth_place: birthPlace,
        birth_time_known: false,
        birth_location: { birthPlace, location: selected },
      },
    });
    h.chartRepository.findByUserId.mockResolvedValue(null);
    h.ephemerisService.calculateNatalChart.mockImplementation(
      async (_date, _time, location) => ({
        birthDate: _date,
        birthTime: _time,
        birthDateTimeUtc: '1990-01-01T18:00:00.000Z',
        location,
        planets: {},
        houses: {},
        metadata: {
          birthTimeKnown: false,
          calculationVersion: 'nodes-utc-houses-v3',
        },
      }),
    );
    h.chartRepository.create.mockImplementation(async (value) => ({
      id: 'chart-1',
      ...value,
    }));
    const first = await h.service.createNatalChart(userId, {});
    expect(first.data.birthPlace).toBe(birthPlace);
    expect(h.ephemerisService.calculateNatalChart.mock.calls[0][2]).toEqual({
      latitude: 39.8,
      longitude: -89.65,
      timezoneId: 'America/Chicago',
      timezone: -6,
    });
    h.chartRepository.findByUserId.mockResolvedValue({
      id: 'chart-1',
      user_id: userId,
      data: first.data,
    });
    h.chartRepository.update.mockImplementation(async (_id, value) => ({
      id: 'chart-1',
      user_id: userId,
      ...value,
    }));
    const repeated = await h.service.forceRecalculateNatalChart(userId);
    expect(repeated.data.metadata.fingerprint).toBe(
      first.data.metadata.fingerprint,
    );
    expect(h.geoService.suggestCities).not.toHaveBeenCalled();
    expect(
      h.interpretationService.generateNatalChartInterpretation,
    ).not.toHaveBeenCalled();

    // Same city name, different coordinates: invalidate the chart and AI cache key.
    h.supabaseService.getUserProfileAdmin.mockResolvedValue({
      data: {
        birth_date: '1990-01-01',
        birth_time: '12:00',
        birth_place: birthPlace,
        birth_time_known: false,
        birth_location: {
          birthPlace,
          location: { ...selected, latitude: 39.9 },
        },
      },
    });
    const moved = await h.service.getNatalChartWithInterpretation(userId);
    expect(moved.data.location.latitude).toBe(39.9);
    expect(moved.data.metadata.fingerprint).not.toBe(
      first.data.metadata.fingerprint,
    );
  });

  it('does not reuse unidentified legacy coordinates for a changed birthplace', async () => {
    const h = createService();
    h.chartRepository.findByUserId.mockResolvedValue({
      id: 'chart-1',
      data: {
        ...baseChartData,
        birthPlace: 'Paris, France',
        location: { latitude: 55.75, longitude: 37.6, timezone: 3 },
      },
    });
    h.supabaseService.getUserProfileAdmin.mockResolvedValue({
      data: {
        birth_date: '1990-01-01',
        birth_time: '12:00',
        birth_place: 'Paris, France',
        birth_time_known: false,
      },
    });
    h.geoService.suggestCities.mockResolvedValue([
      { lat: 48.85, lon: 2.35, tzid: 'Europe/Paris' },
    ]);
    h.ephemerisService.calculateNatalChart.mockResolvedValue({
      planets: {},
      metadata: { birthTimeKnown: false },
    });
    h.chartRepository.update.mockImplementation(async (_id, value) => ({
      id: 'chart-1',
      ...value,
    }));
    await h.service.forceRecalculateNatalChart(userId);
    expect(h.geoService.suggestCities).toHaveBeenCalledWith(
      'Paris, France',
      'ru',
    );
    expect(h.ephemerisService.calculateNatalChart.mock.calls[0][2]).toEqual({
      latitude: 48.85,
      longitude: 2.35,
      timezoneId: 'Europe/Paris',
      timezone: 1,
    });
  });

  it('withholds legacy unknown-time angles and never generates their interpretation', async () => {
    const { service, interpretationService, chartRepository, aiService } =
      createService();
    chartRepository.findByUserId.mockResolvedValue({
      id: 'chart-1',
      user_id: userId,
      data: {
        ...baseChartData,
        houses: { 1: { sign: 'Aries', cusp: 0 } },
        ascendant: { sign: 'Aries', degree: 0 },
        metadata: { ...baseChartData.metadata, birthTimeKnown: false },
      },
    });
    const chart = await service.getNatalChartWithInterpretation(userId, 'en');
    expect(chart.data.houses).toEqual({});
    expect(chart.data.ascendant).toBeNull();
    expect(chart.data.interpretation).toBeUndefined();
    expect(
      interpretationService.generateNatalChartInterpretation,
    ).not.toHaveBeenCalled();
    expect(
      aiService.generatePremiumNatalSummaryInterpretation,
    ).not.toHaveBeenCalled();
  });

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

  it('backfills AI prompt version without calling AI when structured cached narrative exists', async () => {
    const { service, aiService, chartRepository, prisma } = createService();
    aiService.isAvailable.mockReturnValue(true);
    const chartData = {
      ...baseChartData,
      interpretation: {
        ...baseChartData.interpretation,
        aiNarrative: 'Старый сохраненный AI текст',
        premiumNarrative: 'Старый сохраненный AI текст',
        structuredAi: {
          premiumSummary: 'Старый сохраненный AI текст',
        },
        generatedBy: 'ai',
      },
      interpretationVersion: 'v3-ai',
      generatedBy: 'ai',
    };

    chartRepository.findByUserId.mockResolvedValue({
      id: 'chart-1',
      user_id: userId,
      data: chartData,
      created_at: '2026-04-02T00:00:00.000Z',
      updated_at: '2026-04-02T00:00:00.000Z',
    });

    await service.regenerateAiInterpretation(userId, 'ru', false);

    expect(aiService.generateChartInterpretation).not.toHaveBeenCalled();
    expect(prisma.aiContentCache.upsert).toHaveBeenCalled();
    expect(chartRepository.update).toHaveBeenCalledWith(
      'chart-1',
      expect.objectContaining({
        data: expect.objectContaining({
          aiInterpretations: expect.objectContaining({
            ru: expect.objectContaining({
              narrative: 'Старый сохраненный AI текст',
              structured: expect.objectContaining({
                premiumSummary: 'Старый сохраненный AI текст',
              }),
              promptVersion: 'natal-ai-v10-clean-text-format',
            }),
          }),
          interpretation: expect.objectContaining({
            aiPromptVersion: 'natal-ai-v10-clean-text-format',
          }),
        }),
      }),
    );
  });

  it('does not write chart when current AI narrative is already cached', async () => {
    const { service, aiService, chartRepository, prisma } = createService();
    aiService.isAvailable.mockReturnValue(true);
    const chartData = {
      ...baseChartData,
      aiInterpretations: {
        ru: {
          narrative: 'Актуальный AI текст',
          premiumNarrative: 'Актуальный AI текст',
          structured: {
            premiumSummary: 'Актуальный AI текст',
          },
          generatedAt: '2026-04-02T00:00:00.000Z',
          promptVersion: 'natal-ai-v10-clean-text-format',
        },
      },
      interpretation: {
        ...baseChartData.interpretation,
        aiNarrative: 'Актуальный AI текст',
        premiumNarrative: 'Актуальный AI текст',
        structuredAi: {
          premiumSummary: 'Актуальный AI текст',
        },
        aiPromptVersion: 'natal-ai-v10-clean-text-format',
        generatedBy: 'ai',
      },
      interpretationVersion: 'v3-ai',
      generatedBy: 'ai',
    };

    chartRepository.findByUserId.mockResolvedValue({
      id: 'chart-1',
      user_id: userId,
      data: chartData,
      created_at: '2026-04-02T00:00:00.000Z',
      updated_at: '2026-04-02T00:00:00.000Z',
    });

    await service.regenerateAiInterpretation(userId, 'ru', false);

    expect(aiService.generateChartInterpretation).not.toHaveBeenCalled();
    expect(chartRepository.update).not.toHaveBeenCalled();
    expect(prisma.aiContentCache.upsert).not.toHaveBeenCalled();
  });

  it('regenerates AI when cached narrative has no structured payload', async () => {
    const { service, aiService, chartRepository } = createService();
    aiService.isAvailable.mockReturnValue(true);
    aiService.generatePremiumNatalSummaryInterpretation.mockResolvedValue({
      premiumSummary: 'Новый структурный AI текст',
    });

    chartRepository.findByUserId.mockResolvedValue({
      id: 'chart-1',
      user_id: userId,
      data: {
        ...baseChartData,
        aiInterpretations: {
          ru: {
            narrative: 'Старый AI текст без JSON',
            premiumNarrative: 'Старый AI текст без JSON',
            promptVersion: 'natal-ai-v10-clean-text-format',
          },
        },
        interpretationVersion: 'v3-ai',
        generatedBy: 'ai',
      },
      created_at: '2026-04-02T00:00:00.000Z',
      updated_at: '2026-04-02T00:00:00.000Z',
    });

    await service.regenerateAiInterpretation(userId, 'ru', false);

    expect(
      aiService.generatePremiumNatalSummaryInterpretation,
    ).toHaveBeenCalled();
    expect(chartRepository.update).toHaveBeenCalledWith(
      'chart-1',
      expect.objectContaining({
        data: expect.objectContaining({
          interpretation: expect.objectContaining({
            premiumSummary: 'Новый структурный AI текст',
          }),
        }),
      }),
    );
  });

  it('skips duplicate AI generation while another natal AI request is running', async () => {
    const { service, aiService, chartRepository, redis } = createService();
    aiService.isAvailable.mockReturnValue(true);
    const redisClient = {
      set: jest.fn().mockResolvedValue(null),
      eval: jest.fn(),
    };
    redis.getClient.mockReturnValue(redisClient);

    chartRepository.findByUserId.mockResolvedValue({
      id: 'chart-1',
      user_id: userId,
      data: baseChartData,
      created_at: '2026-04-02T00:00:00.000Z',
      updated_at: '2026-04-02T00:00:00.000Z',
    });

    await service.regenerateAiInterpretation(userId, 'ru', false);

    expect(redisClient.set).toHaveBeenCalledWith(
      expect.stringContaining(`lock:natal-ai:${userId}:ru:`),
      expect.any(String),
      'EX',
      600,
      'NX',
    );
    expect(
      aiService.generateStructuredChartInterpretation,
    ).not.toHaveBeenCalled();
    expect(chartRepository.update).not.toHaveBeenCalled();
  });

  it('uses persistent natal AI cache before calling AI', async () => {
    const { service, aiService, chartRepository, prisma } = createService();
    aiService.isAvailable.mockReturnValue(true);
    prisma.aiContentCache.findUnique.mockResolvedValue({
      contentJson: {
        narrative: 'Сохраненный AI текст из кеша',
        structured: {
          premiumSummary: 'Сохраненный AI текст из кеша',
        },
      },
    });

    chartRepository.findByUserId.mockResolvedValue({
      id: 'chart-1',
      user_id: userId,
      data: baseChartData,
      created_at: '2026-04-02T00:00:00.000Z',
      updated_at: '2026-04-02T00:00:00.000Z',
    });

    await service.regenerateAiInterpretation(userId, 'ru', false);

    expect(prisma.aiContentCache.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId_contentType_subjectKey_locale_chartFingerprint_promptVersion:
            expect.objectContaining({
              userId,
              contentType: 'natal_ai_interpretation',
              subjectKey: 'natal',
              locale: 'ru',
              promptVersion: 'natal-ai-v10-clean-text-format',
            }),
        }),
      }),
    );
    expect(aiService.generateChartInterpretation).not.toHaveBeenCalled();
    expect(chartRepository.update).toHaveBeenCalledWith(
      'chart-1',
      expect.objectContaining({
        data: expect.objectContaining({
          aiInterpretations: expect.objectContaining({
            ru: expect.objectContaining({
              narrative: 'Сохраненный AI текст из кеша',
              structured: expect.objectContaining({
                premiumSummary: 'Сохраненный AI текст из кеша',
              }),
              promptVersion: 'natal-ai-v10-clean-text-format',
            }),
          }),
        }),
      }),
    );
  });

  it('merges structured AI text into the existing interpretation shape', async () => {
    const { service, aiService, chartRepository, prisma } = createService();
    aiService.isAvailable.mockReturnValue(true);
    aiService.generatePremiumNatalSummaryInterpretation.mockResolvedValue({
      premiumSummary:
        '# Живой премиальный синтез карты.\n\n---\n\n№ 1 Итоговый вывод.',
      overview: 'AI обзор по нашей структуре.',
      sunSign: {
        interpretation: 'AI описание Солнца.',
      },
      summary: {
        chartRuler: {
          interpretation: 'AI управитель карты.',
        },
      },
    });

    const chartData = {
      ...baseChartData,
      interpretation: {
        ...baseChartData.interpretation,
        overview: 'Базовый обзор.',
        sunSign: {
          sign: 'leo',
          degree: 12,
          interpretation: 'Базовое описание Солнца.',
        },
        summary: {
          chartRuler: {
            ruler: 'Sun',
            sign: 'leo',
            house: 1,
            interpretation: 'Базовый управитель карты.',
          },
        },
      },
    };

    chartRepository.findByUserId.mockResolvedValue({
      id: 'chart-1',
      user_id: userId,
      data: chartData,
      created_at: '2026-04-02T00:00:00.000Z',
      updated_at: '2026-04-02T00:00:00.000Z',
    });

    await service.regenerateAiInterpretation(userId, 'ru', false);

    expect(aiService.generateChartInterpretation).not.toHaveBeenCalled();
    expect(
      aiService.generatePremiumNatalSummaryInterpretation,
    ).toHaveBeenCalled();
    expect(chartRepository.update).toHaveBeenCalledWith(
      'chart-1',
      expect.objectContaining({
        data: expect.objectContaining({
          interpretation: expect.objectContaining({
            premiumSummary:
              'Живой премиальный синтез карты.\n\nИтоговый вывод.',
            overview: 'AI обзор по нашей структуре.',
            sunSign: expect.objectContaining({
              sign: 'leo',
              degree: 12,
              interpretation: 'AI описание Солнца.',
            }),
            summary: expect.objectContaining({
              chartRuler: expect.objectContaining({
                ruler: 'Sun',
                house: 1,
                interpretation: 'AI управитель карты.',
              }),
            }),
          }),
        }),
      }),
    );
    expect(prisma.aiContentCache.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          contentJson: expect.objectContaining({
            narrative: 'Живой премиальный синтез карты.\n\nИтоговый вывод.',
            structured: expect.objectContaining({
              premiumSummary:
                'Живой премиальный синтез карты.\n\nИтоговый вывод.',
            }),
          }),
        }),
      }),
    );
  });
});
