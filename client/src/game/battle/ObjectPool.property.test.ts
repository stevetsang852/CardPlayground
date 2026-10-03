/**
 * Property-based tests for ObjectPool
 *
 * **Validates: Requirements 11.3**
 */
import * as fc from 'fast-check';
import { ObjectPool } from './ObjectPool';

interface TestObj {
  id: number;
  active: boolean;
}

function makePool(initialCapacity = 0) {
  let counter = 0;
  return new ObjectPool<TestObj>(
    () => ({ id: ++counter, active: true }),
    (obj) => { obj.active = false; },
    initialCapacity
  );
}

describe('ObjectPool property tests', () => {
  /**
   * Property 5: After N acquires followed by N releases, pool size >= N (no objects lost)
   * **Validates: Requirements 11.3**
   */
  it('Property 5: acquire then release never loses objects', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }),  // initialCapacity
        fc.integer({ min: 1, max: 20 }), // N acquires/releases
        (initialCapacity, n) => {
          const pool = makePool(initialCapacity);

          // Acquire N objects
          const acquired: TestObj[] = [];
          for (let i = 0; i < n; i++) {
            acquired.push(pool.acquire());
          }

          // Release all N objects back
          for (const obj of acquired) {
            pool.release(obj);
          }

          // Pool must hold at least N objects (no objects lost)
          expect(pool.size()).toBeGreaterThanOrEqual(n);
        }
      ),
      { numRuns: 300 }
    );
  });

  /**
   * Property 6: Acquiring more objects than initial capacity always succeeds
   * (never returns null/undefined, never throws)
   * **Validates: Requirements 11.3**
   */
  it('Property 6: acquiring beyond initial capacity always succeeds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),  // initialCapacity
        fc.integer({ min: 1, max: 10 }),  // extra acquires beyond capacity
        (initialCapacity, extra) => {
          const pool = makePool(initialCapacity);

          // Drain the pool completely
          for (let i = 0; i < initialCapacity; i++) {
            pool.acquire();
          }

          // Acquire `extra` more beyond capacity — must never throw or return null
          for (let i = 0; i < extra; i++) {
            let obj: TestObj | null = null;
            expect(() => { obj = pool.acquire(); }).not.toThrow();
            expect(obj).not.toBeNull();
            expect(obj).not.toBeUndefined();
          }
        }
      ),
      { numRuns: 300 }
    );
  });
});
