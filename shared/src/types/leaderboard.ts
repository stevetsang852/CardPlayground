export type LeaderboardType = 'total_score' | 'rarity_score' | 'creativity';

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  score: number;
  rank: number;
  
  // Gallery info
  galleryCardCount: number;
  totalLikes?: number;
  totalComments?: number;
}

export interface LeaderboardQuery {
  type: LeaderboardType;
  limit: number;
  offset: number;
}

export interface LeaderboardResult {
  type: LeaderboardType;
  entries: LeaderboardEntry[];
  totalCount: number;
  hasMore: boolean;
}
