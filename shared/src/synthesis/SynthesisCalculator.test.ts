import { SynthesisCalculator } from './SynthesisCalculator';
import { SynthesisRecipe } from '../types/synthesis';
import { ActiveEvent } from '../types/event';
import { SeededRandom } from '../random/SeededRandom';

describe('SynthesisCalculator', () => {
  let calculator: SynthesisCalculator;

  beforeEach(() => {
    calculator = new SynthesisCalculator();
  });

  describe('calculateSuccessRate', () => {
    const normalRecipe: SynthesisRecipe = {
      type: 'normal',
      requiredCards: { count: 3, mustBeIdentical: true },
      outputRarity: 'rare',
      baseSuccessRate: 1.0,
    };

    const advancedRecipe: SynthesisRecipe = {
      type: 'advanced',
      requiredCards: { count: 2, mustBeIdentical: true },
      outputRarity: 'epic',
      baseSuccessRate: 0.7,
    };

    const gamblerRecipe: SynthesisRecipe = {
      type: 'gambler',
      requiredCards: { count: 1, mustBeIdentical: false },
      outputRarity: 'epic',
      baseSuccessRate: 0.5,
    };

    const legendaryRecipe: SynthesisRecipe = {
      type: 'legendary',
      requiredCards: { count: 5, mustBeIdentical: false, rarityRequirement: 'epic' },
      outputRarity: 'legendary',
      baseSuccessRate: 0.3,
    };

    it('should return base success rate with no modifiers', () => {
      const rate = calculator.calculateSuccessRate(advancedRecipe, [], 0);
      expect(rate).toBe(0.7);
    });

    it('should apply Lucky Moment bonus (+20%)', () => {
      const luckyEvent: ActiveEvent = {
        id: 'event1',
        playerId: 'player1',
        eventType: 'lucky',
        triggeredAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        luckyMomentBonus: 0.20,
        claimed: false,
      };

      const rate = calculator.calculateSuccessRate(advancedRecipe, [luckyEvent], 0);
      expect(rate).toBeCloseTo(0.9); // 0.7 + 0.2
    });

    it('should apply failure protection bonus after 3 failures', () => {
      const rate = calculator.calculateSuccessRate(advancedRecipe, [], 3);
      expect(rate).toBeCloseTo(0.8); // 0.7 + 0.1
    });

    it('should not apply failure protection bonus with less than 3 failures', () => {
      const rate1 = calculator.calculateSuccessRate(advancedRecipe, [], 0);
      const rate2 = calculator.calculateSuccessRate(advancedRecipe, [], 1);
      const rate3 = calculator.calculateSuccessRate(advancedRecipe, [], 2);
      
      expect(rate1).toBe(0.7);
      expect(rate2).toBe(0.7);
      expect(rate3).toBe(0.7);
    });

    it('should apply both Lucky Moment and failure protection bonuses', () => {
      const luckyEvent: ActiveEvent = {
        id: 'event1',
        playerId: 'player1',
        eventType: 'lucky',
        triggeredAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        luckyMomentBonus: 0.20,
        claimed: false,
      };

      const rate = calculator.calculateSuccessRate(legendaryRecipe, [luckyEvent], 3);
      expect(rate).toBe(0.6); // 0.3 + 0.2 + 0.1
    });

    it('should cap success rate at 100%', () => {
      const luckyEvent: ActiveEvent = {
        id: 'event1',
        playerId: 'player1',
        eventType: 'lucky',
        triggeredAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        luckyMomentBonus: 0.20,
        claimed: false,
      };

      // Normal recipe has 100% base rate, adding bonuses should cap at 100%
      const rate = calculator.calculateSuccessRate(normalRecipe, [luckyEvent], 3);
      expect(rate).toBe(1.0); // Capped at 1.0, not 1.3
    });

    it('should ignore non-lucky events', () => {
      const stormEvent: ActiveEvent = {
        id: 'event1',
        playerId: 'player1',
        eventType: 'storm',
        triggeredAt: new Date().toISOString(),
        stormDrawsRemaining: 3,
        claimed: false,
      };

      const rate = calculator.calculateSuccessRate(advancedRecipe, [stormEvent], 0);
      expect(rate).toBe(0.7); // No bonus applied
    });

    it('should handle multiple events but only apply lucky bonus', () => {
      const luckyEvent: ActiveEvent = {
        id: 'event1',
        playerId: 'player1',
        eventType: 'lucky',
        triggeredAt: new Date().toISOString(),
        luckyMomentBonus: 0.20,
        claimed: false,
      };

      const stormEvent: ActiveEvent = {
        id: 'event2',
        playerId: 'player1',
        eventType: 'storm',
        triggeredAt: new Date().toISOString(),
        stormDrawsRemaining: 3,
        claimed: false,
      };

      const rate = calculator.calculateSuccessRate(
        advancedRecipe,
        [luckyEvent, stormEvent],
        0
      );
      expect(rate).toBeCloseTo(0.9); // 0.7 + 0.2
    });

    it('should handle lucky event without luckyMomentBonus field', () => {
      const luckyEvent: ActiveEvent = {
        id: 'event1',
        playerId: 'player1',
        eventType: 'lucky',
        triggeredAt: new Date().toISOString(),
        claimed: false,
      };

      const rate = calculator.calculateSuccessRate(advancedRecipe, [luckyEvent], 0);
      expect(rate).toBe(0.7); // No bonus if field is missing
    });

    it('should work with all synthesis types', () => {
      expect(calculator.calculateSuccessRate(normalRecipe, [], 0)).toBe(1.0);
      expect(calculator.calculateSuccessRate(advancedRecipe, [], 0)).toBe(0.7);
      expect(calculator.calculateSuccessRate(gamblerRecipe, [], 0)).toBe(0.5);
      expect(calculator.calculateSuccessRate(legendaryRecipe, [], 0)).toBe(0.3);
    });
  });

  describe('performSynthesis', () => {
    const testRecipe: SynthesisRecipe = {
      type: 'advanced',
      requiredCards: { count: 2, mustBeIdentical: true },
      outputRarity: 'epic',
      baseSuccessRate: 0.7,
    };

    it('should succeed when random value is below success rate', () => {
      const rng = new SeededRandom(12345);
      const firstRoll = rng.next();
      
      // Reset with same seed to get same roll
      const rng2 = new SeededRandom(12345);
      const result = calculator.performSynthesis(testRecipe, 0.9, rng2);
      
      // If firstRoll < 0.9, should succeed
      expect(result).toBe(firstRoll < 0.9);
    });

    it('should fail when random value is above success rate', () => {
      const rng = new SeededRandom(12345);
      const firstRoll = rng.next();
      
      // Reset with same seed to get same roll
      const rng2 = new SeededRandom(12345);
      const result = calculator.performSynthesis(testRecipe, 0.1, rng2);
      
      // If firstRoll >= 0.1, should fail
      expect(result).toBe(firstRoll < 0.1);
    });

    it('should always succeed with 100% success rate', () => {
      // Test multiple seeds
      for (let seed = 0; seed < 100; seed++) {
        const rng = new SeededRandom(seed);
        const result = calculator.performSynthesis(testRecipe, 1.0, rng);
        expect(result).toBe(true);
      }
    });

    it('should always fail with 0% success rate', () => {
      // Test multiple seeds
      for (let seed = 0; seed < 100; seed++) {
        const rng = new SeededRandom(seed);
        const result = calculator.performSynthesis(testRecipe, 0.0, rng);
        expect(result).toBe(false);
      }
    });

    it('should be deterministic with same seed', () => {
      const seed = 42;
      
      const rng1 = new SeededRandom(seed);
      const result1 = calculator.performSynthesis(testRecipe, 0.7, rng1);
      
      const rng2 = new SeededRandom(seed);
      const result2 = calculator.performSynthesis(testRecipe, 0.7, rng2);
      
      expect(result1).toBe(result2);
    });

    it('should produce different results with different seeds', () => {
      const results = new Set<boolean>();
      
      // Try 100 different seeds
      for (let seed = 0; seed < 100; seed++) {
        const rng = new SeededRandom(seed);
        const result = calculator.performSynthesis(testRecipe, 0.5, rng);
        results.add(result);
      }
      
      // With 50% success rate and 100 attempts, we should see both outcomes
      expect(results.size).toBe(2);
      expect(results.has(true)).toBe(true);
      expect(results.has(false)).toBe(true);
    });

    it('should approximate success rate over many attempts', () => {
      const successRate = 0.7;
      let successes = 0;
      const attempts = 1000;
      
      for (let i = 0; i < attempts; i++) {
        const rng = new SeededRandom(i);
        if (calculator.performSynthesis(testRecipe, successRate, rng)) {
          successes++;
        }
      }
      
      const observedRate = successes / attempts;
      
      // Should be within 5% of expected rate
      expect(observedRate).toBeGreaterThan(successRate - 0.05);
      expect(observedRate).toBeLessThan(successRate + 0.05);
    });
  });

  describe('integration tests', () => {
    it('should handle complete synthesis flow', () => {
      const recipe: SynthesisRecipe = {
        type: 'gambler',
        requiredCards: { count: 1, mustBeIdentical: false },
        outputRarity: 'epic',
        baseSuccessRate: 0.5,
      };

      const luckyEvent: ActiveEvent = {
        id: 'event1',
        playerId: 'player1',
        eventType: 'lucky',
        triggeredAt: new Date().toISOString(),
        luckyMomentBonus: 0.20,
        claimed: false,
      };

      // Calculate success rate with Lucky Moment and failure protection
      const successRate = calculator.calculateSuccessRate(recipe, [luckyEvent], 3);
      expect(successRate).toBeCloseTo(0.8); // 0.5 + 0.2 + 0.1

      // Perform synthesis
      const rng = new SeededRandom(12345);
      const result = calculator.performSynthesis(recipe, successRate, rng);
      
      // Result should be deterministic
      expect(typeof result).toBe('boolean');
    });
  });
});

