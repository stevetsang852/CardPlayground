import fc from 'fast-check';
import { LuckValueCalculator } from './LuckValueCalculator';

describe('LuckValueCalculator', () => {
  let calculator: LuckValueCalculator;

  beforeEach(() => {
    calculator = new LuckValueCalculator();
  });

  describe('calculateBonusProbability', () => {
    it('should return 0 when luck value is below threshold', () => {
      expect(calculator.calculateBonusProbability(0)).toBe(0);
      expect(calculator.calculateBonusProbability(25)).toBe(0);
      expect(calculator.calculateBonusProbability(49)).toBe(0);
      expect(calculator.calculateBonusProbability(49.9)).toBe(0);
    });

    it('should return 0 when luck value equals threshold', () => {
      expect(calculator.calculateBonusProbability(50)).toBe(0);
    });

    it('should return proportional bonus when luck value exceeds threshold', () => {
      // At threshold + 25 (halfway to max), bonus should be 2.5% (half of max 5%)
      const bonus1 = calculator.calculateBonusProbability(75);
      expect(bonus1).toBeCloseTo(0.025, 5);

      // At threshold + 50 (at max), bonus should be 5%
      const bonus2 = calculator.calculateBonusProbability(100);
      expect(bonus2).toBeCloseTo(0.05, 5);
    });

    it('should cap bonus at MAX_BONUS (5%)', () => {
      expect(calculator.calculateBonusProbability(100)).toBe(0.05);
      expect(calculator.calculateBonusProbability(150)).toBe(0.05);
      expect(calculator.calculateBonusProbability(200)).toBe(0.05);
      expect(calculator.calculateBonusProbability(1000)).toBe(0.05);
    });

    it('should calculate correct bonus for various luck values', () => {
      // Test specific values
      expect(calculator.calculateBonusProbability(60)).toBeCloseTo(0.01, 5); // 10 excess / 50 * 0.05 = 0.01
      expect(calculator.calculateBonusProbability(70)).toBeCloseTo(0.02, 5); // 20 excess / 50 * 0.05 = 0.02
      expect(calculator.calculateBonusProbability(80)).toBeCloseTo(0.03, 5); // 30 excess / 50 * 0.05 = 0.03
      expect(calculator.calculateBonusProbability(90)).toBeCloseTo(0.04, 5); // 40 excess / 50 * 0.05 = 0.04
    });

    it('should handle negative luck values', () => {
      expect(calculator.calculateBonusProbability(-10)).toBe(0);
      expect(calculator.calculateBonusProbability(-100)).toBe(0);
    });

    it('should handle decimal luck values', () => {
      expect(calculator.calculateBonusProbability(50.5)).toBeCloseTo(0.0005, 5);
      expect(calculator.calculateBonusProbability(75.5)).toBeCloseTo(0.0255, 5);
    });
  });

  describe('updateLuckValue', () => {
    it('should reset luck value to 0 when legendary is drawn', () => {
      expect(calculator.updateLuckValue(0, true)).toBe(0);
      expect(calculator.updateLuckValue(10, true)).toBe(0);
      expect(calculator.updateLuckValue(50, true)).toBe(0);
      expect(calculator.updateLuckValue(100, true)).toBe(0);
      expect(calculator.updateLuckValue(999, true)).toBe(0);
    });

    it('should increment luck value by 1.0 when non-legendary is drawn', () => {
      expect(calculator.updateLuckValue(0, false)).toBe(1.0);
      expect(calculator.updateLuckValue(10, false)).toBe(11.0);
      expect(calculator.updateLuckValue(49, false)).toBe(50.0);
      expect(calculator.updateLuckValue(50, false)).toBe(51.0);
      expect(calculator.updateLuckValue(99, false)).toBe(100.0);
    });

    it('should handle decimal luck values', () => {
      expect(calculator.updateLuckValue(0.5, false)).toBe(1.5);
      expect(calculator.updateLuckValue(10.7, false)).toBe(11.7);
      expect(calculator.updateLuckValue(49.9, false)).toBe(50.9);
    });

    it('should handle negative luck values', () => {
      expect(calculator.updateLuckValue(-5, false)).toBe(-4.0);
      expect(calculator.updateLuckValue(-1, false)).toBe(0.0);
    });
  });

  describe('integration scenarios', () => {
    it('should simulate a typical draw sequence without legendary', () => {
      let luck = 0;

      // Simulate 60 non-legendary draws
      for (let i = 0; i < 60; i++) {
        luck = calculator.updateLuckValue(luck, false);
      }

      expect(luck).toBe(60);
      
      // At luck 60, bonus should be (60-50)/50 * 0.05 = 0.01 (1%)
      const bonus = calculator.calculateBonusProbability(luck);
      expect(bonus).toBeCloseTo(0.01, 5);
    });

    it('should simulate draw sequence with legendary reset', () => {
      let luck = 0;

      // Draw 30 non-legendary cards
      for (let i = 0; i < 30; i++) {
        luck = calculator.updateLuckValue(luck, false);
      }
      expect(luck).toBe(30);

      // Draw 20 more non-legendary cards
      for (let i = 0; i < 20; i++) {
        luck = calculator.updateLuckValue(luck, false);
      }
      expect(luck).toBe(50);

      // No bonus yet at threshold
      expect(calculator.calculateBonusProbability(luck)).toBe(0);

      // Draw 10 more non-legendary cards
      for (let i = 0; i < 10; i++) {
        luck = calculator.updateLuckValue(luck, false);
      }
      expect(luck).toBe(60);

      // Now there's a bonus
      expect(calculator.calculateBonusProbability(luck)).toBeCloseTo(0.01, 5);

      // Draw a legendary - luck resets
      luck = calculator.updateLuckValue(luck, true);
      expect(luck).toBe(0);
      expect(calculator.calculateBonusProbability(luck)).toBe(0);
    });

    it('should simulate reaching maximum bonus', () => {
      let luck = 0;

      // Draw 100 non-legendary cards to reach max bonus
      for (let i = 0; i < 100; i++) {
        luck = calculator.updateLuckValue(luck, false);
      }

      expect(luck).toBe(100);
      expect(calculator.calculateBonusProbability(luck)).toBe(0.05);

      // Draw 50 more - bonus should still be capped
      for (let i = 0; i < 50; i++) {
        luck = calculator.updateLuckValue(luck, false);
      }

      expect(luck).toBe(150);
      expect(calculator.calculateBonusProbability(luck)).toBe(0.05);
    });

    it('should handle multiple legendary draws in sequence', () => {
      let luck = 50;

      // Draw legendary
      luck = calculator.updateLuckValue(luck, true);
      expect(luck).toBe(0);

      // Draw another legendary immediately
      luck = calculator.updateLuckValue(luck, true);
      expect(luck).toBe(0);

      // Draw a third legendary
      luck = calculator.updateLuckValue(luck, true);
      expect(luck).toBe(0);
    });

    it('should verify bonus increases linearly up to max', () => {
      const bonuses: number[] = [];
      
      // Calculate bonuses from threshold to max
      for (let luck = 50; luck <= 100; luck += 10) {
        bonuses.push(calculator.calculateBonusProbability(luck));
      }

      // Verify bonuses are increasing
      for (let i = 1; i < bonuses.length; i++) {
        expect(bonuses[i]).toBeGreaterThanOrEqual(bonuses[i - 1]);
      }

      // Verify first is 0 and last is max
      expect(bonuses[0]).toBe(0);
      expect(bonuses[bonuses.length - 1]).toBe(0.05);
    });
  });

  describe('edge cases', () => {
    it('should handle very large luck values', () => {
      const largeLuck = 1000000;
      expect(calculator.calculateBonusProbability(largeLuck)).toBe(0.05);
      expect(calculator.updateLuckValue(largeLuck, false)).toBe(largeLuck + 1);
      expect(calculator.updateLuckValue(largeLuck, true)).toBe(0);
    });

    it('should handle luck value at exact threshold boundary', () => {
      expect(calculator.calculateBonusProbability(50.0)).toBe(0);
      expect(calculator.calculateBonusProbability(50.0000001)).toBeGreaterThan(0);
    });

    it('should handle luck value at exact max bonus boundary', () => {
      expect(calculator.calculateBonusProbability(100.0)).toBe(0.05);
      expect(calculator.calculateBonusProbability(99.9999999)).toBeLessThan(0.05);
    });
  });

  describe('Property-based tests', () => {
    /**
     * **Validates: Requirements 1.6**
     * 
     * Property 4: Luck value accumulation
     * 
     * For any sequence of non-legendary draws, the player's luck value should
     * increase by the configured increment after each draw.
     * 
     * This property ensures that the luck value accumulates correctly over time,
     * providing the foundation for the pity system.
     */
    it('Property 4: should accumulate luck value by 1.0 for each non-legendary draw', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 10000 }), // Starting luck value
          fc.integer({ min: 1, max: 200 }), // Number of non-legendary draws
          (startingLuck, drawCount) => {
            // Skip NaN values
            if (isNaN(startingLuck)) {
              return true;
            }
            
            let currentLuck = startingLuck;
            
            // Perform sequence of non-legendary draws
            for (let i = 0; i < drawCount; i++) {
              currentLuck = calculator.updateLuckValue(currentLuck, false);
            }
            
            // Luck value should have increased by exactly drawCount
            const expectedLuck = startingLuck + drawCount;
            return Math.abs(currentLuck - expectedLuck) < 0.0001; // Account for floating point precision
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * **Validates: Requirements 1.7**
     * 
     * Property 5: Luck value probability boost
     * 
     * For any player with luck value exceeding the threshold, the legendary drop
     * probability should be increased proportionally to the excess luck value.
     * 
     * This property ensures that the bonus probability calculation is correct and
     * provides the intended boost to legendary drop rates.
     */
    it('Property 5: should increase legendary probability proportionally when luck exceeds threshold', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(50.01), max: 500 }), // Luck value above threshold
          (luckValue) => {
            // Skip NaN values
            if (isNaN(luckValue)) {
              return true;
            }
            
            const bonus = calculator.calculateBonusProbability(luckValue);
            
            // Bonus should be non-negative
            if (bonus < 0) return false;
            
            // Bonus should not exceed MAX_BONUS (5%)
            if (bonus > 0.05) return false;
            
            // For luck values above threshold but below max (100),
            // bonus should be proportional to excess luck
            if (luckValue <= 100) {
              const excessLuck = luckValue - 50;
              const expectedBonus = (excessLuck / 50) * 0.05;
              return Math.abs(bonus - expectedBonus) < 0.0001;
            }
            
            // For luck values above max, bonus should be capped at MAX_BONUS
            return bonus === 0.05;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('Property 5: should return zero bonus when luck is below threshold', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 50 }), // Luck value at or below threshold
          (luckValue) => {
            const bonus = calculator.calculateBonusProbability(luckValue);
            return bonus === 0;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('Property 5: should cap bonus at MAX_BONUS regardless of luck value', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 100000 }), // Luck value at or above max bonus threshold
          (luckValue) => {
            // Skip NaN values
            if (isNaN(luckValue)) {
              return true;
            }
            
            const bonus = calculator.calculateBonusProbability(luckValue);
            return bonus === 0.05;
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * **Validates: Requirements 1.8**
     * 
     * Property 6: Luck value reset on legendary
     * 
     * For any card draw that produces a legendary card, the player's luck value
     * should be reset to zero.
     * 
     * This property ensures that the pity system resets correctly when a legendary
     * is obtained, preventing excessive legendary drop rates.
     */
    it('Property 6: should reset luck value to zero when legendary is drawn', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 10000 }), // Any luck value
          (luckValue) => {
            const newLuck = calculator.updateLuckValue(luckValue, true);
            return newLuck === 0;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('Property 6: should reset luck value to zero regardless of how high it was', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000000 }), // Very large luck values
          (luckValue) => {
            const newLuck = calculator.updateLuckValue(luckValue, true);
            return newLuck === 0;
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Combined property test: Luck value system behavior over draw sequences
     * 
     * This test validates the complete luck value system behavior including
     * accumulation, bonus calculation, and reset mechanics working together.
     */
    it('Property 4-6 combined: should correctly handle mixed draw sequences', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100 }), // Starting luck value
          fc.array(fc.boolean(), { minLength: 1, maxLength: 100 }), // Sequence of draws (true = legendary, false = non-legendary)
          (startingLuck, drawSequence) => {
            let currentLuck = startingLuck;
            let expectedLuck = startingLuck;
            
            for (const isLegendary of drawSequence) {
              // Calculate expected luck value
              if (isLegendary) {
                expectedLuck = 0;
              } else {
                expectedLuck += 1.0;
              }
              
              // Update actual luck value
              currentLuck = calculator.updateLuckValue(currentLuck, isLegendary);
              
              // Verify they match
              if (Math.abs(currentLuck - expectedLuck) > 0.0001) {
                return false;
              }
              
              // Verify bonus calculation is correct for current luck
              const bonus = calculator.calculateBonusProbability(currentLuck);
              
              if (currentLuck < 50) {
                if (bonus !== 0) return false;
              } else if (currentLuck >= 100) {
                if (bonus !== 0.05) return false;
              } else {
                const excessLuck = currentLuck - 50;
                const expectedBonus = (excessLuck / 50) * 0.05;
                if (Math.abs(bonus - expectedBonus) > 0.0001) return false;
              }
            }
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Property test: Monotonicity of bonus probability
     * 
     * Validates that bonus probability increases monotonically with luck value
     * (never decreases as luck increases).
     */
    it('Property 5: bonus probability should increase monotonically with luck value', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 500 }), // First luck value
          fc.float({ min: 0, max: 500 }), // Second luck value
          (luck1, luck2) => {
            // Skip NaN values
            if (isNaN(luck1) || isNaN(luck2)) {
              return true;
            }
            
            const bonus1 = calculator.calculateBonusProbability(luck1);
            const bonus2 = calculator.calculateBonusProbability(luck2);
            
            // If luck1 < luck2, then bonus1 <= bonus2 (monotonic increase)
            if (luck1 < luck2) {
              return bonus1 <= bonus2;
            }
            
            // If luck1 > luck2, then bonus1 >= bonus2
            if (luck1 > luck2) {
              return bonus1 >= bonus2;
            }
            
            // If luck1 === luck2, then bonus1 === bonus2
            return bonus1 === bonus2;
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Property test: Idempotency of legendary reset
     * 
     * Validates that resetting luck value multiple times with legendary draws
     * always results in zero.
     */
    it('Property 6: multiple consecutive legendary draws should keep luck at zero', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 10000 }), // Starting luck value
          fc.integer({ min: 1, max: 20 }), // Number of consecutive legendary draws
          (startingLuck, legendaryCount) => {
            let currentLuck = startingLuck;
            
            // Draw multiple legendaries in a row
            for (let i = 0; i < legendaryCount; i++) {
              currentLuck = calculator.updateLuckValue(currentLuck, true);
              
              // After each legendary, luck should be zero
              if (currentLuck !== 0) return false;
            }
            
            return currentLuck === 0;
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Property test: Luck accumulation is additive
     * 
     * Validates that performing N draws one at a time produces the same result
     * as calculating the expected luck value directly.
     */
    it('Property 4: luck accumulation should be additive and commutative', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100 }), // Starting luck
          fc.integer({ min: 1, max: 50 }), // First batch of draws
          fc.integer({ min: 1, max: 50 }), // Second batch of draws
          (startingLuck, batch1, batch2) => {
            // Skip NaN values
            if (isNaN(startingLuck)) {
              return true;
            }
            
            // Method 1: Apply all draws at once
            let luck1 = startingLuck;
            for (let i = 0; i < batch1 + batch2; i++) {
              luck1 = calculator.updateLuckValue(luck1, false);
            }
            
            // Method 2: Apply draws in two batches
            let luck2 = startingLuck;
            for (let i = 0; i < batch1; i++) {
              luck2 = calculator.updateLuckValue(luck2, false);
            }
            for (let i = 0; i < batch2; i++) {
              luck2 = calculator.updateLuckValue(luck2, false);
            }
            
            // Both methods should produce the same result
            return Math.abs(luck1 - luck2) < 0.0001;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
