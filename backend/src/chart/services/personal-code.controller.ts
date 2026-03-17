import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  PersonalCodeService,
  CodePurpose,
} from '../services/personal-code.service';
import { SupabaseAuthGuard } from '@/auth/guards/supabase-auth.guard';
import { AuthenticatedRequest } from '@/types/auth';
import { SubscriptionTier } from '@/types';

interface GenerateCodeDto {
  purpose: CodePurpose;
  digitCount?: number;
}

@ApiTags('Personal Codes')
@Controller('personal-code')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class PersonalCodeController {
  constructor(private readonly personalCodeService: PersonalCodeService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Сгенерировать персональный код' })
  @ApiResponse({
    status: 200,
    description: 'Код успешно сгенерирован',
  })
  @ApiResponse({
    status: 400,
    description: 'Некорректные параметры',
  })
  @ApiResponse({
    status: 401,
    description: 'Пользователь не авторизован',
  })
  @ApiResponse({
    status: 404,
    description: 'Натальная карта не найдена',
  })
  async generateCode(
    @Request() req: AuthenticatedRequest,
    @Body() dto: GenerateCodeDto,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;

    if (!userId) {
      throw new BadRequestException('Пользователь не авторизован');
    }

    const localeHeader =
      (req.headers?.['x-locale'] as string | undefined) ||
      (req.headers?.['accept-language'] as string | undefined);
    const locale = localeHeader?.toLowerCase().startsWith('es')
      ? 'es'
      : localeHeader?.toLowerCase().startsWith('en')
        ? 'en'
        : 'ru';

    // Get user's subscription tier
    const subscription = await this.getSubscriptionTier(userId);

    return await this.personalCodeService.generatePersonalCode(
      userId,
      dto.purpose,
      dto.digitCount || 4,
      subscription,
      locale,
    );
  }

  @Get('purposes')
  @ApiOperation({ summary: 'Получить список доступных целей' })
  @ApiResponse({
    status: 200,
    description: 'Список целей',
  })
  async getPurposes() {
    return {
      purposes: [
        {
          key: 'luck',
          name: 'Удача и везение',
          description: 'Привлекает благоприятные возможности',
          icon: '🍀',
          color: '#10B981',
        },
        {
          key: 'health',
          name: 'Здоровье и витальность',
          description: 'Укрепляет жизненную силу',
          icon: '❤️',
          color: '#EF4444',
        },
        {
          key: 'wealth',
          name: 'Богатство и финансы',
          description: 'Открывает денежные потоки',
          icon: '💰',
          color: '#F59E0B',
        },
        {
          key: 'love',
          name: 'Любовь и отношения',
          description: 'Гармонизирует отношения',
          icon: '💕',
          color: '#EC4899',
        },
        {
          key: 'career',
          name: 'Карьера и успех',
          description: 'Ускоряет профессиональный рост',
          icon: '🎯',
          color: '#8B5CF6',
        },
        {
          key: 'creativity',
          name: 'Творчество',
          description: 'Раскрывает творческий потенциал',
          icon: '🎨',
          color: '#F97316',
        },
        {
          key: 'protection',
          name: 'Защита',
          description: 'Создаёт энергетический щит',
          icon: '🛡️',
          color: '#6366F1',
        },
        {
          key: 'intuition',
          name: 'Интуиция',
          description: 'Усиливает духовное восприятие',
          icon: '🔮',
          color: '#A855F7',
        },
        {
          key: 'harmony',
          name: 'Гармония',
          description: 'Балансирует все сферы жизни',
          icon: '☯️',
          color: '#06B6D4',
        },
        {
          key: 'energy',
          name: 'Энергия',
          description: 'Повышает жизненную энергию',
          icon: '⚡',
          color: '#FBBF24',
        },
      ],
    };
  }

  /**
   * DEBUG ENDPOINT - Remove after fixing chart structure issue
   */
  @Get('debug/chart-structure')
  @ApiOperation({ summary: '[DEBUG] Показать структуру натальной карты' })
  async debugChartStructure(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('Пользователь не авторизован');
    }

    // Access chart repository via service (assuming it's accessible)
    // For now, return instructions
    return {
      message: 'Debug endpoint - check chart structure',
      instructions: [
        '1. Check backend logs for debug output',
        '2. Look for: "Chart data keys:", "Debug info:"',
        '3. The structure should show where planets are located',
      ],
      userId,
      tip: 'Try calling POST /personal-code/generate and check the logs',
    };
  }

  /**
   * Helper: Get user's subscription tier
   */
  private async getSubscriptionTier(userId: string): Promise<SubscriptionTier> {
    // This should use your existing SubscriptionService
    // For now, returning default
    return SubscriptionTier.FREE;
  }
}
