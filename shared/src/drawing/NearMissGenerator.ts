import { Card, CardRarity } from '../types/card';
import { SeededRandom } from '../random/SeededRandom';

/**
 * NearMissGenerator implements the near-miss effect for card draws.
 * 
 * Near-miss animations show rare cards that don't actually drop to create
 * psychological engagement. The system:
 * - Only shows near-miss for common/rare draws (not epic/legendary)
 * - Shows near-miss at 15% probability
 * - Displays a card one rarity higher than actual
 * - Uses SeededRandom for deterministic results
 * 
 * Validates Requirements 1.9
 */
export class NearMissGenerator {
  private readonly NEAR_MISS_PROBABILITY = 0.15; // 15% chance

  /**
   * Determines whether a near-miss animation should be shown for a card draw.
   * 
   * Near-miss is only shown for common and rare draws (not epic or legendary).
   * When shown, it displays a card one rarity higher than the actual draw.
   * 
   * @param actualRarity - The rarity of the card that was actually drawn
   * @param rng - The seeded random number generator for deterministic results
   * @returns true if near-miss should be shown, false otherwise
   * 
   * Validates Requirements 1.9
   */
  shouldShowNearMiss(actualRarity: CardRarity, rng: SeededRandom): boolean {
    // Only show near-miss for common/rare draws
    if (actualRarity === 'legendary' || actualRarity === 'epic') {
      return false;
    }

    // Check probability using the RNG
    return rng.next() < this.NEAR_MISS_PROBABILITY;
  }

  /**
   * Generates a near-miss card to display before revealing the actual card.
   * 
   * The near-miss card is always one rarity higher than the actual card:
   * - common -> rare
   * - rare -> epic
   * 
   * @param actualRarity - The rarity of the card that was actually drawn
   * @param rng - The seeded random number generator for deterministic results
   * @param cardPool - The pool of available cards organized by rarity
   * @returns A card one rarity higher than the actual draw
   * 
   * Validates Requirements 1.9
   */
  generateNearMissCard(
    actualRarity: CardRarity,
    rng: SeededRandom,
    cardPool: Map<CardRarity, Card[]>
  ): Card {
    // Determine near-miss rarity (one level higher)
    const nearMissRarity: CardRarity = actualRarity === 'common' ? 'rare' : 'epic';

    // Select a random card of the near-miss rarity
    const cardsOfRarity = cardPool.get(nearMissRarity);

    if (!cardsOfRarity || cardsOfRarity.length === 0) {
      throw new Error(`No cards available for near-miss rarity: ${nearMissRarity}`);
    }

    const index = Math.floor(rng.next() * cardsOfRarity.length);
    const template = cardsOfRarity[index];

    // Return the template (not a new instance, as this is just for display)
    return template;
  }
}
