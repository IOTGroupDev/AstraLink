export interface DatingProfile {
  id: string;
  userId: string;
  isActive: boolean;
  preferences: Record<string, any>;
  filters: Record<string, any>;
  bio?: string;
  photos: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DatingMatch {
  id: string;
  user1Id: string;
  user2Id: string;
  compatibility: Record<string, any>;
  status: 'PENDING' | 'LIKED' | 'PASSED' | 'MATCHED' | 'UNMATCHED';
  astroAnalysis: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export type CandidateBadge = 'high' | 'medium' | 'low';

export interface DatingCandidate {
  userId: string;
  badge: CandidateBadge;
  compatibility: number | null;
  compatibilitySummary: string | null;
  photoUrl: string | null;
  photos: string[] | null;
  name: string | null;
  age: number | null;
  zodiacSign: string | null;
  bio: string | null;
  interests: string[] | null;
  city: string | null;
  lookingFor: string | null;
  lastActive: string | null;
}

export interface MutualDatingMatch {
  id: string;
  userId: string;
  name: string | null;
  age: number | null;
  zodiacSign: string | null;
  bio: string | null;
  interests: string[] | null;
  city: string | null;
  lookingFor: string | null;
  lastActive: string | null;
  primaryPhotoUrl: string | null;
  photos: string[] | null;
  compatibility: number | null;
  compatibilitySummary: string | null;
  createdAt: string;
  isNew: boolean;
  isNearby: boolean;
  isOnline: boolean;
}
