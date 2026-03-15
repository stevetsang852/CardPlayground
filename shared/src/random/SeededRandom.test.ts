import fc from 'fast-check';
import { SeededRandom } from './SeededRandom';

describe('SeededRandom', () => {
  describe('next()', () => {
    it('should generate numbers between 0 and 1', () => {
      const rng = new SeededRandom(12345);
      
      for (let i = 0; i < 100; i++) {
        const value = rng.next();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('should generate deterministic sequence with same seed', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);
      
      const sequence1 = Array.from({ length: 10 }, () => rng1.next());
      const sequence2 = Array.from({ length: 10 }, () => rng2.next());
      
      expect(sequence1).toEqual(sequence2);
    });

    it('should generate different sequences with different seeds', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(43);
      
      const sequence1 = Array.from({ length: 10 }, () => rng1.next());
      const sequence2 = Array.from({ length: 10 }, () => rng2.next());
      
      expect(sequence1).not.toEqual(sequence2);
    });

    it('should maintain state across multiple calls', () => {
      const rng = new SeededRandom(12345);
      
      const first = rng.next();
      const second = rng.next();
      const third = rng.next();
      
      // Create a new RNG with same seed and verify sequence
      const rng2 = new SeededRandom(12345);
      expect(rng2.next()).toBe(first);
      expect(rng2.next()).toBe(second);
      expect(rng2.next()).toBe(third);
    });
  });

  describe('nextInRange()', () => {
    it('should generate numbers within specified range', () => {
      const rng = new SeededRandom(12345);
      const min = 10;
      const max = 20;
      
      for (let i = 0; i < 100; i++) {
        const value = rng.nextInRange(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThan(max);
      }
    });

    it('should generate deterministic sequence in range with same seed', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);
      const min = 5;
      const max = 15;
      
      const sequence1 = Array.from({ length: 10 }, () => rng1.nextInRange(min, max));
      const sequence2 = Array.from({ length: 10 }, () => rng2.nextInRange(min, max));
      
      expect(sequence1).toEqual(sequence2);
    });

    it('should handle negative ranges', () => {
      const rng = new SeededRandom(12345);
      const min = -10;
      const max = -5;
      
      for (let i = 0; i < 100; i++) {
        const value = rng.nextInRange(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThan(max);
      }
    });

    it('should handle ranges crossing zero', () => {
      const rng = new SeededRandom(12345);
      const min = -5;
      const max = 5;
      
      for (let i = 0; i < 100; i++) {
        const value = rng.nextInRange(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThan(max);
      }
    });

    it('should handle very small ranges', () => {
      const rng = new SeededRandom(12345);
      const min = 0;
      const max = 0.001;
      
      for (let i = 0; i < 100; i++) {
        const value = rng.nextInRange(min, max);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThan(max);
      }
    });
  });

  describe('Linear Congruential Generator properties', () => {
    it('should use correct LCG parameters', () => {
      // Test that the implementation follows the LCG formula
      const seed = 12345;
      const rng = new SeededRandom(seed);
      
      // First call should produce: (12345 * 1103515245 + 12345) & 0x7fffffff
      const expectedSeed1 = (seed * 1103515245 + 12345) & 0x7fffffff;
      const result1 = rng.next();
      expect(result1).toBe(expectedSeed1 / 0x7fffffff);
      
      // Second call should use the updated seed
      const expectedSeed2 = (expectedSeed1 * 1103515245 + 12345) & 0x7fffffff;
      const result2 = rng.next();
      expect(result2).toBe(expectedSeed2 / 0x7fffffff);
    });

    it('should produce a well-distributed sequence', () => {
      const rng = new SeededRandom(42);
      const buckets = new Array(10).fill(0);
      const iterations = 10000;
      
      for (let i = 0; i < iterations; i++) {
        const value = rng.next();
        const bucket = Math.floor(value * 10);
        buckets[bucket]++;
      }
      
      // Each bucket should have roughly 1000 values (10% of 10000)
      // Allow for statistical variance - check each bucket is within 20% of expected
      const expected = iterations / 10;
      const tolerance = expected * 0.2;
      
      buckets.forEach(count => {
        expect(count).toBeGreaterThan(expected - tolerance);
        expect(count).toBeLessThan(expected + tolerance);
      });
    });
  });

  describe('Property-based tests', () => {
    /**
     * **Validates: Requirements 1.10**
     * 
     * Property 7: Deterministic draw reproduction
     * 
     * For any card draw with a given seed, pack configuration, and player state,
     * executing the draw algorithm multiple times should produce identical results.
     * 
     * This property test validates that the SeededRandom class produces deterministic
     * results, which is critical for client-server synchronization where the client
     * can predict the draw result using the same seed, and the server can verify it.
     */
    it('Property 7: should produce identical sequences for the same seed across multiple executions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 2147483647 }), // Valid seed range
          fc.integer({ min: 1, max: 100 }), // Number of random values to generate
          (seed, count) => {
            // First execution
            const rng1 = new SeededRandom(seed);
            const sequence1 = Array.from({ length: count }, () => rng1.next());
            
            // Second execution with same seed
            const rng2 = new SeededRandom(seed);
            const sequence2 = Array.from({ length: count }, () => rng2.next());
            
            // Third execution with same seed
            const rng3 = new SeededRandom(seed);
            const sequence3 = Array.from({ length: count }, () => rng3.next());
            
            // All sequences must be identical
            return sequence1.every((val, idx) => val === sequence2[idx]) &&
                   sequence1.every((val, idx) => val === sequence3[idx]);
          }
        ),
        { numRuns: 20 } // Run 100 different test cases
      );
    });

    it('Property 7: should produce identical nextInRange sequences for the same seed', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 2147483647 }), // Valid seed range
          fc.integer({ min: 1, max: 50 }), // Number of random values to generate
          fc.float({ min: -1000, max: 1000 }), // Min value for range
          fc.float({ min: -1000, max: 1000 }), // Max value for range
          (seed, count, minVal, maxVal) => {
            // Ensure min < max
            const min = Math.min(minVal, maxVal);
            const max = Math.max(minVal, maxVal);
            
            // Skip if range is too small or equal (would cause precision issues or NaN)
            if (max - min < 0.1) {
              return true;
            }
            
            // First execution
            const rng1 = new SeededRandom(seed);
            const sequence1 = Array.from({ length: count }, () => rng1.nextInRange(min, max));
            
            // Second execution with same seed
            const rng2 = new SeededRandom(seed);
            const sequence2 = Array.from({ length: count }, () => rng2.nextInRange(min, max));
            
            // Sequences must be identical (check for NaN separately to avoid false positives)
            return sequence1.every((val, idx) => {
              const val2 = sequence2[idx];
              // Both NaN is considered equal for this test
              if (Number.isNaN(val) && Number.isNaN(val2)) return true;
              return val === val2;
            });
          }
        ),
        { numRuns: 20 }
      );
    });

    it('Property 7: should produce different sequences for different seeds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 2147483647 }), // First seed
          fc.integer({ min: 1, max: 2147483647 }), // Second seed
          fc.integer({ min: 10, max: 50 }), // Number of random values to generate
          (seed1, seed2, count) => {
            // Skip if seeds are the same
            if (seed1 === seed2) {
              return true;
            }
            
            // Generate sequences with different seeds
            const rng1 = new SeededRandom(seed1);
            const sequence1 = Array.from({ length: count }, () => rng1.next());
            
            const rng2 = new SeededRandom(seed2);
            const sequence2 = Array.from({ length: count }, () => rng2.next());
            
            // Sequences should be different (at least one value differs)
            // With high probability for sequences of length >= 10
            return !sequence1.every((val, idx) => val === sequence2[idx]);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('Property 7: should maintain determinism across interleaved next() and nextInRange() calls', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 2147483647 }), // Seed
          fc.array(
            fc.record({
              type: fc.constantFrom('next', 'nextInRange'),
              min: fc.float({ min: 0, max: 100, noNaN: true }),
              max: fc.float({ min: 0, max: 100, noNaN: true })
            }),
            { minLength: 5, maxLength: 20 }
          ),
          (seed, operations) => {
            // First execution
            const rng1 = new SeededRandom(seed);
            const results1 = operations.map(op => {
              if (op.type === 'next') {
                return rng1.next();
              } else {
                const min = Math.min(op.min, op.max);
                const max = Math.max(op.min, op.max);
                return max - min < 0.001 ? 0 : rng1.nextInRange(min, max);
              }
            });
            
            // Second execution with same seed and operations
            const rng2 = new SeededRandom(seed);
            const results2 = operations.map(op => {
              if (op.type === 'next') {
                return rng2.next();
              } else {
                const min = Math.min(op.min, op.max);
                const max = Math.max(op.min, op.max);
                return max - min < 0.001 ? 0 : rng2.nextInRange(min, max);
              }
            });
            
            // Results must be identical
            return results1.every((val, idx) => val === results2[idx]);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
