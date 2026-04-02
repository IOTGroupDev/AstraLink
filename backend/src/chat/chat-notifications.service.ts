import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

interface ChatPushPayload {
  senderId: string;
  recipientId: string;
  text?: string | null;
  mediaPath?: string | null;
}

interface ExpoPushResponseItem {
  status?: string;
  details?: {
    error?: string;
  };
}

@Injectable()
export class ChatNotificationsService {
  private readonly logger = new Logger(ChatNotificationsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  private asJsonObject(value: unknown): Record<string, unknown> {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private normalizeTokens(value: unknown): string[] {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? [trimmed] : [];
    }

    if (!Array.isArray(value)) {
      return [];
    }

    return Array.from(
      new Set(
        value
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
  }

  private async getRecipientTokens(userId: string): Promise<string[]> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('user_profiles')
      .select('preferences')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return [];
    }

    const preferences = this.asJsonObject(data.preferences);
    const notifications = this.asJsonObject(preferences.notifications);

    return this.normalizeTokens(
      notifications.expoPushTokens ?? notifications.expoPushToken,
    );
  }

  private async resolveSenderDisplayName(senderId: string): Promise<string> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('users')
      .select('name, email')
      .eq('id', senderId)
      .maybeSingle();

    if (error || !data) {
      return 'AstraLink';
    }

    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (name) {
      return name;
    }

    if (typeof data.email === 'string' && data.email.includes('@')) {
      return data.email.split('@')[0];
    }

    return 'AstraLink';
  }

  private async removeInvalidTokens(
    userId: string,
    invalidTokens: string[],
  ): Promise<void> {
    if (!invalidTokens.length) {
      return;
    }

    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('user_profiles')
      .select('preferences')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return;
    }

    const preferences = this.asJsonObject(data.preferences);
    const notifications = this.asJsonObject(preferences.notifications);
    const nextTokens = this.normalizeTokens(
      notifications.expoPushTokens ?? notifications.expoPushToken,
    ).filter((token) => !invalidTokens.includes(token));

    const nextNotifications: Record<string, unknown> = {
      ...notifications,
      updatedAt: new Date().toISOString(),
    };

    if (nextTokens.length > 0) {
      nextNotifications.expoPushTokens = nextTokens;
      nextNotifications.expoPushToken = nextTokens[0];
    } else {
      delete nextNotifications.expoPushTokens;
      delete nextNotifications.expoPushToken;
    }

    const nextPreferences = {
      ...preferences,
      notifications: nextNotifications,
    };

    const { error: updateError } = await admin.from('user_profiles').upsert({
      user_id: userId,
      preferences: nextPreferences,
      updated_at: new Date().toISOString(),
    });

    if (updateError) {
      this.logger.warn(
        `Failed to prune invalid Expo tokens for user ${userId}`,
        updateError,
      );
    }
  }

  async notifyIncomingMessage(payload: ChatPushPayload): Promise<void> {
    if (!payload.recipientId || payload.recipientId === payload.senderId) {
      return;
    }

    const tokens = await this.getRecipientTokens(payload.recipientId);
    if (!tokens.length) {
      return;
    }

    const title = await this.resolveSenderDisplayName(payload.senderId);
    const bodyText = String(payload.text || '').trim();
    const body = bodyText ? bodyText.slice(0, 180) : 'Sent you a photo';

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        tokens.map((token) => ({
          to: token,
          title,
          body,
          sound: 'default',
          priority: 'high',
          channelId: 'messages',
          data: {
            type: 'chat-message',
            senderId: payload.senderId,
            recipientId: payload.recipientId,
          },
        })),
      ),
    });

    if (!response.ok) {
      this.logger.warn(
        `Expo push send failed with status ${response.status} for recipient ${payload.recipientId}`,
      );
      return;
    }

    const result = (await response.json()) as {
      data?: ExpoPushResponseItem[];
    };
    const invalidTokens =
      result.data
        ?.map((item, index) =>
          item?.details?.error === 'DeviceNotRegistered' ? tokens[index] : null,
        )
        .filter((token): token is string => typeof token === 'string') ?? [];

    if (invalidTokens.length > 0) {
      await this.removeInvalidTokens(payload.recipientId, invalidTokens);
    }
  }
}
