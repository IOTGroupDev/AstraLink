import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  Body,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { DatingService } from './dating.service';
import type { DatingMatchResponse } from '../types';
import type { AuthenticatedRequest } from '../types/auth';

@ApiTags('Dating')
@Controller('dating')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class DatingController {
  constructor(private readonly datingService: DatingService) {}

  @Get('matches')
  @ApiOperation({ summary: 'Получить список кандидатов для знакомств' })
  @ApiResponse({ status: 200, description: 'Список кандидатов' })
  async getMatches(
    @Request() req: AuthenticatedRequest,
    @Query('ageMin') ageMin?: string,
    @Query('ageMax') ageMax?: string,
    @Query('city') city?: string,
    @Query('limit') limit?: string,
  ): Promise<DatingMatchResponse[]> {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    const filters = {
      ageMin: ageMin ? parseInt(ageMin, 10) : undefined,
      ageMax: ageMax ? parseInt(ageMax, 10) : undefined,
      city: city?.trim() || undefined,
      limit: limit ? Math.max(1, Math.min(50, parseInt(limit, 10))) : undefined,
    };
    return this.datingService.getMatches(userId, filters);
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

  // New: get candidates via Supabase RPC cache (badge only)
  @Get('candidates')
  @ApiOperation({
    summary: 'Получить кандидатов (кэш совместимости, только бейджи)',
  })
  @ApiResponse({ status: 200, description: 'Список кандидатов' })
  async getCandidates(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    const token = this.getAccessToken(req);
    const safeLimit = limit
      ? Math.max(1, Math.min(50, parseInt(limit, 10)))
      : 20;
    return this.datingService.getCandidatesViaSupabase(token, safeLimit);
  }

  // New: like/super_like/pass via Supabase RPC
  @Post('like')
  @ApiOperation({ summary: 'Поставить действие: like/super_like/pass' })
  @ApiResponse({
    status: 200,
    description: 'Действие записано, при взаимности возвращается matchId',
  })
  async likeUser(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: { targetUserId: string; action?: 'like' | 'super_like' | 'pass' },
  ) {
    const token = this.getAccessToken(req);
    if (!body?.targetUserId) {
      throw new UnauthorizedException('targetUserId is required');
    }
    const action = body.action ?? 'like';
    return this.datingService.likeUserViaSupabase(
      token,
      body.targetUserId,
      action,
    );
  }

  @Post('rank/run')
  @ApiOperation({ summary: 'Запустить ночной ранк кандидатов вручную (admin)' })
  @ApiResponse({ status: 200, description: 'Задача запущена' })
  async runRankCandidates() {
    const res = await this.datingService.runRankCandidatesNightly();
    return res;
  }

  // Helper to extract bearer token (needed for Supabase RLS auth.uid())
  private getAccessToken(req: any): string {
    const auth = req?.headers?.authorization || '';
    const [scheme, token] = auth.split(' ');
    if (!token || String(scheme).toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('Missing bearer token');
    }
    return token;
  }
}
