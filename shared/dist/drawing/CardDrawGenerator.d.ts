import { Card, CardRarity } from '../types/card';
import { PackConfiguration } from '../types/pack';
/**
 * CardDrawGenerator implements the card draw generation algorithm
 * that uses probability distributions, applies luck value bonuses,
 * implements pity system for guaranteed drops, and uses SeededRandom
 * for deterministic results.
 *
 * Validates Requirements 1.1, 1.2, 1.3, 1.4, 1.7
 */
export declare class CardDrawGenerator {
    private luckCalculator;
    constructor();
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
    generateCardDraw(packConfig: PackConfiguration, playerLuck: number, serverSeed: number, cardPool: Map<CardRarity, Card[]>, drawsSinceEpic?: number, drawsSinceLegendary?: number): Card;
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
    private checkPitySystem;
    /**
     * Select a random card from the pool of cards with the specified rarity.
     *
     * @param rarity - The rarity of card to select
     * @param rng - The seeded random number generator
     * @param cardPool - The pool of available cards organized by rarity
     * @returns A random card of the specified rarity
     */
    private selectRandomCardOfRarity;
    /**
     * Generate a unique card ID
     * In a real implementation, this would use a proper UUID generator
     */
    private generateCardId;
}
//# sourceMappingURL=CardDrawGenerator.d.ts.map