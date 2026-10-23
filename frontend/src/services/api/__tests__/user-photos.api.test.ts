import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { api } from '../client';
import { userPhotosAPI } from '../user-photos.api';
import {
  normalizeBodyInitAsync,
  normalizeHeadersInit,
  overrideHeaders,
} from 'expo/src/winter/fetch/RequestUtils';

jest.mock('../client', () => ({ api: { post: jest.fn() } }));
jest.mock('expo-file-system', () => ({ File: jest.fn() }));

const post = jest.mocked(api.post);
const readFile = jest.fn();
const uploadFetch = jest.fn();
const originalFetch = global.fetch;
const originalOS = Platform.OS;
const confirmedPhoto = { id: 'photo-id', path: 'owner/photo.png' };
const signatures = [
  { ext: 'jpg', mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff, 0xe0] },
  {
    ext: 'png',
    mime: 'image/png',
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  {
    ext: 'webp',
    mime: 'image/webp',
    bytes: [0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
  },
];

describe('profile photo upload', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    Platform.OS = 'ios';
    global.fetch = uploadFetch;
    jest
      .mocked(File)
      .mockImplementation(() => ({ arrayBuffer: readFile }) as unknown as File);
    readFile.mockResolvedValue(new Uint8Array(signatures[0].bytes).buffer);
    post.mockImplementation(async (url) => ({
      data:
        url === '/user/photos/upload-url'
          ? {
              path: 'owner/photo.png',
              signedUrl: 'https://storage.test/upload',
            }
          : confirmedPhoto,
    }));
    uploadFetch.mockResolvedValue({ ok: true, status: 200 });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Platform.OS = originalOS;
  });

  it.each(signatures)(
    'uploads native $ext bytes with the matching MIME and confirms afterward',
    async ({ ext, mime, bytes }) => {
      const data = new Uint8Array(bytes).buffer;
      readFile.mockResolvedValue(data);

      await expect(
        userPhotosAPI.uploadPickedPhoto('file:///cropped-photo.jpg')
      ).resolves.toEqual(confirmedPhoto);

      expect(File).toHaveBeenCalledWith('file:///cropped-photo.jpg');
      expect(post).toHaveBeenNthCalledWith(1, '/user/photos/upload-url', {
        ext,
        path: undefined,
      });
      expect(uploadFetch).toHaveBeenCalledTimes(1);
      expect(uploadFetch).toHaveBeenCalledWith('https://storage.test/upload', {
        method: 'PUT',
        headers: { 'Content-Type': mime, 'x-upsert': 'true' },
        body: data,
      });
      expect(post).toHaveBeenNthCalledWith(2, '/user/photos/confirm', {
        path: 'owner/photo.png',
      });
    }
  );

  it('reads a web picker URI without calling the native filesystem', async () => {
    Platform.OS = 'web';
    const data = new Uint8Array(signatures[1].bytes).buffer;
    uploadFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => data,
    });

    await userPhotosAPI.uploadPickedPhoto('blob:browser-photo');

    expect(File).not.toHaveBeenCalled();
    expect(uploadFetch).toHaveBeenNthCalledWith(1, 'blob:browser-photo');
    expect(uploadFetch.mock.calls[1][1].body).toBe(data);
  });

  it('preserves the image MIME through the real Expo fetch body normalizer', async () => {
    uploadFetch.mockImplementationOnce(async (_url, init: RequestInit) => {
      const normalized = await normalizeBodyInitAsync(init.body);
      const headers = overrideHeaders(
        normalizeHeadersInit(init.headers),
        normalized.overriddenHeaders ?? []
      );
      expect(headers).toContainEqual(['Content-Type', 'image/jpeg']);
      expect(normalized.body).toEqual(new Uint8Array(signatures[0].bytes));
      return { ok: true, status: 200 };
    });

    await userPhotosAPI.uploadPickedPhoto('file:///photo.jpg');

    expect(uploadFetch).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenLastCalledWith('/user/photos/confirm', {
      path: 'owner/photo.png',
    });
  });

  it.each([{ bytes: [] }, { bytes: [1, 2, 3, 4] }])(
    'rejects empty or unsupported data before requesting an upload URL ($bytes)',
    async ({ bytes }) => {
      readFile.mockResolvedValue(new Uint8Array(bytes).buffer);

      await expect(
        userPhotosAPI.uploadPickedPhoto('file:///invalid.jpg')
      ).rejects.toThrow('Selected file is not a supported photo');
      expect(post).not.toHaveBeenCalled();
      expect(uploadFetch).not.toHaveBeenCalled();
    }
  );

  it('does not confirm a rejected storage upload', async () => {
    uploadFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Upload rejected',
    });

    await expect(
      userPhotosAPI.uploadPickedPhoto('file:///photo.jpg')
    ).rejects.toThrow('Upload failed: 403');
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('propagates a file read failure before uploading', async () => {
    readFile.mockRejectedValueOnce(new Error('File unavailable'));

    await expect(
      userPhotosAPI.uploadPickedPhoto('file:///missing.jpg')
    ).rejects.toThrow('File unavailable');
    expect(post).not.toHaveBeenCalled();
    expect(uploadFetch).not.toHaveBeenCalled();
  });

  it('propagates confirmation failure instead of reporting upload success', async () => {
    post.mockResolvedValueOnce({
      data: {
        path: 'owner/photo.jpg',
        signedUrl: 'https://storage.test/upload',
      },
    });
    post.mockRejectedValueOnce(new Error('Confirmation unavailable'));

    await expect(
      userPhotosAPI.uploadPickedPhoto('file:///photo.jpg')
    ).rejects.toThrow('Confirmation unavailable');
  });
});
