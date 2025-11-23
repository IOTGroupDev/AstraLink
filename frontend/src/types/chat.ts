export interface StartConversationRequest {
  recipientId: string;
  initialMessage?: string;
}

export interface StartConversationResponse {
  success: boolean;
  messageId?: string;
  recipientId: string;
}
