import { CardGameDB } from './CardGameDB';

// Singleton instance
export const db = new CardGameDB();

export type {
  ICardInstance,
  IGallery,
  IGallerySlot,
  IAchievementProgress,
  ISetting,
  IMarketListing,
  IOperationLog,
} from './CardGameDB';
