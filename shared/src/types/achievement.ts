export type AchievementCategory = 'collection' | 'rarity' | 'social' | 'random' | 'secret';

export type AchievementRequirementType =
  | 'complete_series'
  | 'legendary_count'
  | 'gallery_likes'
  | 'merchant_streak'
  | string;

export interface AchievementRequirement {
  type: AchievementRequirementType;
  target: number;
  params?: Record<string, any>;
}

export interface AchievementRewards {
  softCurrency?: number;
  hardCurrency?: number;
  exclusiveCard?: string;
  title?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;

  /** Unlock conditions */
  requirement: AchievementRequirement;

  /** Rewards granted on unlock */
  rewards: AchievementRewards;

  /** Display */
  iconUrl: string;
  isSecret: boolean;

  // Player-specific state (populated when queried for a specific player)
  unlocked?: boolean;
  progress?: number;
  unlockedAt?: string;
}

/** Stored in /player_achievements/{playerId}/achievements/{achievementId} */
export interface PlayerAchievementProgress {
  achievementId: string;
  playerId: string;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
}
