import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EphemerisService } from '../services/ephemeris.service';

@Injectable()
export class ChartService {
  constructor(
    private prisma: PrismaService,
    private ephemerisService: EphemerisService,
  ) {}

  async getNatalChart(userId: number) {
    const chart = await this.prisma.chart.findFirst({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!chart) {
      throw new NotFoundException('Натальная карта не найдена');
    }

    return chart;
  }

  async createNatalChart(userId: number, data: any) {
    // Получаем данные пользователя для расчёта
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.birthDate || !user.birthTime || !user.birthPlace) {
      throw new NotFoundException('Недостаточно данных для расчёта натальной карты');
    }

    // Преобразуем дату и время с проверкой
    const birthDate = user.birthDate.toISOString().split('T')[0];
    const birthTime = user.birthTime || '12:00'; // Дефолтное время если не указано
    
    // Проверяем корректность времени
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(birthTime)) {
      throw new NotFoundException('Некорректный формат времени рождения. Ожидается HH:MM');
    }

    // Проверяем корректность даты
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthDate)) {
      throw new NotFoundException('Некорректный формат даты рождения. Ожидается YYYY-MM-DD');
    }
    
    // Упрощённые координаты (можно захардкодить для тестирования)
    const location = this.getLocationCoordinates(user.birthPlace);

    // Рассчитываем натальную карту через Swiss Ephemeris
    const natalChartData = await this.ephemerisService.calculateNatalChart(
      birthDate,
      birthTime,
      location
    );

    // Удаляем старую натальную карту, если есть
    await this.prisma.chart.deleteMany({
      where: {
        userId,
      },
    });

    return this.prisma.chart.create({
      data: {
        userId,
        data: natalChartData,
      },
    });
  }

  async getTransits(userId: number, from: string, to: string) {
    // Получаем натальную карту пользователя
    const natalChart = await this.getNatalChart(userId);
    
    // Рассчитываем транзиты через Swiss Ephemeris
    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    const transits = await this.ephemerisService.getTransits(
      userId,
      fromDate,
      toDate
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
  private getLocationCoordinates(birthPlace: string): { latitude: number; longitude: number; timezone: number } {
    // Упрощённые координаты для основных городов
    const locations: { [key: string]: { latitude: number; longitude: number; timezone: number } } = {
      'Москва': { latitude: 55.7558, longitude: 37.6176, timezone: 3 },
      'Санкт-Петербург': { latitude: 59.9311, longitude: 30.3609, timezone: 3 },
      'Екатеринбург': { latitude: 56.8431, longitude: 60.6454, timezone: 5 },
      'Новосибирск': { latitude: 55.0084, longitude: 82.9357, timezone: 7 },
      'default': { latitude: 55.7558, longitude: 37.6176, timezone: 3 }, // Москва по умолчанию
    };

    return locations[birthPlace] || locations['default'];
  }


  /**
   * Получить текущие позиции планет
   */
  async getCurrentPlanets(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const now = new Date();
    const julianDay = this.ephemerisService.dateToJulianDay(now);
    const currentPlanets = await this.ephemerisService.calculatePlanets(julianDay);

    return {
      date: now.toISOString(),
      planets: currentPlanets,
    };
  }

  /**
   * Получить астрологические предсказания
   */
  async getPredictions(userId: number, period: string = 'day') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Получаем натальную карту
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
    const targetPlanets = await this.ephemerisService.calculatePlanets(julianDay);
    
    // Генерируем предсказания на основе транзитов
    const predictions = this.generatePredictions(natalChart, { planets: targetPlanets }, period);

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
  private generatePredictions(natalChart: any, currentPlanets: any, period: string) {
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
    const periodText = period === 'tomorrow' ? 'завтра' : period === 'week' ? 'на неделе' : 'сегодня';
    const periodPrefix = period === 'tomorrow' ? 'Завтра' : period === 'week' ? 'На неделе' : 'Сегодня';

    // Анализ Солнца
    if (current.sun && natalPlanets.sun) {
      const sunAspect = this.calculateAspect(current.sun.longitude, natalPlanets.sun.longitude);
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
      const moonAspect = this.calculateAspect(current.moon.longitude, natalPlanets.moon.longitude);
      if (moonAspect === 'conjunction') {
        predictions.love = `${periodPrefix} эмоциональная близость в отношениях. Хорошее время для романтических встреч.`;
      } else {
        predictions.love = `${periodPrefix} Луна будет влиять на ваши эмоции и интуицию в отношениях.`;
      }
    }

    // Анализ Венеры
    if (current.venus && natalPlanets.venus) {
      const venusAspect = this.calculateAspect(current.venus.longitude, natalPlanets.venus.longitude);
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
      const marsAspect = this.calculateAspect(current.mars.longitude, natalPlanets.mars.longitude);
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
      const jupiterAspect = this.calculateAspect(current.jupiter.longitude, natalPlanets.jupiter.longitude);
      if (jupiterAspect === 'trine') {
        predictions.health = `${periodPrefix} хорошее время для укрепления здоровья. Занимайтесь спортом.`;
      } else {
        predictions.health = `${periodPrefix} Юпитер будет влиять на ваше общее самочувствие и жизненную силу.`;
      }
    }

    // Общие советы в зависимости от периода
    if (period === 'week') {
      predictions.advice = 'На этой неделе фокусируйтесь на долгосрочных целях и планировании.';
    } else if (period === 'tomorrow') {
      predictions.advice = 'Завтра будьте готовы к новым возможностям и изменениям.';
    } else {
      predictions.advice = 'Сегодня слушайте свою интуицию и доверяйте внутреннему голосу.';
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
