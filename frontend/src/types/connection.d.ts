export interface Connection {
  id: string;
  user1Id: string;
  user2Id: string;
  connectionType: 'FRIEND' | 'FAMILY' | 'ROMANTIC' | 'BUSINESS';
  compatibility: Record<string, any>;
  aspects: Record<string, any>;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  createdAt?: string;
  updatedAt?: string;
}
