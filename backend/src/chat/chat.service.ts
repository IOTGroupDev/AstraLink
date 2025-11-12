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
  private readonly preferRpc = process.env.CHAT_PREFER_RPC !== 'false';
  private rpcWarned = false;
  private messagesColumnsCache: Set<string> | null = null;

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
    // 1) RPC (если включено переменной окружения)
    const payload = {
      p_recipient_id: recipientId,
      p_text: (text ?? '').trim(),
      p_media_path: mediaPath ?? null,
    };

    if (this.preferRpc) {
      const { data, error } = await this.supabaseService.rpcWithToken<string>(
        'send_message',
        payload,
        userAccessToken,
      );

      if (data && !error) {
        return { id: data };
      }
      if (!this.rpcWarned) {
        console.warn('send_message RPC failed, using fallback insert', {
          rpcError: error?.message ?? error,
        });
        this.rpcWarned = true;
      }
    }

    // 2) Фоллбек: прямой INSERT с перебором названий колонок

    const { data: userRes, error: userErr } =
      await this.supabaseService.getUser(userAccessToken);
    const uid = (userRes as any)?.user?.id as string | undefined;
    if (!uid || userErr) {
      console.error('Cannot resolve user from token for sendMessage fallback', {
        userErr: userErr?.message ?? userErr,
      });
      throw new Error('send_message failed (no user from token)');
    }

    const client = this.supabaseService.getClientForToken(userAccessToken);

    // Попробуем определить реальные колонки таблицы messages
    const existing = await this.getExistingColumns(userAccessToken);
    const preferExisting = (cands: string[]) => {
      const present = cands.filter((c) => existing.has(c));
      return present.length ? present : cands;
    };

    // Возможные названия колонок (на случай дрейфа схемы)
    const senderColumns = preferExisting([
      'sender_id',
      'from_user_id',
      'from',
      'from_id',
      'sender',
    ]);
    // Предпочтём названия вида to_user_id/recipient, так как RPC может расходиться со схемой
    const recipientColumns = preferExisting([
      'to_user_id',
      'recipient',
      'receiver_id',
      'recipient_id',
      'to_id',
    ]);
    const contentColumns = preferExisting([
      'content',
      'text',
      'body',
      'message',
      'message_text',
    ]);
    // Самые вероятные медиа-колонки пробуем первыми
    const mediaColumnsAll = [
      'attachment_path',
      'media_path',
      'media_url',
      'attachment_url',
      'attachment',
    ];
    const mediaColumns = (() => {
      const present = mediaColumnsAll.filter((c) => existing.has(c));
      return present.length ? present : mediaColumnsAll;
    })();

    let firstErr: any = null;
    let lastErr: any = null;

    // Разрешим match для RLS и NOT NULL match_id
    const matchId = await this.ensureMatch(userAccessToken, uid, recipientId);

    // Выберем лучшую доступную колонку для отправителя
    const senderKey = senderColumns.find((k) => existing.has(k)) || null;

    // Если в схеме требуется match_id, но создать/найти не удалось — сообщим об этом явно
    if (existing.has('match_id') && !matchId) {
      throw new Error(
        'match required: no match found/created for this dialog (RLS/NOT NULL match_id)',
      );
    }

    // Для каждой комбинации rc/cc пробуем сначала без явного указания sender-колонки,
    // чтобы сработали DEFAULT/триггеры (auth.uid()). Затем пробуем с sender-колонками.
    for (const rc of recipientColumns) {
      for (const cc of contentColumns) {
        const baseCore = {
          [rc]: recipientId,
          [cc]: (text ?? '').trim() || null,
          ...(existing.has('match_id') && matchId ? { match_id: matchId } : {}),
          ...(existing.has('type') ? { type: 'text' } : {}),
        } as any;

        // 2.1 Попытка БЕЗ sender-колонки, без медиа (имеет смысл только если нет явной колонки отправителя)
        if (!senderKey) {
          const { data: ins0, error: err0 } = await client
            .from('messages')
            .insert(baseCore)
            .select('*')
            .single();

          if (!err0 && ins0) {
            const newId0 =
              ins0.id ??
              ins0.message_id ??
              ins0.uuid ??
              ins0.messageId ??
              ins0.pk;
            if (newId0) {
              return { id: String(newId0) };
            }
          }
          firstErr = firstErr ?? err0;
          lastErr = err0 ?? lastErr;
        }

        // 2.2 Попытка БЕЗ sender-колонки, С медиа (имеет смысл только если нет явной колонки отправителя)
        if (!senderKey) {
          for (const mc of mediaColumns) {
            const insertCoreWithMedia = {
              ...baseCore,
              [mc]: mediaPath ?? null,
            };
            const { data: ins01, error: err01 } = await client
              .from('messages')
              .insert(insertCoreWithMedia)
              .select('*')
              .single();
            if (!err01 && ins01) {
              const newId01 =
                ins01.id ??
                ins01.message_id ??
                ins01.uuid ??
                ins01.messageId ??
                ins01.pk;
              if (newId01) {
                return { id: String(newId01) };
              }
            }
            firstErr = firstErr ?? err01;
            lastErr = err01 ?? lastErr;
          }
        }

        // 2.3 Попытки С sender-колонками
        {
          const senderList = senderKey ? [senderKey] : senderColumns;
          for (const sc of senderList) {
            const baseWithSender = {
              [sc]: uid,
              ...baseCore,
            };

            // 2.3.1 С sender, без медиа
            {
              const { data: ins1, error: err1 } = await client
                .from('messages')
                .insert(baseWithSender)
                .select('*')
                .single();

              if (!err1 && ins1) {
                const newId =
                  ins1.id ??
                  ins1.message_id ??
                  ins1.uuid ??
                  ins1.messageId ??
                  ins1.pk;
                if (newId) {
                  return { id: String(newId) };
                }
              }
              firstErr = firstErr ?? err1;
              lastErr = err1 ?? lastErr;
            }

            // 2.3.2 С sender, с медиа
            for (const mc of mediaColumns) {
              const insertWithMedia = {
                ...baseWithSender,
                [mc]: mediaPath ?? null,
              };
              const { data: ins2, error: err2 } = await client
                .from('messages')
                .insert(insertWithMedia)
                .select('*')
                .single();

              if (!err2 && ins2) {
                const newId2 =
                  ins2.id ??
                  ins2.message_id ??
                  ins2.uuid ??
                  ins2.messageId ??
                  ins2.pk;
                if (newId2) {
                  return { id: String(newId2) };
                }
              }
              firstErr = firstErr ?? err2;
              lastErr = err2 ?? lastErr;
            }
          }
        }
      }
    }

    console.error('send_message fallback insert failed', {
      firstError: firstErr?.message ?? firstErr,
      lastError: lastErr?.message ?? lastErr,
      existingColumns: Array.from(existing),
    });
    throw new Error(
      (firstErr?.message as string) ||
        (lastErr?.message as string) ||
        'send_message failed',
    );
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

    // Из-за дрейфа схемы не используем серверные фильтры по неизвестным колонкам.
    // Берём порцию сообщений, RLS отдаст только доступные строки для auth.uid().
    const { data, error } = await client
      .from('messages')
      .select('*')
      .limit(Math.max(50, safeLimit * 2));

    if (error) {
      return [];
    }
    const rows = Array.isArray(data) ? data : [];

    const pickKey = (obj: any, keys: string[]) =>
      keys.find((k) => obj && Object.prototype.hasOwnProperty.call(obj, k));

    // Кандидаты ключей
    const senderKeys = [
      'sender_id',
      'senderId',
      'from_user_id',
      'fromId',
      'from',
    ];
    const recipientKeys = [
      'recipient_id',
      'receiver_id',
      'recipient',
      'to_user_id',
      'to_id',
    ];
    const contentKeys = ['content', 'text', 'body', 'message'];
    const mediaKeys = [
      'attachment_path',
      'media_path',
      'media_url',
      'attachment_url',
      'attachment',
    ];
    const createdKeys = ['created_at', 'createdAt', 'createdAtUtc'];

    // Фильтруем диалог: собеседник = otherUserId (второй участник)
    const filtered = rows.filter((r) => {
      const sender = r[pickKey(r, senderKeys) || 'sender_id'];
      const recipient = r[pickKey(r, recipientKeys) || 'recipient_id'];
      return sender === otherUserId || recipient === otherUserId;
    });

    // Сорт по времени (возрастание)
    filtered.sort((a, b) => {
      const ka = a[pickKey(a, createdKeys) || 'created_at'] ?? '';
      const kb = b[pickKey(b, createdKeys) || 'created_at'] ?? '';
      return new Date(ka).getTime() - new Date(kb).getTime();
    });

    // Ограничиваем и маппим в DTO
    return filtered.slice(-safeLimit).map((r) => {
      const senderK = pickKey(r, senderKeys) || 'sender_id';
      const recipientK = pickKey(r, recipientKeys) || 'recipient_id';
      const contentK = pickKey(r, contentKeys) || 'content';
      const mediaK = pickKey(r, mediaKeys) || 'media_path';
      const createdK = pickKey(r, createdKeys) || 'created_at';

      const rawCreated = r[createdK];
      const createdAt =
        typeof rawCreated === 'string'
          ? rawCreated
          : rawCreated
            ? new Date(rawCreated).toISOString()
            : new Date().toISOString();

      return {
        id: r.id,
        senderId: r[senderK],
        recipientId: r[recipientK],
        text: r[contentK] ?? null,
        mediaPath: r[mediaK] ?? null,
        createdAt,
      } as ChatMessage;
    });
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
    const { data: userRes } =
      await this.supabaseService.getUser(userAccessToken);
    const selfId = (userRes as any)?.user?.id as string | undefined;
    if (!selfId) {
      return [];
    }

    const safeLimit = Math.max(1, Math.min(100, limit));
    const fetchLimit = Math.max(50, safeLimit * 4);
    const client = this.supabaseService.getClientForToken(userAccessToken);

    const { data, error } = await client
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(fetchLimit);

    if (error) {
      return [];
    }

    const rows = Array.isArray(data) ? data : [];

    const pick = (obj: any, keys: string[]): any =>
      keys.find((k) => obj && Object.prototype.hasOwnProperty.call(obj, k));

    const map = new Map<string, ChatConversation>();
    for (const r of rows) {
      const sender =
        r.sender_id ?? r.senderId ?? r.from_user_id ?? r.fromId ?? r.from;
      const recipientKey = pick(r, [
        'recipient_id',
        'receiver_id',
        'recipient',
        'to_user_id',
        'to_id',
      ]) as string;
      const recipient = r[recipientKey];

      const otherUserId = sender === selfId ? recipient : sender;
      if (!otherUserId) continue;

      if (!map.has(otherUserId)) {
        const createdKey = pick(r, [
          'created_at',
          'createdAt',
          'createdAtUtc',
        ]) as string;
        const contentKey = pick(r, [
          'content',
          'text',
          'body',
          'message',
        ]) as string;
        const mediaKey = pick(r, [
          'media_path',
          'media_url',
          'attachment_url',
          'attachment',
          'file_url',
        ]) as string;

        const createdAt =
          typeof r[createdKey] === 'string'
            ? r[createdKey]
            : new Date(r[createdKey]).toISOString();

        map.set(otherUserId, {
          otherUserId,
          lastSenderId: sender,
          lastMessageText: r[contentKey] ?? null,
          lastMessageMediaPath: r[mediaKey] ?? null,
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
          .select('user_id, storage_path')
          .eq('is_primary', true)
          .in('user_id', otherIds);
        if (!photosErr && Array.isArray(photos)) {
          // Сопоставим user_id -> storage_path
          const byUser: Record<string, string> = {};
          for (const p of photos as any[]) {
            if (p?.user_id && p?.storage_path)
              byUser[p.user_id] = p.storage_path;
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

  /**
   * Проверяет, существует ли указанный столбец в таблице messages с контекстом пользователя.
   * Выполняется безопасный select(column) limit(0). Если колонка отсутствует — вернётся ошибка.
   */
  private async columnExists(
    userAccessToken: string,
    column: string,
  ): Promise<boolean> {
    try {
      const client = this.supabaseService.getClientForToken(userAccessToken);
      const { error } = await client.from('messages').select(column).limit(0);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Возвращает множество реально существующих колонок в messages.
   * Результат кэшируется в памяти процесса (messagesColumnsCache) для последующих вызовов.
   */
  private async getExistingColumns(
    userAccessToken: string,
  ): Promise<Set<string>> {
    if (this.messagesColumnsCache) {
      return this.messagesColumnsCache;
    }

    const candidates = [
      'id',
      'match_id',
      'sender_id',
      'recipient_id',
      'receiver_id',
      'to_user_id',
      'to_id',
      'type',
      'content',
      'text',
      'body',
      'message',
      'message_text',
      'attachment_path',
      'media_path',
      'media_url',
      'attachment_url',
      'attachment',
      'created_at',
      'read_at',
    ];

    const present = new Set<string>();
    await Promise.all(
      candidates.map(async (c) => {
        const ok = await this.columnExists(userAccessToken, c);
        if (ok) present.add(c);
      }),
    );

    this.messagesColumnsCache = present;
    return present;
  }
  /**
   * Создаёт/находит match между selfId и otherUserId, чтобы удовлетворить RLS и NOT NULL match_id.
   * Пытается:
   *  - найти существующий match в любом порядке (A,B) / (B,A)
   *  - создать match как (selfId, otherUserId) со статусом 'active'
   *  - при неудаче создания (например, из-за RLS) — ещё раз поиск (на случай гонки)
   *
   * Возвращает id matсh или null, если ни прочитать, ни создать не удалось.
   */
  private async ensureMatch(
    userAccessToken: string,
    selfId: string,
    otherUserId: string,
  ): Promise<string | null> {
    const client = this.supabaseService.getClientForToken(userAccessToken);

    // локальный помощник для поиска
    const tryFind = async (): Promise<string | null> => {
      const orders = [
        { a: selfId, b: otherUserId },
        { a: otherUserId, b: selfId },
      ];
      for (const o of orders) {
        const { data, error } = await client
          .from('matches')
          .select('id')
          .eq('user_a', o.a)
          .eq('user_b', o.b)
          .limit(1)
          .maybeSingle();
        if (!error && data?.id) {
          return String(data.id);
        }
      }
      return null;
    };

    // 1) поиск существующего
    let id = await tryFind();
    if (id) return id;

    // 2) попытка создать match от имени пользователя (проходит RLS, если политика разрешает)
    const { data: created, error: createErr } = await client
      .from('matches')
      .insert({ user_a: selfId, user_b: otherUserId, status: 'active' })
      .select('id')
      .single();

    if (!createErr && created?.id) {
      return String(created.id);
    }

    // 2.1) если не удалось — пробуем создать через admin (обходит RLS)
    try {
      const admin = this.supabaseService.getAdminClient();
      const { data: adminCreated, error: adminErr } = await admin
        .from('matches')
        .insert({ user_a: selfId, user_b: otherUserId, status: 'active' })
        .select('id')
        .single();

      if (!adminErr && adminCreated?.id) {
        return String(adminCreated.id);
      }
    } catch {
      // если нет service role — просто продолжаем
    }

    // 3) финальный повторный поиск (возможна гонка вставки другой стороной)
    id = await tryFind();
    return id; // может остаться null — тогда вставка сообщения упадёт, и мы отдадим подробности в логах выше
  }
}
