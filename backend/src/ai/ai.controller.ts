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
import { SubscriptionGuard } from '@/common/guards/subscription.guard';
import { RequiresSubscription } from '@/common/decorators/requires-subscription.decorator';
import { SubscriptionTier } from '@/types/subscription';
import type { AuthenticatedRequest } from '../types/auth';

interface GenerateHoroscopeDto {
  period: 'day' | 'tomorrow' | 'week' | 'month';
  provider?: 'claude' | 'openai' | 'deepseek'; // ✅ Выбор AI провайдера
  useStreaming?: boolean;
}

@ApiTags('AI')
@Controller('ai')
@UseGuards(SupabaseAuthGuard, SubscriptionGuard)
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
        deepseek: {
          available: this.aiService.isProviderAvailable('deepseek'),
          model: 'deepseek-chat',
          cost: '$0.14/1M input, $0.28/1M output',
          quality: 'excellent',
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
  @RequiresSubscription(SubscriptionTier.PREMIUM, SubscriptionTier.MAX) // 🎯 Только Premium и MAX
  @ApiOperation({
    summary: 'AI генерация гороскопа (PREMIUM/MAX, обновление 1 раз в сутки)',
  })
  @ApiResponse({ status: 200, description: 'AI-гороскоп успешно сгенерирован' })
  @ApiResponse({
    status: 403,
    description: 'Требуется PREMIUM или MAX подписка',
  })
  async generateHoroscope(
    @Request() req: AuthenticatedRequest,
    @Body() dto: GenerateHoroscopeDto,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    const localeHeader =
      (req.headers?.['x-locale'] as string | undefined) ||
      (req.headers?.['accept-language'] as string | undefined);
    const locale = localeHeader?.toLowerCase().startsWith('es')
      ? 'es'
      : localeHeader?.toLowerCase().startsWith('en')
        ? 'en'
        : 'ru';

    // Generate horoscope via HoroscopeGeneratorService
    // which will check subscription and use AI if premium
    const horoscope = await this.horoscopeService.generateHoroscope(
      userId,
      dto.period || 'day',
      undefined,
      locale,
    );

    return horoscope;
  }

  @Post('horoscope/direct')
  @RequiresSubscription(SubscriptionTier.PREMIUM, SubscriptionTier.MAX) // 🎯 Только Premium и MAX
  @ApiOperation({
    summary: '🎯 Прямая генерация через AI с выбором провайдера (PREMIUM/MAX)',
  })
  @ApiResponse({ status: 200, description: 'AI-гороскоп успешно сгенерирован' })
  @ApiResponse({ status: 400, description: 'Недоступный провайдер' })
  @ApiResponse({
    status: 403,
    description: 'Требуется PREMIUM или MAX подписка',
  })
  async generateHoroscopeDirect(
    @Request() req: AuthenticatedRequest,
    @Body() dto: GenerateHoroscopeDto,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    const localeHeader =
      (req.headers?.['x-locale'] as string | undefined) ||
      (req.headers?.['accept-language'] as string | undefined);
    const locale = localeHeader?.toLowerCase().startsWith('es')
      ? 'es'
      : localeHeader?.toLowerCase().startsWith('en')
        ? 'en'
        : 'ru';

    // Validate provider if specified
    if (dto.provider && !this.aiService.isProviderAvailable(dto.provider)) {
      return {
        error: `Провайдер ${dto.provider} недоступен`,
        availableProviders: this.aiService.getAvailableProviders(),
      };
    }

    try {
      // Note: Provider selection not fully implemented yet - using default horoscope service
      // TODO: Implement buildHoroscopeContext to support provider selection
      const result = await this.horoscopeService.generateHoroscope(
        userId,
        dto.period || 'day',
        true, // isPremium - assuming user has access since this endpoint requires subscription
        locale,
      );

      return {
        ...result,
        meta: {
          provider: this.aiService.getProvider(),
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
  @RequiresSubscription(SubscriptionTier.PREMIUM, SubscriptionTier.MAX) // 🎯 Только Premium и MAX
  @ApiOperation({
    summary:
      '🌊 STREAMING с выбором провайдера (PREMIUM/MAX - Claude, DeepSeek & OpenAI)',
  })
  @ApiResponse({
    status: 200,
    description: 'Server-Sent Events stream с частями гороскопа',
  })
  @ApiResponse({
    status: 403,
    description: 'Требуется PREMIUM или MAX подписка',
  })
  async streamHoroscope(
    @Request() req: AuthenticatedRequest,
    @Body() dto: GenerateHoroscopeDto,
    @Res() res: Response,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    const localeHeader =
      (req.headers?.['x-locale'] as string | undefined) ||
      (req.headers?.['accept-language'] as string | undefined);
    const locale = localeHeader?.toLowerCase().startsWith('es')
      ? 'es'
      : localeHeader?.toLowerCase().startsWith('en')
        ? 'en'
        : 'ru';

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
      // Note: Streaming with provider selection not fully implemented yet
      // TODO: Implement buildHoroscopeContext and streaming support

      // Send provider info first
      res.write(
        `data: ${JSON.stringify({
          provider: this.aiService.getProvider(),
          explicitChoice: !!dto.provider,
        })}\n\n`,
      );

      // For now, generate complete horoscope and send as stream
      const result = await this.horoscopeService.generateHoroscope(
        userId,
        dto.period || 'day',
        true,
        locale,
      );

      // Send result as stream chunks
      res.write(`data: ${JSON.stringify({ content: result.general })}\n\n`);
      res.write(`data: ${JSON.stringify({ content: result.love })}\n\n`);
      res.write(`data: ${JSON.stringify({ content: result.career })}\n\n`);
      res.write(`data: ${JSON.stringify({ content: result.health })}\n\n`);

      // TODO: Implement true streaming with generateHoroscopeStreamWithProvider
      // For now, just send completion event

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
