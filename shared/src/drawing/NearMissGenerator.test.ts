import { NearMissGenerator } from './NearMissGenerator';
import { SeededRandom } from '../random/SeededRandom';
import { Card, CardRarity } from '../types/card';

describe('NearMissGenerator', () => {
  let generator: NearMissGenerator;
  let cardPool: Map<CardRarity, Card[]>;

  beforeEach(() => {
    generator = new NearMissGenerator();

    // Create a test card pool with cards of each rarity
    cardPool = new Map<CardRarity, Card[]>([
      [
        'common',
        [
          createTestCard('common_1', 'common'),
          createTestCard('common_2', 'common'),
          createTestCard('common_3', 'common'),
        ],
      ],
      [
        'rare',
        [
          createTestCard('rare_1', 'rare'),
          createTestCard('rare_2', 'rare'),
          createTestCard('rare_3', 'rare'),
        ],
      ],
      [
        'epic',
        [
          createTestCard('epic_1', 'epic'),
          createTestCard('epic_2', 'epic'),
          createTestCard('epic_3', 'epic'),
        ],
      ],
      [
        'legendary',
        [
          createTestCard('legendary_1', 'legendary'),
          createTestCard('legendary_2', 'legendary'),
        ],
      ],
    ]);
  });

  describe('shouldShowNearMiss()', () => {
    it('should never show near-miss for legendary draws', () => {
      // Test with multiple seeds to ensure consistency
      for (let seed = 0; seed < 100; seed++) {
        const rng = new SeededRandom(seed);
        const result = generator.shouldShowNearMiss('legendary', rng);
        expect(result).toBe(false);
      }
    });

    it('should never show near-miss for epic draws', () => {
      // Test with multiple seeds to ensure consistency
      for (let seed = 0; seed < 100; seed++) {
        const rng = new SeededRandom(seed);
        const result = generator.shouldShowNearMiss('epic', rng);
        expect(result).toBe(false);
      }
    });

    it('should show near-miss for common draws at approximately 15% probability', () => {
      let nearMissCount = 0;
      const iterations = 1000;

      for (let seed = 0; seed < iterations; seed++) {
        const rng = new SeededRandom(seed);
        if (generator.shouldShowNearMiss('common', rng)) {
          nearMissCount++;
        }
      }

      // Expected: 15% of 1000 = 150
      // Allow for statistical variance: 150 ± 30 (20% tolerance)
      expect(nearMissCount).toBeGreaterThan(120);
      expect(nearMissCount).toBeLessThan(180);
    });

    it('should show near-miss for rare draws at approximately 15% probability', () => {
      let nearMissCount = 0;
      const iterations = 1000;

      for (let seed = 0; seed < iterations; seed++) {
        const rng = new SeededRandom(seed);
        if (generator.shouldShowNearMiss('rare', rng)) {
          nearMissCount++;
        }
      }

      // Expected: 15% of 1000 = 150
      // Allow for statistical variance: 150 ± 30 (20% tolerance)
      expect(nearMissCount).toBeGreaterThan(120);
      expect(nearMissCount).toBeLessThan(180);
    });

    it('should produce deterministic results with the same seed', () => {
      const seed = 42;

      const rng1 = new SeededRandom(seed);
      const result1 = generator.shouldShowNearMiss('common', rng1);

      const rng2 = new SeededRandom(seed);
      const result2 = generator.shouldShowNearMiss('common', rng2);

      expect(result1).toBe(result2);
    });

    it('should consume one random value from the RNG', () => {
      const seed = 12345;

      // Create two RNGs with the same seed
      const rng1 = new SeededRandom(seed);
      const rng2 = new SeededRandom(seed);

      // Call shouldShowNearMiss on the first RNG
      generator.shouldShowNearMiss('common', rng1);

      // Consume one value from the second RNG manually
      rng2.next();

      // Both RNGs should now be in the same state
      expect(rng1.next()).toBe(rng2.next());
    });
  });

  describe('generateNearMissCard()', () => {
    it('should generate a rare card for common actual rarity', () => {
      const rng = new SeededRandom(42);
      const nearMissCard = generator.generateNearMissCard('common', rng, cardPool);

      expect(nearMissCard.rarity).toBe('rare');
      expect(nearMissCard.templateId).toMatch(/^rare_/);
    });

    it('should generate an epic card for rare actual rarity', () => {
      const rng = new SeededRandom(42);
      const nearMissCard = generator.generateNearMissCard('rare', rng, cardPool);

      expect(nearMissCard.rarity).toBe('epic');
      expect(nearMissCard.templateId).toMatch(/^epic_/);
    });

    it('should select from the available cards in the pool', () => {
      const rng = new SeededRandom(42);
      const nearMissCard = generator.generateNearMissCard('common', rng, cardPool);

      const rareCards = cardPool.get('rare')!;
      expect(rareCards).toContainEqual(nearMissCard);
    });

    it('should produce deterministic results with the same seed', () => {
      const seed = 12345;

      const rng1 = new SeededRandom(seed);
      const card1 = generator.generateNearMissCard('common', rng1, cardPool);

      const rng2 = new SeededRandom(seed);
      const card2 = generator.generateNearMissCard('common', rng2, cardPool);

      expect(card1).toEqual(card2);
    });

    it('should distribute selections across all available cards', () => {
      const selections = new Map<string, number>();
      const iterations = 1000;

      for (let seed = 0; seed < iterations; seed++) {
        const rng = new SeededRandom(seed);
        const card = generator.generateNearMissCard('common', rng, cardPool);
        selections.set(card.templateId, (selections.get(card.templateId) || 0) + 1);
      }

      // All rare cards should be selected at least once
      const rareCards = cardPool.get('rare')!;
      rareCards.forEach((card) => {
        expect(selections.has(card.templateId)).toBe(true);
        expect(selections.get(card.templateId)).toBeGreaterThan(0);
      });

      // Distribution should be roughly even (each card ~333 times out of 1000)
      // Allow for statistical variance
      rareCards.forEach((card) => {
        const count = selections.get(card.templateId)!;
        expect(count).toBeGreaterThan(250); // At least 25%
        expect(count).toBeLessThan(450); // At most 45%
      });
    });

    it('should throw error if no cards available for near-miss rarity', () => {
      const emptyPool = new Map<CardRarity, Card[]>([
        ['common', [createTestCard('common_1', 'common')]],
        ['rare', []], // Empty rare pool
        ['epic', [createTestCard('epic_1', 'epic')]],
        ['legendary', [createTestCard('legendary_1', 'legendary')]],
      ]);

      const rng = new SeededRandom(42);

      expect(() => {
        generator.generateNearMissCard('common', rng, emptyPool);
      }).toThrow('No cards available for near-miss rarity: rare');
    });

    it('should throw error if near-miss rarity is missing from pool', () => {
      const incompletePool = new Map<CardRarity, Card[]>([
        ['common', [createTestCard('common_1', 'common')]],
        // rare is missing
        ['epic', [createTestCard('epic_1', 'epic')]],
        ['legendary', [createTestCard('legendary_1', 'legendary')]],
      ]);

      const rng = new SeededRandom(42);

      expect(() => {
        generator.generateNearMissCard('common', rng, incompletePool);
      }).toThrow('No cards available for near-miss rarity: rare');
    });
  });

  describe('Integration: shouldShowNearMiss + generateNearMissCard', () => {
    it('should work together to create near-miss experience', () => {
      const seed = 42;
      const rng = new SeededRandom(seed);

      // Check if near-miss should be shown
      const shouldShow = generator.shouldShowNearMiss('common', rng);

      if (shouldShow) {
        // Generate the near-miss card
        const nearMissCard = generator.generateNearMissCard('common', rng, cardPool);

        // Verify it's one rarity higher
        expect(nearMissCard.rarity).toBe('rare');
      }

      // This test just verifies the methods work together without errors
      expect(true).toBe(true);
    });

    it('should maintain RNG state consistency across both methods', () => {
      const seed = 12345;

      // Scenario 1: Call both methods
      const rng1 = new SeededRandom(seed);
      const shouldShow1 = generator.shouldShowNearMiss('common', rng1);
      if (shouldShow1) {
        generator.generateNearMissCard('common', rng1, cardPool);
      }
      const nextValue1 = rng1.next();

      // Scenario 2: Manually consume the same number of random values
      const rng2 = new SeededRandom(seed);
      const roll = rng2.next(); // shouldShowNearMiss consumes one
      const shouldShow2 = roll < 0.15;
      if (shouldShow2) {
        rng2.next(); // generateNearMissCard consumes one
      }
      const nextValue2 = rng2.next();

      // Both scenarios should result in the same RNG state
      expect(shouldShow1).toBe(shouldShow2);
      expect(nextValue1).toBe(nextValue2);
    });
  });

  describe('Edge cases', () => {
    it('should handle card pool with single card per rarity', () => {
      const minimalPool = new Map<CardRarity, Card[]>([
        ['common', [createTestCard('common_1', 'common')]],
        ['rare', [createTestCard('rare_1', 'rare')]],
        ['epic', [createTestCard('epic_1', 'epic')]],
        ['legendary', [createTestCard('legendary_1', 'legendary')]],
      ]);

      const rng = new SeededRandom(42);
      const nearMissCard = generator.generateNearMissCard('common', rng, minimalPool);

      expect(nearMissCard.rarity).toBe('rare');
      expect(nearMissCard.templateId).toBe('rare_1');
    });

    it('should handle card pool with many cards per rarity', () => {
      const largePool = new Map<CardRarity, Card[]>([
        ['common', Array.from({ length: 100 }, (_, i) => createTestCard(`common_${i}`, 'common'))],
        ['rare', Array.from({ length: 50 }, (_, i) => createTestCard(`rare_${i}`, 'rare'))],
        ['epic', Array.from({ length: 20 }, (_, i) => createTestCard(`epic_${i}`, 'epic'))],
        ['legendary', Array.from({ length: 5 }, (_, i) => createTestCard(`legendary_${i}`, 'legendary'))],
      ]);

      const rng = new SeededRandom(42);
      const nearMissCard = generator.generateNearMissCard('common', rng, largePool);

      expect(nearMissCard.rarity).toBe('rare');
      expect(nearMissCard.templateId).toMatch(/^rare_\d+$/);
    });
  });
});

