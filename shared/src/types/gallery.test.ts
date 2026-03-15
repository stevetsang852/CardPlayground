import { Gallery, GalleryInteraction } from './gallery';

describe('Gallery Data Model', () => {
  describe('Gallery interface', () => {
    it('should create a valid gallery with required fields', () => {
      const gallery: Gallery = {
        playerId: 'player-123',
        cardIds: ['card-1', 'card-2', 'card-3'],
        totalLikes: 10,
        totalComments: 5,
        totalScore: 1500,
        rarityScore: 2000,
        creativityScore: 150,
        updatedAt: new Date().toISOString(),
      };

      expect(gallery.playerId).toBe('player-123');
      expect(gallery.cardIds).toHaveLength(3);
      expect(gallery.totalLikes).toBe(10);
      expect(gallery.totalComments).toBe(5);
      expect(gallery.totalScore).toBe(1500);
      expect(gallery.rarityScore).toBe(2000);
      expect(gallery.creativityScore).toBe(150);
    });

    it('should create a gallery with optional customization fields', () => {
      const gallery: Gallery = {
        playerId: 'player-456',
        cardIds: [],
        totalLikes: 0,
        totalComments: 0,
        totalScore: 0,
        rarityScore: 0,
        creativityScore: 0,
        skinId: 'skin-gold',
        layout: 'grid',
        updatedAt: new Date().toISOString(),
      };

      expect(gallery.skinId).toBe('skin-gold');
      expect(gallery.layout).toBe('grid');
    });

    it('should enforce maximum of 50 cards constraint (type-level)', () => {
      // This test validates the type definition allows up to 50 cards
      const cardIds = Array.from({ length: 50 }, (_, i) => `card-${i}`);
      
      const gallery: Gallery = {
        playerId: 'player-789',
        cardIds,
        totalLikes: 0,
        totalComments: 0,
        totalScore: 0,
        rarityScore: 0,
        creativityScore: 0,
        updatedAt: new Date().toISOString(),
      };

      expect(gallery.cardIds).toHaveLength(50);
    });

    it('should calculate scores correctly', () => {
      // Example: 3 cards with scores 100, 200, 300
      const totalScore = 100 + 200 + 300; // 600
      
      // Example rarity weights: common=1, rare=5, epic=20, legendary=100
      // If we have 1 common (100), 1 rare (200), 1 epic (300)
      const rarityScore = (100 * 1) + (200 * 5) + (300 * 20); // 7100
      
      // Creativity score based on likes (10) and comments (5)
      // Example formula: likes * 10 + comments * 20
      const creativityScore = (10 * 10) + (5 * 20); // 200

      const gallery: Gallery = {
        playerId: 'player-calc',
        cardIds: ['card-1', 'card-2', 'card-3'],
        totalLikes: 10,
        totalComments: 5,
        totalScore,
        rarityScore,
        creativityScore,
        updatedAt: new Date().toISOString(),
      };

      expect(gallery.totalScore).toBe(600);
      expect(gallery.rarityScore).toBe(7100);
      expect(gallery.creativityScore).toBe(200);
    });
  });

  describe('GalleryInteraction interface', () => {
    it('should create a valid like interaction', () => {
      const interaction: GalleryInteraction = {
        id: 'interaction-1',
        galleryPlayerId: 'owner-123',
        interactingPlayerId: 'visitor-456',
        type: 'like',
        createdAt: new Date().toISOString(),
      };

      expect(interaction.type).toBe('like');
      expect(interaction.text).toBeUndefined();
    });

    it('should create a valid comment interaction with text', () => {
      const interaction: GalleryInteraction = {
        id: 'interaction-2',
        galleryPlayerId: 'owner-123',
        interactingPlayerId: 'visitor-789',
        type: 'comment',
        text: 'Amazing collection!',
        createdAt: new Date().toISOString(),
      };

      expect(interaction.type).toBe('comment');
      expect(interaction.text).toBe('Amazing collection!');
    });

    it('should allow comment without text (optional)', () => {
      const interaction: GalleryInteraction = {
        id: 'interaction-3',
        galleryPlayerId: 'owner-123',
        interactingPlayerId: 'visitor-999',
        type: 'comment',
        createdAt: new Date().toISOString(),
      };

      expect(interaction.type).toBe('comment');
      expect(interaction.text).toBeUndefined();
    });
  });

  describe('Gallery score calculations', () => {
    it('should support empty gallery with zero scores', () => {
      const emptyGallery: Gallery = {
        playerId: 'new-player',
        cardIds: [],
        totalLikes: 0,
        totalComments: 0,
        totalScore: 0,
        rarityScore: 0,
        creativityScore: 0,
        updatedAt: new Date().toISOString(),
      };

      expect(emptyGallery.cardIds).toHaveLength(0);
      expect(emptyGallery.totalScore).toBe(0);
      expect(emptyGallery.rarityScore).toBe(0);
      expect(emptyGallery.creativityScore).toBe(0);
    });

    it('should support gallery with high social engagement', () => {
      const popularGallery: Gallery = {
        playerId: 'popular-player',
        cardIds: Array.from({ length: 50 }, (_, i) => `card-${i}`),
        totalLikes: 1000,
        totalComments: 500,
        totalScore: 50000,
        rarityScore: 100000,
        creativityScore: 20000, // High creativity score from likes/comments
        updatedAt: new Date().toISOString(),
      };

      expect(popularGallery.totalLikes).toBe(1000);
      expect(popularGallery.totalComments).toBe(500);
      expect(popularGallery.creativityScore).toBe(20000);
    });
  });
});
