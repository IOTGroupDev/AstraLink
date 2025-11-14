import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '@/supabase/supabase.service';
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

  constructor(private readonly supabaseService: SupabaseService) {}

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
    const admin = this.supabaseService.getAdminClient();

    // Узнаем, есть ли уже фото у пользователя
    const { data: existing, error: listErr } = await admin
      .from('user_photos')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (listErr) {
      this.logger.error('Check existing photos error', listErr);
      throw new BadRequestException('Failed to check existing photos');
    }

    const isFirst = !existing || existing.length === 0;

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('user_photos')
      .insert({
        user_id: userId,
        storage_path: path, // ✅ Используем storage_path
        is_primary: isFirst,
        created_at: now,
      })
      .select('id, user_id, storage_path, is_primary, created_at') // ✅ storage_path
      .single();

    if (error || !data) {
      this.logger.error('Insert photo error', error);
      throw new BadRequestException(
        `Failed to confirm user photo: ${error?.message || 'unknown'}`,
      );
    }

    const url = await this.supabaseService.createSignedUrl(
      this.BUCKET,
      data.storage_path, // ✅ storage_path
      900,
    );

    return {
      id: data.id,
      userId: data.user_id,
      path: data.storage_path, // ✅ storage_path
      isPrimary: !!data.is_primary,
      url,
      createdAt:
        typeof data.created_at === 'string'
          ? data.created_at
          : new Date(data.created_at).toISOString(),
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
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('user_photos')
      .select('id, user_id, storage_path, is_primary, created_at') // ✅ storage_path
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1); // Supabase range для пагинации

    if (error) {
      this.logger.error('List photos error', error);
      throw new BadRequestException('Failed to list user photos');
    }

    const rows = Array.isArray(data) ? data : [];

    // Batch создание signed URLs для всех фото одним запросом (вместо N запросов)
    const paths = rows.map((r) => r.storage_path);
    const urlsMap = await this.supabaseService.createSignedUrlsBatch(
      this.BUCKET,
      paths,
      900,
    );

    // Собираем результат с O(1) доступом к URL
    const result: UserPhoto[] = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      path: r.storage_path,
      isPrimary: !!r.is_primary,
      url: urlsMap.get(r.storage_path) ?? null,
      createdAt:
        typeof r.created_at === 'string'
          ? r.created_at
          : new Date(r.created_at).toISOString(),
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
   * Использует admin client для обхода RLS
   */
  async setPrimaryDirect(userId: string, photoId: string): Promise<void> {
    const admin = this.supabaseService.getAdminClient();

    // Проверяем, что фото существует и принадлежит пользователю
    const { data: photo, error: checkErr } = await admin
      .from('user_photos')
      .select('id, user_id')
      .eq('id', photoId)
      .eq('user_id', userId)
      .single();

    if (checkErr || !photo) {
      throw new NotFoundException('Photo not found or does not belong to user');
    }

    // Сбрасываем is_primary для всех фото пользователя
    const { error: resetErr } = await admin
      .from('user_photos')
      .update({ is_primary: false })
      .eq('user_id', userId);

    if (resetErr) {
      this.logger.error('Failed to reset primary photos', resetErr);
      throw new BadRequestException('Failed to reset primary photos');
    }

    // Устанавливаем is_primary для выбранного фото
    const { error: updateErr } = await admin
      .from('user_photos')
      .update({ is_primary: true })
      .eq('id', photoId)
      .eq('user_id', userId);

    if (updateErr) {
      this.logger.error('Failed to set primary photo', updateErr);
      throw new BadRequestException('Failed to set primary photo');
    }
  }

  /**
   * Удалить фото: запись из user_photos + объект из Storage
   */
  async deletePhoto(
    userId: string,
    photoId: string,
  ): Promise<{ success: boolean }> {
    const admin = this.supabaseService.getAdminClient();

    // Найдем запись чтобы знать path
    const { data: photo, error: readErr } = await admin
      .from('user_photos')
      .select('id, user_id, storage_path, is_primary') // ✅ storage_path
      .eq('id', photoId)
      .eq('user_id', userId)
      .single();

    if (readErr || !photo) {
      throw new NotFoundException('Photo not found');
    }

    // Удаляем объект из Storage
    const { error: storageErr } = await admin.storage
      .from(this.BUCKET)
      .remove([photo.storage_path]); // ✅ storage_path

    if (storageErr) {
      this.logger.warn('Storage delete error', storageErr);
      // Логируем, но продолжаем удаление записи, чтобы не зависеть от Storage состояния
    }

    // Удаляем запись
    const { error: delErr } = await admin
      .from('user_photos')
      .delete()
      .eq('id', photoId)
      .eq('user_id', userId);

    if (delErr) {
      this.logger.error('Delete photo row error', delErr);
      throw new BadRequestException('Failed to delete photo row');
    }

    return { success: true };
  }
}