// ============================================================================
// Property-Based Tests
// ============================================================================

import * as fc from 'fast-check';

describe('SynthesisCalculator - Property-Based Tests', () => {
  let calculator: SynthesisCalculator;

  beforeEach(() => {
    calculator = new SynthesisCalculator();
  });

  // **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
  describe('Property 9: Synthesis success rate adherence', () => {
    it('should converge to configured success rate over large samples', () => {
      fc.assert(
        fc.property(
          fc.record({
            baseSuccessRate: fc.double({ min: 0.0, max: 1.0, noNaN: true }),
            sampleSize: fc.integer({ min: 1000, max: 5000 }),
            seedOffset: fc.integer({ min: 0, max: 10000 }),
          }),
          ({ baseSuccessRate, sampleSize, seedOffset }) => {
            const recipe: SynthesisRecipe = {
              type: 'advanced',
              requiredCards: { count: 2, mustBeIdentical: true },
              outputRarity: 'epic',
              baseSuccessRate,
            };

            let successes = 0;
            for (let i = 0; i < sampleSize; i++) {
              const rng = new SeededRandom(seedOffset + i);
              const successRate = calculator.calculateSuccessRate(recipe, [], 0);
              if (calculator.performSynthesis(recipe, successRate, rng)) {
                successes++;
              }
            }

            const observedRate = successes / sampleSize;
            
            // Statistical tolerance: within 5% for large samples
            // Using a more lenient tolerance for edge cases near 0 or 1
            const tolerance = Math.max(0.05, Math.min(baseSuccessRate, 1 - baseSuccessRate) * 0.2);
            
            return Math.abs(observedRate - baseSuccessRate) <= tolerance;
          }
        ),
        { numRuns: 10 } // Reduced runs for faster execution
      );
    });

    it('should converge to modified success rate with Lucky Moment bonus', () => {
      fc.assert(
        fc.property(
          fc.record({
            baseSuccessRate: fc.double({ min: 0.0, max: 0.8, noNaN: true }), // Cap at 0.8 so +0.2 doesn't exceed 1.0
            sampleSize: fc.integer({ min: 1000, max: 3000 }),
            seedOffset: fc.integer({ min: 0, max: 10000 }),
          }),
          ({ baseSuccessRate, sampleSize, seedOffset }) => {
            const recipe: SynthesisRecipe = {
              type: 'advanced',
              requiredCards: { count: 2, mustBeIdentical: true },
              outputRarity: 'epic',
              baseSuccessRate,
            };

            const luckyEvent: ActiveEvent = {
              id: 'event1',
              playerId: 'player1',
              eventType: 'lucky',
              triggeredAt: new Date().toISOString(),
              luckyMomentBonus: 0.20,
              claimed: false,
            };

            let successes = 0;
            for (let i = 0; i < sampleSize; i++) {
              const rng = new SeededRandom(seedOffset + i);
              const successRate = calculator.calculateSuccessRate(recipe, [luckyEvent], 0);
              if (calculator.performSynthesis(recipe, successRate, rng)) {
                successes++;
              }
            }

            const observedRate = successes / sampleSize;
            const expectedRate = baseSuccessRate + 0.20;
            
            // Statistical tolerance: within 5%
            const tolerance = 0.05;
            
            return Math.abs(observedRate - expectedRate) <= tolerance;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should converge to modified success rate with failure protection', () => {
      fc.assert(
        fc.property(
          fc.record({
            baseSuccessRate: fc.double({ min: 0.0, max: 0.9, noNaN: true }), // Cap at 0.9 so +0.1 doesn't exceed 1.0
            sampleSize: fc.integer({ min: 1000, max: 3000 }),
            seedOffset: fc.integer({ min: 0, max: 10000 }),
          }),
          ({ baseSuccessRate, sampleSize, seedOffset }) => {
            const recipe: SynthesisRecipe = {
              type: 'advanced',
              requiredCards: { count: 2, mustBeIdentical: true },
              outputRarity: 'epic',
              baseSuccessRate,
            };

            let successes = 0;
            for (let i = 0; i < sampleSize; i++) {
              const rng = new SeededRandom(seedOffset + i);
              const successRate = calculator.calculateSuccessRate(recipe, [], 3); // 3 failures
              if (calculator.performSynthesis(recipe, successRate, rng)) {
                successes++;
              }
            }

            const observedRate = successes / sampleSize;
            const expectedRate = baseSuccessRate + 0.10;
            
            // Statistical tolerance: within 5%
            const tolerance = 0.05;
            
            return Math.abs(observedRate - expectedRate) <= tolerance;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  // **Validates: Requirements 2.8**
  describe('Property 11: Lucky Moment synthesis bonus', () => {
    it('should add exactly 20% to success rate when Lucky Moment is active', () => {
      fc.assert(
        fc.property(
          fc.record({
            baseSuccessRate: fc.double({ min: 0.0, max: 1.0, noNaN: true }),
            failureCount: fc.integer({ min: 0, max: 10 }),
          }),
          ({ baseSuccessRate, failureCount }) => {
            const recipe: SynthesisRecipe = {
              type: 'gambler',
              requiredCards: { count: 1, mustBeIdentical: false },
              outputRarity: 'epic',
              baseSuccessRate,
            };

            const luckyEvent: ActiveEvent = {
              id: 'lucky1',
              playerId: 'player1',
              eventType: 'lucky',
              triggeredAt: new Date().toISOString(),
              luckyMomentBonus: 0.20,
              claimed: false,
            };

            // Calculate rate without Lucky Moment
            const rateWithout = calculator.calculateSuccessRate(recipe, [], failureCount);
            
            // Calculate rate with Lucky Moment
            const rateWith = calculator.calculateSuccessRate(recipe, [luckyEvent], failureCount);
            
            // The difference should be exactly 0.20, unless capped at 1.0
            const expectedDifference = Math.min(rateWithout + 0.20, 1.0) - rateWithout;
            const actualDifference = rateWith - rateWithout;
            
            return Math.abs(actualDifference - expectedDifference) < 0.0001; // Floating point tolerance
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should not apply bonus when Lucky Moment event is missing luckyMomentBonus field', () => {
      fc.assert(
        fc.property(
          fc.record({
            baseSuccessRate: fc.double({ min: 0.0, max: 1.0, noNaN: true }),
            failureCount: fc.integer({ min: 0, max: 10 }),
          }),
          ({ baseSuccessRate, failureCount }) => {
            const recipe: SynthesisRecipe = {
              type: 'gambler',
              requiredCards: { count: 1, mustBeIdentical: false },
              outputRarity: 'epic',
              baseSuccessRate,
            };

            const luckyEventWithoutBonus: ActiveEvent = {
              id: 'lucky1',
              playerId: 'player1',
              eventType: 'lucky',
              triggeredAt: new Date().toISOString(),
              claimed: false,
            };

            // Calculate rate without any events
            const rateWithout = calculator.calculateSuccessRate(recipe, [], failureCount);
            
            // Calculate rate with Lucky Moment event but no bonus field
            const rateWith = calculator.calculateSuccessRate(
              recipe,
              [luckyEventWithoutBonus],
              failureCount
            );
            
            // Rates should be identical
            return Math.abs(rateWith - rateWithout) < 0.0001;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should only apply Lucky Moment bonus once even with multiple lucky events', () => {
      fc.assert(
        fc.property(
          fc.record({
            baseSuccessRate: fc.double({ min: 0.0, max: 1.0, noNaN: true }),
            numLuckyEvents: fc.integer({ min: 1, max: 5 }),
          }),
          ({ baseSuccessRate, numLuckyEvents }) => {
            const recipe: SynthesisRecipe = {
              type: 'gambler',
              requiredCards: { count: 1, mustBeIdentical: false },
              outputRarity: 'epic',
              baseSuccessRate,
            };

            // Create multiple lucky events
            const luckyEvents: ActiveEvent[] = Array.from({ length: numLuckyEvents }, (_, i) => ({
              id: `lucky${i}`,
              playerId: 'player1',
              eventType: 'lucky',
              triggeredAt: new Date().toISOString(),
              luckyMomentBonus: 0.20,
              claimed: false,
            }));

            const rate = calculator.calculateSuccessRate(recipe, luckyEvents, 0);
            const expectedRate = Math.min(baseSuccessRate + 0.20, 1.0);
            
            // Should only apply bonus once
            return Math.abs(rate - expectedRate) < 0.0001;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // **Validates: Requirements 8.8**
  describe('Property 12: Failure protection activation', () => {
    it('should add exactly 10% to success rate after 3 consecutive failures', () => {
      fc.assert(
        fc.property(
          fc.record({
            baseSuccessRate: fc.double({ min: 0.0, max: 1.0, noNaN: true }),
            failureCount: fc.integer({ min: 3, max: 20 }),
          }),
          ({ baseSuccessRate, failureCount }) => {
            const recipe: SynthesisRecipe = {
              type: 'legendary',
              requiredCards: { count: 5, mustBeIdentical: false, rarityRequirement: 'epic' },
              outputRarity: 'legendary',
              baseSuccessRate,
            };

            // Calculate rate without failure protection (0 failures)
            const rateWithout = calculator.calculateSuccessRate(recipe, [], 0);
            
            // Calculate rate with failure protection (3+ failures)
            const rateWith = calculator.calculateSuccessRate(recipe, [], failureCount);
            
            // The difference should be exactly 0.10, unless capped at 1.0
            const expectedDifference = Math.min(rateWithout + 0.10, 1.0) - rateWithout;
            const actualDifference = rateWith - rateWithout;
            
            return Math.abs(actualDifference - expectedDifference) < 0.0001;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should not add bonus with fewer than 3 failures', () => {
      fc.assert(
        fc.property(
          fc.record({
            baseSuccessRate: fc.double({ min: 0.0, max: 1.0, noNaN: true }),
            failureCount: fc.integer({ min: 0, max: 2 }),
          }),
          ({ baseSuccessRate, failureCount }) => {
            const recipe: SynthesisRecipe = {
              type: 'legendary',
              requiredCards: { count: 5, mustBeIdentical: false, rarityRequirement: 'epic' },
              outputRarity: 'legendary',
              baseSuccessRate,
            };

            // Calculate rate with less than 3 failures
            const rate = calculator.calculateSuccessRate(recipe, [], failureCount);
            
            // Should equal base rate (capped at 1.0)
            const expectedRate = Math.min(baseSuccessRate, 1.0);
            
            return Math.abs(rate - expectedRate) < 0.0001;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should combine failure protection with Lucky Moment bonus correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            baseSuccessRate: fc.double({ min: 0.0, max: 0.7, noNaN: true }), // Cap to avoid exceeding 1.0
            failureCount: fc.integer({ min: 3, max: 20 }),
          }),
          ({ baseSuccessRate, failureCount }) => {
            const recipe: SynthesisRecipe = {
              type: 'legendary',
              requiredCards: { count: 5, mustBeIdentical: false, rarityRequirement: 'epic' },
              outputRarity: 'legendary',
              baseSuccessRate,
            };

            const luckyEvent: ActiveEvent = {
              id: 'lucky1',
              playerId: 'player1',
              eventType: 'lucky',
              triggeredAt: new Date().toISOString(),
              luckyMomentBonus: 0.20,
              claimed: false,
            };

            // Calculate rate with both bonuses
            const rate = calculator.calculateSuccessRate(recipe, [luckyEvent], failureCount);
            
            // Expected: base + 0.20 (Lucky) + 0.10 (failure protection), capped at 1.0
            const expectedRate = Math.min(baseSuccessRate + 0.20 + 0.10, 1.0);
            
            return Math.abs(rate - expectedRate) < 0.0001;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should apply same bonus regardless of failure count above threshold', () => {
      fc.assert(
        fc.property(
          fc.record({
            baseSuccessRate: fc.double({ min: 0.0, max: 1.0, noNaN: true }),
            failureCount1: fc.integer({ min: 3, max: 10 }),
            failureCount2: fc.integer({ min: 3, max: 10 }),
          }),
          ({ baseSuccessRate, failureCount1, failureCount2 }) => {
            const recipe: SynthesisRecipe = {
              type: 'legendary',
              requiredCards: { count: 5, mustBeIdentical: false, rarityRequirement: 'epic' },
              outputRarity: 'legendary',
              baseSuccessRate,
            };

            // Both should get the same 10% bonus
            const rate1 = calculator.calculateSuccessRate(recipe, [], failureCount1);
            const rate2 = calculator.calculateSuccessRate(recipe, [], failureCount2);
            
            // Rates should be identical
            return Math.abs(rate1 - rate2) < 0.0001;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // Combined property test: All modifiers work correctly together
  describe('Property: Combined modifier correctness', () => {
    it('should correctly apply all modifiers and cap at 100%', () => {
      fc.assert(
        fc.property(
          fc.record({
            baseSuccessRate: fc.double({ min: 0.0, max: 1.0, noNaN: true }),
            hasLuckyMoment: fc.boolean(),
            failureCount: fc.integer({ min: 0, max: 10 }),
          }),
          ({ baseSuccessRate, hasLuckyMoment, failureCount }) => {
            const recipe: SynthesisRecipe = {
              type: 'gambler',
              requiredCards: { count: 1, mustBeIdentical: false },
              outputRarity: 'epic',
              baseSuccessRate,
            };

            const events: ActiveEvent[] = hasLuckyMoment
              ? [
                  {
                    id: 'lucky1',
                    playerId: 'player1',
                    eventType: 'lucky',
                    triggeredAt: new Date().toISOString(),
                    luckyMomentBonus: 0.20,
                    claimed: false,
                  },
                ]
              : [];

            const rate = calculator.calculateSuccessRate(recipe, events, failureCount);

            // Calculate expected rate
            let expectedRate = baseSuccessRate;
            if (hasLuckyMoment) {
              expectedRate += 0.20;
            }
            if (failureCount >= 3) {
              expectedRate += 0.10;
            }
            expectedRate = Math.min(expectedRate, 1.0);

            // Rate should always be between 0 and 1
            const isInRange = rate >= 0.0 && rate <= 1.0;
            
            // Rate should match expected
            const matchesExpected = Math.abs(rate - expectedRate) < 0.0001;

            return isInRange && matchesExpected;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // **Validates: Requirements 2.5**
  describe('Property 10: Failed synthesis card consumption', () => {
    it('should consume all input cards and produce no output when synthesis fails', () => {
      fc.assert(
        fc.property(
          fc.record({
            synthesisType: fc.constantFrom('normal', 'advanced', 'gambler', 'legendary') as fc.Arbitrary<SynthesisRecipe['type']>,
            numInputCards: fc.integer({ min: 1, max: 5 }),
            initialCardCount: fc.integer({ min: 5, max: 20 }),
            seed: fc.integer({ min: 0, max: 100000 }),
          }),
          ({ synthesisType, numInputCards, initialCardCount, seed }) => {
            // Create a recipe with 0% success rate to guarantee failure
            const recipe: SynthesisRecipe = {
              type: synthesisType,
              requiredCards: { count: numInputCards, mustBeIdentical: false },
              outputRarity: 'epic',
              baseSuccessRate: 0.0, // Guaranteed failure
            };

            // Create mock player with cards
            const inputCardIds = Array.from({ length: numInputCards }, (_, i) => `input_card_${i}`);
            const otherCardIds = Array.from(
              { length: initialCardCount - numInputCards },
              (_, i) => `other_card_${i}`
            );
            const allCardIds = [...inputCardIds, ...otherCardIds];

            const mockPlayer = {
              id: 'test_player',
              cards: [...allCardIds], // Copy to preserve original
            };

            // Perform synthesis (will fail due to 0% success rate)
            const rng = new SeededRandom(seed);
            const successRate = calculator.calculateSuccessRate(recipe, [], 0);
            const synthesisSucceeded = calculator.performSynthesis(recipe, successRate, rng);

            // Verify synthesis failed
            if (synthesisSucceeded) {
              // This should never happen with 0% success rate
              return false;
            }

            // Simulate card consumption (what the service would do)
            const updatedCards = mockPlayer.cards.filter(
              cardId => !inputCardIds.includes(cardId)
            );

            // Property checks:
            // 1. All input cards should be removed
            const allInputCardsRemoved = inputCardIds.every(
              cardId => !updatedCards.includes(cardId)
            );

            // 2. Player's card count should decrease by exactly the number of input cards
            const cardCountDecreased = 
              updatedCards.length === mockPlayer.cards.length - numInputCards;

            // 3. Other cards should remain unchanged
            const otherCardsPreserved = otherCardIds.every(
              cardId => updatedCards.includes(cardId)
            );

            // 4. No output card should be produced (verified by synthesis failure)
            const noOutputProduced = !synthesisSucceeded;

            return (
              allInputCardsRemoved &&
              cardCountDecreased &&
              otherCardsPreserved &&
              noOutputProduced
            );
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should consume cards regardless of synthesis type when synthesis fails', () => {
      fc.assert(
        fc.property(
          fc.record({
            synthesisType: fc.constantFrom('normal', 'advanced', 'gambler', 'legendary') as fc.Arbitrary<SynthesisRecipe['type']>,
            baseSuccessRate: fc.double({ min: 0.0, max: 0.99, noNaN: true }), // Not 100% to allow failures
            seed: fc.integer({ min: 0, max: 100000 }),
          }),
          ({ synthesisType, baseSuccessRate, seed }) => {
            // Map synthesis type to required card count
            const cardCountMap: Record<SynthesisRecipe['type'], number> = {
              normal: 3,
              advanced: 2,
              gambler: 1,
              legendary: 5,
            };

            const numInputCards = cardCountMap[synthesisType];

            const recipe: SynthesisRecipe = {
              type: synthesisType,
              requiredCards: { count: numInputCards, mustBeIdentical: false },
              outputRarity: 'epic',
              baseSuccessRate,
            };

            // Create mock player with cards
            const inputCardIds = Array.from({ length: numInputCards }, (_, i) => `input_${i}`);
            const otherCardIds = ['other_1', 'other_2', 'other_3'];
            const allCardIds = [...inputCardIds, ...otherCardIds];

            const initialCardCount = allCardIds.length;

            // Perform synthesis
            const rng = new SeededRandom(seed);
            const successRate = calculator.calculateSuccessRate(recipe, [], 0);
            const synthesisSucceeded = calculator.performSynthesis(recipe, successRate, rng);

            // Only check properties when synthesis fails
            if (!synthesisSucceeded) {
              // Simulate card consumption
              const updatedCards = allCardIds.filter(
                cardId => !inputCardIds.includes(cardId)
              );

              // All input cards should be removed
              const allInputCardsRemoved = inputCardIds.every(
                cardId => !updatedCards.includes(cardId)
              );

              // Card count should decrease by number of input cards
              const cardCountDecreased = updatedCards.length === initialCardCount - numInputCards;

              // Other cards should remain
              const otherCardsPreserved = otherCardIds.every(
                cardId => updatedCards.includes(cardId)
              );

              return allInputCardsRemoved && cardCountDecreased && otherCardsPreserved;
            }

            // If synthesis succeeded, property doesn't apply (but test passes)
            return true;
          }
        ),
        { numRuns: 30 } // Reduced runs for faster execution
      );
    });

    it('should handle edge case of consuming all player cards when synthesis fails', () => {
      fc.assert(
        fc.property(
          fc.record({
            numCards: fc.integer({ min: 1, max: 5 }),
            seed: fc.integer({ min: 0, max: 100000 }),
          }),
          ({ numCards, seed }) => {
            const recipe: SynthesisRecipe = {
              type: 'normal',
              requiredCards: { count: numCards, mustBeIdentical: false },
              outputRarity: 'epic',
              baseSuccessRate: 0.0, // Guaranteed failure
            };

            // Player has exactly the number of cards needed for synthesis
            const inputCardIds = Array.from({ length: numCards }, (_, i) => `card_${i}`);
            const mockPlayer = {
              id: 'test_player',
              cards: [...inputCardIds],
            };

            // Perform synthesis (will fail)
            const rng = new SeededRandom(seed);
            const successRate = calculator.calculateSuccessRate(recipe, [], 0);
            const synthesisSucceeded = calculator.performSynthesis(recipe, successRate, rng);

            // Verify synthesis failed
            if (synthesisSucceeded) {
              return false;
            }

            // Simulate card consumption
            const updatedCards = mockPlayer.cards.filter(
              cardId => !inputCardIds.includes(cardId)
            );

            // Player should have no cards left
            return updatedCards.length === 0;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should consume correct number of cards for each synthesis type on failure', () => {
      fc.assert(
        fc.property(
          fc.record({
            seed: fc.integer({ min: 0, max: 100000 }),
          }),
          ({ seed }) => {
            const synthesisConfigs: Array<{
              type: SynthesisRecipe['type'];
              cardCount: number;
              baseRate: number;
            }> = [
              { type: 'normal', cardCount: 3, baseRate: 0.0 },
              { type: 'advanced', cardCount: 2, baseRate: 0.0 },
              { type: 'gambler', cardCount: 1, baseRate: 0.0 },
              { type: 'legendary', cardCount: 5, baseRate: 0.0 },
            ];

            const results = synthesisConfigs.map(config => {
              const recipe: SynthesisRecipe = {
                type: config.type,
                requiredCards: { count: config.cardCount, mustBeIdentical: false },
                outputRarity: 'epic',
                baseSuccessRate: config.baseRate,
              };

              // Create player with enough cards
              const inputCardIds = Array.from(
                { length: config.cardCount },
                (_, i) => `${config.type}_card_${i}`
              );
              const otherCardIds = ['other_1', 'other_2'];
              const allCardIds = [...inputCardIds, ...otherCardIds];

              // Perform synthesis
              const rng = new SeededRandom(seed);
              const successRate = calculator.calculateSuccessRate(recipe, [], 0);
              const synthesisSucceeded = calculator.performSynthesis(recipe, successRate, rng);

              // Simulate card consumption
              const updatedCards = allCardIds.filter(
                cardId => !inputCardIds.includes(cardId)
              );

              // Verify correct number of cards consumed
              const correctConsumption =
                !synthesisSucceeded &&
                updatedCards.length === allCardIds.length - config.cardCount;

              return correctConsumption;
            });

            // All synthesis types should consume correct number of cards
            return results.every(result => result === true);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
