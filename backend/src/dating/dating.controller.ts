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
  Logger,
  HttpException,
  HttpStatus,
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
  private readonly logger = new Logger(DatingController.name);

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
    try {
      const userId = req.user?.userId || req.user?.id || req.user?.sub;
      if (!userId) {
        throw new UnauthorizedException('Пользователь не аутентифицирован');
      }
      const filters = {
        ageMin: ageMin ? parseInt(ageMin, 10) : undefined,
        ageMax: ageMax ? parseInt(ageMax, 10) : undefined,
        city: city?.trim() || undefined,
        limit: limit
          ? Math.max(1, Math.min(50, parseInt(limit, 10)))
          : undefined,
      };
      return await this.datingService.getMatches(userId, filters);
    } catch (e: any) {
      this.logger.error('getMatches failed', e?.stack || e);
      if (e instanceof HttpException) throw e;
      throw new HttpException(
        'Failed to fetch matches',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('match/:id/like')
  @ApiOperation({ summary: 'Лайкнуть кандидата' })
  @ApiParam({ name: 'id', description: 'ID кандидата' })
  @ApiResponse({ status: 200, description: 'Лайк поставлен' })
  @ApiResponse({ status: 404, description: 'Кандидат не найден' })
  async likeMatch(
    @Request() req: AuthenticatedRequest,
    @Param('id') matchId: string,
  ) {
    try {
      const userId = req.user?.userId || req.user?.id || req.user?.sub;
      if (!userId) {
        throw new UnauthorizedException('Пользователь не аутентифицирован');
      }
      return await this.datingService.likeMatch(userId, matchId);
    } catch (e: any) {
      this.logger.error('likeMatch failed', e?.stack || e);
      if (e instanceof HttpException) throw e;
      throw new HttpException(
        'Failed to like match',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('match/:id/reject')
  @ApiOperation({ summary: 'Отклонить кандидата' })
  @ApiParam({ name: 'id', description: 'ID кандидата' })
  @ApiResponse({ status: 200, description: 'Кандидат отклонен' })
  @ApiResponse({ status: 404, description: 'Кандидат не найден' })
  async rejectMatch(
    @Request() req: AuthenticatedRequest,
    @Param('id') matchId: string,
  ) {
    try {
      const userId = req.user?.userId || req.user?.id || req.user?.sub;
      if (!userId) {
        throw new UnauthorizedException('Пользователь не аутентифицирован');
      }
      return await this.datingService.rejectMatch(userId, matchId);
    } catch (e: any) {
      this.logger.error('rejectMatch failed', e?.stack || e);
      if (e instanceof HttpException) throw e;
      throw new HttpException(
        'Failed to reject match',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
    try {
      const token = this.getAccessToken(req);
      const safeLimit = limit
        ? Math.max(1, Math.min(50, parseInt(limit, 10)))
        : 20;
      return await this.datingService.getCandidatesViaSupabase(
        token,
        safeLimit,
      );
    } catch (e: any) {
      this.logger.error('getCandidates failed', e?.stack || e);
      if (e instanceof HttpException) throw e;
      throw new HttpException(
        'Failed to fetch candidates',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
    try {
      const token = this.getAccessToken(req);
      if (!body?.targetUserId) {
        throw new UnauthorizedException('targetUserId is required');
      }
      const action = body.action ?? 'like';
      return await this.datingService.likeUserViaSupabase(
        token,
        body.targetUserId,
        action,
      );
    } catch (e: any) {
      this.logger.error('likeUser failed', e?.stack || e);
      if (e instanceof HttpException) throw e;
      throw new HttpException(
        'Failed to process like action',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('rank/run')
  @ApiOperation({ summary: 'Запустить ночной ранк кандидатов вручную (admin)' })
  @ApiResponse({ status: 200, description: 'Задача запущена' })
  async runRankCandidates() {
    try {
      const res = await this.datingService.runRankCandidatesNightly();
      return res;
    } catch (e: any) {
      this.logger.error('runRankCandidates failed', e?.stack || e);
      if (e instanceof HttpException) throw e;
      throw new HttpException(
        'Failed to trigger ranking task',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('profile/:userId')
  @ApiOperation({
    summary: 'Публичные данные профиля для карточки Dating',
  })
  @ApiParam({ name: 'userId', description: 'ID пользователя' })
  @ApiResponse({ status: 200, description: 'Публичный профиль' })
  async getPublicProfileForCard(@Param('userId') userId: string) {
    try {
      if (!userId) {
        throw new UnauthorizedException('userId is required');
      }
      return await this.datingService.getPublicProfileForCard(userId);
    } catch (e: any) {
      this.logger.error('getPublicProfileForCard failed', e?.stack || e);
      if (e instanceof HttpException) throw e;
      throw new HttpException(
        'Failed to fetch public profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
