import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DatingService } from './dating.service';
import type { DatingMatchResponse } from '../types';
import type { AuthenticatedRequest } from '../types/auth';

@ApiTags('Dating')
@Controller('dating')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DatingController {
  constructor(private readonly datingService: DatingService) {}

  @Get('matches')
  @ApiOperation({ summary: 'Получить список кандидатов для знакомств' })
  @ApiResponse({ status: 200, description: 'Список кандидатов' })
  async getMatches(
    @Request() _req: AuthenticatedRequest,
  ): Promise<DatingMatchResponse[]> {
    return this.datingService.getMatches();
  }

  @Post('match/:id/like')
  @ApiOperation({ summary: 'Лайкнуть кандидата' })
  @ApiParam({ name: 'id', description: 'ID кандидата' })
  @ApiResponse({ status: 200, description: 'Лайк поставлен' })
  @ApiResponse({ status: 404, description: 'Кандидат не найден' })
  likeMatch(
    @Request() req: AuthenticatedRequest,
    @Param('id') matchId: string,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.datingService.likeMatch(userId, matchId);
  }

  @Post('match/:id/reject')
  @ApiOperation({ summary: 'Отклонить кандидата' })
  @ApiParam({ name: 'id', description: 'ID кандидата' })
  @ApiResponse({ status: 200, description: 'Кандидат отклонен' })
  @ApiResponse({ status: 404, description: 'Кандидат не найден' })
  rejectMatch(
    @Request() req: AuthenticatedRequest,
    @Param('id') matchId: string,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.datingService.rejectMatch(userId, matchId);
  }
}
