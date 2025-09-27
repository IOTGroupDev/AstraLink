import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  Body,
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

@ApiTags('Dating')
@Controller('dating')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DatingController {
  constructor(private readonly datingService: DatingService) {}

  @Get('matches')
  @ApiOperation({ summary: 'Получить список кандидатов для знакомств' })
  @ApiResponse({ status: 200, description: 'Список кандидатов' })
  async getMatches(@Request() _req): Promise<DatingMatchResponse[]> {
    return this.datingService.getMatches();
  }

  @Post('match/:id/like')
  @ApiOperation({ summary: 'Лайкнуть кандидата' })
  @ApiParam({ name: 'id', description: 'ID кандидата' })
  @ApiResponse({ status: 200, description: 'Лайк поставлен' })
  @ApiResponse({ status: 404, description: 'Кандидат не найден' })
  likeMatch(@Request() req, @Param('id') matchId: string) {
    return this.datingService.likeMatch(req.user.userId, matchId);
  }

  @Post('match/:id/reject')
  @ApiOperation({ summary: 'Отклонить кандидата' })
  @ApiParam({ name: 'id', description: 'ID кандидата' })
  @ApiResponse({ status: 200, description: 'Кандидат отклонен' })
  @ApiResponse({ status: 404, description: 'Кандидат не найден' })
  rejectMatch(@Request() req, @Param('id') matchId: string) {
    return this.datingService.rejectMatch(req.user.userId, matchId);
  }
}
