/* eslint-disable */
import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RedisService } from '../redis/redis.service';
import {
  pickKey,
  getValue,
  preferExisting,
  normalizeDate,
  isAbsoluteUrl,
} from '../utils/column-mapper.utils';
import type {
  MessageRow,
  SupabaseUserResponse,
  COLUMN_CANDIDATES,
  Match,
  UserPhoto,
  User,
} from './chat.types';
import { COLUMN_CANDIDATES as COLS } from './chat.types';

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  text: string | null;
  mediaPath: string | null;
  createdAt: string;
  mediaUrl?: string | null;
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
  private readonly logger = new Logger(ChatService.name);
  // RPC отключён по умолчанию, включайте через CHAT_PREFER_RPC=true
  private readonly preferRpc = process.env.CHAT_PREFER_RPC === 'true';
  // RPC для удаления сообщений (если в БД есть SECURITY DEFINER delete_message)
  private readonly preferDeleteRpc =
    process.env.CHAT_DELETE_PREFER_RPC === 'true';
  private rpcWarned = false;
  private messagesColumnsCache: Set<string> | null = null;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly redis: RedisService,
  ) {}

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
        const newId = String(data);

        // Safety patch: если RPC проигнорировал media_path, проставим его вручную
        try {
          const existingCols = await this.getExistingColumns(userAccessToken);
          const client =
            this.supabaseService.getClientForToken(userAccessToken);

          const idCandidates = ['id', 'message_id', 'uuid', 'pk', 'messageId'];
          const mediaColumnsAll = [
            'attachment_path',
            'media_path',
            'media_url',
            'attachment_url',
            'attachment',
            'file_url',
            'file_path',
            'file',
            'image_url',
          ];
          const mediaColumns = (() => {
            const present = mediaColumnsAll.filter((c) => existingCols.has(c));
            return present.length ? present : mediaColumnsAll;
          })();

          const hasMedia =
            typeof mediaPath === 'string' && mediaPath.trim().length > 0;

          if (hasMedia) {
            let patched = false;

            // Пытаемся обновить по каждому возможному id-ключу
            for (const idK of idCandidates) {
              try {
                const { error: upErr } = await client
                  .from('messages')
                  .update({
                    [mediaColumns[0]]: mediaPath,
                    ...(existingCols.has('type') ? { type: 'image' } : {}),
                  } as Record<string, unknown>)
                  .eq(idK, newId)
                  .select('id')
                  .single();
                if (!upErr) {
                  patched = true;
                  break;
                }
              } catch {
                // continue
              }
            }

            // Фолбэк: OR по всем возможным id-ключам
            if (!patched) {
              try {
                const orExpr = idCandidates
                  .map((k) => `${k}.eq.${newId}`)
                  .join(',');
                const { data: upd, error: upErr } = await client
                  .from('messages')
                  .update({
                    [mediaColumns[0]]: mediaPath,
                    ...(existingCols.has('type') ? { type: 'image' } : {}),
                  } as Record<string, unknown>)
                  .or(orExpr)
                  .select('id');
                if (
                  !upErr &&
                  ((Array.isArray(upd) && upd.length > 0) || !!upd)
                ) {
                  patched = true;
                }
              } catch {
                // ignore
              }
            }

            // Последний фолбэк: попытка через admin-клиент (если доступен)
            if (!patched) {
              try {
                const admin = this.supabaseService.getAdminClient();
                for (const idK of idCandidates) {
                  const { error: upErr } = await admin
                    .from('messages')
                    .update({
                      [mediaColumns[0]]: mediaPath,
                      ...(existingCols.has('type') ? { type: 'image' } : {}),
                    } as Record<string, unknown>)
                    .eq(idK, newId)
                    .select('id')
                    .single();
                  if (!upErr) {
                    patched = true;
                    break;
                  }
                }
                if (!patched) {
                  const orExpr = idCandidates
                    .map((k) => `${k}.eq.${newId}`)
                    .join(',');
                  const { data: upd, error: upErr } = await admin
                    .from('messages')
                    .update({
                      [mediaColumns[0]]: mediaPath,
                      ...(existingCols.has('type') ? { type: 'image' } : {}),
                    } as Record<string, unknown>)
                    .or(orExpr)
                    .select('id');
                  if (
                    !upErr &&
                    ((Array.isArray(upd) && upd.length > 0) || !!upd)
                  ) {
                    patched = true;
                  }
                }
              } catch {
                // ignore
              }
            }
          }
        } catch {
          // не критично для возврата id — фронтенд подхватит media через кэш/подпись URL
        }

        return { id: newId };
      }
      if (!this.rpcWarned) {
        this.logger.warn('send_message RPC failed, using fallback insert', {
          rpcError: error?.message ?? error,
        });
        this.rpcWarned = true;
      }
    }

    // 2) Фоллбек: прямой INSERT с перебором названий колонок

    const { data: userRes, error: userErr } =
      await this.supabaseService.getUser(userAccessToken);
    const typedUserRes = userRes as SupabaseUserResponse | null;
    const uid = typedUserRes?.user?.id;
    if (!uid || userErr) {
      this.logger.error('Cannot resolve user from token for sendMessage fallback', {
        userErr: userErr?.message ?? userErr,
      });
      throw new Error('send_message failed (no user from token)');
    }

    const client = this.supabaseService.getClientForToken(userAccessToken);

    // Попробуем определить реальные колонки таблицы messages
    const existing = await this.getExistingColumns(userAccessToken);

    // Use column candidates with existing column filtering
    const senderColumns = preferExisting(COLS.sender, existing);
    const recipientColumns = preferExisting(COLS.recipient, existing);
    const contentColumns = preferExisting(COLS.content, existing);
    const mediaColumns = preferExisting(COLS.media, existing);

    const trimmedText = (text ?? '').trim();
    const hasText = trimmedText.length > 0;
    const hasMedia =
      typeof mediaPath === 'string' && mediaPath.trim().length > 0;

    let firstErr: Error | null = null;
    let lastErr: Error | null = null;

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
          [cc]: hasText ? trimmedText : null,
          ...(existing.has('match_id') && matchId ? { match_id: matchId } : {}),
          ...(existing.has('type')
            ? { type: hasMedia ? 'image' : 'text' }
            : {}),
        } as Record<string, unknown>;

        // 2.1 Попытка БЕЗ sender-колонки, С медиа — СНАЧАЛА (если есть медиа)
        if (!senderKey && hasMedia) {
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

        // 2.2 Попытка БЕЗ sender-колонки, без медиа (только если нет медиа и есть текст)
        if (!senderKey && !hasMedia && hasText) {
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

        // 2.3 Попытки С sender-колонками
        {
          const senderList = senderKey ? [senderKey] : senderColumns;
          for (const sc of senderList) {
            const baseWithSender = {
              [sc]: uid,
              ...baseCore,
            };

            // 2.3.1 С sender, с медиа — СНАЧАЛА (если есть медиа)
            if (hasMedia) {
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

            // 2.3.2 С sender, без медиа (только если нет медиа и есть текст)
            if (!hasMedia && hasText) {
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
          }
        }
      }
    }

    this.logger.error('send_message fallback insert failed', {
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

    // Определим текущего пользователя и его скрытия (для себя)
    const { data: userRes2 } =
      await this.supabaseService.getUser(userAccessToken);
    const typedUserRes2 = userRes2 as SupabaseUserResponse | null;
    const selfId = typedUserRes2?.user?.id;

    let hiddenMsgIds = new Set<string>();
    if (selfId) {
      try {
        const convKey = `chat:hidden:conversations:${selfId}`;
        const msgKey = `chat:hidden:messages:${selfId}`;
        const [convList, msgList] = await Promise.all([
          this.redis.get<string[]>(convKey),
          this.redis.get<string[]>(msgKey),
        ]);
        const hiddenConv =
          Array.isArray(convList) && convList.includes(otherUserId);
        if (hiddenConv) {
          return [];
        }
        hiddenMsgIds = new Set<string>(
          Array.isArray(msgList) ? msgList.map(String) : [],
        );
      } catch {
        // в случае проблем с Redis скрытия игнорируем
      }
    }

    // Из-за дрейфа схемы не используем серверные фильтры по неизвестным колонкам.
    // Берём порцию сообщений, RLS отдаст только доступные строки для auth.uid().
    const { data, error } = await client
      .from('messages')
      .select('*')
      .limit(Math.max(50, safeLimit * 2));

    if (error) {
      return [];
    }
    const rows = Array.isArray(data) ? (data as MessageRow[]) : [];

    // Use column candidates from types
    const senderKeys = COLS.sender;
    const recipientKeys = COLS.recipient;
    const contentKeys = COLS.content;
    const mediaKeys = COLS.media;
    const createdKeys = COLS.created;

    // Фильтруем диалог: собеседник = otherUserId (второй участник)
    let filtered = rows.filter((r) => {
      const sender = r[pickKey(r, senderKeys) || 'sender_id'];
      const recipient = r[pickKey(r, recipientKeys) || 'recipient_id'];
      return sender === otherUserId || recipient === otherUserId;
    });

    // Исключаем скрытые пользователем сообщения
    if (hiddenMsgIds && hiddenMsgIds.size) {
      filtered = filtered.filter((r) => {
        const anyId = r.id ?? r.message_id ?? r.uuid ?? r.pk ?? r.messageId;
        return !hiddenMsgIds.has(String(anyId));
      });
    }

    // Сорт по времени (возрастание)
    filtered.sort((a, b) => {
      const ka = String(a[pickKey(a, createdKeys) || 'created_at'] ?? '');

      const kb = String(b[pickKey(b, createdKeys) || 'created_at'] ?? '');
      return new Date(ka).getTime() - new Date(kb).getTime();
    });

    // Ограничиваем и маппим в DTO
    const result: ChatMessage[] = filtered.slice(-safeLimit).map((r) => {
      const senderK = pickKey(r, senderKeys) || 'sender_id';
      const recipientK = pickKey(r, recipientKeys) || 'recipient_id';
      const contentK = pickKey(r, contentKeys) || 'content';
      const mediaK = pickKey(r, mediaKeys) || 'media_path';
      const createdK = pickKey(r, createdKeys) || 'created_at';

      const createdAt = normalizeDate(r[createdK]);

      // Разделяем URL и path: если в колонке значение — абсолютный URL, используем его напрямую
      const rawMedia = r[mediaK] ?? null;
      let mediaPath: string | null = null;
      let mediaUrl: string | null = null;
      if (typeof rawMedia === 'string' && rawMedia.trim()) {
        if (isAbsoluteUrl(rawMedia)) {
          mediaUrl = rawMedia;
        } else {
          mediaPath = rawMedia;
        }
      }

      return {
        id: r.id,
        senderId: r[senderK],
        recipientId: r[recipientK],
        text: r[contentK] ?? null,
        mediaPath,
        createdAt,
        mediaUrl,
      } as ChatMessage;
    });

    // Попробуем создать подписанные URL для медиа-путей (bucket user-photos), если URL ещё не задан
    // Оптимизировано: batch создание signed URLs (N+1 → 1 запрос)
    try {
      const mediaPaths = result
        .filter((m) => !m.mediaUrl && m.mediaPath)
        .map((m) => m.mediaPath!);

      if (mediaPaths.length > 0) {
        const urlsMap = await this.supabaseService.createSignedUrlsBatch(
          'user-photos',
          mediaPaths,
          900,
        );

        // Проставляем URL из Map с O(1) доступом
        result.forEach((m) => {
          if (!m.mediaUrl && m.mediaPath) {
            m.mediaUrl = urlsMap.get(m.mediaPath) ?? null;
          }
        });
      }
    } catch {
      // без URL — покажем плейсхолдер на фронтенде
    }

    return result;
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
    const typedUserRes = userRes as SupabaseUserResponse | null;
    const selfId = typedUserRes?.user?.id;
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

    const rows = Array.isArray(data) ? (data as MessageRow[]) : [];

    const map = new Map<string, ChatConversation>();
    for (const r of rows) {
      const sender = getValue<MessageRow, string>(r, COLS.sender, '');
      const recipientKey = pickKey(r, COLS.recipient);
      const recipient = recipientKey ? r[recipientKey] : null;

      const otherUserId =
        sender === selfId ? String(recipient) : String(sender);
      if (!otherUserId || otherUserId === 'null' || otherUserId === 'undefined')
        continue;

      if (!map.has(otherUserId)) {
        const createdKey = pickKey(r, COLS.created) || 'created_at';
        const contentKey = pickKey(r, COLS.content) || 'content';
        const mediaKey = pickKey(r, COLS.media) || 'media_path';

        const createdAt = normalizeDate(r[createdKey]);

        map.set(otherUserId, {
          otherUserId,
          lastSenderId: sender || selfId || '',

          lastMessageText: String(r[contentKey] ?? ''),

          lastMessageMediaPath: String(r[mediaKey] ?? '') || null,
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
          for (const p of photos as UserPhoto[]) {
            if (p?.user_id && p?.storage_path)
              byUser[p.user_id] = p.storage_path;
          }

          // Создадим подписанные URL'ы batch методом (N+1 → 1 запрос)
          const photoPaths = Object.values(byUser).filter(Boolean);
          if (photoPaths.length > 0) {
            const urlsMap = await this.supabaseService.createSignedUrlsBatch(
              'user-photos',
              photoPaths,
              900,
            );

            // Проставляем URL для каждого собеседника с O(1) доступом
            otherIds.forEach((uid) => {
              const path = byUser[uid];
              if (path) {
                const conv = map.get(uid);
                if (conv) conv.primaryPhotoUrl = urlsMap.get(path) ?? null;
              }
            });
          }
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
          for (const u of users as User[]) {
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

    // Применим фильтр скрытых переписок (для текущего пользователя)
    let items = Array.from(map.values());
    try {
      const hidden =
        (await this.redis.get<string[]>(
          `chat:hidden:conversations:${selfId}`,
        )) ?? [];
      if (Array.isArray(hidden) && hidden.length) {
        items = items.filter((c) => hidden.indexOf(c.otherUserId) === -1);
      }
    } catch {
      // если Redis недоступен — просто не фильтруем
    }
    return items.slice(0, safeLimit);
  }

  /**
   * Проверяет, существует ли указанный столбец в таблице messages с контекстом пользователя.
   * Выполняется безопасный select(column) limit(0). Если колонка отсутствует — вернётся ошибка.
   */
  private async columnExists(
    userAccessToken: string,
    column: string,
  ): Promise<boolean> {
    // Сначала пробуем клиентом пользователя (RLS)
    try {
      const client = this.supabaseService.getClientForToken(userAccessToken);
      const { error } = await client.from('messages').select(column).limit(0);
      if (!error) return true;
    } catch {
      // игнорируем, попробуем через admin
    }
    // Фолбэк — проверяем существование колонки через admin (обходит RLS)
    try {
      const admin = this.supabaseService.getAdminClient();
      const { error } = await admin.from('messages').select(column).limit(0);
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

  /**
   * Удаление сообщения.
   * mode: 'for_me' — скрыть у текущего пользователя (Redis);
   *       'for_all' — физически удалить, если текущий пользователь — отправитель.
   */
  async deleteMessageWithToken(
    userAccessToken: string,
    messageId: string,
    mode: 'for_me' | 'for_all' = 'for_me',
  ): Promise<{ success: boolean }> {
    const { data: userRes } =
      await this.supabaseService.getUser(userAccessToken);
    const typedUserRes = userRes as SupabaseUserResponse | null;
    const selfId = typedUserRes?.user?.id;
    if (!selfId) {
      throw new Error('auth required');
    }

    // "Удалить у меня" — скрываем в Redis
    if (mode === 'for_me') {
      const key = `chat:hidden:messages:${selfId}`;
      const list = (await this.redis.get<string[]>(key)) ?? [];
      if (!list.includes(String(messageId))) {
        list.push(String(messageId));
        await this.redis.set(key, list);
      }
      return { success: true };
    }

    // "Удалить для всех" — жёсткое удаление из БД
    const client = this.supabaseService.getClientForToken(userAccessToken);

    // Проверим наличие admin-клиента (для обхода RLS)
    let admin: ReturnType<typeof this.supabaseService.getAdminClient> | null =
      null;
    let adminAvailable = false;
    try {
      admin = this.supabaseService.getAdminClient();
      adminAvailable = true;
    } catch {
      admin = null;
      adminAvailable = false;
    }

    // Попробуем RPC delete_message (если включено и функция существует)
    if (this.preferDeleteRpc) {
      try {
        const { error } = await this.supabaseService.rpcWithToken<any>(
          'delete_message',
          { p_message_id: messageId },
          userAccessToken,
        );
        if (!error) {
          return { success: true };
        }
      } catch {
        // игнорируем и продолжаем fallback'ами
      }
    }

    // Универсальные кандидаты ключей
    const idCandidates = ['id', 'message_id', 'uuid', 'pk', 'messageId'];
    const senderCandidates = [
      'sender_id',
      'senderId',
      'from_user_id',
      'fromId',
      'from',
      'author_id',
    ];

    // 1) Прочитать строку сообщения (сначала как пользователь, затем через admin)
    const tryFetch = async (viaAdmin: boolean): Promise<MessageRow | null> => {
      const c = viaAdmin ? admin : client;
      if (!c) return null;
      for (const idK of idCandidates) {
        try {
          const { data, error } = await c
            .from('messages')
            .select('*')
            .eq(idK, messageId)
            .maybeSingle();
          if (!error && data) return data as MessageRow;
        } catch {
          // ignore and try next candidate
        }
      }
      return null;
    };

    let row: MessageRow | null = await tryFetch(false);
    if (!row && adminAvailable) {
      row = await tryFetch(true);
    }
    if (!row) {
      throw new Error('message not found');
    }

    // 2) Убедимся, что сообщение принадлежит текущему пользователю (он — отправитель)
    const senderKey =
      senderCandidates.find((k) =>
        Object.prototype.hasOwnProperty.call(row, k),
      ) || null;
    if (!senderKey || row[senderKey] !== selfId) {
      throw new Error('for_all is allowed only for the sender');
    }

    // Определим реальный ключ id в возвращённой строке
    const actualIdKey =
      idCandidates.find((k) => Object.prototype.hasOwnProperty.call(row, k)) ||
      'id';
    const actualIdValue = row[actualIdKey] ?? messageId;

    // 3) Удаляем: если доступен admin — используем его (надежнее против RLS)
    const tryDelete = async (viaAdmin: boolean): Promise<boolean> => {
      const c = viaAdmin ? admin : client;
      if (!c) return false;
      try {
        // Возвращаем удалённые id, чтобы убедиться, что удаление действительно произошло
        const { data, error } = await c
          .from('messages')
          .delete()
          .eq(actualIdKey, actualIdValue)
          .select('id');
        if (error) return false;
        if (Array.isArray(data)) return data.length > 0;
        return !!data; // на случай единичного объекта
      } catch {
        return false;
      }
    };

    let deleted = false;
    if (adminAvailable) {
      deleted = await tryDelete(true);
    }
    if (!deleted) {
      deleted = await tryDelete(false);
    }
    if (!deleted && adminAvailable) {
      // Еще одна попытка клиентом-пользователем на случай сетевой гонки
      deleted = await tryDelete(false);
    }

    // Последний фолбэк: удалить по любому из возможных ключей (OR), если реальный ключ id определить не удалось или eq не сработал
    const tryDeleteAnyKey = async (viaAdmin: boolean): Promise<boolean> => {
      const c = viaAdmin ? admin : client;
      if (!c) return false;
      try {
        // Собираем OR-выражение вида: id.eq.<val>,message_id.eq.<val>,uuid.eq.<val>,pk.eq.<val>,messageId.eq.<val>
        const orExpr = idCandidates

          .map((k) => `${k}.eq.${actualIdValue}`)
          .join(',');
        const { data, error } = await c
          .from('messages')
          .delete()
          .or(orExpr)
          .select('id');
        if (error) return false;
        if (Array.isArray(data)) return data.length > 0;
        return !!data;
      } catch {
        return false;
      }
    };

    if (!deleted && adminAvailable) {
      deleted = await tryDeleteAnyKey(true);
    }
    if (!deleted) {
      deleted = await tryDeleteAnyKey(false);
    }

    // 4) Верифицируем, что запись действительно исчезла
    const verifyMissing = async (): Promise<boolean> => {
      const verify = async (
        c: ReturnType<typeof this.supabaseService.getClientForToken> | null,
      ) => {
        if (!c) return true;
        for (const idK of idCandidates) {
          try {
            const { data, error } = await c
              .from('messages')
              .select('*')
              .eq(idK, actualIdValue)
              .maybeSingle();
            if (!error && data) return false; // нашлась — значит не удалилось
          } catch {
            // ignore
          }
        }
        return true;
      };
      if (adminAvailable && admin) {
        const missAdmin = await verify(admin);
        if (!missAdmin) return false;
      }
      const missUser = await verify(client);
      return missUser;
    };

    if (!deleted || !(await verifyMissing())) {
      throw new Error('delete for_all failed (not removed in DB)');
    }

    return { success: true };
  }

  /**
   * Скрыть переписку (диалог) у текущего пользователя.
   */
  async deleteConversationForMe(
    userAccessToken: string,
    otherUserId: string,
  ): Promise<{ success: boolean }> {
    const { data: userRes } =
      await this.supabaseService.getUser(userAccessToken);
    const typedUserRes = userRes as SupabaseUserResponse | null;
    const selfId = typedUserRes?.user?.id;
    if (!selfId) {
      throw new Error('auth required');
    }
    const key = `chat:hidden:conversations:${selfId}`;
    const list = (await this.redis.get<string[]>(key)) ?? [];
    if (!list.includes(String(otherUserId))) {
      list.push(String(otherUserId));
      await this.redis.set(key, list);
    }
    return { success: true };
  }
}
