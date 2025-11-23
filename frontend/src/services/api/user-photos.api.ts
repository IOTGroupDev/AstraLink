import { api } from './client';

export type UserPhotoItem = {
  id: string;
  userId: string;
  path: string;
  isPrimary: boolean;
  url: string | null;
  createdAt: string;
};

export const userPhotosAPI = {
  // 1) Ask backend for signed PUT URL
  getUploadUrl: async (params?: {
    ext?: 'jpg' | 'jpeg' | 'png' | 'webp';
    path?: string;
  }): Promise<{
    path: string;
    signedUrl: string;
    token: string;
    method: 'PUT';
    requiredHeaders: Record<string, string>;
  }> => {
    const response = await api.post('/user/photos/upload-url', {
      ext: params?.ext ?? 'jpg',
      path: params?.path,
    });
    return response.data;
  },

  // 2) Upload directly to signed URL (PUT)
  uploadToSignedUrl: async (
    signedUrl: string,
    data: Blob | ArrayBuffer | Uint8Array,
    contentType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
  ): Promise<boolean> => {
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'x-upsert': 'true', // harmless for most signed uploads; backend may ignore
    };

    const resp = await fetch(signedUrl, {
      method: 'PUT',
      headers,
      body: data as any,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Upload failed: ${resp.status} ${text}`);
    }
    return true;
  },

  // 3) Confirm uploaded file and persist DB record
  confirmPhoto: async (path: string): Promise<UserPhotoItem> => {
    const response = await api.post('/user/photos/confirm', { path });
    return response.data as UserPhotoItem;
  },

  listPhotos: async (): Promise<UserPhotoItem[]> => {
    const response = await api.get('/user/photos');
    return response.data as UserPhotoItem[];
  },

  deletePhoto: async (photoId: string): Promise<{ success: boolean }> => {
    const response = await api.delete(
      `/user/photos/${encodeURIComponent(photoId)}`
    );
    return response.data as { success: boolean };
  },

  setPrimary: async (photoId: string): Promise<{ success: boolean }> => {
    const response = await api.post(
      `/user/photos/${encodeURIComponent(photoId)}/set-primary`,
      {}
    );
    return response.data as { success: boolean };
  },
};
