import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { SupabaseService } from '../supabase/supabase.service';
import { RedisService } from '../redis/redis.service';

type VisibilityKind = 'messages' | 'conversations';

/** PostgreSQL is authoritative; old Redis entries are imported lazily per owner. */
@Injectable()
export class ChatVisibilityService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly redis: RedisService,
  ) {}

  async getHidden(userId: string, kind: VisibilityKind): Promise<Set<string>> {
    const client = this.supabase.getAdminClient();
    const table = `chat_hidden_${kind}`;
    const column = kind === 'messages' ? 'message_id' : 'other_user_id';
    const key = `chat:hidden:${kind}:${userId}`;
    const legacy = await this.redis.get<string[]>(key);
    const ids = Array.isArray(legacy)
      ? [
          ...new Set(
            legacy.filter((id) => typeof id === 'string' && isUUID(id)),
          ),
        ]
      : [];
    for (let offset = 0; offset < ids.length; offset += 500) {
      const { error } = await client.from(table).upsert(
        ids
          .slice(offset, offset + 500)
          .map((id) => ({ user_id: userId, [column]: id })),
        { onConflict: `user_id,${column}`, ignoreDuplicates: true },
      );
      if (error)
        throw new ServiceUnavailableException('Cannot migrate chat visibility');
    }
    if (Array.isArray(legacy)) await this.redis.del(key);
    const hidden = new Set<string>();
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client
        .from(table)
        .select(column)
        .eq('user_id', userId)
        .order(column)
        .range(offset, offset + 999);
      if (error || !data)
        throw new ServiceUnavailableException('Cannot load chat visibility');
      for (const row of data as unknown as Record<string, string>[])
        hidden.add(row[column]);
      if (data.length < 1000) return hidden;
    }
  }

  async hide(
    userId: string,
    kind: VisibilityKind,
    targetId: string,
  ): Promise<void> {
    const column = kind === 'messages' ? 'message_id' : 'other_user_id';
    const { error } = await this.supabase
      .getAdminClient()
      .from(`chat_hidden_${kind}`)
      .upsert(
        { user_id: userId, [column]: targetId },
        { onConflict: `user_id,${column}`, ignoreDuplicates: true },
      );
    if (error)
      throw new ServiceUnavailableException('Cannot save chat visibility');
  }
}
