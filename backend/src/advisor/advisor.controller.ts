import {
  Body,
  Controller,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EvaluateAdviceDto } from './dto/evaluate-advice.dto';
import { AdviceResponseDto } from './dto/advice-response.dto';
import { AdvisorService } from './advisor.service';
import { SupabaseAuthGuard } from '@/auth/guards/supabase-auth.guard';
import { SubscriptionGuard } from '@/common/guards/subscription.guard';
import { RequiresSubscription } from '@/common/decorators/requires-subscription.decorator';
import { SubscriptionTier } from '@/types';
import type { AuthenticatedRequest } from '@/types/auth';

@ApiTags('Advisor')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, SubscriptionGuard)
@Controller('advisor')
export class AdvisorController {
  constructor(private readonly advisor: AdvisorService) {}

  @Post('evaluate')
  @ApiOperation({ summary: 'Премиум: совет — хороший ли день для заданной темы' })
  @RequiresSubscription(SubscriptionTier.PREMIUM, SubscriptionTier.MAX)
  @ApiResponse({ status: 201, description: 'Совет с оценкой и метриками' })
  async evaluate(
    @Request() req: AuthenticatedRequest,
    @Body() dto: EvaluateAdviceDto,
  ): Promise<AdviceResponseDto> {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.advisor.evaluate(userId, dto);
  }
}