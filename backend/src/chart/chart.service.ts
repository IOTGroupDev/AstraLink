import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChartService {
  constructor(private prisma: PrismaService) {}

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
    // Удаляем старую натальную карту, если есть
    await this.prisma.chart.deleteMany({
      where: {
        userId,
      },
    });

    return this.prisma.chart.create({
      data: {
        userId,
        data,
      },
    });
  }

  async getTransits(userId: number, from: string, to: string) {
    // Заглушка для транзитов
    return {
      from,
      to,
      transits: [
        {
          date: from,
          planet: 'Sun',
          sign: 'Aries',
          house: 1,
          aspect: 'conjunction',
          orb: 0.5,
        },
        {
          date: to,
          planet: 'Moon',
          sign: 'Taurus',
          house: 2,
          aspect: 'trine',
          orb: 1.2,
        },
      ],
      message: 'Транзиты рассчитываются на основе натальной карты',
    };
  }
}
