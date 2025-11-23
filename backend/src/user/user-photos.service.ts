import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '@/supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

export interface UserPhoto {
  id: string;
  userId: string;
  path: string;
  isPrimary: boolean;
  url: string | null;
  createdAt: string;
}

@Injectable()
export class UserPhotosService {
  private readonly BUCKET = 'user-photos';
  private readonly logger = new Logger(UserPhotosService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Создать одноразовый signed upload URL для загрузки фото в Storage.
   * Если path не передан — сгенерируем userId/uuid.jpg
   */
  async getSignedUploadUrl(userId: string, path?: string, ext: string = 'jpg') {
    const safeExt =
      (ext || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
    const safePath = path?.trim() || `${userId}/${randomUUID()}.${safeExt}`;

    const res = await this.supabaseService.createSignedUploadUrl(
      this.BUCKET,
      safePath,
    );
    if (!res) {
      throw new BadRequestException('Failed to create signed upload URL');
    }
    return { path: safePath, ...res };
  }

  /**
   * Подтвердить загрузку фото: сохранить запись в public.user_photos
   * Первое фото пользователя может быть автоматически помечено как primary = true
   */
  async confirmPhoto(userId: string, path: string): Promise<UserPhoto> {
    // ✅ PRISMA: Проверяем, есть ли уже фото у пользователя
    const existingCount = await this.prisma.userPhoto.count({
      where: { userId },
    });

    const isFirst = existingCount === 0;

    // ✅ PRISMA: Создаем запись о фото
    const photo = await this.prisma.userPhoto.create({
      data: {
        userId,
        storagePath: path,
        isPrimary: isFirst,
      },
    });

    // Storage operation остается на Supabase
    const url = await this.supabaseService.createSignedUrl(
      this.BUCKET,
      photo.storagePath,
      900,
    );

    return {
      id: photo.id,
      userId: photo.userId,
      path: photo.storagePath,
      isPrimary: photo.isPrimary,
      url,
      createdAt: photo.createdAt.toISOString(),
    };
  }

  /**
   * Список фото пользователя (подписанные URL с TTL)
   * Оптимизировано: batch создание signed URLs (N+1 → 1 запрос) + пагинация
   */
  async listPhotos(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<UserPhoto[]> {
    // ✅ PRISMA: Получаем список фото с пагинацией
    const photos = await this.prisma.userPhoto.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    // Batch создание signed URLs для всех фото одним запросом (вместо N запросов)
    const paths = photos.map((p: any) => p.storagePath);
    const urlsMap = await this.supabaseService.createSignedUrlsBatch(
      this.BUCKET,
      paths,
      900,
    );

    // Собираем результат с O(1) доступом к URL
    const result: UserPhoto[] = photos.map((p: any) => ({
      id: p.id,
      userId: p.userId,
      path: p.storagePath,
      isPrimary: p.isPrimary,
      url: urlsMap.get(p.storagePath) ?? null,
      createdAt: p.createdAt.toISOString(),
    }));

    return result;
  }

  /**
   * Назначить primary через RPC set_primary_photo (требует контекст JWT пользователя)
   * NOTE: Требует применения SQL миграции (см. supabase_set_primary_photo.sql)
   */
  async setPrimaryWithToken(
    userAccessToken: string,
    photoId: string,
  ): Promise<void> {
    const { error } = await this.supabaseService.rpcWithToken<void>(
      'set_primary_photo',
      { p_photo_id: photoId },
      userAccessToken,
    );
    if (error) {
      throw new BadRequestException('Failed to set primary photo');
    }
  }

  /**
   * Назначить primary через прямое обновление (не требует RPC миграции)
   */
  async setPrimaryDirect(userId: string, photoId: string): Promise<void> {
    // ✅ PRISMA: Проверяем, что фото существует и принадлежит пользователю
    const photo = await this.prisma.userPhoto.findUnique({
      where: { id: photoId },
      select: { userId: true },
    });

    if (!photo || photo.userId !== userId) {
      throw new NotFoundException('Photo not found or does not belong to user');
    }

    // ✅ PRISMA: Используем транзакцию для атомарной операции
    await this.prisma.$transaction([
      // Сбрасываем is_primary для всех фото пользователя
      this.prisma.userPhoto.updateMany({
        where: { userId },
        data: { isPrimary: false },
      }),
      // Устанавливаем is_primary для выбранного фото
      this.prisma.userPhoto.update({
        where: { id: photoId },
        data: { isPrimary: true },
      }),
    ]);
  }

  /**
   * Удалить фото: запись из user_photos + объект из Storage
   */
  async deletePhoto(
    userId: string,
    photoId: string,
  ): Promise<{ success: boolean }> {
    // ✅ PRISMA: Найдем запись чтобы знать path
    const photo = await this.prisma.userPhoto.findUnique({
      where: { id: photoId },
      select: { userId: true, storagePath: true },
    });

    if (!photo || photo.userId !== userId) {
      throw new NotFoundException('Photo not found');
    }

    // Storage deletion остается на Supabase
    const admin = this.supabaseService.getAdminClient();
    const { error: storageErr } = await admin.storage
      .from(this.BUCKET)
      .remove([photo.storagePath]);

    if (storageErr) {
      this.logger.warn('Storage delete error', storageErr);
      // Логируем, но продолжаем удаление записи, чтобы не зависеть от Storage состояния
    }

    // ✅ PRISMA: Удаляем запись из БД
    await this.prisma.userPhoto.delete({
      where: { id: photoId },
    });

    return { success: true };
  }
}
