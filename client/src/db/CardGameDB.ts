import Dexie, { type Table } from 'dexie';
import type { Rarity } from '../cardData';

export interface ICardInstance {
  id?: number;
  cardId: number;
  rarity: Rarity;
  level: number;
  obtainedAt: number;
  foil?: string;
}

export interface IGallerySlot {
  slotIndex: number;
  cardInstanceId: number;
}

export interface IGallery {
  userId: string;
  slots: IGallerySlot[];
  updatedAt: number;
}

export interface IAchievementProgress {
  id: string;
  unlocked: boolean;
  progress: number;
  unlockedAt?: number;
}

export interface ISetting {
  key: string;
  value: string;
}

export interface IMarketListing {
  id?: number;
  cardId: number;
  rarity: Rarity;
  price: number;
  expiresAt: number;
  purchased: boolean;
}

export interface IOperationLog {
  id?: number;
  type: string;
  timestamp: number;
  data: string;
}

export class CardGameDB extends Dexie {
  cards!: Table<ICardInstance, number>;
  gallery!: Table<IGallery, string>;
  achievements!: Table<IAchievementProgress, string>;
  settings!: Table<ISetting, string>;
  market!: Table<IMarketListing, number>;
  operationLog!: Table<IOperationLog, number>;

  constructor() {
    super('CardMysteryRealm');
    this.version(1).stores({
      cards: '++id, cardId, rarity, level, obtainedAt',
      gallery: 'userId',
      achievements: 'id, unlocked',
      settings: 'key',
      market: '++id, cardId, price, expiresAt, purchased',
      operationLog: '++id, type, timestamp',
    });
  }
}
