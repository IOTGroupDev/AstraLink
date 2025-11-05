import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  text: string | null;
  mediaPath: string | null;
  createdAt: string;
}

export interface ChatConversation {
  otherUserId: string;
  lastSenderId: string;
  lastMessageText: string | null;
  lastMessageMediaPath: string | null;
  lastMessageAt: string;
  primaryPhotoUrl?: string | null;
  displayName?: string | null;
}

@Injectable()
export class ChatService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Отправить сообщение через RPC send_message (SECURITY DEFINER).
   * Требуется пользовательский access token для корректного auth.uid() в RLS.
   */
  async sendMessageWithToken(
    userAccessToken: string,
    recipientId: string,
    text?: string,
    mediaPath?: string | null,
  ): Promise<{ id: string }> {
    const payload = {
      p_recipient_id: recipientId,
      p_text: (text ?? '').trim(),
      p_media_path: mediaPath ?? null,
    };

    const { data, error } = await this.supabaseService.rpcWithToken<string>(
      'send_message',
      payload,
      userAccessToken,
    );

    if (error || !data) {
      throw new Error('send_message failed');
    }
    return { id: data };
  }

  /**
   * Получить сообщения диалога с пользователем otherUserId.
   * Используем клиент с токеном, фильтруем по участнику otherUserId.
   * RLS ограничит выборку только сообщениями auth.uid() <-> otherUserId.
   */
  async listDialogMessages(
    userAccessToken: string,
    otherUserId: string,
    limit = 50,
  ): Promise<ChatMessage[]> {
    const safeLimit = Math.max(1, Math.min(100, limit));
    const client = this.supabaseService.getClientForToken(userAccessToken);

    const { data, error } = await client
      .from('messages')
      .select('id, sender_id, recipient_id, content, media_path, created_at')
      // Сообщения, в которых другой участник = otherUserId.
      // RLS вернет только строки, где второй участник = auth.uid().
      .or(`sender_id.eq.${otherUserId},recipient_id.eq.${otherUserId}`)
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (error) {
      // В случае RLS-ошибки/прочих ошибок — вернём пустой список
      return [];
    }

    const rows = Array.isArray(data) ? data : [];

    return rows.map((r: any) => ({
      id: r.id,
      senderId: r.sender_id,
      recipientId: r.recipient_id,
      text: r.content ?? null,
      mediaPath: r.media_path ?? null,
      createdAt:
        typeof r.created_at === 'string'
          ? r.created_at
          : new Date(r.created_at).toISOString(),
    }));
  }

  /**
   * Список последних диалогов (агрегация на стороне сервера).
   * Берём последние сообщения, группируем по собеседнику и отдаём top-N.
   * Фото собеседника и unreadCount опциональны и зависят от дальнейшей интеграции Storage/Realtime.
   */
  async listConversationsWithToken(
    userAccessToken: string,
    limit = 50,
  ): Promise<ChatConversation[]> {
    // Узнаём собственного пользователя по токену
    const { data: userRes } =
      await this.supabaseService.getUser(userAccessToken);
    const selfId = (userRes as any)?.user?.id as string | undefined;
    if (!selfId) {
      return [];
    }

    const safeLimit = Math.max(1, Math.min(100, limit));
    const fetchLimit = Math.max(50, safeLimit * 4); // небольшой запас для агрегации
    const client = this.supabaseService.getClientForToken(userAccessToken);

    const { data, error } = await client
      .from('messages')
      .select('id, sender_id, recipient_id, content, media_path, created_at')
      .order('created_at', { ascending: false })
      .limit(fetchLimit);

    if (error) {
      return [];
    }

    const rows = Array.isArray(data) ? data : [];

    const map = new Map<string, ChatConversation>();
    for (const r of rows) {
      const sender = r.sender_id as string;
      const recipient = r.recipient_id as string;
      const otherUserId = sender === selfId ? recipient : sender;

      if (!map.has(otherUserId)) {
        const createdAt =
          typeof r.created_at === 'string'
            ? r.created_at
            : new Date(r.created_at).toISOString();

        map.set(otherUserId, {
          otherUserId,
          lastSenderId: sender,
          lastMessageText: (r as any).content ?? null,
          lastMessageMediaPath: (r as any).media_path ?? null,
          lastMessageAt: createdAt,
          primaryPhotoUrl: null,
          displayName: null,
        });
      }
      if (map.size >= safeLimit) break;
    }

    // Пробуем подтянуть primary-фото собеседников через admin client
    try {
      const otherIds = Array.from(map.keys());
      if (otherIds.length > 0) {
        const admin = this.supabaseService.getAdminClient();
        const { data: photos, error: photosErr } = await admin
          .from('user_photos')
          .select('user_id, path')
          .eq('is_primary', true)
          .in('user_id', otherIds);
        if (!photosErr && Array.isArray(photos)) {
          // Сопоставим user_id -> path
          const byUser: Record<string, string> = {};
          for (const p of photos as any[]) {
            if (p?.user_id && p?.path) byUser[p.user_id] = p.path;
          }
          // Создадим подписанные URL'ы (по одному на фото)
          await Promise.all(
            otherIds.map(async (uid) => {
              const path = byUser[uid];
              if (!path) return;
              const url = await this.supabaseService.createSignedUrl(
                'user-photos',
                path,
                900,
              );
              const conv = map.get(uid);
              if (conv) conv.primaryPhotoUrl = url ?? null;
            }),
          );
        }
      }
    } catch {
      // игнорируем — фото опциональны
    }

    // Подтянем имя/емейл собеседника для отображения (admin, обходит RLS)
    try {
      const otherIds = Array.from(map.keys());
      if (otherIds.length > 0) {
        const admin = this.supabaseService.getAdminClient();
        const { data: users, error: usersErr } = await admin
          .from('users')
          .select('id, name, email')
          .in('id', otherIds);

        if (!usersErr && Array.isArray(users)) {
          const byUser: Record<string, { name?: string; email?: string }> = {};
          for (const u of users as any[]) {
            if (u?.id) byUser[u.id] = { name: u?.name, email: u?.email };
          }
          otherIds.forEach((uid) => {
            const conv = map.get(uid);
            if (!conv) return;
            const info = byUser[uid];
            if (!info) return;
            const display =
              (info.name && String(info.name).trim()) ||
              (info.email ? String(info.email).split('@')[0] : null);
            if (display) conv.displayName = display;
          });
        }
      }
    } catch {
      // имя опционально
    }

    return Array.from(map.values()).slice(0, safeLimit);
  }
}
