import fc from 'fast-check';
import { Card, CardRarity } from './card';

describe('Card Types', () => {
  describe('CardRarity', () => {
    it('should have valid rarity values', () => {
      const validRarities: CardRarity[] = ['common', 'rare', 'epic', 'legendary'];
      expect(validRarities).toHaveLength(4);
    });
  });

  describe('Card interface', () => {
    it('should create a valid card object', () => {
      const card: Card = {
        id: 'card-123',
        templateId: 'template-1',
        name: 'Test Card',
        description: 'A test card',
        rarity: 'rare',
        theme: 'fantasy',
        imageUrl: 'https://example.com/card.png',
        score: 100,
        isLimitedEdition: false,
        obtainedAt: new Date().toISOString(),
        obtainedFrom: 'draw'
      };

      expect(card.id).toBe('card-123');
      expect(card.rarity).toBe('rare');
      expect(card.isLimitedEdition).toBe(false);
    });

    it('should support limited edition cards', () => {
      const limitedCard: Card = {
        id: 'card-456',
        templateId: 'template-2',
        name: 'Limited Card',
        description: 'A limited edition card',
        rarity: 'legendary',
        theme: 'fantasy',
        imageUrl: 'https://example.com/limited.png',
        score: 500,
        isLimitedEdition: true,
        editionNumber: 42,
        originalOwner: 'player-1',
        ownershipHistory: [{
          playerId: 'player-1',
          playerName: 'Alice',
          acquiredAt: new Date().toISOString(),
          acquiredFrom: 'draw'
        }],
        obtainedAt: new Date().toISOString(),
        obtainedFrom: 'draw'
      };

      expect(limitedCard.isLimitedEdition).toBe(true);
      expect(limitedCard.editionNumber).toBe(42);
      expect(limitedCard.originalOwner).toBe('player-1');
    });
  });

  describe('Property-based tests', () => {
    it('should handle any valid card rarity', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<CardRarity>('common', 'rare', 'epic', 'legendary'),
          (rarity) => {
            const card: Card = {
              id: 'test-id',
              templateId: 'test-template',
              name: 'Test',
              description: 'Test card',
              rarity,
              theme: 'test',
              imageUrl: 'test.png',
              score: 100,
              isLimitedEdition: false,
              obtainedAt: new Date().toISOString(),
              obtainedFrom: 'draw'
            };

            return ['common', 'rare', 'epic', 'legendary'].includes(card.rarity);
          }
        )
      );
    });

    it('should preserve card properties', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
            name: fc.string({ minLength: 1 }),
            score: fc.integer({ min: 0, max: 10000 }),
            rarity: fc.constantFrom<CardRarity>('common', 'rare', 'epic', 'legendary')
          }),
          (props) => {
            const card: Card = {
              ...props,
              templateId: 'template',
              description: 'desc',
              theme: 'theme',
              imageUrl: 'url',
              isLimitedEdition: false,
              obtainedAt: new Date().toISOString(),
              obtainedFrom: 'draw'
            };

            return card.id === props.id &&
                   card.name === props.name &&
                   card.score === props.score &&
                   card.rarity === props.rarity;
          }
        )
      );
    });
  });
});
