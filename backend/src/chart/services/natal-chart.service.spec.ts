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
