export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface OwnershipRecord {
  playerId: string;
  playerName: string;
  acquiredAt: string;
  acquiredFrom: 'draw' | 'trade' | 'synthesis';
}

export interface Card {
  id: string;
  templateId: string;
  name: string;
  description: string;
  rarity: CardRarity;
  theme: string;
  imageUrl: string;
  animationUrl?: string;
  score: number;
  
  // Limited edition metadata
  isLimitedEdition: boolean;
  editionNumber?: number;
  originalOwner?: string;
  ownershipHistory?: OwnershipRecord[];
  
  // Timestamps
  obtainedAt: string;
  obtainedFrom: 'draw' | 'synthesis' | 'trade' | 'event' | 'achievement';
}
