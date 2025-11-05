import {
  Injectable,
  BadRequestException,
  NotFoundException,
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
      throw new BadRequestException('Failed to check existing photos');
    }

    const isFirst = !existing || existing.length === 0;

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('user_photos')
      .insert({
        user_id: userId,
        path,
        is_primary: isFirst,
        created_at: now,
      })
      .select('id, user_id, path, is_primary, created_at')
      .single();

    if (error || !data) {
      throw new BadRequestException('Failed to confirm user photo');
    }

    const url = await this.supabaseService.createSignedUrl(
      this.BUCKET,
      data.path,
      900,
    );

    return {
      id: data.id,
      userId: data.user_id,
      path: data.path,
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
   */
  async listPhotos(userId: string): Promise<UserPhoto[]> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('user_photos')
      .select('id, user_id, path, is_primary, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException('Failed to list user photos');
    }

    const rows = Array.isArray(data) ? data : [];

    const result: UserPhoto[] = [];
    for (const r of rows) {
      const url = await this.supabaseService.createSignedUrl(
        this.BUCKET,
        r.path,
        900,
      );
      result.push({
        id: r.id,
        userId: r.user_id,
        path: r.path,
        isPrimary: !!r.is_primary,
        url,
        createdAt:
          typeof r.created_at === 'string'
            ? r.created_at
            : new Date(r.created_at).toISOString(),
      });
    }

    return result;
  }

  /**
   * Назначить primary через RPC set_primary_photo (требует контекст JWT пользователя)
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
      .select('id, user_id, path, is_primary')
      .eq('id', photoId)
      .eq('user_id', userId)
      .single();

    if (readErr || !photo) {
      throw new NotFoundException('Photo not found');
    }

    // Удаляем объект из Storage
    const { error: storageErr } = await admin.storage
      .from(this.BUCKET)
      .remove([photo.path]);

    if (storageErr) {
      // Логируем, но продолжаем удаление записи, чтобы не зависеть от Storage состояния
      // throw new BadRequestException('Failed to remove storage object');
    }

    // Удаляем запись
    const { error: delErr } = await admin
      .from('user_photos')
      .delete()
      .eq('id', photoId)
      .eq('user_id', userId);

    if (delErr) {
      throw new BadRequestException('Failed to delete photo row');
    }

    return { success: true };
  }
}
