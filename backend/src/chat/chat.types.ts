/**
 * Type definitions for chat module
 */

// Database message row (flexible schema support)
export interface MessageRow {
  // ID columns (various naming conventions)
  id?: string;
  message_id?: string;
  uuid?: string;
  pk?: string;
  messageId?: string;

  // Sender columns
  sender_id?: string;
  senderId?: string;
  from_user_id?: string;
  fromId?: string;
  from?: string;
  author_id?: string;

  // Recipient columns
  recipient_id?: string;
  receiver_id?: string;
  recipient?: string;
  to_user_id?: string;
  to_id?: string;

  // Content columns
  content?: string;
  text?: string;
  body?: string;
  message?: string;
  message_text?: string;

  // Media columns
  attachment_path?: string;
  media_path?: string;
  media_url?: string;
  attachment_url?: string;
  attachment?: string;
  file_url?: string;
  file_path?: string;
  file?: string;
  image_url?: string;

  // Metadata columns
  type?: 'text' | 'image' | 'file' | string;
  created_at?: string | Date;
  createdAt?: string | Date;
  createdAtUtc?: string | Date;
  read_at?: string | Date;
  match_id?: string;

  // Allow any other columns for flexibility
  [key: string]: unknown;
}

// User data from Supabase auth
export interface SupabaseUser {
  id: string;
  email?: string;
  phone?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface SupabaseUserResponse {
  user: SupabaseUser | null;
  [key: string]: unknown;
}

// Column mapping candidates
export interface ColumnCandidates {
  id: string[];
  sender: string[];
  recipient: string[];
  content: string[];
  media: string[];
  created: string[];
}

export const COLUMN_CANDIDATES: ColumnCandidates = {
  id: ['id', 'message_id', 'uuid', 'pk', 'messageId'],
  sender: [
    'sender_id',
    'senderId',
    'from_user_id',
    'fromId',
    'from',
    'author_id',
  ],
  recipient: [
    'recipient_id',
    'receiver_id',
    'recipient',
    'to_user_id',
    'to_id',
  ],
  content: ['content', 'text', 'body', 'message', 'message_text'],
  media: [
    'attachment_path',
    'media_path',
    'media_url',
    'attachment_url',
    'attachment',
    'file_url',
    'file_path',
    'file',
    'image_url',
  ],
  created: ['created_at', 'createdAt', 'createdAtUtc'],
};

// Match entity
export interface Match {
  id: string;
  user_a: string;
  user_b: string;
  status: 'pending' | 'active' | 'rejected' | string;
  created_at?: string;
  [key: string]: unknown;
}

// User photo entity
export interface UserPhoto {
  user_id: string;
  storage_path: string;
  is_primary: boolean;
  [key: string]: unknown;
}

// User entity
export interface User {
  id: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
}
