import { refreshDailyShop, purchaseItem } from './SystemShop';
import type { PlayerState } from '../store/gameStore';
import type { ICardInstance, IMarketListing } from '../db';

if (typeof globalThis.crypto === 'undefined') {
  const nodeCrypto = eval('require')('crypto') as { webcrypto: Crypto };
  Object.defineProperty(globalThis, 'crypto', { value: nodeCrypto.webcrypto });
}

const defaultPlayer: PlayerState = {
  softCurrency: 10000,
  hardCurrency: 0,
  luckValue: 0,
  drawsSinceLastLegendary: 0,
  drawsSinceLastMythic: 0,
  consecutiveSynthesisFailures: 0,
  totalDraws: 0,
  loginDays: 0,
  lastLoginDate: '',
  actionCount: 0,
};

describe('SystemShop', () => {
  describe('refreshDailyShop', () => {
    it('generates between 5 and 8 listings', () => {
      const listings = refreshDailyShop(defaultPlayer, [], '2026-03-15');
      expect(listings.length).toBeGreaterThanOrEqual(5);
      expect(listings.length).toBeLessThanOrEqual(8);
    });

    it('all listings have valid rarities', () => {
      const listings = refreshDailyShop(defaultPlayer, [], '2026-03-15');
      const validRarities = ['common', 'rare', 'epic', 'legendary', 'mythic'];
      for (const listing of listings) {
        expect(validRarities).toContain(listing.rarity);
      }
    });

    it('all listings have positive prices', () => {
      const listings = refreshDailyShop(defaultPlayer, [], '2026-03-15');
      for (const listing of listings) {
        expect(listing.price).toBeGreaterThan(0);
      }
    });

    it('all listings are not purchased initially', () => {
      const listings = refreshDailyShop(defaultPlayer, [], '2026-03-15');
      for (const listing of listings) {
        expect(listing.purchased).toBe(false);
      }
    });
  });

  describe('purchaseItem', () => {
    function makeListings(): IMarketListing[] {
      return [
        { id: 1, cardId: 1, rarity: 'common', price: 50, expiresAt: Date.now() + 86400000, purchased: false },
        { id: 2, cardId: 121, rarity: 'rare', price: 200, expiresAt: Date.now() + 86400000, purchased: false },
      ];
    }

    it('succeeds when player has enough currency', () => {
      const result = purchaseItem(1, makeListings(), defaultPlayer);
      expect(result.success).toBe(true);
      expect(result.card).not.toBeNull();
    });

    it('deducts correct currency on purchase', () => {
      const result = purchaseItem(1, makeListings(), defaultPlayer);
      expect(result.updatedPlayer.softCurrency).toBe(defaultPlayer.softCurrency - 50);
    });

    it('fails when player has insufficient currency', () => {
      const poorPlayer = { ...defaultPlayer, softCurrency: 10 };
      const result = purchaseItem(2, makeListings(), poorPlayer);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient');
    });

    it('fails when item not found', () => {
      const result = purchaseItem(999, makeListings(), defaultPlayer);
      expect(result.success).toBe(false);
    });

    it('fails when item already purchased', () => {
      const listings: IMarketListing[] = [
        { id: 1, cardId: 1, rarity: 'common', price: 50, expiresAt: Date.now() + 86400000, purchased: true },
      ];
      const result = purchaseItem(1, listings, defaultPlayer);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Already purchased');
    });

    it('returns card with correct rarity', () => {
      const result = purchaseItem(1, makeListings(), defaultPlayer);
      expect(result.card!.rarity).toBe('common');
    });
  });
});
