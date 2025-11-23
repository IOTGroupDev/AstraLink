import { api } from './client';
import type {
  StartConversationRequest,
  StartConversationResponse,
} from '../../types/chat';

export const chatAPI = {
  listConversations: async (
    limit = 50
  ): Promise<
    Array<{
      otherUserId: string;
      lastSenderId: string;
      lastMessageText: string | null;
      lastMessageMediaPath: string | null;
      lastMessageAt: string;
      primaryPhotoUrl?: string | null;
      displayName?: string | null;
    }>
  > => {
    const response = await api.get(
      `/chat/conversations?limit=${Math.max(1, Math.min(100, limit))}`
    );
    return response.data?.items ?? [];
  },

  listMessages: async (
    userId: string,
    limit = 50
  ): Promise<
    Array<{
      id: string;
      senderId: string;
      recipientId: string;
      text: string | null;
      mediaPath: string | null;
      createdAt: string;
    }>
  > => {
    const response = await api.get(
      `/chat/messages?userId=${encodeURIComponent(userId)}&limit=${Math.max(1, Math.min(100, limit))}`
    );
    return response.data?.items ?? [];
  },

  sendMessage: async (
    recipientId: string,
    text?: string,
    mediaPath?: string | null
  ): Promise<{ success: boolean; id: string }> => {
    const response = await api.post('/chat/messages/send', {
      recipientId,
      text,
      mediaPath: mediaPath ?? null,
    });
    return response.data;
  },

  deleteMessage: async (
    id: string,
    mode: 'for_me' | 'for_all' = 'for_me'
  ): Promise<{ success: boolean }> => {
    const response = await api.delete(
      `/chat/messages/${encodeURIComponent(id)}?mode=${mode}`
    );
    return response.data;
  },

  deleteConversation: async (
    otherUserId: string
  ): Promise<{ success: boolean }> => {
    const response = await api.delete(
      `/chat/conversations/${encodeURIComponent(otherUserId)}`
    );
    return response.data;
  },

  startConversation: async (
    data: StartConversationRequest
  ): Promise<StartConversationResponse> => {
    const response = await api.post<StartConversationResponse>(
      '/chat/conversations/start',
      data
    );
    return response.data;
  },
};
