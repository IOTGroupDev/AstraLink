/* eslint-disable */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
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
import { ChatNotificationsService } from './chat-notifications.service';
import { isOwnedPhotoPath } from '../user/dto/photos.dto';
import { isUUID } from 'class-validator';
import { decodeDialogCursor, messageTimestamp } from './dialog-cursor';
import { ChatVisibilityService } from './chat-visibility.service';

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  text: string | null;
  mediaPath: string | null;
  createdAt: string;
  mediaUrl?: string | null;
  readAt?: string | null;
}

export interface ChatConversation {
  otherUserId: string;
  lastSenderId: string;
  lastMessageText: string | null;
  lastMessageMediaPath: string | null;
  lastMessageAt: string;
  primaryPhotoUrl?: string | null;
  displayName?: string | null;
  unreadCount: number;
}

@Injectable()
export class ChatService {
  private static readonly USER_PHOTOS_BUCKET = 'user-photos';
  private static readonly CHAT_MEDIA_BUCKET = 'chat-media';
  private static readonly CHAT_MEDIA_PREFIX = `${ChatService.CHAT_MEDIA_BUCKET}:`;
  private readonly logger = new Logger(ChatService.name);
  // RPC отключён по умолчанию, включайте через CHAT_PREFER_RPC=true
  private readonly preferRpc = process.env.CHAT_PREFER_RPC === 'true';
  // RPC для удаления сообщений (если в БД есть SECURITY DEFINER delete_message)
  private readonly preferDeleteRpc =
    process.env.CHAT_DELETE_PREFER_RPC === 'true';
  private rpcWarned = false;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly redis: RedisService,
    private readonly chatNotificationsService: ChatNotificationsService,
    private readonly visibility: ChatVisibilityService,
  ) {}

  private triggerIncomingMessageNotification(params: {
    senderId: string;
    recipientId: string;
    text?: string;
    mediaPath?: string | null;
  }): void {
    void this.chatNotificationsService
      .notifyIncomingMessage(params)
      .catch((error) => {
        this.logger.warn('Failed to send chat push notification', error);
      });
  }

  async createMediaUploadUrl(
    userId: string,
    ext: string = 'jpg',
  ): Promise<{ path: string; signedUrl: string; token: string }> {
    const safeExt =
      (ext || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
    const rawPath = `${userId}/${randomUUID()}.${safeExt}`;
    const signedUpload = await this.supabaseService.createSignedUploadUrl(
      ChatService.CHAT_MEDIA_BUCKET,
      rawPath,
    );

    if (!signedUpload) {
      throw new BadRequestException(
        'Failed to create signed upload URL for chat media',
      );
    }

    return {
      path: this.encodeChatMediaPath(rawPath),
      ...signedUpload,
    };
  }

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
    const { data: userRes, error: userErr } =
      await this.supabaseService.getUser(userAccessToken);
    const typedUserRes = userRes as SupabaseUserResponse | null;
    const uid = typedUserRes?.user?.id;
    if (!uid || userErr) {
      this.logger.error('Cannot resolve user from token for sendMessage', {
        userErr: userErr?.message ?? userErr,
      });
      throw new Error('send_message failed (no user from token)');
    }

    const normalizedMediaPath = mediaPath?.trim() || null;
    if (normalizedMediaPath) {
      this.assertOwnedMediaPath(uid, normalizedMediaPath);
    }

    await this.assertMessagingAllowed(uid, recipientId);
    // Validate media before creating a conversation; check status before RPC too.
    const matchId = await this.ensureMatch(userAccessToken, uid, recipientId);

    // 1) RPC (если включено переменной окружения)
    const payload = {
      p_recipient_id: recipientId,
      p_text: (text ?? '').trim(),
      p_media_path: normalizedMediaPath,
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
            typeof normalizedMediaPath === 'string' &&
            normalizedMediaPath.trim().length > 0;

          if (hasMedia) {
            let patched = false;

            // Пытаемся обновить по каждому возможному id-ключу
            for (const idK of idCandidates) {
              try {
                const { error: upErr } = await client
                  .from('messages')
                  .update({
                    [mediaColumns[0]]: normalizedMediaPath,
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
                    [mediaColumns[0]]: normalizedMediaPath,
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
                      [mediaColumns[0]]: normalizedMediaPath,
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
                      [mediaColumns[0]]: normalizedMediaPath,
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

        this.triggerIncomingMessageNotification({
          senderId: uid,
          recipientId,
          text,
          mediaPath: normalizedMediaPath,
        });
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
      typeof normalizedMediaPath === 'string' &&
      normalizedMediaPath.trim().length > 0;

    let firstErr: Error | null = null;
    let lastErr: Error | null = null;

    // Разрешим match для RLS и NOT NULL match_id
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
              [mc]: normalizedMediaPath,
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
                this.triggerIncomingMessageNotification({
                  senderId: uid,
                  recipientId,
                  text,
                  mediaPath: normalizedMediaPath,
                });
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
              this.triggerIncomingMessageNotification({
                senderId: uid,
                recipientId,
                text,
                mediaPath: normalizedMediaPath,
              });
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
                  [mc]: normalizedMediaPath,
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
                    this.triggerIncomingMessageNotification({
                      senderId: uid,
                      recipientId,
                      text,
                      mediaPath: normalizedMediaPath,
                    });
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
                  this.triggerIncomingMessageNotification({
                    senderId: uid,
                    recipientId,
                    text,
                    mediaPath: normalizedMediaPath,
                  });
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
    before?: string,
  ): Promise<ChatMessage[]> {
    const safeLimit = Math.max(1, Math.min(100, limit));
    const client = this.supabaseService.getClientForToken(userAccessToken);

    // Определим текущего пользователя и его скрытия (для себя)
    const { data: userRes2 } =
      await this.supabaseService.getUser(userAccessToken);
    const typedUserRes2 = userRes2 as SupabaseUserResponse | null;
    const selfId = typedUserRes2?.user?.id;
    if (!selfId || !isUUID(selfId) || !isUUID(otherUserId)) {
      throw new BadRequestException('Invalid dialog participants');
    }
    const cursor = before ? decodeDialogCursor(before) : null;

    const [hiddenConversations, hiddenMsgIds] = await Promise.all([
      this.visibility.getHidden(selfId, 'conversations'),
      this.visibility.getHidden(selfId, 'messages'),
    ]);
    if (hiddenConversations.has(otherUserId)) return [];

    // Filter the actual conversation and hidden rows before sorting/limiting.
    let query = client
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${selfId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${selfId})`,
      );
    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      );
    }
    const hiddenIds = [...hiddenMsgIds].filter((id) => isUUID(id));
    if (hiddenIds.length)
      query = query.not('id', 'in', `(${hiddenIds.join(',')})`);
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(safeLimit);

    if (error) {
      throw new ServiceUnavailableException('Unable to load message history');
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
      return (
        messageTimestamp(ka).localeCompare(messageTimestamp(kb)) ||
        String(a.id).localeCompare(String(b.id))
      );
    });

    // Ограничиваем и маппим в DTO
    const result: ChatMessage[] = filtered.slice(-safeLimit).map((r) => {
      const senderK = pickKey(r, senderKeys) || 'sender_id';
      const recipientK = pickKey(r, recipientKeys) || 'recipient_id';
      const contentK = pickKey(r, contentKeys) || 'content';
      const mediaK = pickKey(r, mediaKeys) || 'media_path';
      const createdK = pickKey(r, createdKeys) || 'created_at';

      const createdAt = messageTimestamp(r[createdK]);

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
        readAt: r.read_at ? normalizeDate(r.read_at) : null,
      } as ChatMessage;
    });

    // Поддерживаем legacy user-photos и новый chat-media:* формат.
    try {
      const refsByBucket = new Map<string, Set<string>>();

      for (const message of result) {
        if (!message.mediaUrl && message.mediaPath) {
          if (!this.isOwnedMediaPath(message.senderId, message.mediaPath)) {
            message.mediaPath = null;
            continue;
          }
          const target = this.resolveMediaStorageTarget(message.mediaPath);
          const bucketPaths =
            refsByBucket.get(target.bucket) ?? new Set<string>();
          bucketPaths.add(target.path);
          refsByBucket.set(target.bucket, bucketPaths);
        }
      }

      if (refsByBucket.size > 0) {
        const urlMaps = new Map<string, Map<string, string | null>>();
        for (const [bucket, paths] of refsByBucket.entries()) {
          urlMaps.set(
            bucket,
            await this.supabaseService.createSignedUrlsBatch(
              bucket,
              Array.from(paths),
              900,
            ),
          );
        }

        result.forEach((m) => {
          if (!m.mediaUrl && m.mediaPath) {
            const target = this.resolveMediaStorageTarget(m.mediaPath);
            m.mediaUrl = urlMaps.get(target.bucket)?.get(target.path) ?? null;
          }
        });
      }
    } catch {
      // без URL — покажем плейсхолдер на фронтенде
    }

    // Opening a dialog marks incoming messages as read. The authenticated
    // recipient id is resolved server-side before the admin update.
    if (selfId) {
      try {
        const existing = await this.getExistingColumns(userAccessToken);
        const senderColumn = COLS.sender.find((key) => existing.has(key));
        const recipientColumn = COLS.recipient.find((key) => existing.has(key));
        if (existing.has('read_at') && senderColumn && recipientColumn) {
          await this.supabaseService
            .getAdminClient()
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq(senderColumn, otherUserId)
            .eq(recipientColumn, selfId)
            .is('read_at', null);
        }
      } catch {
        // Read receipts are non-critical; message loading must still succeed.
      }
    }

    return result;
  }

  private encodeChatMediaPath(path: string): string {
    return `${ChatService.CHAT_MEDIA_PREFIX}${path}`;
  }

  private resolveMediaStorageTarget(mediaPath: string): {
    bucket: string;
    path: string;
  } {
    const trimmed = mediaPath.trim();
    if (trimmed.startsWith(ChatService.CHAT_MEDIA_PREFIX)) {
      return {
        bucket: ChatService.CHAT_MEDIA_BUCKET,
        path: trimmed.slice(ChatService.CHAT_MEDIA_PREFIX.length),
      };
    }

    return {
      bucket: ChatService.USER_PHOTOS_BUCKET,
      path: trimmed,
    };
  }

  private assertOwnedMediaPath(userId: string, mediaPath: string): void {
    if (!this.isOwnedMediaPath(userId, mediaPath)) {
      throw new BadRequestException('Invalid chat media path');
    }
  }

  private isOwnedMediaPath(userId: string, mediaPath: string): boolean {
    const { bucket, path } = this.resolveMediaStorageTarget(mediaPath);

    if (
      bucket !== ChatService.CHAT_MEDIA_BUCKET &&
      bucket !== ChatService.USER_PHOTOS_BUCKET
    ) {
      return false;
    }

    return (
      !!path &&
      path.length <= 1024 &&
      path.startsWith(`${userId}/`) &&
      path.split('/').every((part) => /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(part))
    );
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

      if (!map.has(otherUserId) && map.size >= safeLimit) continue;

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
          unreadCount: 0,
        });
      }

      const conversation = map.get(otherUserId);
      if (conversation && String(recipient) === selfId && !r.read_at) {
        conversation.unreadCount += 1;
      }
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
            if (
              map.has(p.user_id) &&
              isOwnedPhotoPath(p.user_id, p.storage_path)
            )
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

    // Подтянем имя собеседника для отображения (admin, обходит RLS)
    try {
      const otherIds = Array.from(map.keys());
      if (otherIds.length > 0) {
        const admin = this.supabaseService.getAdminClient();
        const { data: users, error: usersErr } = await admin
          .from('users')
          .select('id, name')
          .in('id', otherIds);

        if (!usersErr && Array.isArray(users)) {
          const byUser: Record<string, { name?: string }> = {};
          for (const u of users as User[]) {
            if (u?.id) byUser[u.id] = { name: u?.name };
          }
          otherIds.forEach((uid) => {
            const conv = map.get(uid);
            if (!conv) return;
            const info = byUser[uid];
            if (!info) return;
            const display = info.name && String(info.name).trim();
            if (display) conv.displayName = display;
          });
        }
      }
    } catch {
      // имя опционально
    }

    const hidden = await this.visibility.getHidden(selfId, 'conversations');
    const items = Array.from(map.values()).filter(
      (c) => !hidden.has(c.otherUserId),
    );
    return items.slice(0, safeLimit);
  }

  private async getExistingColumns(
    _userAccessToken: string,
  ): Promise<Set<string>> {
    return new Set([
      'id',
      'match_id',
      'sender_id',
      'recipient_id',
      'type',
      'content',
      'attachment_path',
      'created_at',
      'read_at',
    ]);
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
          .select('id, status')
          .eq('user_a', o.a)
          .eq('user_b', o.b)
          .limit(1)
          .maybeSingle();
        if (!error && data?.id) {
          if (data.status !== 'active') {
            throw new ForbiddenException('This conversation is not active');
          }
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

  private async assertMessagingAllowed(
    selfId: string,
    otherUserId: string,
  ): Promise<void> {
    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (
      !uuid.test(selfId) ||
      !uuid.test(otherUserId) ||
      selfId === otherUserId
    ) {
      throw new BadRequestException('Invalid message recipient');
    }

    // Read both directions through the server client; RLS hides incoming blocks.
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('user_blocks')
      .select('id')
      .or(
        `and(user_id.eq.${selfId},blocked_user_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},blocked_user_id.eq.${selfId})`,
      )
      .limit(1);

    if (error) {
      throw new ServiceUnavailableException(
        'Cannot verify messaging permissions',
      );
    }
    if (Array.isArray(data) && data.length > 0) {
      throw new ForbiddenException('Messaging is unavailable for these users');
    }
  }

  /**
   * Удаление сообщения.
   * mode: 'for_me' — скрыть у текущего пользователя (PostgreSQL);
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

    if (!isUUID(messageId)) throw new BadRequestException('Invalid message ID');
    if (mode === 'for_me') {
      await this.visibility.hide(selfId, 'messages', messageId);
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
    if (!isUUID(otherUserId) || selfId === otherUserId)
      throw new BadRequestException('Invalid conversation');
    await this.visibility.hide(selfId, 'conversations', otherUserId);
    return { success: true };
  }
}
