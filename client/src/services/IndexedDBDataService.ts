import { db } from '../db';
import type {
  ICardInstance,
  IGallery,
  IAchievementProgress,
  IMarketListing,
} from '../db';
import type { IDataService } from './IDataService';

export class IndexedDBDataService implements IDataService {
  async getCards(): Promise<ICardInstance[]> {
    return db.cards.toArray();
  }

  async saveCard(card: ICardInstance): Promise<number> {
    return db.cards.put(card);
  }

  async deleteCard(id: number): Promise<void> {
    await db.cards.delete(id);
  }

  async bulkSaveCards(cards: ICardInstance[]): Promise<void> {
    await db.cards.bulkPut(cards);
  }

  async getGallery(): Promise<IGallery | undefined> {
    return db.gallery.get('local');
  }

  async saveGallery(gallery: IGallery): Promise<void> {
    await db.gallery.put({ ...gallery, userId: 'local' });
  }

  async getAchievements(): Promise<IAchievementProgress[]> {
    return db.achievements.toArray();
  }

  async saveAchievement(achievement: IAchievementProgress): Promise<void> {
    await db.achievements.put(achievement);
  }

  async getSetting(key: string): Promise<string | undefined> {
    const setting = await db.settings.get(key);
    return setting?.value;
  }

  async saveSetting(key: string, value: string): Promise<void> {
    await db.settings.put({ key, value });
  }

  async getMarketListings(): Promise<IMarketListing[]> {
    return db.market.toArray();
  }

  async saveMarketListings(listings: IMarketListing[]): Promise<void> {
    await db.market.clear();
    await db.market.bulkPut(listings);
  }

  async exportSave(): Promise<string> {
    const [cards, gallery, achievements, settings, market] = await Promise.all([
      db.cards.toArray(),
      db.gallery.toArray(),
      db.achievements.toArray(),
      db.settings.toArray(),
      db.market.toArray(),
    ]);
    return JSON.stringify({ cards, gallery, achievements, settings, market, exportedAt: Date.now() }, null, 2);
  }

  async importSave(json: string): Promise<void> {
    const data = JSON.parse(json);
    await db.transaction('rw', [db.cards, db.gallery, db.achievements, db.settings, db.market, db.operationLog], async () => {
      await db.cards.clear();
      await db.gallery.clear();
      await db.achievements.clear();
      await db.settings.clear();
      await db.market.clear();
      await db.operationLog.clear();
      if (data.cards?.length) await db.cards.bulkPut(data.cards);
      if (data.gallery?.length) await db.gallery.bulkPut(data.gallery);
      if (data.achievements?.length) await db.achievements.bulkPut(data.achievements);
      if (data.settings?.length) await db.settings.bulkPut(data.settings);
      if (data.market?.length) await db.market.bulkPut(data.market);
    });
  }

  async resetGame(): Promise<void> {
    await db.transaction('rw', [db.cards, db.gallery, db.achievements, db.settings, db.market, db.operationLog], async () => {
      await db.cards.clear();
      await db.gallery.clear();
      await db.achievements.clear();
      await db.settings.clear();
      await db.market.clear();
      await db.operationLog.clear();
    });
  }
}
