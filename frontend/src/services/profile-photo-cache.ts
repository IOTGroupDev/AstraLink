import AsyncStorage from '@react-native-async-storage/async-storage';

export type PrimaryPhotoSnapshot = {
  url: string;
  path: string | null;
  expiresAt: string | null;
};

const PROFILE_PHOTO_CACHE_PREFIX = '@astralink/profile-photo:';

const buildProfilePhotoCacheKey = (userId: string): string =>
  `${PROFILE_PHOTO_CACHE_PREFIX}${userId}`;

const isExpired = (expiresAt?: string | null): boolean => {
  if (!expiresAt) return false;
  const expiresAtMs = Date.parse(expiresAt);
  return Number.isFinite(expiresAtMs) ? expiresAtMs <= Date.now() : true;
};

export const getCachedPrimaryPhoto = async (
  userId: string
): Promise<PrimaryPhotoSnapshot | null> => {
  if (!userId) return null;

  try {
    const raw = await AsyncStorage.getItem(buildProfilePhotoCacheKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PrimaryPhotoSnapshot>;
    if (!parsed?.url || isExpired(parsed.expiresAt)) {
      await AsyncStorage.removeItem(buildProfilePhotoCacheKey(userId));
      return null;
    }

    return {
      url: parsed.url,
      path: parsed.path ?? null,
      expiresAt: parsed.expiresAt ?? null,
    };
  } catch {
    return null;
  }
};

export const setCachedPrimaryPhoto = async (
  userId: string,
  snapshot: PrimaryPhotoSnapshot | null
): Promise<void> => {
  if (!userId) return;

  if (!snapshot?.url) {
    await AsyncStorage.removeItem(buildProfilePhotoCacheKey(userId));
    return;
  }

  await AsyncStorage.setItem(
    buildProfilePhotoCacheKey(userId),
    JSON.stringify(snapshot)
  );
};

export const clearCachedPrimaryPhoto = async (
  userId: string
): Promise<void> => {
  if (!userId) return;
  await AsyncStorage.removeItem(buildProfilePhotoCacheKey(userId));
};
