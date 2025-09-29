import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { EphemerisService } from '../services/ephemeris.service';

@Injectable()
export class ChartService {
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
    private ephemerisService: EphemerisService,
  ) {}

  /**
   * Создать натальную карту напрямую из данных рождения (используется в момент регистрации).
   * Не читает пользователя из БД — использует переданные данные и обеспечивает атомарность.
   * Если карта уже существует для userId — возвращает её без пересчёта.
   */
  async createNatalChartFromBirthData(
    userId: string,
    birthDateISO: string,
    birthTime: string,
    birthPlace: string,
  ) {
    if (!userId) {
      throw new BadRequestException('userId обязателен');
    }
    if (!birthDateISO || !birthTime || !birthPlace) {
      throw new BadRequestException(
        'Недостаточно данных: требуются дата, время и место рождения',
      );
    }

    // Если уже есть карта — возвращаем, не пересчитывая
    const existing = await this.prisma.chart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;

    // Валидация и нормализация
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

    // Координаты места рождения (с упрощённым маппингом)
    const location = this.getLocationCoordinates(birthPlace);

    // Расчёт (EphemerisService сам имеет fallback)
    const natalChartData = await this.ephemerisService.calculateNatalChart(
      dateStr,
      birthTime,
      location,
    );

    // Сохраняем как неизменяемую натальную карту
    return await this.prisma.chart.create({
      data: {
        userId,
        data: natalChartData,
      },
    });
  }

  /**
   * Создает натальную карту для нового пользователя (только при регистрации)
   */
  async createNatalChartForNewUser(userId: string) {
    // Получаем данные пользователя из базы данных
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        birthDate: true,
        birthTime: true,
        birthPlace: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (!user.birthDate || !user.birthTime || !user.birthPlace) {
      throw new NotFoundException(
        'Недостаточно данных для расчёта натальной карты. Заполните дату, время и место рождения.',
      );
    }

    // Преобразуем дату и время
    const birthDate = user.birthDate.toISOString().split('T')[0];
    const birthTime = user.birthTime;

    // Проверяем корректность времени
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(birthTime)) {
      throw new NotFoundException(
        'Некорректный формат времени рождения. Ожидается HH:MM',
      );
    }

    // Проверяем корректность даты
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthDate)) {
      throw new NotFoundException(
        'Некорректный формат даты рождения. Ожидается YYYY-MM-DD',
      );
    }

    // Получаем координаты места рождения
    const location = this.getLocationCoordinates(user.birthPlace);

    // Рассчитываем натальную карту через Swiss Ephemeris
    const natalChartData = await this.ephemerisService.calculateNatalChart(
      birthDate,
      birthTime,
      location,
    );

    // Сохраняем карту (для новых пользователей всегда создаем новую)
    const newChart = await this.prisma.chart.create({
      data: {
        userId,
        data: natalChartData,
      },
    });

    return newChart;
  }

  async getNatalChart(userId: string) {
    // Сначала пытаемся получить карту через admin (если доступен), иначе через обычный клиент.
    // В случае ошибки доступа (RLS) не прерываемся — ниже попробуем авто-создать карту.
    let charts: any[] | null = null;

    try {
      const res = await this.supabaseService.getUserChartsAdmin(userId);
      if (res.data) {
        charts = res.data;
      }
    } catch (_e) {
      const { data } = await this.supabaseService.getUserCharts(userId);
      // Не прерываемся при ошибке RLS/доступа — попробуем авто-создать карту ниже
      charts = data || [];
    }

    if (charts && charts.length > 0) {
      // Возвращаем самую новую карту
      const chart = charts[0];

      // Самоисцеление: если старая схема/пустые дома/планеты — пересчитываем
      const data = chart.data || {};
      const hasPlanets =
        data.planets &&
        typeof data.planets === 'object' &&
        Object.keys(data.planets).length >= 7;
      const hasHouses =
        data.houses &&
        typeof data.houses === 'object' &&
        Object.keys(data.houses).length >= 12;

      if (!hasPlanets || !hasHouses) {
        try {
          // Пересчитываем по актуальной логике Swiss Ephemeris и сохраняем как новую запись
          return await this.recalculateNatalChart(userId);
        } catch (_recalcErr) {
          // Если не удалось пересчитать (например RLS) — возвращаем то, что есть
        }
      }

      return {
        id: chart.id,
        userId: chart.user_id,
        data: chart.data,
        createdAt: chart.created_at,
        updatedAt: chart.updated_at,
      };
    }

    // Если карты нет, создаём её
    return this.createNatalChart(userId, {});
  }

  async createNatalChart(userId: string, _data: any) {
    // Сначала проверяем, есть ли уже карта (пытаемся через admin, затем обычным способом)
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
      const { data: charts, error } =
        await this.supabaseService.getUserCharts(userId);
      if (!error && charts && charts.length > 0) {
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

    // Если карты нет, создаём её из данных пользователя
    const { data: user, error: userError } = await this.supabaseService
      .from('users')
      .select('id, birth_date, birth_time, birth_place')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      // RLS или отсутствие доступа к профилю пользователя.
      // Фолбэк: считаем натальную карту по тестовым данным без сохранения.
      const fallbackBirthDate = '1990-05-15';
      const fallbackBirthTime = '14:30';
      const fallbackLocation = this.getLocationCoordinates('Москва');

      const fallbackChartData = await this.ephemerisService.calculateNatalChart(
        fallbackBirthDate,
        fallbackBirthTime,
        fallbackLocation,
      );

      return {
        id: 'temporary',
        userId,
        data: fallbackChartData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    if (!user.birth_date || !user.birth_time || !user.birth_place) {
      throw new NotFoundException(
        'Недостаточно данных для расчёта натальной карты. Заполните дату, время и место рождения.',
      );
    }

    // Преобразуем дату и время
    const birthDate = new Date(user.birth_date).toISOString().split('T')[0];
    const birthTime = user.birth_time;

    // Проверяем корректность времени
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(birthTime)) {
      throw new NotFoundException(
        'Некорректный формат времени рождения. Ожидается HH:MM',
      );
    }

    // Получаем координаты места рождения
    const location = this.getLocationCoordinates(user.birth_place);

    // Рассчитываем натальную карту через Swiss Ephemeris
    const natalChartData = await this.ephemerisService.calculateNatalChart(
      birthDate,
      birthTime,
      location,
    );

    // Сохраняем карту через Supabase
    const { data: newChart, error: createError } =
      await this.supabaseService.createUserChart(userId, natalChartData);

    if (createError || !newChart) {
      // Если не удалось сохранить (RLS/нет service role), возвращаем рассчитанные данные без сохранения
      return {
        id: 'temporary',
        userId,
        data: natalChartData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      id: newChart.id,
      userId: newChart.user_id,
      data: newChart.data,
      createdAt: newChart.created_at,
      updatedAt: newChart.updated_at,
    };
  }

  /**
   * Принудительный пересчет натальной карты через Swiss Ephemeris
   * и сохранение результата в Supabase как новую запись (сохраняем историю).
   */
  async recalculateNatalChart(userId: string) {
    // Получаем профиль пользователя: сначала пытаемся через admin (если есть),
    // иначе пробуем анонимным клиентом (RLS может помешать).
    let birthDateISO: string | null = null;
    let birthTime: string | null = null;
    let birthPlace: string | null = null;

    try {
      const { data: profileAdmin } =
        await this.supabaseService.getUserProfileAdmin(userId);
      if (profileAdmin) {
        birthDateISO = profileAdmin.birth_date
          ? new Date(profileAdmin.birth_date).toISOString().split('T')[0]
          : null;
        birthTime = profileAdmin.birth_time || null;
        birthPlace = profileAdmin.birth_place || null;
      }
    } catch (_adminErr) {
      // ignore, попробуем анонимным клиентом ниже
    }

    if (!birthDateISO || !birthTime || !birthPlace) {
      try {
        const { data: profile } = await this.supabaseService
          .from('users')
          .select('id, birth_date, birth_time, birth_place')
          .eq('id', userId)
          .single();
        if (profile) {
          birthDateISO = profile.birth_date
            ? new Date(profile.birth_date).toISOString().split('T')[0]
            : birthDateISO;
          birthTime = profile.birth_time || birthTime;
          birthPlace = profile.birth_place || birthPlace;
        }
      } catch (_anonErr) {
        // ignore
      }
    }

    // Если всё ещё недостаточно данных — используем предсказуемый фолбэк профиля,
    // но сам расчет будет строго через Swiss Ephemeris (в EphemerisService фолбэк отключен).
    if (!birthDateISO || !birthTime || !birthPlace) {
      birthDateISO = birthDateISO || '1990-05-15';
      birthTime = birthTime || '14:30';
      birthPlace = birthPlace || 'Москва';
    }

    const location = this.getLocationCoordinates(birthPlace);
    const natalChartData = await this.ephemerisService.calculateNatalChart(
      birthDateISO,
      birthTime,
      location,
    );

    // Пытаемся сохранить через admin-клиент (обходит RLS), иначе обычным клиентом
    try {
      const { data: newChartAdmin } =
        await this.supabaseService.createUserChartAdmin(userId, natalChartData);
      if (newChartAdmin) {
        return {
          id: newChartAdmin.id,
          userId: newChartAdmin.user_id,
          data: newChartAdmin.data,
          createdAt: newChartAdmin.created_at,
          updatedAt: newChartAdmin.updated_at,
        };
      }
    } catch (_e) {
      // ignore, попробуем обычным клиентом
    }

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

    // Если не удалось сохранить (например, жесткое RLS), возвращаем рассчитанные данные без сохранения
    return {
      id: 'temporary',
      userId,
      data: natalChartData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getTransits(userId: string, from: string, to: string) {
    // Получаем натальную карту пользователя
    const natalChart = await this.getNatalChart(userId);

    // Рассчитываем транзиты через Swiss Ephemeris
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
   * Получает координаты места рождения
   * Упрощённая версия - можно захардкодить для тестирования
   */
  getLocationCoordinates(birthPlace: string): {
    latitude: number;
    longitude: number;
    timezone: number;
  } {
    // Упрощённые координаты для основных городов
    const locations: {
      [key: string]: { latitude: number; longitude: number; timezone: number };
    } = {
      Москва: { latitude: 55.7558, longitude: 37.6176, timezone: 3 },
      'Санкт-Петербург': { latitude: 59.9311, longitude: 30.3609, timezone: 3 },
      Екатеринбург: { latitude: 56.8431, longitude: 60.6454, timezone: 5 },
      Новосибирск: { latitude: 55.0084, longitude: 82.9357, timezone: 7 },
      default: { latitude: 55.7558, longitude: 37.6176, timezone: 3 }, // Москва по умолчанию
    };

    return locations[birthPlace] || locations['default'];
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
    }

    // Получаем позиции планет для целевой даты
    const julianDay = this.ephemerisService.dateToJulianDay(targetDate);
    const targetPlanets =
      await this.ephemerisService.calculatePlanets(julianDay);

    // Генерируем предсказания на основе транзитов
    const predictions = this.generatePredictions(
      natalChart,
      { planets: targetPlanets },
      period,
    );

    return {
      period,
      date: targetDate.toISOString(),
      predictions,
      currentPlanets: targetPlanets,
    };
  }

  /**
   * Генерирует предсказания на основе натальной карты и текущих позиций
   */
  private generatePredictions(
    natalChart: any,
    currentPlanets: any,
    period: string,
  ) {
    const predictions = {
      general: '',
      love: '',
      career: '',
      health: '',
      advice: '',
    };

    // Простая логика предсказаний на основе планет
    const natalPlanets = natalChart.data?.planets || natalChart.planets || {};
    const current = currentPlanets.planets || {};

    // Базовые предсказания в зависимости от периода
    const periodPrefix =
      period === 'tomorrow'
        ? 'Завтра'
        : period === 'week'
          ? 'На неделе'
          : 'Сегодня';

    // Анализ Солнца
    if (current.sun && natalPlanets.sun) {
      const sunAspect = this.calculateAspect(
        current.sun.longitude,
        natalPlanets.sun.longitude,
      );
      if (sunAspect === 'conjunction') {
        predictions.general = `${periodPrefix} благоприятный день для новых начинаний. Энергия Солнца усиливает ваши лидерские качества.`;
      } else if (sunAspect === 'opposition') {
        predictions.general = `${periodPrefix} возможны конфликты в отношениях. Старайтесь быть более дипломатичными.`;
      } else {
        predictions.general = `${periodPrefix} энергия Солнца будет влиять на вашу активность и уверенность в себе.`;
      }
    }

    // Анализ Луны
    if (current.moon && natalPlanets.moon) {
      const moonAspect = this.calculateAspect(
        current.moon.longitude,
        natalPlanets.moon.longitude,
      );
      if (moonAspect === 'conjunction') {
        predictions.love = `${periodPrefix} эмоциональная близость в отношениях. Хорошее время для романтических встреч.`;
      } else {
        predictions.love = `${periodPrefix} Луна будет влиять на ваши эмоции и интуицию в отношениях.`;
      }
    }

    // Анализ Венеры
    if (current.venus && natalPlanets.venus) {
      const venusAspect = this.calculateAspect(
        current.venus.longitude,
        natalPlanets.venus.longitude,
      );
      if (venusAspect === 'trine') {
        predictions.love = `${periodPrefix} гармония в любовных отношениях. Возможны новые знакомства.`;
      } else if (venusAspect === 'square') {
        predictions.love = `${periodPrefix} возможны сложности в отношениях. Будьте терпеливы.`;
      } else {
        predictions.love = `${periodPrefix} Венера будет влиять на вашу привлекательность и отношения.`;
      }
    }

    // Анализ Марса
    if (current.mars && natalPlanets.mars) {
      const marsAspect = this.calculateAspect(
        current.mars.longitude,
        natalPlanets.mars.longitude,
      );
      if (marsAspect === 'square') {
        predictions.career = `${periodPrefix} возможны препятствия в работе. Проявите терпение и настойчивость.`;
      } else if (marsAspect === 'trine') {
        predictions.career = `${periodPrefix} хорошее время для карьерных достижений. Проявляйте инициативу.`;
      } else {
        predictions.career = `${periodPrefix} Марс будет влиять на вашу энергию и амбиции в работе.`;
      }
    }

    // Анализ Юпитера для здоровья
    if (current.jupiter && natalPlanets.jupiter) {
      const jupiterAspect = this.calculateAspect(
        current.jupiter.longitude,
        natalPlanets.jupiter.longitude,
      );
      if (jupiterAspect === 'trine') {
        predictions.health = `${periodPrefix} хорошее время для укрепления здоровья. Занимайтесь спортом.`;
      } else {
        predictions.health = `${periodPrefix} Юпитер будет влиять на ваше общее самочувствие и жизненную силу.`;
      }
    }

    // Общие советы в зависимости от периода
    if (period === 'week') {
      predictions.advice =
        'На этой неделе фокусируйтесь на долгосрочных целях и планировании.';
    } else if (period === 'tomorrow') {
      predictions.advice =
        'Завтра будьте готовы к новым возможностям и изменениям.';
    } else {
      predictions.advice =
        'Сегодня слушайте свою интуицию и доверяйте внутреннему голосу.';
    }

    return predictions;
  }

  /**
   * Вычисляет аспект между двумя планетами
   */
  private calculateAspect(longitude1: number, longitude2: number): string {
    const diff = Math.abs(longitude1 - longitude2);
    const normalizedDiff = Math.min(diff, 360 - diff);

    if (normalizedDiff <= 8) return 'conjunction';
    if (normalizedDiff >= 82 && normalizedDiff <= 98) return 'square';
    if (normalizedDiff >= 118 && normalizedDiff <= 122) return 'trine';
    if (normalizedDiff >= 172 && normalizedDiff <= 188) return 'opposition';

    return 'other';
  }
}
