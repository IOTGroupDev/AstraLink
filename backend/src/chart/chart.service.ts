// backend/src/chart/chart.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { EphemerisService } from '../services/ephemeris.service';
import { InterpretationService } from '../services/interpretation.service';
import { HoroscopeGeneratorService } from '../services/horoscope-generator.service';

@Injectable()
export class ChartService {
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
    private ephemerisService: EphemerisService,
    private interpretationService: InterpretationService,
    private horoscopeService: HoroscopeGeneratorService,
  ) {}

  /**
   * Создать натальную карту с интерпретацией при регистрации
   */
  async createNatalChartWithInterpretation(
    userId: string,
    birthDateISO: string,
    birthTime: string,
    birthPlace: string,
  ) {
    // Проверяем существующую карту
    const existing = await this.prisma.chart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Если карта уже существует с интерпретацией, возвращаем её
    if (existing && (existing.data as any)?.interpretation) {
      return existing;
    }

    // Валидация данных
    if (!userId || !birthDateISO || !birthTime || !birthPlace) {
      throw new BadRequestException('Все данные рождения обязательны');
    }

    const birthDate = new Date(birthDateISO);
    if (isNaN(birthDate.getTime())) {
      throw new BadRequestException('Некорректная дата рождения');
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(birthTime)) {
      throw new BadRequestException(
        'Некорректное время рождения (ожидается HH:MM)',
      );
    }

    const dateStr = birthDate.toISOString().split('T')[0];
    const location = this.getLocationCoordinates(birthPlace);

    // Рассчитываем натальную карту через Swiss Ephemeris
    const natalChartData = await this.ephemerisService.calculateNatalChart(
      dateStr,
      birthTime,
      location,
    );

    // Генерируем полную интерпретацию (только один раз при регистрации)
    const interpretation =
      await this.interpretationService.generateNatalChartInterpretation(
        userId,
        natalChartData,
      );

    // Сохраняем карту с интерпретацией
    const chartWithInterpretation = {
      ...natalChartData,
      interpretation,
    };

    return await this.prisma.chart.create({
      data: {
        userId,
        data: chartWithInterpretation,
      },
    });
  }

  /**
   * Получить натальную карту с интерпретацией
   */
  async getNatalChartWithInterpretation(userId: string) {
    const chart = await this.prisma.chart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!chart) {
      throw new NotFoundException('Натальная карта не найдена');
    }

    const chartData = chart.data as any;

    // Если интерпретация отсутствует, генерируем её
    if (!chartData.interpretation) {
      const interpretation =
        await this.interpretationService.generateNatalChartInterpretation(
          userId,
          chartData,
        );

      // Обновляем карту с интерпретацией
      const updatedData = {
        ...chartData,
        interpretation,
      };

      await this.prisma.chart.update({
        where: { id: chart.id },
        data: { data: updatedData },
      });

      return {
        ...chart,
        data: updatedData,
      };
    }

    return chart;
  }

  /**
   * Получить гороскоп на период (день, неделя, месяц)
   * FREE: базовый шаблонный гороскоп
   * PREMIUM: AI-генерация с детальным анализом
   */
  async getHoroscope(
    userId: string,
    period: 'day' | 'tomorrow' | 'week' | 'month' = 'day',
  ) {
    // Проверяем подписку пользователя
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    const isPremium =
      subscription?.tier !== 'free' &&
      subscription?.expiresAt != null &&
      new Date(subscription.expiresAt) > new Date();

    // Генерируем гороскоп через HoroscopeGeneratorService
    return await this.horoscopeService.generateHoroscope(
      userId,
      period,
      isPremium,
    );
  }

  /**
   * Получить все типы гороскопов (для виджета)
   */
  async getAllHoroscopes(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    const isPremium =
      subscription?.tier !== 'free' &&
      subscription?.expiresAt != null &&
      new Date(subscription.expiresAt) > new Date();

    const [today, tomorrow, week, month] = await Promise.all([
      this.horoscopeService.generateHoroscope(userId, 'day', isPremium),
      this.horoscopeService.generateHoroscope(userId, 'tomorrow', isPremium),
      this.horoscopeService.generateHoroscope(userId, 'week', isPremium),
      this.horoscopeService.generateHoroscope(userId, 'month', isPremium),
    ]);

    return {
      today,
      tomorrow,
      week,
      month,
      isPremium,
    };
  }

  /**
   * Получить только интерпретацию натальной карты
   */
  async getChartInterpretation(userId: string) {
    return await this.interpretationService.getStoredInterpretation(userId);
  }

  /**
   * Получить натальную карту (базовый метод для обратной совместимости)
   */
  async getNatalChart(userId: string) {
    try {
      const res = await this.supabaseService.getUserChartsAdmin(userId);
      if (res.data && res.data.length > 0) {
        const chart = res.data[0];
        return {
          id: chart.id,
          userId: chart.user_id,
          data: chart.data,
          createdAt: chart.created_at,
          updatedAt: chart.updated_at,
        };
      }
    } catch (_e) {
      const { data } = await this.supabaseService.getUserCharts(userId);
      if (data && data.length > 0) {
        const chart = data[0];
        return {
          id: chart.id,
          userId: chart.user_id,
          data: chart.data,
          createdAt: chart.created_at,
          updatedAt: chart.updated_at,
        };
      }
    }

    // Если карты нет, создаём её
    return this.createNatalChart(userId, {});
  }

  /**
   * Создать натальную карту (базовый метод для обратной совместимости)
   */
  async createNatalChart(userId: string, _data: any) {
    // Проверяем существующую карту
    try {
      const { data } = await this.supabaseService.getUserChartsAdmin(userId);
      if (data && data.length > 0) {
        const chart = data[0];
        return {
          id: chart.id,
          userId: chart.user_id,
          data: chart.data,
          createdAt: chart.created_at,
          updatedAt: chart.updated_at,
        };
      }
    } catch (_e) {
      const { data: charts } = await this.supabaseService.getUserCharts(userId);
      if (charts && charts.length > 0) {
        const chart = charts[0];
        return {
          id: chart.id,
          userId: chart.user_id,
          data: chart.data,
          createdAt: chart.created_at,
          updatedAt: chart.updated_at,
        };
      }
    }

    // Получаем данные пользователя
    const { data: user } = await this.supabaseService
      .from('users')
      .select('id, birth_date, birth_time, birth_place')
      .eq('id', userId)
      .single();

    if (!user || !user.birth_date || !user.birth_time || !user.birth_place) {
      // Fallback данные для демонстрации
      const fallbackChartData = await this.ephemerisService.calculateNatalChart(
        '1990-05-15',
        '14:30',
        this.getLocationCoordinates('Москва'),
      );

      return {
        id: 'temporary',
        userId,
        data: fallbackChartData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Рассчитываем натальную карту
    const birthDate = new Date(user.birth_date).toISOString().split('T')[0];
    const birthTime = user.birth_time;
    const location = this.getLocationCoordinates(user.birth_place);

    const natalChartData = await this.ephemerisService.calculateNatalChart(
      birthDate,
      birthTime,
      location,
    );

    // Сохраняем карту
    const { data: newChart } = await this.supabaseService.createUserChart(
      userId,
      natalChartData,
    );

    if (newChart) {
      return {
        id: newChart.id,
        userId: newChart.user_id,
        data: newChart.data,
        createdAt: newChart.created_at,
        updatedAt: newChart.updated_at,
      };
    }

    // Если не удалось сохранить
    return {
      id: 'temporary',
      userId,
      data: natalChartData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Получить транзиты
   */
  async getTransits(userId: string, from: string, to: string) {
    const natalChart = await this.getNatalChart(userId);
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const transits = await this.ephemerisService.getTransits(
      userId,
      fromDate,
      toDate,
    );

    return {
      from,
      to,
      transits,
      natalChart: natalChart.data,
      message: 'Транзиты рассчитаны на основе натальной карты',
    };
  }

  /**
   * Получить текущие позиции планет
   */
  async getCurrentPlanets(_userId: string) {
    const now = new Date();
    const julianDay = this.ephemerisService.dateToJulianDay(now);
    const currentPlanets =
      await this.ephemerisService.calculatePlanets(julianDay);

    return {
      date: now.toISOString(),
      planets: currentPlanets,
    };
  }

  /**
   * Получить астрологические предсказания
   */
  async getPredictions(userId: string, period: string = 'day') {
    // Получаем натальную карту (без пересчёта)
    const natalChart = await this.getNatalChart(userId);
    if (!natalChart) {
      throw new NotFoundException('Натальная карта не найдена');
    }

    // Вычисляем дату для предсказания
    let targetDate = new Date();
    if (period === 'tomorrow') {
      targetDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (period === 'week') {
      targetDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    // Получаем позиции планет для целевой даты
    const julianDay = this.ephemerisService.dateToJulianDay(targetDate);
    const targetPlanets =
      await this.ephemerisService.calculatePlanets(julianDay);

    // Генерируем предсказания на основе транзитов
    const predictions = this.generatePredictionsInternal(
      natalChart,
      { planets: targetPlanets },
      period,
    );

    return {
      period,
      date: targetDate.toISOString(),
      predictions, // Возвращаем как объект predictions
      currentPlanets: targetPlanets,
      // Также возвращаем плоские поля для обратной совместимости
      ...predictions,
    };
  }

  /**
   * Генерирует расширенные предсказания на основе натальной карты и текущих позиций
   */
  private generatePredictionsInternal(
    natalChart: any,
    currentPlanets: any,
    period: string,
  ) {
    const predictions = {
      general: '',
      love: '',
      career: '',
      health: '',
      finance: '',
      advice: '',
      luckyNumbers: [] as number[],
      luckyColors: [] as string[],
      energy: 50,
      mood: 'Нейтральное',
      challenges: [] as string[],
      opportunities: [] as string[],
      generatedBy: 'ephemeris' as const,
    };

    const natalPlanets = natalChart.data?.planets || natalChart.planets || {};
    const current = currentPlanets.planets || {};

    // Определяем префикс для периода
    const periodPrefix =
      period === 'tomorrow'
        ? 'Завтра'
        : period === 'week'
          ? 'На этой неделе'
          : period === 'month'
            ? 'В этом месяце'
            : 'Сегодня';

    // Рассчитываем энергию на основе аспектов
    let energyScore = 50;
    let harmoniousCount = 0;
    let challengingCount = 0;

    // Анализ Солнца
    if (current.sun && natalPlanets.sun) {
      const sunAspect = this.calculateAspect(
        current.sun.longitude,
        natalPlanets.sun.longitude,
      );

      if (sunAspect === 'conjunction' || sunAspect === 'trine') {
        predictions.general = `${periodPrefix} благоприятный период для самореализации. Солнце усиливает вашу энергию и уверенность.`;
        energyScore += 15;
        harmoniousCount++;
        predictions.opportunities.push('Новые начинания и проекты');
      } else if (sunAspect === 'opposition' || sunAspect === 'square') {
        predictions.general = `${periodPrefix} может потребовать от вас терпения. Возможны испытания, которые помогут вам вырасти.`;
        energyScore -= 10;
        challengingCount++;
        predictions.challenges.push('Конфликты с окружающими');
      } else {
        predictions.general = `${periodPrefix} энергия Солнца влияет на вашу активность и жизненную силу.`;
      }
    }

    // Анализ Луны (эмоции и интуиция)
    if (current.moon && natalPlanets.moon) {
      const moonAspect = this.calculateAspect(
        current.moon.longitude,
        natalPlanets.moon.longitude,
      );

      if (moonAspect === 'conjunction' || moonAspect === 'trine') {
        predictions.health = `${periodPrefix} ваше эмоциональное состояние стабильно. Хорошее время для заботы о себе.`;
        energyScore += 10;
        harmoniousCount++;
      } else if (moonAspect === 'square') {
        predictions.health = `${periodPrefix} будьте внимательны к своим эмоциям. Избегайте стрессовых ситуаций.`;
        energyScore -= 5;
        challengingCount++;
        predictions.challenges.push('Эмоциональная нестабильность');
      } else {
        predictions.health = `${periodPrefix} Луна влияет на ваши эмоции и интуицию.`;
      }
    }

    // Анализ Венеры (любовь и отношения)
    if (current.venus && natalPlanets.venus) {
      const venusAspect = this.calculateAspect(
        current.venus.longitude,
        natalPlanets.venus.longitude,
      );

      if (venusAspect === 'trine' || venusAspect === 'sextile') {
        predictions.love = `${periodPrefix} Венера создает гармоничные аспекты. Отличное время для романтики и общения с близкими.`;
        energyScore += 10;
        harmoniousCount++;
        predictions.opportunities.push('Гармония в отношениях');
      } else if (venusAspect === 'square' || venusAspect === 'opposition') {
        predictions.love = `${periodPrefix} Венера в напряженном аспекте. Проявите терпение и понимание в отношениях.`;
        challengingCount++;
        predictions.challenges.push('Недопонимание в отношениях');
      } else {
        predictions.love = `${periodPrefix} Венера влияет на вашу привлекательность и способность выражать чувства.`;
      }
    }

    // Анализ Марса (энергия и действия)
    if (current.mars && natalPlanets.mars) {
      const marsAspect = this.calculateAspect(
        current.mars.longitude,
        natalPlanets.mars.longitude,
      );

      if (marsAspect === 'trine') {
        predictions.career = `${periodPrefix} Марс придает вам энергию и решительность. Отличное время для карьерных достижений.`;
        energyScore += 15;
        harmoniousCount++;
        predictions.opportunities.push('Карьерный рост');
      } else if (marsAspect === 'square') {
        predictions.career = `${periodPrefix} Марс создает напряжение. Избегайте конфликтов на работе и проявляйте терпение.`;
        energyScore -= 10;
        challengingCount++;
        predictions.challenges.push('Препятствия в работе');
      } else {
        predictions.career = `${periodPrefix} Марс влияет на вашу энергию и амбиции в профессиональной сфере.`;
      }
    }

    // Анализ Юпитера (рост и расширение)
    if (current.jupiter && natalPlanets.jupiter) {
      const jupiterAspect = this.calculateAspect(
        current.jupiter.longitude,
        natalPlanets.jupiter.longitude,
      );

      if (jupiterAspect === 'trine' || jupiterAspect === 'conjunction') {
        predictions.finance = `${periodPrefix} Юпитер благоволит вашим финансам. Время для разумных инвестиций.`;
        energyScore += 10;
        harmoniousCount++;
        predictions.opportunities.push('Финансовые возможности');
      } else {
        predictions.finance = `${periodPrefix} финансовая ситуация стабильна. Придерживайтесь бюджета и избегайте рисков.`;
      }
    }

    // Анализ Меркурия (коммуникация и мышление)
    if (current.mercury && natalPlanets.mercury) {
      const mercuryAspect = this.calculateAspect(
        current.mercury.longitude,
        natalPlanets.mercury.longitude,
      );
      if (mercuryAspect === 'square' || mercuryAspect === 'opposition') {
        predictions.challenges.push('Сложности в коммуникации');
      } else if (mercuryAspect === 'trine' || mercuryAspect === 'sextile') {
        predictions.opportunities.push('Ясность мышления');
      }
    }

    // Нормализуем энергию (0-100)
    predictions.energy = Math.min(100, Math.max(0, energyScore));

    // Определяем настроение
    if (harmoniousCount > challengingCount + 2) {
      predictions.mood = 'Радостное и вдохновленное';
    } else if (harmoniousCount > challengingCount) {
      predictions.mood = 'Оптимистичное';
    } else if (challengingCount > harmoniousCount) {
      predictions.mood = 'Сдержанное и осторожное';
    } else {
      predictions.mood = 'Нейтральное и сбалансированное';
    }

    // Генерируем счастливые числа (на основе позиций планет)
    predictions.luckyNumbers = [
      (Math.floor((current.sun?.longitude || 0) / 10) % 90) + 1,
      (Math.floor((current.moon?.longitude || 0) / 10) % 90) + 1,
      (Math.floor((current.venus?.longitude || 0) / 10) % 90) + 1,
      (Math.floor((current.jupiter?.longitude || 0) / 10) % 90) + 1,
      (Math.floor((current.mars?.longitude || 0) / 10) % 90) + 1,
    ].filter((num, index, self) => self.indexOf(num) === index);

    // Определяем счастливые цвета на основе знаков
    const sunSign = current.sun?.sign || 'Aries';
    const moonSign = current.moon?.sign || 'Cancer';

    const signColors: { [key: string]: string } = {
      Aries: 'Красный',
      Taurus: 'Зеленый',
      Gemini: 'Желтый',
      Cancer: 'Серебряный',
      Leo: 'Золотой',
      Virgo: 'Коричневый',
      Libra: 'Розовый',
      Scorpio: 'Бордовый',
      Sagittarius: 'Фиолетовый',
      Capricorn: 'Серый',
      Aquarius: 'Синий',
      Pisces: 'Бирюзовый',
    };

    predictions.luckyColors = [
      signColors[sunSign] || 'Белый',
      signColors[moonSign] || 'Серый',
    ].filter((color, index, self) => self.indexOf(color) === index);

    // Генерируем совет
    if (period === 'day' || period === 'tomorrow') {
      if (predictions.energy > 75) {
        predictions.advice = `${periodPrefix} доверяйте своей интуиции и действуйте решительно.`;
      } else if (predictions.energy > 50) {
        predictions.advice = `${periodPrefix} фокусируйтесь на важных делах и избегайте распыления энергии.`;
      } else {
        predictions.advice = `${periodPrefix} практикуйте терпение и заботьтесь о своем внутреннем балансе.`;
      }
    } else if (period === 'week') {
      predictions.advice = `На этой неделе практикуйте благодарность и оставайтесь открытыми новому опыту.`;
    } else if (period === 'month') {
      predictions.advice = `В этом месяце сосредоточьтесь на долгосрочных целях и не забывайте отдыхать.`;
    }

    return predictions;
  }

  private calculateAspect(longitude1: number, longitude2: number): string {
    const diff = Math.abs(longitude1 - longitude2);
    const normalizedDiff = Math.min(diff, 360 - diff);

    if (normalizedDiff <= 8) return 'conjunction';
    if (normalizedDiff >= 82 && normalizedDiff <= 98) return 'square';
    if (normalizedDiff >= 118 && normalizedDiff <= 122) return 'trine';
    if (normalizedDiff >= 172 && normalizedDiff <= 188) return 'opposition';
    if (normalizedDiff >= 54 && normalizedDiff <= 66) return 'sextile';

    return 'other';
  }

  /**
   * Получить координаты места рождения
   */
  getLocationCoordinates(birthPlace: string): {
    latitude: number;
    longitude: number;
    timezone: number;
  } {
    const locations: {
      [key: string]: { latitude: number; longitude: number; timezone: number };
    } = {
      Москва: { latitude: 55.7558, longitude: 37.6176, timezone: 3 },
      'Санкт-Петербург': { latitude: 59.9311, longitude: 30.3609, timezone: 3 },
      Екатеринбург: { latitude: 56.8431, longitude: 60.6454, timezone: 5 },
      Новосибирск: { latitude: 55.0084, longitude: 82.9357, timezone: 7 },
      default: { latitude: 55.7558, longitude: 37.6176, timezone: 3 },
    };

    return locations[birthPlace] || locations['default'];
  }
}
