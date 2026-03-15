export interface Player {
  id: string;
  username: string;
  email: string;
  
  // Currencies
  softCurrency: number;
  hardCurrency: number;
  
  // Card collection
  cards: string[];
  galleryCardIds: string[];
  
  // Progression
  level: number;
  experience: number;
  battlePassLevel: number;
  battlePassXP: number;
  hasPaidBattlePass: boolean;
  
  // Psychological mechanics
  luckValue: number;
  drawsSinceLastLegendary: number;
  consecutiveSynthesisFailures: number;
  
  // Engagement tracking
  consecutiveLoginDays: number;
  lastLoginDate: string;
  totalPlayTime: number;
  
  // Personalization data
  preferredThemes: string[];
  collectionFocus: string[];
  
  // Social
  friends: string[];
  
  // Limits and cooldowns
  legendaryPacksThisWeek: number;
  weekResetDate: string;
  
  // Monthly Card
  monthlyCardExpiresAt?: string;
  monthlyCardLastClaimed?: string;

  // Cosmetics
  ownedCosmetics?: string[];

  // Timestamps
  createdAt: string;
  lastActiveAt: string;
}
