import Dexie, { type Table } from 'dexie';
import type { Rarity } from '../cardData';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ICardInstance {
  id?: number;
  cardId: number;
  rarity: Rarity;
  level: number;
  obtainedAt: number; // timestamp
}

export interface IGallerySlot {
  slotIndex: number; // 0-based grid position
  cardInstanceId: number;
}

export interface IGallery {
  userId: string; // always 'local' for offline
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
  expiresAt: number; // timestamp
  purchased: boolean;
}

export interface IOperationLog {
  id?: number;
  type: string; // 'draw' | 'synthesize' | 'purchase' | 'login'
  timestamp: number;
  data: string; // JSON string
}

// ── Database ──────────────────────────────────────────────────────────────────

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
