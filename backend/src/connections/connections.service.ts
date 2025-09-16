import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateConnectionRequest, SynastryResponse, CompositeResponse } from '../types';

@Injectable()
export class ConnectionsService {
  constructor(private prisma: PrismaService) {}

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

    // Заглушка для синастрии
    return {
      compatibility: Math.floor(Math.random() * 40) + 60, // 60-100%
      aspects: [
        {
          planet1: 'Sun',
          planet2: 'Moon',
          aspect: 'trine',
          orb: 2.5,
          strength: 0.8,
        },
        {
          planet1: 'Venus',
          planet2: 'Mars',
          aspect: 'sextile',
          orb: 1.2,
          strength: 0.9,
        },
      ],
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

    // Заглушка для композитной карты
    return {
      summary: `Композитная карта для ${connection.targetName} - анализ совместимости в разработке`,
    };
  }
}