/**
 * Helper function to create a test card
 */
function createTestCard(templateId: string, rarity: CardRarity): Card {
  return {
    id: `${templateId}_instance`,
    templateId,
    name: `Test ${rarity} Card`,
    description: `A test card of ${rarity} rarity`,
    rarity,
    theme: 'test',
    imageUrl: `https://example.com/${templateId}.png`,
    score: 100,
    isLimitedEdition: false,
    obtainedAt: new Date().toISOString(),
    obtainedFrom: 'draw',
  };
}

// ============================================================================
// Property-Based Tests
// ============================================================================

import * as fc from 'fast-check';

describe('Property-Based Tests', () => {
  let generator: NearMissGenerator;
  let cardPool: Map<CardRarity, Card[]>;

  beforeEach(() => {
    generator = new NearMissGenerator();

    // Create a test card pool with cards of each rarity
    cardPool = new Map<CardRarity, Card[]>([
      [
        'common',
        [
          createTestCard('common_1', 'common'),
          createTestCard('common_2', 'common'),
          createTestCard('common_3', 'common'),
        ],
      ],
      [
        'rare',
        [
          createTestCard('rare_1', 'rare'),
          createTestCard('rare_2', 'rare'),
          createTestCard('rare_3', 'rare'),
        ],
      ],
      [
        'epic',
        [
          createTestCard('epic_1', 'epic'),
          createTestCard('epic_2', 'epic'),
          createTestCard('epic_3', 'epic'),
        ],
      ],
      [
        'legendary',
        [
          createTestCard('legendary_1', 'legendary'),
          createTestCard('legendary_2', 'legendary'),
        ],
      ],
    ]);
  });

  /**
   * **Validates: Requirements 1.9**
   * 
   * Property 8: Near-miss display probability
   * 
   * For any large sample of non-legendary, non-epic draws, near-miss animations
   * should appear at approximately the configured probability rate (15%).
   * 
   * This test validates that:
   * 1. Near-miss never appears for epic/legendary draws
   * 2. Near-miss appears at ~15% probability for common/rare draws
   * 3. The probability holds across different random seeds
   * 4. Statistical tolerance is appropriate for sample sizes
   */
  test('Property 8: Near-miss display probability - near-miss appears at configured probability for eligible draws', () => {
    fc.assert(
      fc.property(
        fc.record({
          // Test with different sample sizes to validate statistical convergence
          sampleSize: fc.integer({ min: 1000, max: 5000 }),
          // Test with different starting seeds
          baseSeed: fc.integer({ min: 0, max: 1000000 }),
          // Test with both common and rare draws
          actualRarity: fc.constantFrom('common' as CardRarity, 'rare' as CardRarity),
        }),
        ({ sampleSize, baseSeed, actualRarity }) => {
          let nearMissCount = 0;

          // Perform multiple draws with sequential seeds
          for (let i = 0; i < sampleSize; i++) {
            const rng = new SeededRandom(baseSeed + i);
            if (generator.shouldShowNearMiss(actualRarity, rng)) {
              nearMissCount++;
            }
          }

          // Calculate observed probability
          const observedProbability = nearMissCount / sampleSize;
          const expectedProbability = 0.15; // 15% as per design

          // Calculate acceptable tolerance using statistical bounds
          // For a binomial distribution, standard error = sqrt(p * (1-p) / n)
          // We use 3 standard deviations for 99.7% confidence
          const standardError = Math.sqrt(
            (expectedProbability * (1 - expectedProbability)) / sampleSize
          );
          const tolerance = 3 * standardError;

          // Verify observed probability is within tolerance
          const lowerBound = expectedProbability - tolerance;
          const upperBound = expectedProbability + tolerance;

          return (
            observedProbability >= lowerBound &&
            observedProbability <= upperBound
          );
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * **Validates: Requirements 1.9**
   * 
   * Property 8: Near-miss display probability (negative case)
   * 
   * For any sample of epic or legendary draws, near-miss animations should
   * NEVER appear, regardless of sample size or random seed.
   */
  test('Property 8: Near-miss display probability - near-miss never appears for epic/legendary draws', () => {
    fc.assert(
      fc.property(
        fc.record({
          sampleSize: fc.integer({ min: 100, max: 1000 }),
          baseSeed: fc.integer({ min: 0, max: 1000000 }),
          actualRarity: fc.constantFrom('epic' as CardRarity, 'legendary' as CardRarity),
        }),
        ({ sampleSize, baseSeed, actualRarity }) => {
          // Verify that near-miss NEVER appears for epic/legendary
          for (let i = 0; i < sampleSize; i++) {
            const rng = new SeededRandom(baseSeed + i);
            const shouldShow = generator.shouldShowNearMiss(actualRarity, rng);
            
            if (shouldShow) {
              // If near-miss appears for epic/legendary, property is violated
              return false;
            }
          }

          // All draws correctly showed no near-miss
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * **Validates: Requirements 1.9**
   * 
   * Property 8: Near-miss display probability (determinism)
   * 
   * For any given seed and rarity, the near-miss decision should be deterministic
   * and reproducible across multiple executions.
   */
  test('Property 8: Near-miss display probability - deterministic behavior with same seed', () => {
    fc.assert(
      fc.property(
        fc.record({
          seed: fc.integer({ min: 0, max: 1000000 }),
          actualRarity: fc.constantFrom(
            'common' as CardRarity,
            'rare' as CardRarity,
            'epic' as CardRarity,
            'legendary' as CardRarity
          ),
        }),
        ({ seed, actualRarity }) => {
          // Execute the same draw multiple times with the same seed
          const results: boolean[] = [];
          
          for (let i = 0; i < 5; i++) {
            const rng = new SeededRandom(seed);
            const shouldShow = generator.shouldShowNearMiss(actualRarity, rng);
            results.push(shouldShow);
          }

          // All results should be identical (deterministic)
          const firstResult = results[0];
          return results.every(result => result === firstResult);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * **Validates: Requirements 1.9**
   * 
   * Property 8: Near-miss display probability (card generation consistency)
   * 
   * When near-miss is shown, the generated near-miss card should:
   * 1. Always be one rarity higher than the actual draw
   * 2. Be deterministic for the same seed
   * 3. Come from the available card pool
   */
  test('Property 8: Near-miss card generation is consistent and correct', () => {
    fc.assert(
      fc.property(
        fc.record({
          seed: fc.integer({ min: 0, max: 1000000 }),
          actualRarity: fc.constantFrom('common' as CardRarity, 'rare' as CardRarity),
        }),
        ({ seed, actualRarity }) => {
          const rng = new SeededRandom(seed);
          
          // Check if near-miss should be shown
          const shouldShow = generator.shouldShowNearMiss(actualRarity, rng);
          
          if (!shouldShow) {
            // If near-miss is not shown, property is trivially satisfied
            return true;
          }

          // Generate the near-miss card
          const nearMissCard = generator.generateNearMissCard(actualRarity, rng, cardPool);

          // Verify the near-miss card is one rarity higher
          const expectedRarity = actualRarity === 'common' ? 'rare' : 'epic';
          if (nearMissCard.rarity !== expectedRarity) {
            return false;
          }

          // Verify the card comes from the pool
          const cardsOfExpectedRarity = cardPool.get(expectedRarity);
          if (!cardsOfExpectedRarity) {
            return false;
          }

          const cardExists = cardsOfExpectedRarity.some(
            card => card.templateId === nearMissCard.templateId
          );

          return cardExists;
        }
      ),
      { numRuns: 20 }
    );
  });
});
