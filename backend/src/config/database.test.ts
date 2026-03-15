import { collections } from './database';

describe('Database Configuration', () => {
  describe('collections', () => {
    it('should provide collection references', () => {
      expect(collections.players).toBeDefined();
      expect(collections.cards).toBeDefined();
      expect(collections.cardTemplates).toBeDefined();
      expect(collections.packConfigurations).toBeDefined();
      expect(collections.galleries).toBeDefined();
      expect(collections.galleryInteractions).toBeDefined();
      expect(collections.marketListings).toBeDefined();
      expect(collections.marketTransactions).toBeDefined();
      expect(collections.achievements).toBeDefined();
      expect(collections.seasons).toBeDefined();
      expect(collections.activeEvents).toBeDefined();
      expect(collections.missions).toBeDefined();
    });

    it('should have correct collection names', () => {
      const collectionNames = Object.keys(collections);
      expect(collectionNames).toContain('players');
      expect(collectionNames).toContain('cards');
      expect(collectionNames).toContain('achievements');
      expect(collectionNames).toContain('seasons');
    });
  });
});
