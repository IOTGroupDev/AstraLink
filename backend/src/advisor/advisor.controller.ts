import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EvaluateAdviceDto } from './dto/evaluate-advice.dto';
import { AdviceResponseDto } from './dto/advice-response.dto';
import { AdvisorService } from './advisor.service';
import { SupabaseAuthGuard } from '@/auth/guards/supabase-auth.guard';
import { SubscriptionGuard } from '@/common/guards/subscription.guard';
import { RequiresSubscription } from '@/common/decorators/requires-subscription.decorator';
import { SubscriptionTier } from '@/types';
import { AdvisorRateLimitGuard } from './guards/advisor-rate-limit.guard';
import type { AuthenticatedRequest } from '@/types/auth';

@ApiTags('advisor')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, SubscriptionGuard)
@Controller('advisor')
export class AdvisorController {
  constructor(private readonly advisor: AdvisorService) {}

  @Post('evaluate')
  @UseGuards(AdvisorRateLimitGuard) // 🎯 Rate limiting: 30/day (Premium), 100/day (MAX)
  @ApiOperation({
    summary:
      'AI Советник: совет для заданной темы (Premium: 30/день, MAX: 100/день)',
  })
  @RequiresSubscription(SubscriptionTier.PREMIUM, SubscriptionTier.MAX)
  @ApiResponse({
    status: 201,
    description: 'Совет с оценкой и метриками',
    schema: {
      example: {
        advice: 'Сегодня благоприятный день для карьерных решений',
        score: 8.5,
        remaining: 29,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Лимит запросов исчерпан или требуется Premium подписка',
  })
  async evaluate(
    @Request() req: AuthenticatedRequest,
    @Body() dto: EvaluateAdviceDto,
  ): Promise<AdviceResponseDto> {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    // Add usage info to response
    const result = await this.advisor.evaluate(userId, dto);

    // Append rate limit info if available
    const usage = req['advisorUsage'];
    if (usage) {
      return {
        ...result,
        rateLimit: {
          current: usage.current,
          limit: usage.limit,
          remaining: usage.remaining,
          tier: usage.tier,
        },
      };
    }

    return result;
  }

  @Get('usage')
  @ApiOperation({
    summary: 'Получить информацию об использовании советника',
  })
  @RequiresSubscription(SubscriptionTier.PREMIUM, SubscriptionTier.MAX)
  @ApiResponse({
    status: 200,
    description: 'Статистика использования советника',
  })
  async getUsage(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    // This will be implemented in the service
    return this.advisor.getUsageStats(userId);
  }
}
