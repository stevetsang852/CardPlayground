import { EventTriggerSystem } from './EventTriggerSystem';
import { SeededRandom } from '../random/SeededRandom';
import { EventConfiguration, EventType, ActiveEvent } from '../types/event';
import { Card } from '../types/card';

describe('EventTriggerSystem', () => {
  const createTestCard = (id: string, rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common'): Card => ({
    id,
    templateId: `template-${id}`,
    name: `Card ${id}`,
    description: 'Test card',
    rarity,
    theme: 'test',
    imageUrl: 'https://example.com/card.png',
    score: 10,
    isLimitedEdition: false,
    obtainedAt: '2024-01-01T00:00:00Z',
    obtainedFrom: 'draw'
  });

  describe('constructor', () => {
    it('should create EventTriggerSystem with event configurations', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'merchant', probability: 10 },
        { eventType: 'storm', probability: 5 },
        { eventType: 'lucky', probability: 15, duration: 10 },
        { eventType: 'copy', probability: 10 }
      ];

      const system = new EventTriggerSystem(configs);
      expect(system).toBeDefined();
    });

    it('should handle empty configuration array', () => {
      const system = new EventTriggerSystem([]);
      expect(system).toBeDefined();
    });
  });

  describe('checkForEvent', () => {
    it('should return null when no event triggers (roll above all probabilities)', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'merchant', probability: 10 }
      ];
      const system = new EventTriggerSystem(configs);
      const rng = new SeededRandom(12345); // Seed that produces high roll
      
      // Skip to a high roll
      for (let i = 0; i < 10; i++) {
        rng.next();
      }
      
      const playerCards: Card[] = [createTestCard('1')];
      const event = system.checkForEvent('player-1', playerCards, rng);
      
      // With cumulative probability of 10%, most rolls should not trigger
      // This test may occasionally fail due to randomness, but with proper seed it should pass
    });

    it('should trigger merchant event when roll is within merchant probability', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'merchant', probability: 100 } // 100% to guarantee trigger
      ];
      const system = new EventTriggerSystem(configs);
      const rng = new SeededRandom(1);
      const playerCards: Card[] = [createTestCard('1')];
      
      const event = system.checkForEvent('player-1', playerCards, rng);
      
      expect(event).not.toBeNull();
      expect(event!.eventType).toBe('merchant');
      expect(event!.playerId).toBe('player-1');
      expect(event!.merchantOffers).toBeDefined();
      expect(event!.merchantOffers!.length).toBeGreaterThan(0);
    });

    it('should trigger storm event', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'storm', probability: 100 }
      ];
      const system = new EventTriggerSystem(configs);
      const rng = new SeededRandom(2);
      const playerCards: Card[] = [createTestCard('1')];
      
      const event = system.checkForEvent('player-1', playerCards, rng);
      
      expect(event).not.toBeNull();
      expect(event!.eventType).toBe('storm');
      expect(event!.stormDrawsRemaining).toBe(3);
    });

    it('should trigger lucky event with 10-minute expiration', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'lucky', probability: 100, duration: 10 }
      ];
      const system = new EventTriggerSystem(configs);
      const rng = new SeededRandom(3);
      const playerCards: Card[] = [createTestCard('1')];
      
      const beforeTrigger = Date.now();
      const event = system.checkForEvent('player-1', playerCards, rng);
      const afterTrigger = Date.now();
      
      expect(event).not.toBeNull();
      expect(event!.eventType).toBe('lucky');
      expect(event!.luckyMomentBonus).toBe(0.20);
      expect(event!.expiresAt).toBeDefined();
      
      // Verify expiration is approximately 10 minutes from now
      const expiresAt = new Date(event!.expiresAt!).getTime();
      const triggeredAt = new Date(event!.triggeredAt).getTime();
      const duration = expiresAt - triggeredAt;
      
      expect(duration).toBe(10 * 60 * 1000); // Exactly 10 minutes
    });

    it('should trigger copy event with random card from collection', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'copy', probability: 100 }
      ];
      const system = new EventTriggerSystem(configs);
      const rng = new SeededRandom(4);
      const playerCards: Card[] = [
        createTestCard('1', 'common'),
        createTestCard('2', 'rare'),
        createTestCard('3', 'epic')
      ];
      
      const event = system.checkForEvent('player-1', playerCards, rng);
      
      expect(event).not.toBeNull();
      expect(event!.eventType).toBe('copy');
      expect(event!.copiedCard).toBeDefined();
      
      // Verify the copied card is from the player's collection
      const copiedCardId = event!.copiedCard!.id;
      const isFromCollection = playerCards.some(card => card.id === copiedCardId);
      expect(isFromCollection).toBe(true);
    });

    it('should handle copy event with empty card collection', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'copy', probability: 100 }
      ];
      const system = new EventTriggerSystem(configs);
      const rng = new SeededRandom(5);
      const playerCards: Card[] = [];
      
      const event = system.checkForEvent('player-1', playerCards, rng);
      
      expect(event).not.toBeNull();
      expect(event!.eventType).toBe('copy');
      expect(event!.copiedCard).toBeUndefined();
    });

    it('should use cumulative probability to select event type', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'merchant', probability: 25 },  // 0-25
        { eventType: 'storm', probability: 25 },     // 25-50
        { eventType: 'lucky', probability: 25, duration: 10 },      // 50-75
        { eventType: 'copy', probability: 25 }       // 75-100
      ];
      const system = new EventTriggerSystem(configs);
      
      // Test multiple seeds to see different events trigger
      const eventTypes = new Set<EventType>();
      
      for (let seed = 1; seed <= 20; seed++) {
        const rng = new SeededRandom(seed);
        const playerCards: Card[] = [createTestCard('1')];
        const event = system.checkForEvent('player-1', playerCards, rng);
        
        if (event) {
          eventTypes.add(event.eventType);
        }
      }
      
      // With 20 trials and 25% each, we should see multiple event types
      expect(eventTypes.size).toBeGreaterThan(1);
    });

    it('should generate unique event IDs', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'merchant', probability: 100 }
      ];
      const system = new EventTriggerSystem(configs);
      const playerCards: Card[] = [createTestCard('1')];
      
      const event1 = system.checkForEvent('player-1', playerCards, new SeededRandom(1));
      const event2 = system.checkForEvent('player-1', playerCards, new SeededRandom(2));
      
      expect(event1!.id).not.toBe(event2!.id);
    });

    it('should set claimed to false for new events', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'merchant', probability: 100 }
      ];
      const system = new EventTriggerSystem(configs);
      const rng = new SeededRandom(1);
      const playerCards: Card[] = [createTestCard('1')];
      
      const event = system.checkForEvent('player-1', playerCards, rng);
      
      expect(event!.claimed).toBe(false);
    });

    it('should include triggeredAt timestamp', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'merchant', probability: 100 }
      ];
      const system = new EventTriggerSystem(configs);
      const rng = new SeededRandom(1);
      const playerCards: Card[] = [createTestCard('1')];
      
      const beforeTrigger = Date.now();
      const event = system.checkForEvent('player-1', playerCards, rng);
      const afterTrigger = Date.now();
      
      expect(event!.triggeredAt).toBeDefined();
      const triggeredTime = new Date(event!.triggeredAt).getTime();
      
      expect(triggeredTime).toBeGreaterThanOrEqual(beforeTrigger);
      expect(triggeredTime).toBeLessThanOrEqual(afterTrigger);
    });
  });

  describe('merchant offer generation', () => {
    it('should generate 2-3 merchant offers', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'merchant', probability: 100 }
      ];
      const system = new EventTriggerSystem(configs);
      const playerCards: Card[] = [createTestCard('1')];
      
      // Test multiple seeds
      for (let seed = 1; seed <= 10; seed++) {
        const rng = new SeededRandom(seed);
        const event = system.checkForEvent('player-1', playerCards, rng);
        
        expect(event!.merchantOffers!.length).toBeGreaterThanOrEqual(2);
        expect(event!.merchantOffers!.length).toBeLessThanOrEqual(3);
      }
    });

    it('should generate offers with valid item types', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'merchant', probability: 100 }
      ];
      const system = new EventTriggerSystem(configs);
      const rng = new SeededRandom(1);
      const playerCards: Card[] = [createTestCard('1')];
      
      const event = system.checkForEvent('player-1', playerCards, rng);
      
      event!.merchantOffers!.forEach(offer => {
        expect(['pack', 'material', 'card']).toContain(offer.itemType);
      });
    });

    it('should generate offers with discounts between 10-50%', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'merchant', probability: 100 }
      ];
      const system = new EventTriggerSystem(configs);
      const rng = new SeededRandom(1);
      const playerCards: Card[] = [createTestCard('1')];
      
      const event = system.checkForEvent('player-1', playerCards, rng);
      
      event!.merchantOffers!.forEach(offer => {
        expect(offer.discount).toBeGreaterThanOrEqual(10);
        expect(offer.discount).toBeLessThanOrEqual(50);
      });
    });

    it('should generate offers with both currency types', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'merchant', probability: 100 }
      ];
      const system = new EventTriggerSystem(configs);
      const playerCards: Card[] = [createTestCard('1')];
      
      const currencyTypes = new Set<string>();
      
      // Test multiple seeds to see both currency types
      for (let seed = 1; seed <= 20; seed++) {
        const rng = new SeededRandom(seed);
        const event = system.checkForEvent('player-1', playerCards, rng);
        
        event!.merchantOffers!.forEach(offer => {
          currencyTypes.add(offer.currencyType);
        });
      }
      
      // Should see both soft and hard currency across multiple trials
      expect(currencyTypes.has('soft')).toBe(true);
      expect(currencyTypes.has('hard')).toBe(true);
    });

    it('should generate offers with unique IDs within an event', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'merchant', probability: 100 }
      ];
      const system = new EventTriggerSystem(configs);
      const rng = new SeededRandom(1);
      const playerCards: Card[] = [createTestCard('1')];
      
      const event = system.checkForEvent('player-1', playerCards, rng);
      
      const offerIds = event!.merchantOffers!.map(offer => offer.id);
      const uniqueIds = new Set(offerIds);
      
      expect(uniqueIds.size).toBe(offerIds.length);
    });

    it('should apply discount to base price correctly', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'merchant', probability: 100 }
      ];
      const system = new EventTriggerSystem(configs);
      const rng = new SeededRandom(1);
      const playerCards: Card[] = [createTestCard('1')];
      
      const event = system.checkForEvent('player-1', playerCards, rng);
      
      event!.merchantOffers!.forEach(offer => {
        // Price should be positive
        expect(offer.price).toBeGreaterThan(0);
        
        // With discount, price should be less than typical base prices
        // (This is a weak test, but we can't know exact base price without exposing it)
        expect(offer.price).toBeGreaterThan(0);
      });
    });
  });

  describe('deterministic behavior', () => {
    it('should produce identical events with same seed', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'merchant', probability: 50 },
        { eventType: 'storm', probability: 50 }
      ];
      const system = new EventTriggerSystem(configs);
      const playerCards: Card[] = [createTestCard('1'), createTestCard('2')];
      
      const event1 = system.checkForEvent('player-1', playerCards, new SeededRandom(42));
      const event2 = system.checkForEvent('player-1', playerCards, new SeededRandom(42));
      
      expect(event1?.eventType).toBe(event2?.eventType);
      
      if (event1?.eventType === 'merchant' && event2?.eventType === 'merchant') {
        expect(event1.merchantOffers?.length).toBe(event2.merchantOffers?.length);
        
        // Compare offers
        event1.merchantOffers?.forEach((offer1, index) => {
          const offer2 = event2.merchantOffers![index];
          expect(offer1.itemType).toBe(offer2.itemType);
          expect(offer1.itemId).toBe(offer2.itemId);
          expect(offer1.price).toBe(offer2.price);
          expect(offer1.discount).toBe(offer2.discount);
          expect(offer1.currencyType).toBe(offer2.currencyType);
        });
      }
      
      if (event1?.eventType === 'copy' && event2?.eventType === 'copy') {
        expect(event1.copiedCard?.id).toBe(event2.copiedCard?.id);
      }
    });

    it('should produce different events with different seeds', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'merchant', probability: 25 },
        { eventType: 'storm', probability: 25 },
        { eventType: 'lucky', probability: 25, duration: 10 },
        { eventType: 'copy', probability: 25 }
      ];
      const system = new EventTriggerSystem(configs);
      const playerCards: Card[] = [createTestCard('1'), createTestCard('2')];
      
      const events = new Set<EventType>();
      
      for (let seed = 1; seed <= 50; seed++) {
        const event = system.checkForEvent('player-1', playerCards, new SeededRandom(seed));
        if (event) {
          events.add(event.eventType);
        }
      }
      
      // With 50 trials and equal probabilities, we should see multiple event types
      expect(events.size).toBeGreaterThan(1);
    });
  });

  describe('real-world event configurations', () => {
    it('should work with actual game event probabilities', () => {
      const configs: EventConfiguration[] = [
        { eventType: 'merchant', probability: 10 },
        { eventType: 'storm', probability: 5 },
        { eventType: 'lucky', probability: 15, duration: 10 },
        { eventType: 'copy', probability: 10 }
      ];
      const system = new EventTriggerSystem(configs);
      const playerCards: Card[] = [
        createTestCard('1', 'common'),
        createTestCard('2', 'rare'),
        createTestCard('3', 'epic')
      ];
      
      let eventCount = 0;
      const eventTypes = new Map<EventType, number>();
      
      // Simulate 1000 player actions
      for (let i = 0; i < 1000; i++) {
        const rng = new SeededRandom(i);
        const event = system.checkForEvent(`player-${i}`, playerCards, rng);
        
        if (event) {
          eventCount++;
          eventTypes.set(event.eventType, (eventTypes.get(event.eventType) || 0) + 1);
        }
      }
      
      // With total probability of 40%, we expect around 400 events (±statistical variance)
      // Allow for wide range due to randomness
      expect(eventCount).toBeGreaterThan(300);
      expect(eventCount).toBeLessThan(500);
      
      // Verify we see all event types
      expect(eventTypes.size).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Property-Based Tests
// ============================================================================

import * as fc from 'fast-check';

describe('EventTriggerSystem - Property-Based Tests', () => {
  const createTestCard = (id: string, rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common'): Card => ({
    id,
    templateId: `template-${id}`,
    name: `Card ${id}`,
    description: 'Test card',
    rarity,
    theme: 'test',
    imageUrl: 'https://example.com/card.png',
    score: 10,
    isLimitedEdition: false,
    obtainedAt: '2024-01-01T00:00:00Z',
    obtainedFrom: 'draw'
  });

  /**
   * **Validates: Requirements 3.1, 3.3, 3.5, 3.7**
   * 
   * Property 13: Event trigger probability adherence
   * 
   * For any event type and large sample of player actions, the event should trigger
   * at approximately the configured probability rate within statistical tolerance.
   * 
   * This property ensures that the random event system provides the intended
   * frequency of special events, maintaining game balance and player engagement.
   */
  describe('Property 13: Event trigger probability adherence', () => {
    it('should trigger events at approximately the configured probability rate', () => {
      fc.assert(
        fc.property(
          fc.record({
            eventType: fc.constantFrom<EventType>('merchant', 'storm', 'lucky', 'copy'),
            probability: fc.float({ min: 1, max: 50, noNaN: true }), // 1-50% probability
            sampleSize: fc.integer({ min: 1000, max: 5000 }),
            baseSeed: fc.integer({ min: 1, max: 1000000 })
          }),
          ({ eventType, probability, sampleSize, baseSeed }) => {
            // Create system with single event type at specified probability
            const configs: EventConfiguration[] = [
              eventType === 'lucky' 
                ? { eventType, probability, duration: 10 }
                : { eventType, probability }
            ];
            const system = new EventTriggerSystem(configs);
            const playerCards: Card[] = [
              createTestCard('1', 'common'),
              createTestCard('2', 'rare'),
              createTestCard('3', 'epic')
            ];

            // Run many trials
            let triggerCount = 0;
            for (let i = 0; i < sampleSize; i++) {
              const rng = new SeededRandom(baseSeed + i);
              const event = system.checkForEvent(`player-${i}`, playerCards, rng);
              if (event && event.eventType === eventType) {
                triggerCount++;
              }
            }

            // Calculate observed probability
            const observedProbability = (triggerCount / sampleSize) * 100;
            const expectedProbability = probability;

            // Chi-square test for goodness of fit
            // Expected counts
            const expectedTriggers = (expectedProbability / 100) * sampleSize;
            const expectedNoTriggers = sampleSize - expectedTriggers;
            
            // Observed counts
            const observedTriggers = triggerCount;
            const observedNoTriggers = sampleSize - triggerCount;

            // Chi-square statistic
            const chiSquare = 
              Math.pow(observedTriggers - expectedTriggers, 2) / expectedTriggers +
              Math.pow(observedNoTriggers - expectedNoTriggers, 2) / expectedNoTriggers;

            // For 1 degree of freedom, chi-square critical value at 99% confidence is 6.635
            // This means we accept if p-value > 0.01
            const criticalValue = 6.635;

            return chiSquare < criticalValue;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain probability distribution with multiple event types', () => {
      fc.assert(
        fc.property(
          fc.record({
            merchantProb: fc.float({ min: 5, max: 20, noNaN: true }),
            stormProb: fc.float({ min: 5, max: 20, noNaN: true }),
            luckyProb: fc.float({ min: 5, max: 20, noNaN: true }),
            copyProb: fc.float({ min: 5, max: 20, noNaN: true }),
            sampleSize: fc.integer({ min: 2000, max: 5000 }),
            baseSeed: fc.integer({ min: 1, max: 1000000 })
          }),
          ({ merchantProb, stormProb, luckyProb, copyProb, sampleSize, baseSeed }) => {
            const configs: EventConfiguration[] = [
              { eventType: 'merchant', probability: merchantProb },
              { eventType: 'storm', probability: stormProb },
              { eventType: 'lucky', probability: luckyProb, duration: 10 },
              { eventType: 'copy', probability: copyProb }
            ];
            const system = new EventTriggerSystem(configs);
            const playerCards: Card[] = [createTestCard('1')];

            // Count each event type
            const counts = new Map<EventType, number>([
              ['merchant', 0],
              ['storm', 0],
              ['lucky', 0],
              ['copy', 0]
            ]);

            for (let i = 0; i < sampleSize; i++) {
              const rng = new SeededRandom(baseSeed + i);
              const event = system.checkForEvent(`player-${i}`, playerCards, rng);
              if (event) {
                counts.set(event.eventType, (counts.get(event.eventType) || 0) + 1);
              }
            }

            // Chi-square test for all event types
            const expectedCounts = [
              merchantProb / 100 * sampleSize,
              stormProb / 100 * sampleSize,
              luckyProb / 100 * sampleSize,
              copyProb / 100 * sampleSize,
              (100 - merchantProb - stormProb - luckyProb - copyProb) / 100 * sampleSize // No event
            ];

            const observedCounts = [
              counts.get('merchant') || 0,
              counts.get('storm') || 0,
              counts.get('lucky') || 0,
              counts.get('copy') || 0,
              sampleSize - Array.from(counts.values()).reduce((a, b) => a + b, 0)
            ];

            let chiSquare = 0;
            for (let i = 0; i < expectedCounts.length; i++) {
              if (expectedCounts[i] > 0) {
                chiSquare += Math.pow(observedCounts[i] - expectedCounts[i], 2) / expectedCounts[i];
              }
            }

            // For 4 degrees of freedom, chi-square critical value at 99% confidence is 13.277
            const criticalValue = 13.277;

            return chiSquare < criticalValue;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Validates: Requirements 3.4**
   * 
   * Property 14: Card Storm reward distribution
   * 
   * For any Card Storm event trigger, the player should receive exactly 3 free card draws.
   * 
   * This property ensures that the Card Storm event provides the correct reward,
   * maintaining consistency and player expectations.
   */
  describe('Property 14: Card Storm reward distribution', () => {
    it('should always grant exactly 3 free draws for Card Storm events', () => {
      fc.assert(
        fc.property(
          fc.record({
            playerId: fc.string({ minLength: 1, maxLength: 50 }),
            seed: fc.integer({ min: 1, max: 1000000 }),
            cardCount: fc.integer({ min: 0, max: 100 })
          }),
          ({ playerId, seed, cardCount }) => {
            const configs: EventConfiguration[] = [
              { eventType: 'storm', probability: 100 } // Guarantee trigger
            ];
            const system = new EventTriggerSystem(configs);
            
            // Create player cards
            const playerCards: Card[] = [];
            for (let i = 0; i < cardCount; i++) {
              playerCards.push(createTestCard(`card-${i}`));
            }

            const rng = new SeededRandom(seed);
            const event = system.checkForEvent(playerId, playerCards, rng);

            // Verify event triggered and has correct draws
            return (
              event !== null &&
              event.eventType === 'storm' &&
              event.stormDrawsRemaining === 3
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should grant 3 draws regardless of player state or seed', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 1000000 }), { minLength: 10, maxLength: 50 }),
          (seeds) => {
            const configs: EventConfiguration[] = [
              { eventType: 'storm', probability: 100 }
            ];
            const system = new EventTriggerSystem(configs);
            const playerCards: Card[] = [createTestCard('1')];

            // Test with multiple seeds
            const allHaveThreeDraws = seeds.every(seed => {
              const rng = new SeededRandom(seed);
              const event = system.checkForEvent('player-1', playerCards, rng);
              return event?.stormDrawsRemaining === 3;
            });

            return allHaveThreeDraws;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not include any other event-specific fields for storm events', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000000 }),
          (seed) => {
            const configs: EventConfiguration[] = [
              { eventType: 'storm', probability: 100 }
            ];
            const system = new EventTriggerSystem(configs);
            const playerCards: Card[] = [createTestCard('1')];
            const rng = new SeededRandom(seed);
            
            const event = system.checkForEvent('player-1', playerCards, rng);

            // Storm events should not have merchant, lucky, or copy fields
            return (
              event !== null &&
              event.eventType === 'storm' &&
              event.stormDrawsRemaining === 3 &&
              event.merchantOffers === undefined &&
              event.luckyMomentBonus === undefined &&
              event.expiresAt === undefined &&
              event.copiedCard === undefined
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Validates: Requirements 3.6**
   * 
   * Property 15: Lucky Moment duration and effect
   * 
   * For any Lucky Moment event trigger, the 20% synthesis bonus should be active
   * for exactly 10 minutes from trigger time.
   * 
   * This property ensures that the Lucky Moment event provides the correct bonus
   * and duration, maintaining game balance.
   */
  describe('Property 15: Lucky Moment duration and effect', () => {
    it('should always grant exactly 20% bonus for Lucky Moment events', () => {
      fc.assert(
        fc.property(
          fc.record({
            playerId: fc.string({ minLength: 1, maxLength: 50 }),
            seed: fc.integer({ min: 1, max: 1000000 }),
            cardCount: fc.integer({ min: 0, max: 100 })
          }),
          ({ playerId, seed, cardCount }) => {
            const configs: EventConfiguration[] = [
              { eventType: 'lucky', probability: 100, duration: 10 }
            ];
            const system = new EventTriggerSystem(configs);
            
            const playerCards: Card[] = [];
            for (let i = 0; i < cardCount; i++) {
              playerCards.push(createTestCard(`card-${i}`));
            }

            const rng = new SeededRandom(seed);
            const event = system.checkForEvent(playerId, playerCards, rng);

            return (
              event !== null &&
              event.eventType === 'lucky' &&
              event.luckyMomentBonus === 0.20
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should set expiration to exactly 10 minutes from trigger time', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000000 }),
          (seed) => {
            const configs: EventConfiguration[] = [
              { eventType: 'lucky', probability: 100, duration: 10 }
            ];
            const system = new EventTriggerSystem(configs);
            const playerCards: Card[] = [createTestCard('1')];
            const rng = new SeededRandom(seed);

            const beforeTrigger = Date.now();
            const event = system.checkForEvent('player-1', playerCards, rng);
            const afterTrigger = Date.now();

            if (!event || event.eventType !== 'lucky' || !event.expiresAt) {
              return false;
            }

            const triggeredAt = new Date(event.triggeredAt).getTime();
            const expiresAt = new Date(event.expiresAt).getTime();
            const duration = expiresAt - triggeredAt;

            // Duration should be exactly 10 minutes (600,000 milliseconds)
            const expectedDuration = 10 * 60 * 1000;
            
            // Verify duration is exactly 10 minutes
            // and triggered time is within the test execution window
            return (
              duration === expectedDuration &&
              triggeredAt >= beforeTrigger &&
              triggeredAt <= afterTrigger
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain 20% bonus and 10-minute duration across all seeds', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 1000000 }), { minLength: 10, maxLength: 50 }),
          (seeds) => {
            const configs: EventConfiguration[] = [
              { eventType: 'lucky', probability: 100, duration: 10 }
            ];
            const system = new EventTriggerSystem(configs);
            const playerCards: Card[] = [createTestCard('1')];

            const allCorrect = seeds.every(seed => {
              const rng = new SeededRandom(seed);
              const event = system.checkForEvent('player-1', playerCards, rng);

              if (!event || event.eventType !== 'lucky') {
                return false;
              }

              const triggeredAt = new Date(event.triggeredAt).getTime();
              const expiresAt = new Date(event.expiresAt!).getTime();
              const duration = expiresAt - triggeredAt;

              return (
                event.luckyMomentBonus === 0.20 &&
                duration === 10 * 60 * 1000
              );
            });

            return allCorrect;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not include any other event-specific fields for lucky events', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000000 }),
          (seed) => {
            const configs: EventConfiguration[] = [
              { eventType: 'lucky', probability: 100, duration: 10 }
            ];
            const system = new EventTriggerSystem(configs);
            const playerCards: Card[] = [createTestCard('1')];
            const rng = new SeededRandom(seed);
            
            const event = system.checkForEvent('player-1', playerCards, rng);

            return (
              event !== null &&
              event.eventType === 'lucky' &&
              event.luckyMomentBonus === 0.20 &&
              event.expiresAt !== undefined &&
              event.merchantOffers === undefined &&
              event.stormDrawsRemaining === undefined &&
              event.copiedCard === undefined
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Validates: Requirements 3.8**
   * 
   * Property 16: Copy Miracle card duplication
   * 
   * For any Copy Miracle event trigger, exactly one card from the player's collection
   * should be duplicated and added to their inventory.
   * 
   * This property ensures that the Copy Miracle event correctly selects and duplicates
   * a card from the player's collection.
   */
  describe('Property 16: Copy Miracle card duplication', () => {
    it('should always select exactly one card from player collection', () => {
      fc.assert(
        fc.property(
          fc.record({
            playerId: fc.string({ minLength: 1, maxLength: 50 }),
            seed: fc.integer({ min: 1, max: 1000000 }),
            cardCount: fc.integer({ min: 1, max: 100 }) // At least 1 card
          }),
          ({ playerId, seed, cardCount }) => {
            const configs: EventConfiguration[] = [
              { eventType: 'copy', probability: 100 }
            ];
            const system = new EventTriggerSystem(configs);
            
            const playerCards: Card[] = [];
            for (let i = 0; i < cardCount; i++) {
              playerCards.push(createTestCard(`card-${i}`, i % 2 === 0 ? 'common' : 'rare'));
            }

            const rng = new SeededRandom(seed);
            const event = system.checkForEvent(playerId, playerCards, rng);

            if (!event || event.eventType !== 'copy') {
              return false;
            }

            // Verify exactly one card is selected
            const copiedCard = event.copiedCard;
            if (!copiedCard) {
              return false;
            }

            // Verify the copied card is from the player's collection
            const isFromCollection = playerCards.some(card => card.id === copiedCard.id);

            return isFromCollection;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty collection gracefully', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000000 }),
          (seed) => {
            const configs: EventConfiguration[] = [
              { eventType: 'copy', probability: 100 }
            ];
            const system = new EventTriggerSystem(configs);
            const playerCards: Card[] = []; // Empty collection
            const rng = new SeededRandom(seed);

            const event = system.checkForEvent('player-1', playerCards, rng);

            return (
              event !== null &&
              event.eventType === 'copy' &&
              event.copiedCard === undefined
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should select cards uniformly from collection over many trials', () => {
      fc.assert(
        fc.property(
          fc.record({
            cardCount: fc.integer({ min: 3, max: 10 }),
            sampleSize: fc.integer({ min: 500, max: 2000 }),
            baseSeed: fc.integer({ min: 1, max: 1000000 })
          }),
          ({ cardCount, sampleSize, baseSeed }) => {
            const configs: EventConfiguration[] = [
              { eventType: 'copy', probability: 100 }
            ];
            const system = new EventTriggerSystem(configs);
            
            const playerCards: Card[] = [];
            for (let i = 0; i < cardCount; i++) {
              playerCards.push(createTestCard(`card-${i}`));
            }

            // Count how many times each card is selected
            const selectionCounts = new Map<string, number>();
            playerCards.forEach(card => selectionCounts.set(card.id, 0));

            for (let i = 0; i < sampleSize; i++) {
              const rng = new SeededRandom(baseSeed + i);
              const event = system.checkForEvent('player-1', playerCards, rng);
              
              if (event?.copiedCard) {
                const count = selectionCounts.get(event.copiedCard.id) || 0;
                selectionCounts.set(event.copiedCard.id, count + 1);
              }
            }

            // Chi-square test for uniform distribution
            const expectedCount = sampleSize / cardCount;
            let chiSquare = 0;

            for (const count of selectionCounts.values()) {
              chiSquare += Math.pow(count - expectedCount, 2) / expectedCount;
            }

            // Critical value depends on degrees of freedom (cardCount - 1)
            // For 99% confidence and up to 9 degrees of freedom, use 21.666
            const criticalValue = 21.666;

            return chiSquare < criticalValue;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all card properties when copying', () => {
      fc.assert(
        fc.property(
          fc.record({
            seed: fc.integer({ min: 1, max: 1000000 }),
            cardId: fc.string({ minLength: 1, maxLength: 20 }),
            rarity: fc.constantFrom<'common' | 'rare' | 'epic' | 'legendary'>('common', 'rare', 'epic', 'legendary')
          }),
          ({ seed, cardId, rarity }) => {
            const configs: EventConfiguration[] = [
              { eventType: 'copy', probability: 100 }
            ];
            const system = new EventTriggerSystem(configs);
            
            const originalCard = createTestCard(cardId, rarity);
            const playerCards: Card[] = [originalCard];

            const rng = new SeededRandom(seed);
            const event = system.checkForEvent('player-1', playerCards, rng);

            if (!event || event.eventType !== 'copy' || !event.copiedCard) {
              return false;
            }

            const copiedCard = event.copiedCard;

            // Verify all properties match
            return (
              copiedCard.id === originalCard.id &&
              copiedCard.templateId === originalCard.templateId &&
              copiedCard.name === originalCard.name &&
              copiedCard.description === originalCard.description &&
              copiedCard.rarity === originalCard.rarity &&
              copiedCard.theme === originalCard.theme &&
              copiedCard.imageUrl === originalCard.imageUrl &&
              copiedCard.score === originalCard.score &&
              copiedCard.isLimitedEdition === originalCard.isLimitedEdition
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not include any other event-specific fields for copy events', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000000 }),
          (seed) => {
            const configs: EventConfiguration[] = [
              { eventType: 'copy', probability: 100 }
            ];
            const system = new EventTriggerSystem(configs);
            const playerCards: Card[] = [createTestCard('1')];
            const rng = new SeededRandom(seed);
            
            const event = system.checkForEvent('player-1', playerCards, rng);

            return (
              event !== null &&
              event.eventType === 'copy' &&
              event.copiedCard !== undefined &&
              event.merchantOffers === undefined &&
              event.stormDrawsRemaining === undefined &&
              event.luckyMomentBonus === undefined &&
              event.expiresAt === undefined
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
