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
    if (!/^\d{2}:\d{2}$/.test(birthTime)) {
      throw new NotFoundException('Некорректный формат времени рождения');
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
}
