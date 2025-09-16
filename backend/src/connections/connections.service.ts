import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EphemerisService } from '../services/ephemeris.service';
import type { CreateConnectionRequest, SynastryResponse, CompositeResponse } from '../types';

@Injectable()
export class ConnectionsService {
  constructor(
    private prisma: PrismaService,
    private ephemerisService: EphemerisService,
  ) {}

  async createConnection(userId: number, connectionData: CreateConnectionRequest) {
    return this.prisma.connection.create({
      data: {
        userId: userId,
        targetName: connectionData.targetName,
        targetData: connectionData.targetData,
      },
    });
  }

  async getConnections(userId: number) {
    return this.prisma.connection.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSynastry(userId: number, connectionId: number): Promise<SynastryResponse> {
    const connection = await this.prisma.connection.findFirst({
      where: {
        id: connectionId,
        userId: userId,
      },
    });

    if (!connection) {
      throw new NotFoundException('Связь не найдена');
    }

    // Получаем натальную карту пользователя
    const userChart = await this.prisma.chart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!userChart) {
      throw new NotFoundException('Натальная карта пользователя не найдена');
    }

    // Рассчитываем натальную карту для цели
    const targetData = connection.targetData as any;
    const location = this.getLocationCoordinates(targetData.birthPlace || 'Москва');
    
    const targetChart = await this.ephemerisService.calculateNatalChart(
      targetData.birthDate,
      targetData.birthTime,
      location
    );

    // Рассчитываем синастрию
    const synastryData = await this.ephemerisService.getSynastry(
      userChart.data,
      targetChart
    );

    return {
      compatibility: synastryData.compatibility,
      aspects: synastryData.aspects,
    };
  }

  async getComposite(userId: number, connectionId: number): Promise<CompositeResponse> {
    const connection = await this.prisma.connection.findFirst({
      where: {
        id: connectionId,
        userId: userId,
      },
    });

    if (!connection) {
      throw new NotFoundException('Связь не найдена');
    }

    // Получаем натальную карту пользователя
    const userChart = await this.prisma.chart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!userChart) {
      throw new NotFoundException('Натальная карта пользователя не найдена');
    }

    // Рассчитываем натальную карту для цели
    const targetData = connection.targetData as any;
    const location = this.getLocationCoordinates(targetData.birthPlace || 'Москва');
    
    const targetChart = await this.ephemerisService.calculateNatalChart(
      targetData.birthDate,
      targetData.birthTime,
      location
    );

    // Рассчитываем композитную карту
    const compositeData = await this.ephemerisService.getComposite(
      userChart.data,
      targetChart
    );

    return {
      summary: `Композитная карта для ${connection.targetName}: ${compositeData.summary}`,
    };
  }

  /**
   * Получает координаты места рождения
   */
  private getLocationCoordinates(birthPlace: string): { latitude: number; longitude: number; timezone: number } {
    const locations: { [key: string]: { latitude: number; longitude: number; timezone: number } } = {
      'Москва': { latitude: 55.7558, longitude: 37.6176, timezone: 3 },
      'Санкт-Петербург': { latitude: 59.9311, longitude: 30.3609, timezone: 3 },
      'Екатеринбург': { latitude: 56.8431, longitude: 60.6454, timezone: 5 },
      'Новосибирск': { latitude: 55.0084, longitude: 82.9357, timezone: 7 },
      'default': { latitude: 55.7558, longitude: 37.6176, timezone: 3 },
    };

    return locations[birthPlace] || locations['default'];
  }
}
