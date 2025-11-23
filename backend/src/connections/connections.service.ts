import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EphemerisService } from '../services/ephemeris.service';
import type {
  CreateConnectionRequest,
  SynastryResponse,
  CompositeResponse,
  BirthData,
  LocationCoordinates,
} from '../types';
import { getLocationFromBirthData } from '../utils/location.utils';
import type { ChartData } from '../dating/dating.types';

@Injectable()
export class ConnectionsService {
  constructor(
    private prisma: PrismaService,
    private ephemerisService: EphemerisService,
  ) {}

  async createConnection(
    userId: string,
    connectionData: CreateConnectionRequest,
  ) {
    return this.prisma.connection.create({
      data: {
        userId: userId,
        targetName: connectionData.targetName,
        targetData: connectionData.targetData,
      },
    });
  }

  async getConnections(userId: string) {
    return this.prisma.connection.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSynastry(
    userId: string,
    connectionId: string,
  ): Promise<SynastryResponse> {
    // Get connection and validate
    const connection = await this.getConnectionOrThrow(userId, connectionId);

    // Get user chart
    const userChart = await this.getUserChartOrThrow(userId);

    // Calculate target chart
    const targetChart = await this.calculateTargetChart(connection.targetData);

    // Calculate synastry
    const synastryData = await this.ephemerisService.getSynastry(
      userChart.data,
      targetChart,
    );

    return {
      compatibility: synastryData.compatibility,
      aspects: synastryData.aspects,
    };
  }

  async getComposite(
    userId: string,
    connectionId: string,
  ): Promise<CompositeResponse> {
    // Get connection and validate
    const connection = await this.getConnectionOrThrow(userId, connectionId);

    // Get user chart
    const userChart = await this.getUserChartOrThrow(userId);

    // Calculate target chart
    const targetChart = await this.calculateTargetChart(connection.targetData);

    // Calculate composite chart
    const compositeData = await this.ephemerisService.getComposite(
      userChart.data,
      targetChart,
    );

    return {
      summary: `Композитная карта для ${connection.targetName}: ${compositeData.summary}`,
    };
  }

  /**
   * Get connection by ID and validate ownership
   * @throws NotFoundException if connection not found
   */
  private async getConnectionOrThrow(
    userId: string,
    connectionId: string,
  ): Promise<{ id: string; targetName: string; targetData: BirthData }> {
    const connection = await this.prisma.connection.findFirst({
      where: {
        id: connectionId,
        userId: userId,
      },
    });

    if (!connection) {
      throw new NotFoundException('Связь не найдена');
    }

    return {
      id: connection.id,
      targetName: connection.targetName,
      targetData: connection.targetData as BirthData,
    };
  }

  /**
   * Get user's natal chart
   * @throws NotFoundException if chart not found
   */
  private async getUserChartOrThrow(
    userId: string,
  ): Promise<{ data: ChartData }> {
    const userChart = await this.prisma.chart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!userChart) {
      throw new NotFoundException('Натальная карта пользователя не найдена');
    }

    return {
      data: userChart.data as ChartData,
    };
  }

  /**
   * Calculate natal chart for target person
   */
  private async calculateTargetChart(
    targetData: BirthData,
  ): Promise<ChartData> {
    const location: LocationCoordinates = getLocationFromBirthData(
      targetData.birthPlace,
      targetData.latitude,
      targetData.longitude,
      targetData.timezone,
    );

    return this.ephemerisService.calculateNatalChart(
      targetData.birthDate,
      targetData.birthTime,
      location,
    );
  }
}
