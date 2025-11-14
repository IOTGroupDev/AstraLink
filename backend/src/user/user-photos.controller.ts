import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { SupabaseAuthGuard } from '@/auth/guards/supabase-auth.guard';
import { UserPhotosService } from './user-photos.service';
import { ConfirmPhotoDto, GetUploadUrlDto } from './dto/photos.dto';

interface AuthenticatedUser {
  id: string;
  userId?: string;
  email: string;
  name?: string;
}

interface AuthenticatedRequest extends ExpressRequest {
  user?: AuthenticatedUser;
}

@UseGuards(SupabaseAuthGuard)
@Controller('user/photos')
export class UserPhotosController {
  constructor(private readonly photosService: UserPhotosService) {}

  private getUserId(req: ExpressRequest): string {
    const userId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return userId as string;
  }

  private getAccessToken(req: ExpressRequest): string {
    const authHeader =
      (req.headers['authorization'] as string) ||
      (req.headers['Authorization'] as string) ||
      '';
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Требуется Bearer токен');
    }
    return authHeader.slice('Bearer '.length);
  }

  /**
   * POST /api/user/photos/upload-url
   * Возвращает одноразовый подписанный URL для загрузки файла в Storage (PUT)
   * body: { path?: string; ext?: 'jpg'|'jpeg'|'png'|'webp' } — по умолчанию jpg
   */
  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  async getSignedUploadUrl(
    @Request() req: AuthenticatedRequest,
    @Body() dto: GetUploadUrlDto,
  ) {
    const userId = this.getUserId(req);

    const { path, ext } = dto || {};
    const result = await this.photosService.getSignedUploadUrl(
      userId,
      path,
      ext || 'jpg',
    );

    // Клиент должен выполнить PUT на signedUrl с заголовком 'x-upsert': 'true'
    // и корректным Content-Type
    return {
      path: result.path,
      signedUrl: result.signedUrl,
      token: result.token,
      method: 'PUT',
      requiredHeaders: { 'x-upsert': 'true' },
    };
  }

  /**
   * POST /api/user/photos/confirm
   * Подтверждает загрузку (сохраняет запись в public.user_photos)
   * body: { path: string }
   */
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPhoto(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ConfirmPhotoDto,
  ) {
    const userId = this.getUserId(req);
    if (!dto?.path) {
      throw new BadRequestException('path is required');
    }
    return this.photosService.confirmPhoto(userId, dto.path);
  }

  /**
   * GET /api/user/photos
   * Список фото пользователя с подписанными URL (TTL ~15 минут)
   * Query params: limit (default: 50, max: 100), offset (default: 0)
   */
  @Get()
  async listPhotos(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = this.getUserId(req);
    const safeLimit = limit
      ? Math.max(1, Math.min(100, parseInt(limit, 10)))
      : 50;
    const safeOffset = offset ? Math.max(0, parseInt(offset, 10)) : 0;

    return this.photosService.listPhotos(userId, safeLimit, safeOffset);
  }

  /**
   * DELETE /api/user/photos/:photoId
   * Удаляет запись и объект из Storage (best effort)
   */
  @Delete(':photoId')
  @HttpCode(HttpStatus.OK)
  async deletePhoto(
    @Request() req: AuthenticatedRequest,
    @Param('photoId') photoId: string,
  ) {
    const userId = this.getUserId(req);
    return this.photosService.deletePhoto(userId, photoId);
  }

  /**
   * POST /api/user/photos/:photoId/set-primary
   * Устанавливает фото как главное (primary)
   * Использует прямое обновление через admin client (не требует RPC миграции)
   */
  @Post(':photoId/set-primary')
  @HttpCode(HttpStatus.OK)
  async setPrimary(
    @Request() req: AuthenticatedRequest,
    @Param('photoId') photoId: string,
  ) {
    const userId = this.getUserId(req);
    await this.photosService.setPrimaryDirect(userId, photoId);
    return { success: true };
  }
}
