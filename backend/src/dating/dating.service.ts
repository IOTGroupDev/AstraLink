import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { DatingMatchResponse } from '../types';

@Injectable()
export class DatingService {
  constructor(private prisma: PrismaService) {}

  async getMatches(userId: string): Promise<DatingMatchResponse[]> {
    // Заглушка с 3-5 случайными кандидатами
    const mockCandidates = [
      {
        id: 'match-1',
        partnerId: 'partner-1',
        partnerName: 'Анна',
        compatibility: Math.floor(Math.random() * 30) + 70, // 70-100%
        status: 'pending',
        details: {
          age: 28,
          sign: 'Scorpio',
          interests: ['астрология', 'йога', 'путешествия'],
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'match-2',
        partnerId: 'partner-2',
        partnerName: 'Мария',
        compatibility: Math.floor(Math.random() * 30) + 70,
        status: 'pending',
        details: {
          age: 25,
          sign: 'Pisces',
          interests: ['медитация', 'искусство', 'природа'],
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'match-3',
        partnerId: 'partner-3',
        partnerName: 'Елена',
        compatibility: Math.floor(Math.random() * 30) + 70,
        status: 'pending',
        details: {
          age: 30,
          sign: 'Cancer',
          interests: ['семья', 'кулинария', 'чтение'],
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'match-4',
        partnerId: 'partner-4',
        partnerName: 'Ольга',
        compatibility: Math.floor(Math.random() * 30) + 70,
        status: 'pending',
        details: {
          age: 27,
          sign: 'Libra',
          interests: ['музыка', 'танцы', 'мода'],
        },
        createdAt: new Date().toISOString(),
      },
    ];

    return mockCandidates;
  }

  async likeMatch(userId: string, matchId: string) {
    // В реальном приложении здесь была бы логика обновления статуса матча
    return {
      success: true,
      message: 'Лайк поставлен',
      matchId,
    };
  }

  async rejectMatch(userId: string, matchId: string) {
    // В реальном приложении здесь была бы логика обновления статуса матча
    return {
      success: true,
      message: 'Кандидат отклонен',
      matchId,
    };
  }
}
