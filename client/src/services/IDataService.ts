import type {
  ICardInstance,
  IGallery,
  IAchievementProgress,
  IMarketListing,
} from '../db';

export interface IDataService {
  // Cards
  getCards(): Promise<ICardInstance[]>;
  saveCard(card: ICardInstance): Promise<number>;
  deleteCard(id: number): Promise<void>;
  bulkSaveCards(cards: ICardInstance[]): Promise<void>;

  // Gallery
  getGallery(): Promise<IGallery | undefined>;
  saveGallery(gallery: IGallery): Promise<void>;

  // Achievements
  getAchievements(): Promise<IAchievementProgress[]>;
  saveAchievement(achievement: IAchievementProgress): Promise<void>;

  // Settings
  getSetting(key: string): Promise<string | undefined>;
  saveSetting(key: string, value: string): Promise<void>;

  // Market
  getMarketListings(): Promise<IMarketListing[]>;
  saveMarketListings(listings: IMarketListing[]): Promise<void>;

  // Save management
  exportSave(): Promise<string>;
  importSave(json: string): Promise<void>;
  resetGame(): Promise<void>;
}
