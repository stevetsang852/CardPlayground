export type RewardType = 'soft_currency' | 'hard_currency' | 'card' | 'pack' | 'material' | 'cosmetic';

export interface Reward {
  type: RewardType;
  itemId?: string;
  quantity: number;
}

export interface BattlePassTier {
  level: number;
  xpRequired: number;
  freeRewards: Reward[];
  paidRewards: Reward[];
}

export interface ScheduledEvent {
  name: string;
  type: 'double_probability' | 'synthesis_festival' | 'special_merchant';
  startDate: string;
  endDate: string;
  modifiers: Record<string, any>;
}

export interface Season {
  id: string;
  name: string;
  theme: string;
  startDate: string;
  endDate: string;
  exclusiveCardTemplates: string[];
  exclusivePacks: string[];
  battlePassTiers: BattlePassTier[];
  scheduledEvents: ScheduledEvent[];
}

export interface Mission {
  id: string;
  type: 'daily' | 'weekly';
  name: string;
  description: string;
  objective: {
    type: string;
    target: number;
    params?: Record<string, any>;
  };
  rewards: Reward[];
  battlePassXP: number;
  progress?: number;
  completed?: boolean;
  claimed?: boolean;
  availableFrom: string;
  expiresAt: string;
}

export interface BattlePassProgress {
  playerId: string;
  seasonId: string;
  level: number;
  currentXP: number;
  hasPaidPass: boolean;
  unlockedTiers: number[];
}

export interface LoginStreakData {
  playerId: string;
  consecutiveDays: number;
  lastLoginDate: string;
  todaysClaimed: boolean;
}
