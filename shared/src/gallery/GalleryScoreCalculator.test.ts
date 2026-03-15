import { GalleryScoreCalculator } from './GalleryScoreCalculator';
import { Card, CardRarity } from '../types/card';

describe('GalleryScoreCalculator', () => {
  let calculator: GalleryScoreCalculator;

  beforeEach(() => {
    calculator = new GalleryScoreCalculator();
  });

  const createCard = (id: string, score: number, rarity: CardRarity): Card => ({
    id,
    templateId: `template-${id}`,
    name: `Card ${id}`,
    description: 'Test card',
    rarity,
    theme: 'test',
    imageUrl: 'https://example.com/card.png',
    score,
    isLimitedEdition: false,
    obtainedAt: new Date().toISOString(),
    obtainedFrom: 'draw',
  });

  describe('calculateTotalScore', () => {
    it('should return 0 for empty card array', () => {
      const totalScore = calculator.calculateTotalScore([]);
      expect(totalScore).toBe(0);
    });

    it('should sum all card scores', () => {
      const cards = [
        createCard('1', 100, 'common'),
        createCard('2', 200, 'rare'),
        createCard('3', 300, 'epic'),
      ];

      const totalScore = calculator.calculateTotalScore(cards);
      expect(totalScore).toBe(600);
    });

    it('should handle single card', () => {
      const cards = [createCard('1', 500, 'legendary')];
      const totalScore = calculator.calculateTotalScore(cards);
      expect(totalScore).toBe(500);
    });
  });

  describe('calculateRarityScore', () => {
    it('should return 0 for empty card array', () => {
      const rarityScore = calculator.calculateRarityScore([]);
      expect(rarityScore).toBe(0);
    });

    it('should apply correct rarity weights', () => {
      // Rarity weights: common=1, rare=5, epic=20, legendary=100
      const cards = [
        createCard('1', 100, 'common'),    // 100 * 1 = 100
        createCard('2', 200, 'rare'),      // 200 * 5 = 1000
        createCard('3', 300, 'epic'),      // 300 * 20 = 6000
      ];

      const rarityScore = calculator.calculateRarityScore(cards);
      expect(rarityScore).toBe(7100);
    });

    it('should handle legendary cards with weight 100', () => {
      const cards = [createCard('1', 50, 'legendary')];
      const rarityScore = calculator.calculateRarityScore(cards);
      expect(rarityScore).toBe(5000); // 50 * 100
    });

    it('should handle multiple cards of same rarity', () => {
      const cards = [
        createCard('1', 100, 'common'),
        createCard('2', 150, 'common'),
        createCard('3', 200, 'common'),
      ];

      const rarityScore = calculator.calculateRarityScore(cards);
      expect(rarityScore).toBe(450); // (100 + 150 + 200) * 1
    });
  });

  describe('calculateCreativityScore', () => {
    it('should return 0 for no likes or comments', () => {
      const creativityScore = calculator.calculateCreativityScore(0, 0);
      expect(creativityScore).toBe(0);
    });

    it('should calculate score with likes only', () => {
      // likes * 10
      const creativityScore = calculator.calculateCreativityScore(10, 0);
      expect(creativityScore).toBe(100);
    });

    it('should calculate score with comments only', () => {
      // comments * 20
      const creativityScore = calculator.calculateCreativityScore(0, 5);
      expect(creativityScore).toBe(100);
    });

    it('should calculate score with both likes and comments', () => {
      // likes * 10 + comments * 20
      const creativityScore = calculator.calculateCreativityScore(10, 5);
      expect(creativityScore).toBe(200); // 10*10 + 5*20
    });

    it('should handle large numbers', () => {
      const creativityScore = calculator.calculateCreativityScore(1000, 500);
      expect(creativityScore).toBe(20000); // 1000*10 + 500*20
    });
  });

  describe('calculateAllScores', () => {
    it('should calculate all three scores correctly', () => {
      const cards = [
        createCard('1', 100, 'common'),
        createCard('2', 200, 'rare'),
        createCard('3', 300, 'epic'),
      ];

      const scores = calculator.calculateAllScores(cards, 10, 5);

      expect(scores.totalScore).toBe(600);
      expect(scores.rarityScore).toBe(7100);
      expect(scores.creativityScore).toBe(200);
    });

    it('should handle empty gallery', () => {
      const scores = calculator.calculateAllScores([], 0, 0);

      expect(scores.totalScore).toBe(0);
      expect(scores.rarityScore).toBe(0);
      expect(scores.creativityScore).toBe(0);
    });

    it('should handle gallery with no social engagement', () => {
      const cards = [createCard('1', 500, 'legendary')];
      const scores = calculator.calculateAllScores(cards, 0, 0);

      expect(scores.totalScore).toBe(500);
      expect(scores.rarityScore).toBe(50000);
      expect(scores.creativityScore).toBe(0);
    });
  });
});
