import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChartRepository {
  constructor(private prisma: PrismaService) {}

  async findFirstByUserId(userId: number) {
    return this.prisma.chart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUserId(userId: number) {
    return this.prisma.chart.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: number, data: any) {
    return this.prisma.chart.create({
      data: {
        userId,
        data,
      },
    });
  }

  async deleteByUserId(userId: number) {
    return this.prisma.chart.deleteMany({
      where: { userId },
    });
  }

  async findById(id: number) {
    return this.prisma.chart.findUnique({
      where: { id },
    });
  }

  async update(id: number, data: any) {
    return this.prisma.chart.update({
      where: { id },
      data: { data },
    });
  }
}
