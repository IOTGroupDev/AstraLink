import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '@/supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { UserPhoto as StoredUserPhoto } from '@prisma/client';
import { isOwnedPhotoPath, PHOTO_EXTENSIONS } from './dto/photos.dto';

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

  private assertOwnedPhotoPath(userId: string, path: string): void {
    if (!isOwnedPhotoPath(userId, path)) {
      throw new BadRequestException('Invalid photo path for this user');
    }
  }

  private async isSupportedBinaryPhoto(path: string): Promise<boolean> {
    // Expo's Blob upload can replace an image Content-Type with octet-stream.
    // Validate the actual bytes rather than accepting arbitrary binary files.
    try {
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .storage.from(this.BUCKET)
        .createSignedUrl(path, 30);
      if (error || !data?.signedUrl) return false;

      const response = await fetch(data.signedUrl, {
        headers: { Range: 'bytes=0-11' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        return false;
      }

      const reader = response.body.getReader();
      const header = new Uint8Array(12);
      let length = 0;
      try {
        while (length < header.length) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = value.subarray(0, header.length - length);
          header.set(chunk, length);
          length += chunk.length;
        }
      } finally {
        // Also bound reads when an upstream server ignores the Range header.
        await reader.cancel();
      }

      return (
        (length >= 3 &&
          header[0] === 0xff &&
          header[1] === 0xd8 &&
          header[2] === 0xff) ||
        (length >= 8 &&
          [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
            (byte, index) => header[index] === byte,
          )) ||
        (length >= 12 &&
          [0x52, 0x49, 0x46, 0x46].every(
            (byte, index) => header[index] === byte,
          ) &&
          [0x57, 0x45, 0x42, 0x50].every(
            (byte, index) => header[index + 8] === byte,
          ))
      );
    } catch {
      this.logger.warn('Photo confirmation could not read the file signature');
      return false;
    }
  }

  private async toUserPhoto(photo: StoredUserPhoto): Promise<UserPhoto> {
    this.assertOwnedPhotoPath(photo.userId, photo.storagePath);
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
   * Создать одноразовый signed upload URL для загрузки фото в Storage.
   * Если path не передан — сгенерируем userId/uuid.jpg
   */
  async getSignedUploadUrl(userId: string, path?: string, ext: string = 'jpg') {
    // Check here as well: direct service calls must not bypass DTO validation.
    if (!PHOTO_EXTENSIONS.includes(ext)) {
      throw new BadRequestException('Unsupported photo extension');
    }
    const safePath =
      path === undefined ? `${userId}/${randomUUID()}.${ext}` : path;
    this.assertOwnedPhotoPath(userId, safePath);

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
    this.assertOwnedPhotoPath(userId, path);

    // A signed upload URL alone does not prove that an image was uploaded.
    const { data: object, error } = await this.supabaseService
      .getAdminClient()
      .storage.from(this.BUCKET)
      .info(path);
    if (error || !object) {
      this.logger.warn(
        'Photo confirmation rejected: storage object unavailable',
      );
      throw new BadRequestException('Uploaded photo not found');
    }
    const contentType = object.contentType ?? object.metadata?.mimetype;
    const size = object.size ?? object.metadata?.size;
    if (typeof size !== 'number' || !Number.isSafeInteger(size) || size <= 0) {
      throw new BadRequestException('Uploaded file is not a valid photo');
    }
    const validContentType =
      contentType &&
      (['image/jpeg', 'image/png', 'image/webp'].includes(contentType) ||
        (contentType === 'application/octet-stream' &&
          (await this.isSupportedBinaryPhoto(path))));
    if (!validContentType) {
      this.logger.warn(
        'Photo confirmation rejected: unsupported image content',
      );
      throw new BadRequestException('Uploaded file is not a valid photo');
    }

    // A retry after a lost response should not create another gallery entry.
    const existingPhoto = await this.prisma.userPhoto.findFirst({
      where: { userId, storagePath: path },
    });
    if (existingPhoto) {
      this.assertOwnedPhotoPath(userId, existingPhoto.storagePath);
      if (existingPhoto.userId !== userId) {
        throw new BadRequestException('Invalid photo owner');
      }
      return this.toUserPhoto(existingPhoto);
    }

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

    return this.toUserPhoto(photo);
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

    // Do not sign corrupt legacy rows using the service-role client.
    const safePhotos = photos.filter(
      (photo) =>
        photo.userId === userId && isOwnedPhotoPath(userId, photo.storagePath),
    );
    if (safePhotos.length !== photos.length) {
      this.logger.warn('Skipped photo rows with invalid storage ownership');
    }
    if (safePhotos.length === 0) return [];

    // Batch создание signed URLs для всех фото одним запросом (вместо N запросов)
    const paths = safePhotos.map((p) => p.storagePath);
    const urlsMap = await this.supabaseService.createSignedUrlsBatch(
      this.BUCKET,
      paths,
      900,
    );

    // Собираем результат с O(1) доступом к URL
    const result: UserPhoto[] = safePhotos.map((p) => ({
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
      select: { userId: true, storagePath: true },
    });

    if (!photo || photo.userId !== userId) {
      throw new NotFoundException('Photo not found or does not belong to user');
    }
    this.assertOwnedPhotoPath(userId, photo.storagePath);

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
    this.assertOwnedPhotoPath(userId, photo.storagePath);

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
