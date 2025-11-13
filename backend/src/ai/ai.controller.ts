import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  UnauthorizedException,
  Res,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AIService } from '../services/ai.service';
import { HoroscopeGeneratorService } from '../services/horoscope-generator.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import type { AuthenticatedRequest } from '../types/auth';

interface GenerateHoroscopeDto {
  period: 'day' | 'tomorrow' | 'week' | 'month';
  provider?: 'claude' | 'openai'; // ✅ Выбор AI провайдера
  useStreaming?: boolean;
}

@ApiTags('AI')
@Controller('ai')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly horoscopeService: HoroscopeGeneratorService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Проверить статус AI сервисов' })
  @ApiResponse({ status: 200, description: 'Статус AI провайдеров' })
  async getAIStatus() {
    const provider = this.aiService.getProvider();
    const isAvailable = this.aiService.isAvailable();
    const availableProviders = this.aiService.getAvailableProviders();
    const providerPreference = process.env.AI_PROVIDER_PREFERENCE || 'auto';

    return {
      available: isAvailable,
      currentProvider: provider,
      providerPreference, // 🎯 Глобальная настройка провайдера
      availableProviders, // ✅ Список всех доступных провайдеров
      features: {
        horoscope: isAvailable,
        chartInterpretation: isAvailable,
        streaming: isAvailable,
        retryLogic: isAvailable,
        costTracking: isAvailable,
        automaticFallback: isAvailable,
        globalProviderSelection: true, // ✅ Глобальный выбор провайдера через env
      },
      improvements: {
        claudeStreaming: true,
        claudeRetryLogic: true,
        claudeCostTracking: true,
        automaticFallback: true,
        globalProviderChoice: true, // ✅ Новая фича - глобальный выбор
      },
      providers: {
        claude: {
          available: this.aiService.isProviderAvailable('claude'),
          model: 'claude-sonnet-4-5',
          cost: '$3/1M input, $15/1M output',
          quality: 'premium',
        },
        openai: {
          available: this.aiService.isProviderAvailable('openai'),
          model: 'gpt-4o-mini',
          cost: '$0.15/1M input, $0.60/1M output',
          quality: 'good',
        },
      },
    };
  }

  @Post('horoscope/generate')
  @ApiOperation({ summary: 'Генерация PREMIUM гороскопа через AI (ТОЛЬКО для PREMIUM)' })
  @ApiResponse({ status: 200, description: 'AI-гороскоп успешно сгенерирован' })
  @ApiResponse({ status: 403, description: 'Требуется PREMIUM подписка' })
  async generateHoroscope(
    @Request() req: AuthenticatedRequest,
    @Body() dto: GenerateHoroscopeDto,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    // Generate horoscope via HoroscopeGeneratorService
    // which will check subscription and use AI if premium
    const horoscope = await this.horoscopeService.generateHoroscope(
      userId,
      dto.period || 'day',
    );

    return horoscope;
  }

  @Post('horoscope/direct')
  @ApiOperation({
    summary:
      '🎯 Прямая генерация через AI с выбором провайдера (PREMIUM)',
  })
  @ApiResponse({ status: 200, description: 'AI-гороскоп успешно сгенерирован' })
  @ApiResponse({ status: 400, description: 'Недоступный провайдер' })
  @ApiResponse({ status: 403, description: 'Требуется PREMIUM подписка' })
  async generateHoroscopeDirect(
    @Request() req: AuthenticatedRequest,
    @Body() dto: GenerateHoroscopeDto,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    // Validate provider if specified
    if (dto.provider && !this.aiService.isProviderAvailable(dto.provider)) {
      return {
        error: `Провайдер ${dto.provider} недоступен`,
        availableProviders: this.aiService.getAvailableProviders(),
      };
    }

    try {
      // Get user's natal chart context
      const context = await this.horoscopeService['buildHoroscopeContext'](
        userId,
        dto.period || 'day',
      );

      // Generate with chosen or default provider
      const result = await this.aiService.generateHoroscopeWithProvider(
        context,
        dto.provider,
      );

      return {
        ...result,
        meta: {
          provider: dto.provider || this.aiService.getProvider(),
          explicitChoice: !!dto.provider,
          period: dto.period || 'day',
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        error: errorMessage,
        availableProviders: this.aiService.getAvailableProviders(),
      };
    }
  }

  @Post('horoscope/stream')
  @ApiOperation({
    summary:
      '🌊 STREAMING с выбором провайдера (PREMIUM - Claude & OpenAI)',
  })
  @ApiResponse({
    status: 200,
    description: 'Server-Sent Events stream с частями гороскопа',
  })
  @ApiResponse({ status: 403, description: 'Требуется PREMIUM подписка и AI провайдер' })
  async streamHoroscope(
    @Request() req: AuthenticatedRequest,
    @Body() dto: GenerateHoroscopeDto,
    @Res() res: Response,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    // Validate provider if specified
    if (dto.provider && !this.aiService.isProviderAvailable(dto.provider)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: `Провайдер ${dto.provider} недоступен для streaming`,
        availableProviders: this.aiService.getAvailableProviders(),
      });
    }

    // Check if streaming is available
    if (!this.aiService.isAvailable()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'AI сервис недоступен - необходим API ключ Claude или OpenAI',
        currentProvider: this.aiService.getProvider(),
      });
    }

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    try {
      // Get user's natal chart context
      const context = await this.horoscopeService['buildHoroscopeContext'](
        userId,
        dto.period || 'day',
      );

      // Send provider info first
      res.write(
        `data: ${JSON.stringify({
          provider: dto.provider || this.aiService.getProvider(),
          explicitChoice: !!dto.provider,
        })}\n\n`,
      );

      // Stream the horoscope generation with chosen provider
      for await (const chunk of this.aiService.generateHoroscopeStreamWithProvider(
        context,
        dto.provider,
      )) {
        // Send chunk as SSE event
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }

      // Send completion event
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      res.write(
        `data: ${JSON.stringify({ error: errorMessage, done: true })}\n\n`,
      );
      res.end();
    }
  }

  @Get('usage/stats')
  @ApiOperation({ summary: 'Получить статистику использования AI' })
  @ApiResponse({ status: 200, description: 'Статистика AI использования' })
  async getUsageStats(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    // TODO: Implement usage tracking in Redis
    // For now, return mock data
    return {
      userId,
      provider: this.aiService.getProvider(),
      thisMonth: {
        requests: 0,
        estimatedCost: 0,
      },
      limits: {
        monthly: 100, // Premium limit
        remaining: 100,
      },
    };
  }
}
