import { api } from './client';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

type PhotoContentType = 'image/jpeg' | 'image/png' | 'image/webp';

function getPhotoFormat(data: ArrayBuffer): {
  ext: 'jpg' | 'png' | 'webp';
  contentType: PhotoContentType;
} {
  const bytes = new Uint8Array(data);
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: 'jpg', contentType: 'image/jpeg' };
  }
  if (
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (byte, index) => bytes[index] === byte
    )
  ) {
    return { ext: 'png', contentType: 'image/png' };
  }
  if (
    bytes.length >= 12 &&
    [0x52, 0x49, 0x46, 0x46].every((byte, index) => bytes[index] === byte) &&
    [0x57, 0x45, 0x42, 0x50].every((byte, index) => bytes[index + 8] === byte)
  ) {
    return { ext: 'webp', contentType: 'image/webp' };
  }
  throw new Error('Selected file is not a supported photo');
}

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

  uploadPickedPhoto: async (uri: string): Promise<UserPhotoItem> => {
    // Native file:// URIs must be read by FileSystem, not fetched into a Blob.
    let data: ArrayBuffer;
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      if (!response.ok) throw new Error('Could not read selected photo');
      data = await response.arrayBuffer();
    } else {
      data = await new File(uri).arrayBuffer();
    }
    const { ext, contentType } = getPhotoFormat(data);
    const { path, signedUrl } = await userPhotosAPI.getUploadUrl({ ext });
    await userPhotosAPI.uploadToSignedUrl(signedUrl, data, contentType);
    return userPhotosAPI.confirmPhoto(path);
  },

  // 2) Upload directly to signed URL (PUT)
  uploadToSignedUrl: async (
    signedUrl: string,
    data: ArrayBuffer,
    contentType: PhotoContentType = 'image/jpeg'
  ): Promise<boolean> => {
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'x-upsert': 'true',
    };

    const resp = await fetch(signedUrl, {
      method: 'PUT',
      headers,
      body: data,
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
