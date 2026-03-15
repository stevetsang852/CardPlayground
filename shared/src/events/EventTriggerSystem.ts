import { SeededRandom } from '../random/SeededRandom';
import { 
  ActiveEvent, 
  EventConfiguration, 
  EventType, 
  MerchantOffer 
} from '../types/event';
import { Card } from '../types/card';

/**
 * EventTriggerSystem - Manages random event triggering and creation
 * 
 * This class handles:
 * - Checking for event triggers based on configured probabilities
 * - Creating ActiveEvent objects for each event type
 * - Generating event-specific data (merchant offers, storm draws, etc.)
 * 
 * Uses SeededRandom for deterministic event generation.
 */
export class EventTriggerSystem {
  private eventConfigs: Map<EventType, EventConfiguration>;
  private eventCounter: number = 0;

  /**
   * Creates a new EventTriggerSystem with the given event configurations
   * @param configs - Array of event configurations with probabilities
   */
  constructor(configs: EventConfiguration[]) {
    this.eventConfigs = new Map();
    for (const config of configs) {
      this.eventConfigs.set(config.eventType, config);
    }
  }

  /**
   * Checks if an event should trigger based on configured probabilities
   * @param playerId - The player ID for whom to check events
   * @param playerCards - The player's card collection (for Copy Miracle)
   * @param rng - Seeded random number generator for deterministic results
   * @returns An ActiveEvent if triggered, null otherwise
   */
  checkForEvent(
    playerId: string,
    playerCards: Card[],
    rng: SeededRandom
  ): ActiveEvent | null {
    const roll = rng.next() * 100; // Convert to percentage (0-100)
    let cumulative = 0;

    // Check each event type in order
    for (const [eventType, config] of this.eventConfigs) {
      cumulative += config.probability;

      if (roll <= cumulative) {
        return this.createEvent(eventType, config, playerId, playerCards, rng);
      }
    }

    return null;
  }

  /**
   * Creates an ActiveEvent of the specified type
   * @param eventType - The type of event to create
   * @param config - The event configuration
   * @param playerId - The player ID
   * @param playerCards - The player's card collection
   * @param rng - Seeded random number generator
   * @returns A new ActiveEvent object
   */
  private createEvent(
    eventType: EventType,
    config: EventConfiguration,
    playerId: string,
    playerCards: Card[],
    rng: SeededRandom
  ): ActiveEvent {
    const now = new Date();
    const baseEvent = {
      id: this.generateEventId(playerId, eventType, now),
      playerId,
      eventType,
      triggeredAt: now.toISOString(),
      claimed: false
    };

    switch (eventType) {
      case 'merchant':
        return {
          ...baseEvent,
          merchantOffers: this.generateMerchantOffers(rng)
        };

      case 'storm':
        return {
          ...baseEvent,
          stormDrawsRemaining: 3
        };

      case 'lucky':
        const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
        return {
          ...baseEvent,
          expiresAt: expiresAt.toISOString(),
          luckyMomentBonus: 0.20
        };

      case 'copy':
        const copiedCard = this.selectRandomCard(playerCards, rng);
        return {
          ...baseEvent,
          copiedCard
        };

      default:
        throw new Error(`Unknown event type: ${eventType}`);
    }
  }

  /**
   * Generates merchant offers with random items and discounts
   * @param rng - Seeded random number generator
   * @returns Array of merchant offers
   */
  private generateMerchantOffers(rng: SeededRandom): MerchantOffer[] {
    const offers: MerchantOffer[] = [];
    const offerCount = Math.floor(rng.nextInRange(2, 4)); // 2-3 offers

    for (let i = 0; i < offerCount; i++) {
      const itemTypeRoll = rng.next();
      let itemType: 'pack' | 'material' | 'card';
      let itemId: string;
      let basePrice: number;

      if (itemTypeRoll < 0.5) {
        // 50% chance for pack
        itemType = 'pack';
        const packRoll = rng.next();
        if (packRoll < 0.3) {
          itemId = 'basic-pack';
          basePrice = 100;
        } else if (packRoll < 0.7) {
          itemId = 'premium-pack';
          basePrice = 500;
        } else {
          itemId = 'legendary-pack';
          basePrice = 2000;
        }
      } else if (itemTypeRoll < 0.8) {
        // 30% chance for material
        itemType = 'material';
        const materialRoll = rng.next();
        if (materialRoll < 0.5) {
          itemId = 'common-material';
          basePrice = 50;
        } else {
          itemId = 'rare-material';
          basePrice = 150;
        }
      } else {
        // 20% chance for card
        itemType = 'card';
        itemId = `special-card-${Math.floor(rng.nextInRange(1, 10))}`;
        basePrice = Math.floor(rng.nextInRange(200, 1000));
      }

      // Generate discount (10-50%)
      const discount = Math.floor(rng.nextInRange(10, 51));
      const discountedPrice = Math.floor(basePrice * (1 - discount / 100));

      // Determine currency type (70% soft, 30% hard)
      const currencyType = rng.next() < 0.7 ? 'soft' : 'hard';

      offers.push({
        id: `offer-${i + 1}`,
        itemType,
        itemId,
        price: discountedPrice,
        currencyType,
        discount
      });
    }

    return offers;
  }

  /**
   * Selects a random card from the player's collection
   * @param cards - The player's card collection
   * @param rng - Seeded random number generator
   * @returns A randomly selected card, or undefined if collection is empty
   */
  private selectRandomCard(cards: Card[], rng: SeededRandom): Card | undefined {
    if (cards.length === 0) {
      return undefined;
    }

    const index = Math.floor(rng.nextInRange(0, cards.length));
    return cards[index];
  }

  /**
   * Generates a unique event ID
   * @param playerId - The player ID
   * @param eventType - The event type
   * @param timestamp - The timestamp
   * @returns A unique event ID string
   */
  private generateEventId(
    playerId: string,
    eventType: EventType,
    timestamp: Date
  ): string {
    return `event-${playerId}-${eventType}-${timestamp.getTime()}-${this.eventCounter++}`;
  }
}
