import { Card, CardRarity } from '../types/card';
import { PackConfiguration } from '../types/pack';
import { SeededRandom } from '../random/SeededRandom';
import { LuckValueCalculator } from '../luck/LuckValueCalculator';

/**
 * CardDrawGenerator implements the card draw generation algorithm
 * that uses probability distributions, applies luck value bonuses,
 * implements pity system for guaranteed drops, and uses SeededRandom
 * for deterministic results.
 * 
 * Validates Requirements 1.1, 1.2, 1.3, 1.4, 1.7
 */
export class CardDrawGenerator {
  private luckCalculator: LuckValueCalculator;

  constructor() {
    this.luckCalculator = new LuckValueCalculator();
  }

  /**
   * Generate a card draw using the pack configuration, player luck, server seed,
   * and pity system tracking.
   * 
   * @param packConfig - The pack configuration with probability distribution
   * @param playerLuck - The player's current luck value
   * @param serverSeed - The server-generated seed for deterministic randomness
   * @param cardPool - The pool of available cards organized by rarity
   * @param drawsSinceEpic - Number of draws since last epic (for pity system)
   * @param drawsSinceLegendary - Number of draws since last legendary (for pity system)
   * @returns The drawn card
   * 
   * Validates Requirements 1.1, 1.2, 1.3, 1.4, 1.7
   */
  generateCardDraw(
    packConfig: PackConfiguration,
    playerLuck: number,
    serverSeed: number,
    cardPool: Map<CardRarity, Card[]>,
    drawsSinceEpic: number = 0,
    drawsSinceLegendary: number = 0
  ): Card {
    // Check pity system for guaranteed drops
    const guaranteedRarity = this.checkPitySystem(
      packConfig,
      drawsSinceEpic,
      drawsSinceLegendary
    );

    if (guaranteedRarity) {
      // Force guaranteed drop
      const rng = new SeededRandom(serverSeed);
      return this.selectRandomCardOfRarity(guaranteedRarity, rng, cardPool);
    }

    // Normal draw with probability distribution
    const rng = new SeededRandom(serverSeed);
    const roll = rng.next();

    // Apply luck bonus to legendary probability
    const luckBonus = this.luckCalculator.calculateBonusProbability(playerLuck);

    const adjustedProbs = {
      legendary: packConfig.probabilities.legendary + luckBonus,
      epic: packConfig.probabilities.epic,
      rare: packConfig.probabilities.rare,
      common: packConfig.probabilities.common
    };

    // Normalize probabilities to ensure they sum to 1.0
    const total = Object.values(adjustedProbs).reduce((sum, p) => sum + p, 0);

    const normalizedProbs: Record<CardRarity, number> = {
      legendary: adjustedProbs.legendary / total,
      epic: adjustedProbs.epic / total,
      rare: adjustedProbs.rare / total,
      common: adjustedProbs.common / total
    };

    // Determine rarity using cumulative probability
    let cumulative = 0;
    let selectedRarity: CardRarity = 'common';

    for (const [rarity, prob] of Object.entries(normalizedProbs) as [CardRarity, number][]) {
      cumulative += prob;
      if (roll <= cumulative) {
        selectedRarity = rarity;
        break;
      }
    }

    // Select random card of that rarity
    return this.selectRandomCardOfRarity(selectedRarity, rng, cardPool);
  }

  /**
   * Check if pity system should trigger a guaranteed drop.
   * 
   * @param packConfig - The pack configuration with pity thresholds
   * @param drawsSinceEpic - Number of draws since last epic
   * @param drawsSinceLegendary - Number of draws since last legendary
   * @returns The guaranteed rarity if pity triggers, null otherwise
   * 
   * Validates Requirements 1.3
   */
  private checkPitySystem(
    packConfig: PackConfiguration,
    drawsSinceEpic: number,
    drawsSinceLegendary: number
  ): CardRarity | null {
    // Check legendary pity first (higher priority)
    if (
      packConfig.guaranteedLegendaryAfter !== undefined &&
      drawsSinceLegendary >= packConfig.guaranteedLegendaryAfter
    ) {
      return 'legendary';
    }

    // Check epic pity (only if no legendary pity triggered)
    if (
      packConfig.guaranteedEpicAfter !== undefined &&
      drawsSinceEpic >= packConfig.guaranteedEpicAfter
    ) {
      return 'epic';
    }

    return null;
  }

  /**
   * Select a random card from the pool of cards with the specified rarity.
   * 
   * @param rarity - The rarity of card to select
   * @param rng - The seeded random number generator
   * @param cardPool - The pool of available cards organized by rarity
   * @returns A random card of the specified rarity
   */
  private selectRandomCardOfRarity(
    rarity: CardRarity,
    rng: SeededRandom,
    cardPool: Map<CardRarity, Card[]>
  ): Card {
    const cardsOfRarity = cardPool.get(rarity);

    if (!cardsOfRarity || cardsOfRarity.length === 0) {
      throw new Error(`No cards available for rarity: ${rarity}`);
    }

    const index = Math.floor(rng.next() * cardsOfRarity.length);
    const template = cardsOfRarity[index];

    // Create a new card instance from the template
    return {
      ...template,
      id: this.generateCardId(),
      obtainedAt: new Date().toISOString(),
      obtainedFrom: 'draw'
    };
  }

  /**
   * Generate a unique card ID
   * In a real implementation, this would use a proper UUID generator
   */
  private generateCardId(): string {
    return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
