import { api } from './client';

export const datingAPI = {
  // Candidate feed (badge-only)
  getCandidates: async (
    limit = 20
  ): Promise<
    Array<{
      userId: string;
      badge: 'high' | 'medium' | 'low';
      photoUrl: string | null;
      avatarUrl?: string | null;
      name?: string | null;
      age?: number | null;
      zodiacSign?: string | null;
      bio?: string | null;
      interests?: string[] | null;
      city?: string | null;
    }>
  > => {
    const safeLimit = Math.max(1, Math.min(50, limit));
    const response = await api.get(`/dating/candidates?limit=${safeLimit}`);
    const raw = response?.data;
    // Унификация формы ответа: поддерживаем и массив, и {items}
    const list: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.items)
        ? raw.items
        : [];
    // Нормализуем разные возможные ключи полей, чтобы UI получал ожидаемые данные
    return list
      .map((it: any) => {
        const photo =
          it?.photoUrl ?? it?.primaryPhotoUrl ?? it?.avatarUrl ?? null;
        return {
          userId: it?.userId ?? it?.user_id ?? it?.id ?? '',
          badge: (it?.badge ?? 'low') as 'high' | 'medium' | 'low',
          photoUrl: photo,
          avatarUrl: it?.avatarUrl ?? null,
          name: it?.name ?? null,
          age: typeof it?.age === 'number' ? it.age : (it?.age ?? null),
          zodiacSign: it?.zodiacSign ?? it?.sign ?? null,
          bio: it?.bio ?? null,
          interests: Array.isArray(it?.interests) ? it.interests : null,
          city: it?.city ?? null,
        };
      })
      .filter((c) => typeof c.userId === 'string' && c.userId.length > 0);
  },

  // Public profile for Dating card (backend aggregates users + user_profiles + charts + photos)
  getProfile: async (
    userId: string
  ): Promise<{
    userId: string;
    name: string | null;
    age: number | null;
    zodiacSign: string | null;
    bio: string | null;
    interests: string[] | null;
    city: string | null;
    primaryPhotoUrl: string | null;
    photos?: string[] | null;
  }> => {
    const response = await api.get(
      `/dating/profile/${encodeURIComponent(userId)}`
    );
    const d = response?.data || {};
    return {
      userId: d?.userId ?? userId,
      name: d?.name ?? null,
      age: typeof d?.age === 'number' ? d.age : (d?.age ?? null),
      zodiacSign: d?.zodiacSign ?? d?.sign ?? null,
      bio: d?.bio ?? null,
      interests: Array.isArray(d?.interests) ? d.interests : null,
      city: d?.city ?? null,
      primaryPhotoUrl: d?.primaryPhotoUrl ?? null,
      photos: Array.isArray(d?.photos) ? d.photos : null,
    };
  },

  like: async (
    targetUserId: string,
    action: 'like' | 'super_like' | 'pass' = 'like'
  ): Promise<{ success: boolean; matchId: string | null; message: string }> => {
    const response = await api.post('/dating/like', { targetUserId, action });
    return response.data;
  },

  // Legacy matches
  getMatches: async (): Promise<any[]> => {
    const response = await api.get('/dating/matches');
    return response.data;
  },

  likeMatch: async (matchId: string): Promise<any> => {
    const response = await api.post(`/dating/match/${matchId}/like`);
    return response.data;
  },

  rejectMatch: async (matchId: string): Promise<any> => {
    const response = await api.post(`/dating/match/${matchId}/reject`);
    return response.data;
  },
};
