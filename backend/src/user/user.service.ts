import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        birthDate: true,
        birthTime: true,
        birthPlace: true,
        createdAt: true,
        updatedAt: true,
        subscription: {
          select: {
            level: true,
            expiresAt: true,
          },
        },
        _count: {
          select: {
            charts: true,
            connections: true,
            matches: true,
          },
        },
      },
    });
  }
}
