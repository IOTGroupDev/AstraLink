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
