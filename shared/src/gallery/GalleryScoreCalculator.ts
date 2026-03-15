import { Card, CardRarity } from '../types/card';

/**
 * Rarity weights for calculating gallery rarity scores
 */
const RARITY_WEIGHTS: Record<CardRarity, number> = {
  common: 1,
  rare: 5,
  epic: 20,
  legendary: 100,
};

/**
 * Weight multipliers for creativity score calculation
 */
const CREATIVITY_WEIGHTS = {
  LIKE_WEIGHT: 10,
  COMMENT_WEIGHT: 20,
};

export class GalleryScoreCalculator {
  /**
   * Calculate the total score as the sum of all card scores
   * 
   * @param cards - Array of cards in the gallery
   * @returns Total score (sum of card scores)
   */
  calculateTotalScore(cards: Card[]): number {
    return cards.reduce((sum, card) => sum + card.score, 0);
  }

  /**
   * Calculate the rarity score with rarity weights
   * Weights: common=1, rare=5, epic=20, legendary=100
   * 
   * @param cards - Array of cards in the gallery
   * @returns Rarity-weighted score
   */
  calculateRarityScore(cards: Card[]): number {
    return cards.reduce((sum, card) => {
      const weight = RARITY_WEIGHTS[card.rarity];
      return sum + (card.score * weight);
    }, 0);
  }

  /**
   * Calculate the creativity score from likes and comments
   * Formula: likes * 10 + comments * 20
   * 
   * @param likes - Total number of likes
   * @param comments - Total number of comments
   * @returns Creativity score
   */
  calculateCreativityScore(likes: number, comments: number): number {
    return (likes * CREATIVITY_WEIGHTS.LIKE_WEIGHT) + 
           (comments * CREATIVITY_WEIGHTS.COMMENT_WEIGHT);
  }

  /**
   * Calculate all three scores for a gallery
   * 
   * @param cards - Array of cards in the gallery
   * @param likes - Total number of likes
   * @param comments - Total number of comments
   * @returns Object containing all three scores
   */
  calculateAllScores(
    cards: Card[],
    likes: number,
    comments: number
  ): {
    totalScore: number;
    rarityScore: number;
    creativityScore: number;
  } {
    return {
      totalScore: this.calculateTotalScore(cards),
      rarityScore: this.calculateRarityScore(cards),
      creativityScore: this.calculateCreativityScore(likes, comments),
    };
  }
}
